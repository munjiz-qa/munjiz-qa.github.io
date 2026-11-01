# Munjiz desktop server for Windows. Serves the Munjiz site from this computer at http://localhost:8765
# Uses only what ships with Windows (PowerShell + .NET). No installation and no administrator rights needed.
param(
  [string]$Root = (Join-Path (Split-Path -Parent $PSScriptRoot) 'site'),
  [int]$Port = 8765,
  [string]$Page = 'desktop.html',
  [switch]$NoBrowser,
  [switch]$SocketOnly
)
$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath($Root).TrimEnd('\','/')
if (-not (Test-Path (Join-Path $Root 'index.html'))) { Write-Host "Munjiz files were not found in: $Root" -ForegroundColor Red; exit 1 }
$Url = "http://localhost:$Port/"
$Mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.webmanifest'='application/manifest+json; charset=utf-8';
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif'; '.webp'='image/webp'; '.ico'='image/x-icon';
  '.txt'='text/plain; charset=utf-8'; '.xml'='application/xml; charset=utf-8'; '.pdf'='application/pdf'; '.woff'='font/woff'; '.woff2'='font/woff2'
}

function Open-Browser { if (-not $NoBrowser) { try { Start-Process ($Url + $Page) } catch { Write-Host "Open this address in your browser: $Url$Page" } } }

# Already running (for example, a second double-click)? Just open the browser.
try {
  $probe = New-Object System.Net.Sockets.TcpClient
  $probe.Connect('127.0.0.1', $Port); $probe.Close()
  Write-Host "Munjiz is already running at $Url" -ForegroundColor Green
  Open-Browser; exit 0
} catch { }

function Resolve-File([string]$rawPath) {
  $p = [System.Uri]::UnescapeDataString(($rawPath -split '\?')[0]).TrimStart('/')
  if ($p -eq '' -or $p.EndsWith('/')) { $p += 'index.html' }
  $full = [System.IO.Path]::GetFullPath((Join-Path $Root ($p -replace '/', [System.IO.Path]::DirectorySeparatorChar)))
  if (-not ($full + [System.IO.Path]::DirectorySeparatorChar).StartsWith($Root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { return $null }
  if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }
  if (Test-Path -LiteralPath $full -PathType Leaf) { return $full }
  return $null
}
function Get-Type([string]$file) {
  $t = $Mime[[System.IO.Path]::GetExtension($file).ToLowerInvariant()]
  if ($t) { return $t } else { return 'application/octet-stream' }
}
function Show-Banner {
  Write-Host ''
  Write-Host '  Munjiz Business Services - desktop' -ForegroundColor Yellow
  Write-Host "  Running at $Url" -ForegroundColor Green
  Write-Host '  Keep this window open while you use Munjiz. Close it to stop.'
  Write-Host ''
}

# Preferred engine: HttpListener (built into Windows, handles many browser connections at once).
$listener = $null
if (-not $SocketOnly) { try {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add($Url)
  $listener.Start()
} catch { $listener = $null } }

if ($listener) {
  Show-Banner; Open-Browser
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $file = Resolve-File $ctx.Request.RawUrl
      if ($null -eq $file) { $file = Join-Path $Root '404.html'; $res.StatusCode = 404 }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $res.ContentType = Get-Type $file
      $res.AddHeader('Cache-Control', 'no-cache')
      $res.ContentLength64 = $bytes.Length
      if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
    } catch { try { $res.StatusCode = 500 } catch { } }
    finally { try { $res.OutputStream.Close() } catch { } }
  }
  exit 0
}

# Fallback engine: a minimal server on a raw socket (used only if HttpListener is unavailable).
$tcp = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try { $tcp.Start() } catch { Write-Host "Port $Port is busy. Close the program using it and try again." -ForegroundColor Red; exit 1 }
Show-Banner; Open-Browser
$enc = [System.Text.Encoding]::ASCII
while ($true) {
  $client = $tcp.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 1500
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, $enc, $false, 8192, $true)
    $line = $reader.ReadLine()
    if (-not $line) { continue }
    while (($h = $reader.ReadLine()) -ne $null -and $h -ne '') { }
    $parts = $line.Split(' ')
    $file = Resolve-File $parts[1]
    $status = '200 OK'
    if ($null -eq $file) { $file = Join-Path $Root '404.html'; $status = '404 Not Found' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $head = "HTTP/1.1 $status`r`nContent-Type: $(Get-Type $file)`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $hb = $enc.GetBytes($head); $stream.Write($hb, 0, $hb.Length)
    if ($parts[0] -ne 'HEAD') { $stream.Write($bytes, 0, $bytes.Length) }
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
