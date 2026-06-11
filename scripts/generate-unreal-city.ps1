param(
  [ValidateSet('seoul','new_york','paris','london')]
  [string]$Profile = 'seoul',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$ProfilePath = Join-Path $RepoRoot "renderer\unreal\SmartIntersection\SceneProfiles\cities\$Profile.json"
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\generate_city_scene.py'

function Find-UnrealEditor {
  $candidates = @(
    'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
    'C:\Program Files\Epic Games\UE_5.6\Engine\Binaries\Win64\UnrealEditor.exe',
    'C:\Program Files\Epic Games\UE_5.5\Engine\Binaries\Win64\UnrealEditor.exe',
    'C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UnrealEditor.exe'
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  $found = Get-ChildItem 'C:\Program Files\Epic Games' -Filter UnrealEditor.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }
  return $null
}

foreach ($path in @($ProjectPath, $ProfilePath, $PythonScript)) {
  if (-not (Test-Path $path)) {
    throw "Required path not found: $path"
  }
}

$UnrealEditor = Find-UnrealEditor
Write-Output "PROFILE=$Profile"
Write-Output "PROJECT=$ProjectPath"
Write-Output "PROFILE_PATH=$ProfilePath"
Write-Output "PYTHON_SCRIPT=$PythonScript"
Write-Output "UNREAL_EDITOR_FOUND=$([bool]$UnrealEditor)"
if ($UnrealEditor) { Write-Output "UNREAL_EDITOR=$UnrealEditor" }

if ($DryRun) {
  Write-Output 'DRY_RUN=true'
  exit 0
}

if (-not $UnrealEditor) {
  Write-Error 'UnrealEditor.exe not found. Install Unreal Engine 5.x or run npm run unreal:precheck.'
  exit 3
}

$env:SMART_INTERSECTION_CITY_PROFILE = $ProfilePath
$args = @(
  $ProjectPath,
  "-ExecutePythonScript=$PythonScript",
  '-unattended',
  '-nop4',
  '-nosplash'
)

Write-Output "Launching Unreal city generation for $Profile..."
$process = Start-Process -FilePath $UnrealEditor -ArgumentList $args -Wait -PassThru
exit $process.ExitCode
