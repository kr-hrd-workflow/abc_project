param(
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\smoke_http_snapshot_controller.py'
$ServerScript = Join-Path $RepoRoot 'scripts\smoke_http_snapshot_server.py'
$OutputPath = Join-Path $RepoRoot 'artifacts\unreal-http-snapshot-smoke.json'
$ServerLogPath = Join-Path $RepoRoot 'artifacts\unreal-http-snapshot-server.jsonl'
$UnrealEditor = 'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
$BundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

foreach ($path in @($ProjectPath, $PythonScript, $ServerScript, $UnrealEditor, $BundledPython)) {
  if (-not (Test-Path $path)) {
    throw "Required path not found: $path"
  }
}

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}
if (Test-Path $ServerLogPath) {
  Remove-Item -LiteralPath $ServerLogPath -Force
}

$endpoint = "http://127.0.0.1:$Port/api/renderer/unreal/snapshot"
$env:SMART_INTERSECTION_HTTP_SMOKE_ENDPOINT = $endpoint
$env:SMART_INTERSECTION_HTTP_SMOKE_OUTPUT = $OutputPath
$env:SMART_INTERSECTION_HTTP_SMOKE_SERVER_LOG = $ServerLogPath

$server = Start-Process -FilePath $BundledPython -ArgumentList @($ServerScript, "$Port") -WindowStyle Hidden -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 250
    }
  }
  if (-not $ready) {
    throw "HTTP snapshot server did not become ready: $endpoint"
  }

  $unrealArgs = @(
    $ProjectPath,
    "-ExecCmds=`"py $PythonScript`"",
    '-unattended',
    '-nop4',
    '-nosplash',
    '-NoSound',
    '-nullrhi',
    '-stdout',
    '-FullStdOutLogOutput'
  )
  $process = Start-Process -FilePath $UnrealEditor -ArgumentList $unrealArgs -PassThru
  if (-not $process.WaitForExit(90000)) {
    Stop-Process -Id $process.Id -Force
    throw "Unreal HTTP snapshot smoke timed out waiting for editor exit"
  }

  if (-not (Test-Path $OutputPath)) {
    throw "Unreal HTTP snapshot smoke did not produce output: $OutputPath"
  }

  $result = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
  if (-not $result.passed) {
    throw "Unreal HTTP snapshot smoke failed: $OutputPath"
  }

  Write-Output "HTTP_SNAPSHOT_SMOKE_ARTIFACT=$OutputPath"
  exit $process.ExitCode
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
