$ErrorActionPreference = 'Continue'

$NodePath = 'C:\Program Files\nodejs'
if ((Test-Path $NodePath) -and ($env:Path -notlike "*$NodePath*")) {
  $env:Path = "$NodePath;$env:Path"
}

function Find-UnrealRoot {
  $patterns = @(
    'C:\Program Files\Epic Games\UE_*',
    'D:\Epic Games\UE_*',
    'D:\Program Files\Epic Games\UE_*'
  )
  foreach ($pattern in $patterns) {
    $matches = Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue | Sort-Object FullName -Descending
    if ($matches) { return $matches[0].FullName }
  }
  return $null
}

$UnrealRoot = Find-UnrealRoot
if (-not $UnrealRoot) {
  Write-Output 'Unreal Engine is not installed yet. Install UE 5.x in Epic Games Launcher, then rerun this script.'
  exit 3
}

$ServerRootCandidates = @(
  (Join-Path $UnrealRoot 'Engine\Plugins\Media\PixelStreaming\Resources\WebServers\SignallingWebServer'),
  (Join-Path $UnrealRoot 'Engine\Plugins\Media\PixelStreaming2\Resources\WebServers\SignallingWebServer'),
  (Join-Path $UnrealRoot 'Engine\Plugins\Media\PixelStreaming\Resources\WebServers'),
  (Join-Path $UnrealRoot 'Engine\Plugins\Media\PixelStreaming2\Resources\WebServers')
)

$ServerRoot = $ServerRootCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $ServerRoot) {
  Write-Output "Pixel Streaming signalling server folder was not found under $UnrealRoot."
  Write-Output 'Install/enable the Pixel Streaming plugin or use Epic Pixel Streaming Infrastructure separately.'
  exit 4
}

Write-Output "Pixel Streaming server folder: $ServerRoot"
$Scripts = @(
  (Join-Path $ServerRoot 'platform_scripts\cmd\Start_SignallingServer.ps1'),
  (Join-Path $ServerRoot 'Start_SignallingServer.ps1'),
  (Join-Path $ServerRoot 'run_local.bat')
)
$Script = $Scripts | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Script) {
  Write-Output 'No known signalling startup script was found. Inspect the folder above and run the matching Epic script manually.'
  exit 5
}

Write-Output "Starting Pixel Streaming signalling server: $Script"
Set-Location $ServerRoot
if ($Script.EndsWith('.bat')) {
  Start-Process -FilePath $Script
} else {
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$Script`"")
}
Write-Output 'Expected dashboard stream URL: http://127.0.0.1:8888'
exit 0
