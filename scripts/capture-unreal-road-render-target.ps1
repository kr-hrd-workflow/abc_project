param(
  [string]$Profile = 'london',
  [string]$Output = ''
)
$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
if (-not $Output) {
  $Output = Join-Path $RepoRoot "artifacts\unreal-road-only-${Profile}-rendertarget.png"
}
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\capture_road_only_render_target.py'
$UnrealEditor = 'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
if (-not (Test-Path $UnrealEditor)) { throw "UnrealEditor.exe not found: $UnrealEditor" }
$env:SMART_INTERSECTION_CITY = $Profile
$env:SMART_INTERSECTION_PROOF_OUTPUT = $Output
& $UnrealEditor $ProjectPath "-ExecutePythonScript=$PythonScript" -unattended -nop4 -nosplash
exit $LASTEXITCODE
