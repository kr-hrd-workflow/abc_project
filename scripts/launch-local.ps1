param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$EnvFile = Join-Path $RootDir ".env.local"
$EnvExample = Join-Path $RootDir ".env.example"
$ApiPython = Join-Path $RootDir "apps\api\.venv\Scripts\python.exe"
$ApiDir = Join-Path $RootDir "apps\api"
$WebDir = Join-Path $RootDir "apps\web"
$NextCmd = Join-Path $WebDir "node_modules\.bin\next.cmd"

if (-not (Test-Path $EnvFile) -and (Test-Path $EnvExample)) {
  Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
  Write-Host "Created .env.local from .env.example"
}

$checks = @(
  @{ Name = ".env.local"; Path = $EnvFile },
  @{ Name = "API Python venv"; Path = $ApiPython },
  @{ Name = "Next.js local binary"; Path = $NextCmd }
)

$missing = @()
foreach ($check in $checks) {
  if (-not (Test-Path $check.Path)) {
    $missing += $check.Name
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing local runtime dependency: " + ($missing -join ", "))
}

if ($CheckOnly) {
  Write-Host "Local launch prerequisites are present."
  exit 0
}

Write-Host "Starting API on http://127.0.0.1:8000"
$apiProcess = Start-Process `
  -FilePath $ApiPython `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
  -WorkingDirectory $ApiDir `
  -PassThru `
  -WindowStyle Hidden

try {
  Start-Sleep -Seconds 3
  Invoke-RestMethod "http://127.0.0.1:8000/health" | Out-Null
  Write-Host "Starting web on http://127.0.0.1:3000/dashboard"
  Push-Location $WebDir
  try {
    & $NextCmd "dev" "-H" "127.0.0.1" "-p" "3000"
  } finally {
    Pop-Location
  }
} finally {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
