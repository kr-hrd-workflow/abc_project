$ErrorActionPreference = 'Continue'

function Find-UnrealEditor {
  $candidates = @(
    'C:\Program Files\Epic Games\UE_*\Engine\Binaries\Win64\UnrealEditor.exe',
    'D:\Epic Games\UE_*\Engine\Binaries\Win64\UnrealEditor.exe',
    'D:\Program Files\Epic Games\UE_*\Engine\Binaries\Win64\UnrealEditor.exe'
  )
  foreach ($pattern in $candidates) {
    $matches = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending
    if ($matches) { return $matches[0].FullName }
  }
  $cmd = Get-Command UnrealEditor.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Find-EpicLauncher {
  $candidates = @(
    'C:\Program Files\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe',
    'C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe'
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) { return $path }
  }
  $cmd = Get-Command EpicGamesLauncher.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

Write-Output '== Unreal precheck =='
$NodePath = 'C:\Program Files\nodejs'
if ((Test-Path $NodePath) -and ($env:Path -notlike "*$NodePath*")) {
  $env:Path = "$NodePath;$env:Path"
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
$npm = Get-Command npm.exe -ErrorAction SilentlyContinue
if (-not $npm) {
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
}
$unreal = Find-UnrealEditor
$epic = Find-EpicLauncher

if ($unreal) {
  Write-Output "UNREAL_EDITOR_FOUND=$unreal"
} else {
  Write-Output 'UNREAL_EDITOR_FOUND=false'
}

if ($epic) {
  Write-Output "EPIC_LAUNCHER_FOUND=$epic"
} else {
  Write-Output 'EPIC_LAUNCHER_FOUND=false'
}

if ($node) {
  Write-Output "WINDOWS_NODE_FOUND=$($node.Source)"
  node --version
} else {
  Write-Output 'WINDOWS_NODE_FOUND=false'
}

if ($npm) {
  Write-Output "WINDOWS_NPM_FOUND=$($npm.Source)"
  $previousLocation = Get-Location
  try {
    # npm.cmd is launched through cmd.exe, and cmd.exe refuses UNC working
    # directories such as \\wsl.localhost\Ubuntu\home\chan\abc_project.
    # Run the version probe from a normal Windows directory so WSL-hosted
    # repos can still use Windows Node/npm tools without noisy UNC warnings.
    Set-Location $env:TEMP
    & $npm.Source --version
  } finally {
    Set-Location $previousLocation
  }
} else {
  Write-Output 'WINDOWS_NPM_FOUND=false'
}

Write-Output '== Recommended next action =='
if (-not $epic) {
  Write-Output 'Install Epic Games Launcher: winget install --id EpicGames.EpicGamesLauncher --exact --accept-package-agreements --accept-source-agreements'
  exit 2
}
if (-not $unreal) {
  Write-Output 'Open Epic Games Launcher, sign in, install Unreal Engine 5.x, then run npm run unreal:open.'
  exit 3
}
Write-Output 'Run npm run unreal:open to open the SmartIntersection project.'
exit 0
