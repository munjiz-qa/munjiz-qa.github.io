// بركات · برنامج التشغيل المستقل على الكمبيوتر
// يخدم واجهة النظام من داخل البرنامج نفسه على هذا الجهاز فقط (127.0.0.1)
// ويحفظ بيانات النظام في ملف data/db.json بجوار البرنامج، مع نسخة احتياطية يومية تلقائية.
package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed web
var webFS embed.FS

const (
	firstPort   = 47840
	lastPort    = 47849
	idleTimeout = 6 * time.Minute
	keepBackups = 60
)

var (
	dataDir  string
	mu       sync.Mutex
	lastSeq  int64
	lastSeen = time.Now()
	logFile  *os.File
)

func logf(f string, a ...any) {
	if logFile != nil {
		fmt.Fprintf(logFile, time.Now().Format("2006-01-02 15:04:05 ")+f+"\n", a...)
	}
}

func writable(dir string) bool {
	if os.MkdirAll(dir, 0o755) != nil {
		return false
	}
	t := filepath.Join(dir, ".write-test")
	if os.WriteFile(t, []byte("ok"), 0o644) != nil {
		return false
	}
	os.Remove(t)
	return true
}

func resolveDataDir() string {
	exe, err := os.Executable()
	if err == nil {
		if r, e := filepath.EvalSymlinks(exe); e == nil {
			exe = r
		}
		base := filepath.Dir(exe)
		if strings.EqualFold(filepath.Base(base), "bin") {
			base = filepath.Dir(base)
		}
		tmp := strings.ToLower(os.TempDir())
		inTemp := tmp != "" && strings.HasPrefix(strings.ToLower(base), tmp)
		d := filepath.Join(base, "data")
		if !inTemp && writable(d) {
			return d
		}
	}
	cfg, err := os.UserConfigDir()
	if err != nil {
		cfg, _ = os.UserHomeDir()
	}
	d := filepath.Join(cfg, "Barakat", "data")
	os.MkdirAll(d, 0o755)
	return d
}

func isOurs(addr string) bool {
	c := http.Client{Timeout: 800 * time.Millisecond}
	r, err := c.Get("http://" + addr + "/api/ping")
	if err != nil {
		return false
	}
	defer r.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(r.Body, 64))
	return strings.HasPrefix(string(b), "barakat")
}

func dailyBackup(dbPath string) {
	bdir := filepath.Join(dataDir, "backups")
	os.MkdirAll(bdir, 0o755)
	day := filepath.Join(bdir, "db-"+time.Now().Format("2006-01-02")+".json")
	if _, err := os.Stat(day); err == nil {
		return
	}
	src, err := os.ReadFile(dbPath)
	if err != nil {
		return
	}
	os.WriteFile(day, src, 0o644)
	ents, _ := os.ReadDir(bdir)
	var names []string
	for _, e := range ents {
		if strings.HasPrefix(e.Name(), "db-") && strings.HasSuffix(e.Name(), ".json") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	for len(names) > keepBackups {
		os.Remove(filepath.Join(bdir, names[0]))
		names = names[1:]
	}
}

func handler(port int) http.Handler {
	sub, _ := fs.Sub(webFS, "web")
	static := http.FileServer(http.FS(sub))
	allowed := map[string]bool{fmt.Sprintf("127.0.0.1:%d", port): true, fmt.Sprintf("localhost:%d", port): true}
	dbPath := filepath.Join(dataDir, "db.json")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !allowed[r.Host] {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if o := r.Header.Get("Origin"); o != "" && !allowed[strings.TrimPrefix(o, "http://")] {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		switch r.URL.Path {
		case "/api/ping":
			mu.Lock()
			lastSeen = time.Now()
			mu.Unlock()
			io.WriteString(w, "barakat-ok")
			return
		case "/api/info":
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			json.NewEncoder(w).Encode(map[string]string{"dataDir": dataDir, "dbFile": dbPath, "backups": filepath.Join(dataDir, "backups"), "version": "1.0"})
			return
		case "/api/db":
			mu.Lock()
			defer mu.Unlock()
			lastSeen = time.Now()
			switch r.Method {
			case http.MethodGet:
				b, err := os.ReadFile(dbPath)
				if err != nil {
					w.WriteHeader(http.StatusNoContent)
					return
				}
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.Write(b)
			case http.MethodPut:
				if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
					http.Error(w, "bad type", http.StatusUnsupportedMediaType)
					return
				}
				seq, _ := strconv.ParseInt(r.Header.Get("X-Seq"), 10, 64)
				if seq != 0 && seq < lastSeq {
					w.WriteHeader(http.StatusNoContent) // كتابة أقدم وصلت متأخرة: تُتجاهل
					return
				}
				b, err := io.ReadAll(io.LimitReader(r.Body, 100<<20))
				if err != nil || !json.Valid(b) {
					http.Error(w, "invalid json", http.StatusBadRequest)
					return
				}
				var probe struct{ V int `json:"v"` }
				if json.Unmarshal(b, &probe) != nil || probe.V != 1 {
					http.Error(w, "invalid data", http.StatusBadRequest)
					return
				}
				dailyBackup(dbPath)
				tmp := dbPath + ".tmp"
				if err := os.WriteFile(tmp, b, 0o644); err != nil {
					logf("write: %v", err)
					http.Error(w, "write failed", http.StatusInternalServerError)
					return
				}
				if err := os.Rename(tmp, dbPath); err != nil {
					logf("rename: %v", err)
					http.Error(w, "write failed", http.StatusInternalServerError)
					return
				}
				if seq != 0 {
					lastSeq = seq
				}
				w.WriteHeader(http.StatusNoContent)
			default:
				http.Error(w, "method", http.StatusMethodNotAllowed)
			}
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method", http.StatusMethodNotAllowed)
			return
		}
		static.ServeHTTP(w, r)
	})
}

