# Monitorea DNS + HTTPS + búsqueda demo hasta que Somos Huella esté listo.
# Uso: powershell -File deploy/scripts/go-live-monitor.ps1
# Log: deploy/go-live-status.log

param(
    [int]$IntervalSeconds = 300,
    [int]$MaxHours = 10
)

$ErrorActionPreference = "Continue"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$LogFile = Join-Path $Root "deploy/go-live-status.log"
$VpsIp = "149.56.129.7"
$Hosts = @("somoshuella.org", "www.somoshuella.org", "api.somoshuella.org")
$DemoQuery = Join-Path $Root "frontend/public/demo/angelina_jolie_2.jpg"
$SshKey = $env:SSH_KEY
if (-not $SshKey) { $SshKey = "$env:USERPROFILE\.ssh\droplet" }

function Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

function Resolve-DnsGoogle($name) {
    try {
        $r = Resolve-DnsName -Name $name -Server 8.8.8.8 -Type A -ErrorAction Stop
        return ($r | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress -First 1)
    } catch {
        return $null
    }
}

function Test-Https($hostName) {
    try {
        $r = Invoke-WebRequest -Uri "https://$hostName/" -MaximumRedirection 5 -TimeoutSec 25 -UseBasicParsing
        return $r.StatusCode
    } catch {
        return 0
    }
}

function Test-ApiHealth {
    try {
        $r = Invoke-WebRequest -Uri "https://api.somoshuella.org/health" -TimeoutSec 25 -UseBasicParsing
        return $r.Content
    } catch {
        return $null
    }
}

function Test-SearchViaVps {
    if (-not (Test-Path $DemoQuery)) { return "no_demo_image" }
    scp -i $SshKey -q $DemoQuery "ubuntu@${VpsIp}:/tmp/angelina_query.jpg" 2>$null
    $cmd = 'API_KEY=$(grep ^API_KEY= /home/ubuntu/face-api/.env | cut -d= -f2); curl -s -X POST http://127.0.0.1:8100/search -H "x-api-key: $API_KEY" -F threshold=0.5 -F top_k=3 -F photo=@/tmp/angelina_query.jpg'
    $out = ssh -i $SshKey "ubuntu@${VpsIp}" $cmd 2>$null
    return $out
}

$deadline = (Get-Date).AddHours($MaxHours)
Log "=== Go-live monitor iniciado (intervalo ${IntervalSeconds}s, hasta $deadline) ==="

while ((Get-Date) -lt $deadline) {
    $dnsOk = $true
    foreach ($h in $Hosts) {
        $ip = Resolve-DnsGoogle $h
        $match = $ip -eq $VpsIp
        Log "DNS $h -> $ip $(if ($match) { 'OK' } else { 'PENDIENTE' })"
        if (-not $match) { $dnsOk = $false }
    }

    $wwwCode = Test-Https "www.somoshuella.org"
    $apiHealth = Test-ApiHealth
    Log "HTTPS www -> $wwwCode"
    Log "API health -> $(if ($apiHealth) { $apiHealth.Substring(0, [Math]::Min(80, $apiHealth.Length)) } else { 'FAIL' })"

    $search = Test-SearchViaVps
    if ($search -and $search -match "Angelina") {
        Log "Búsqueda demo Angelina -> OK"
        $searchOk = $true
    } else {
        Log "Búsqueda demo -> pendiente o sin match"
        $searchOk = $false
    }

    if ($dnsOk -and $wwwCode -eq 200 -and $apiHealth -match "ok" -and $searchOk) {
        Log "=== GO LIVE COMPLETO ==="
        Log "Siguiente paso manual: Cloudflare Proxied (naranja) + SSL Full (strict) + Always Use HTTPS"
        break
    }

    Start-Sleep -Seconds $IntervalSeconds
}

Log "Monitor finalizado."
