param(
  [switch]$PixelStreaming,
  [switch]$Game
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'

function Find-UnrealEditor {
  $patterns = @(
    'C:\Program Files\Epic Games\UE_*\Engine\Binaries\Win64\UnrealEditor.exe',
    'D:\Epic Games\UE_*\Engine\Binaries\Win64\UnrealEditor.exe',
    'D:\Program Files\Epic Games\UE_*\Engine\Binaries\Win64\UnrealEditor.exe'
  )
  foreach ($pattern in $patterns) {
    $matches = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending
    if ($matches) { return $matches[0].FullName }
  }
  $cmd = Get-Command UnrealEditor.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Find-EpicLauncher {
  $paths = @(
    'C:\Program Files\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe',
    'C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe'
  )
  foreach ($path in $paths) {
    if (Test-Path $path) { return $path }
  }
  return $null
}

if (-not (Test-Path $ProjectPath)) {
  Write-Error "Missing Unreal project: $ProjectPath"
  exit 2
}

$UnrealEditor = Find-UnrealEditor
if ($UnrealEditor) {
  Write-Output "Opening Unreal project with $UnrealEditor"
  $arguments = @("`"$ProjectPath`"")
  if ($Game) {
    $arguments += '-game'
    Write-Output 'Unreal runtime mode enabled: -game'
  }
  if ($PixelStreaming) {
    $arguments += @(
      '-PixelStreamingURL=ws://127.0.0.1:8888',
      '-RenderOffscreen',
      '-AudioMixer'
    )
    Write-Output 'Pixel Streaming launch flags enabled: -PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffscreen -AudioMixer'
  }
  Start-Process -FilePath $UnrealEditor -ArgumentList $arguments
  exit 0
}

$EpicLauncher = Find-EpicLauncher
if ($EpicLauncher) {
  Write-Output 'UnrealEditor.exe was not found. Launching Epic Games Launcher so you can install Unreal Engine 5.x.'
  Start-Process -FilePath $EpicLauncher
  exit 3
}

Write-Output 'Epic Games Launcher and UnrealEditor.exe were not found. Install Epic Games Launcher first.'
exit 4
