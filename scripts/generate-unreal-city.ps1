param(
  [ValidateSet('seoul','new_york','paris','london')]
  [string]$Profile = 'seoul',
  [switch]$OperatorStage1,
  [switch]$OperatorStage2,
  [switch]$OperatorStage3,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$ProfilePath = Join-Path $RepoRoot "renderer\unreal\SmartIntersection\SceneProfiles\cities\$Profile.json"
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\generate_road_intersection.py'

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

function Invoke-UnrealProjectBuildIfNeeded {
  param(
    [string]$EditorPath,
    [string]$ProjectFile
  )
  $runtimeDll = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Binaries\Win64\UnrealEditor-SmartIntersectionRuntime.dll'
  if (Test-Path $runtimeDll) {
    Write-Output "UNREAL_RUNTIME_MODULE_FOUND=$runtimeDll"
    return
  }
  $engineRoot = Resolve-Path (Join-Path (Split-Path -Parent $EditorPath) '..\..')
  $buildBat = Join-Path $engineRoot 'Build\BatchFiles\Build.bat'
  if (-not (Test-Path $buildBat)) {
    throw "Unreal Build.bat not found: $buildBat"
  }
  Write-Output 'UNREAL_RUNTIME_MODULE_FOUND=false'
  Write-Output "Building SmartIntersectionEditor because runtime DLL is missing..."
  & $buildBat SmartIntersectionEditor Win64 Development "-Project=$ProjectFile" -WaitMutex -NoHotReloadFromIDE
  if ($LASTEXITCODE -ne 0) {
    throw "Unreal project build failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path $runtimeDll)) {
    throw "Unreal project build completed, but runtime DLL is still missing: $runtimeDll"
  }
  Write-Output "UNREAL_RUNTIME_MODULE_BUILT=$runtimeDll"
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
if ($OperatorStage1) { Write-Output 'OPERATOR_STAGE1=true' }
if ($OperatorStage2) { Write-Output 'OPERATOR_STAGE2=true' }
if ($OperatorStage3) { Write-Output 'OPERATOR_STAGE3=true' }

if ($DryRun) {
  Write-Output 'DRY_RUN=true'
  exit 0
}

if (-not $UnrealEditor) {
  Write-Error 'UnrealEditor.exe not found. Install Unreal Engine 5.x or run npm run unreal:precheck.'
  exit 3
}

Invoke-UnrealProjectBuildIfNeeded -EditorPath $UnrealEditor -ProjectFile $ProjectPath

$env:SMART_INTERSECTION_CITY_PROFILE = $ProfilePath
if ($OperatorStage1) {
  $env:SMART_INTERSECTION_OPERATOR_STAGE1 = '1'
} else {
  Remove-Item Env:\SMART_INTERSECTION_OPERATOR_STAGE1 -ErrorAction SilentlyContinue
}
if ($OperatorStage2) {
  $env:SMART_INTERSECTION_OPERATOR_STAGE2 = '1'
} else {
  Remove-Item Env:\SMART_INTERSECTION_OPERATOR_STAGE2 -ErrorAction SilentlyContinue
}
if ($OperatorStage3) {
  $env:SMART_INTERSECTION_OPERATOR_STAGE3 = '1'
} else {
  Remove-Item Env:\SMART_INTERSECTION_OPERATOR_STAGE3 -ErrorAction SilentlyContinue
}
$args = @(
  $ProjectPath,
  "-ExecutePythonScript=$PythonScript",
  '-unattended',
  '-nop4',
  '-nosplash'
)

Write-Output "Launching Unreal city generation for $Profile..."
$process = Start-Process -FilePath $UnrealEditor -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
exit $process.ExitCode
