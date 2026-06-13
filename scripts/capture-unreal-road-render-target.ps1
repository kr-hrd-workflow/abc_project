param(
  [string]$Profile = 'london',
  [string]$Output = '',
  [ValidateSet('layout','oblique','lit_oblique','state_layout')]
  [string]$View = 'layout'
)
$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
if (-not $Output) {
  $Output = Join-Path $RepoRoot "artifacts\unreal-road-only-${Profile}-rendertarget.png"
}
$OutputPath = if ([System.IO.Path]::IsPathRooted($Output)) {
  $Output
} else {
  Join-Path $RepoRoot $Output
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$OutputDir = Split-Path -Parent $OutputPath
if ($OutputDir) {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\capture_road_only_render_target.py'
$UnrealEditor = 'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
if (-not (Test-Path $UnrealEditor)) { throw "UnrealEditor.exe not found: $UnrealEditor" }
$env:SMART_INTERSECTION_CITY = $Profile
$env:SMART_INTERSECTION_PROOF_VIEW = $View
$env:SMART_INTERSECTION_PROOF_OUTPUT = $OutputPath
$process = Start-Process -FilePath $UnrealEditor -ArgumentList @($ProjectPath, "-ExecutePythonScript=$PythonScript", '-unattended', '-nop4', '-nosplash') -Wait -PassThru -WindowStyle Hidden
exit $process.ExitCode
