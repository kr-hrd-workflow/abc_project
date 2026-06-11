$ErrorActionPreference = 'Continue'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

$NodePath = 'C:\Program Files\nodejs'
if ((Test-Path $NodePath) -and ($env:Path -notlike "*$NodePath*")) {
  $env:Path = "$NodePath;$env:Path"
}

Write-Output 'Smart Intersection at-home Unreal continuation'
Write-Output "Repo: $RepoRoot"
Write-Output ''

Write-Output '== 1. Unreal/Epic precheck =='
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/unreal-precheck.ps1
$precheck = $LASTEXITCODE
Write-Output "PRECHECK_EXIT=$precheck"
if ($precheck -ne 0) {
  Write-Output ''
  Write-Output 'BLOCKED: Unreal Editor is not installed yet.'
  Write-Output 'Open Epic Games Launcher, sign in, install Unreal Engine 5.x, then rerun:'
  Write-Output '  npm run unreal:home'
  exit $precheck
}

Write-Output ''
Write-Output '== 2. Ensuring dashboard stream env in .env.local =='
$envTargets = @(
  (Join-Path $RepoRoot '.env.local'),
  (Join-Path $RepoRoot 'apps\web\.env.local')
)
foreach ($envPath in $envTargets) {
  if (-not (Test-Path $envPath)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $envPath -Parent) | Out-Null
    Set-Content -Path $envPath -Value "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api`n" -NoNewline
  }
  $envText = Get-Content $envPath -Raw
  if ($envText -match '(?m)^#?\s*NEXT_PUBLIC_SIMULATION_STREAM_URL=') {
    $envText = [regex]::Replace($envText, '(?m)^#?\s*NEXT_PUBLIC_SIMULATION_STREAM_URL=.*$', 'NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1')
  } else {
    $envText = $envText.TrimEnd() + "`nNEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1`n"
  }
  Set-Content -Path $envPath -Value $envText -NoNewline
  Write-Output "ENV_OK=$envPath NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1"
}

Write-Output ''
Write-Output '== 3. Starting Pixel Streaming signalling server =='
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-pixel-streaming.ps1
$streamCode = $LASTEXITCODE
Write-Output "PIXEL_STREAMING_EXIT=$streamCode"

Write-Output ''
Write-Output '== 4. Opening Unreal runtime with Pixel Streaming streamer flags =='
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/open-unreal-project.ps1 -PixelStreaming -Game
$openCode = $LASTEXITCODE
Write-Output "OPEN_EXIT=$openCode"

Write-Output ''
Write-Output 'Next manual check:'
Write-Output '  npm run launch:local'
Write-Output '  open http://127.0.0.1:3000/dashboard'
Write-Output '  confirm the iframe URL http://127.0.0.1 loads and the Pixel Streaming player connects after CLICK TO START'
exit 0
