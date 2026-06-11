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
