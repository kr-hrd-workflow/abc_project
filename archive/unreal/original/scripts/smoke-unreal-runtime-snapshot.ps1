param(
  [ValidateSet('seoul','new_york','paris','london')]
  [string]$Profile = 'paris'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\smoke_runtime_snapshot_controller.py'
$OutputPath = Join-Path $RepoRoot 'artifacts\unreal-runtime-snapshot-smoke.json'
$UnrealEditor = 'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'

foreach ($path in @($ProjectPath, $PythonScript, $UnrealEditor)) {
  if (-not (Test-Path $path)) {
    throw "Required path not found: $path"
  }
}

$snapshot = @{
  cityProfileId = $Profile
  activeSignalGroup = 'east_priority'
  cycleSecond = 24
  queues = @{
    north = 32
    south = 11
    east = 18
    west = 8
  }
  pedestrian_request = $true
  emergency_vehicle_approach = $true
  emergency_direction = 'east'
  pixelStreamStatus = 'ready'
  pixelStreamSignallingUrl = 'ws://127.0.0.1:8888'
} | ConvertTo-Json -Compress

$env:SMART_INTERSECTION_RUNTIME_SNAPSHOT_JSON = $snapshot
$env:SMART_INTERSECTION_RUNTIME_SMOKE_OUTPUT = $OutputPath
if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

$unrealArgs = @(
  $ProjectPath,
  "-ExecutePythonScript=$PythonScript",
  '-unattended',
  '-nop4',
  '-nosplash',
  '-NoSound',
  '-nullrhi',
  '-stdout',
  '-FullStdOutLogOutput'
)

$process = Start-Process -FilePath $UnrealEditor -ArgumentList $unrealArgs -Wait -PassThru

if (-not (Test-Path $OutputPath)) {
  throw "Unreal runtime snapshot smoke did not produce output: $OutputPath"
}

$result = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
if (-not $result.passed) {
  throw "Unreal runtime snapshot smoke failed: $OutputPath"
}

Write-Output "RUNTIME_SNAPSHOT_SMOKE_ARTIFACT=$OutputPath"
exit $process.ExitCode
