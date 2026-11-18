package qa.munjiz.basiracaller;

import android.Manifest;
import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

/** الشاشة الرئيسية: لوحة تفعيل كاشف المتصل، ثم موقع بصيرة كولر للبحث والإبلاغ والحساب. */
public class MainActivity extends Activity {
    private static final int REQ_ROLE = 7, REQ_NOTIF = 8;
    private TextView status;
    private Button enable;
    private WebView web;

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private GradientDrawable round(int color, int r) { GradientDrawable g = new GradientDrawable(); g.setColor(color); g.setCornerRadius(dp(r)); return g; }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setBackgroundColor(Color.parseColor("#FAF8FF"));

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(14), dp(16), dp(14));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{Color.parseColor("#2A1466"), Color.parseColor("#170B3B")});
        panel.setBackground(bg);

        TextView title = new TextView(this);
        title.setText("بصيرة كولر · من منجز");
        title.setTextColor(Color.WHITE); title.setTextSize(20); title.setTypeface(Typeface.DEFAULT_BOLD);
        panel.addView(title);

        status = new TextView(this);
        status.setTextColor(Color.parseColor("#DCD3F5")); status.setTextSize(14);
        status.setPadding(0, dp(4), 0, dp(10));
        panel.addView(status);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        enable = new Button(this);
        enable.setAllCaps(false); enable.setTextColor(Color.parseColor("#22114F"));
        enable.setBackground(round(Color.parseColor("#F2B705"), 12));
        enable.setPadding(dp(14), 0, dp(14), 0);
        enable.setOnClickListener(v -> requestRole());
        row.addView(enable, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(44)));

        Switch block = new Switch(this);
        block.setText("رفض مكالمات الاحتيال تلقائياً");
        block.setTextColor(Color.WHITE); block.setTextSize(13);
        block.setChecked(Lookup.prefs(this).getBoolean("autoBlock", false));
        block.setOnCheckedChangeListener((s, on) -> {
            Lookup.prefs(this).edit().putBoolean("autoBlock", on).apply();
            Toast.makeText(this, on ? "سيُرفض أي رقم مؤشره 70 فأكثر" : "لن تُرفض أي مكالمة تلقائياً", Toast.LENGTH_SHORT).show();
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        lp.setMarginStart(dp(12));
        row.addView(block, lp);
        panel.addView(row);
        root.addView(panel, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        web = new WebView(this);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true); ws.setDomStorageEnabled(true);
        ws.setUserAgentString(ws.getUserAgentString() + " BasiraCallerAndroid/1");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (u.toString().startsWith(Config.SITE)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        String start = Config.SITE;
        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (data != null && data.toString().startsWith(Config.SITE)) start = data.toString();
        web.loadUrl(start);
        root.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);

        new Thread(() -> {
            try { int n = Lookup.syncSpamList(this); runOnUiThread(() -> refresh(n)); }
            catch (Exception e) { runOnUiThread(() -> refresh(-1)); }
        }).start();
        refresh(-1);
    }

    private boolean hasRole() {
        RoleManager rm = getSystemService(RoleManager.class);
        return rm != null && rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING);
    }

    private void refresh(int synced) {
        boolean on = hasRole();
        String s = on ? "● كاشف المتصل يعمل: سيظهر اسم المتصل ومؤشر الخطر مع الرنين." : "○ كاشف المتصل غير مفعّل بعد. فعّله ليظهر اسم المتصل مع الرنين.";
        if (synced >= 0) s += "\nحُدّثت قائمة الحماية على هاتفك: " + synced + " رقم مزعج.";
        status.setText(s);
        enable.setText(on ? "مفعّل ✓" : "تفعيل كاشف المتصل");
        enable.setEnabled(!on);
    }

    private void requestRole() {
        RoleManager rm = getSystemService(RoleManager.class);
        if (rm == null || !rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            Toast.makeText(this, "هاتفك لا يدعم فحص المكالمات من التطبيقات", Toast.LENGTH_LONG).show();
            return;
        }
        startActivityForResult(rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING), REQ_ROLE);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent d) {
        super.onActivityResult(req, res, d);
        if (req == REQ_ROLE) {
            refresh(-1);
            Toast.makeText(this, hasRole() ? "تم التفعيل. سيعمل بصيرة كولر مع المكالمة القادمة." : "لم يُفعَّل كاشف المتصل.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onResume() { super.onResume(); if (status != null) refresh(-1); }

    @Override
    public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