func browsers() []string {
	switch runtime.GOOS {
	case "windows":
		pf, pf86, la := os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("LocalAppData")
		return []string{
			pf86 + `\Microsoft\Edge\Application\msedge.exe`, pf + `\Microsoft\Edge\Application\msedge.exe`, la + `\Microsoft\Edge\Application\msedge.exe`,
			pf + `\Google\Chrome\Application\chrome.exe`, pf86 + `\Google\Chrome\Application\chrome.exe`, la + `\Google\Chrome\Application\chrome.exe`,
			pf + `\BraveSoftware\Brave-Browser\Application\brave.exe`, la + `\BraveSoftware\Brave-Browser\Application\brave.exe`,
		}
	case "darwin":
		h, _ := os.UserHomeDir()
		return []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", h + "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
		}
	default:
		var out []string
		for _, n := range []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"} {
			if p, err := exec.LookPath(n); err == nil {
				out = append(out, p)
			}
		}
		return out
	}
}

func openUI(url string) {
	if os.Getenv("BARAKAT_NO_BROWSER") != "" {
		return
	}
	prof := filepath.Join(dataDir, "browser")
	for _, b := range browsers() {
		if st, err := os.Stat(b); err == nil && !st.IsDir() {
			cmd := exec.Command(b, "--app="+url, "--user-data-dir="+prof, "--no-first-run", "--no-default-browser-check", "--disable-sync", "--window-size=1280,860")
			if cmd.Start() == nil {
				go cmd.Wait()
				return
			}
		}
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if cmd.Start() == nil {
		go cmd.Wait()
	}
}

func main() {
	dataDir = resolveDataDir()
	logFile, _ = os.OpenFile(filepath.Join(dataDir, "barakat.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	var ln net.Listener
	var port int
	for p := firstPort; p <= lastPort; p++ {
		addr := fmt.Sprintf("127.0.0.1:%d", p)
		if isOurs(addr) { // البرنامج يعمل مسبقاً: افتح نافذته فقط
			logf("already running on %d", p)
			openUI("http://" + addr + "/")
			return
		}
		l, err := net.Listen("tcp", addr)
		if err == nil {
			ln, port = l, p
			break
		}
	}
	if ln == nil {
		logf("no free port")
		os.Exit(1)
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	logf("started on %s · data %s", url, dataDir)
	fmt.Println("بركات يعمل على", url)
	fmt.Println("البيانات:", filepath.Join(dataDir, "db.json"))
	go func() {
		for range time.Tick(30 * time.Second) {
			mu.Lock()
			idle := time.Since(lastSeen)
			mu.Unlock()
			if idle > idleTimeout && os.Getenv("BARAKAT_STAY") == "" {
				logf("idle, exiting")
				os.Exit(0)
			}
		}
	}()
	go func() { time.Sleep(300 * time.Millisecond); openUI(url) }()
	srv := &http.Server{Handler: handler(port), ReadHeaderTimeout: 10 * time.Second}
	if err := srv.Serve(ln); err != nil {
		logf("serve: %v", err)
	}
}
