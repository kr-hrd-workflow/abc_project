param(
  [string]$Profile = 'seoul',
  [string]$Output = ''
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$MapPath = "/Game/Maps/Generated/${Profile}_RoadOnly"
if (-not $Output) {
  $Output = Join-Path $RepoRoot "artifacts\unreal-road-only-${Profile}.png"
}
$OutputDir = Split-Path -Parent $Output
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$UnrealEditor = 'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
if (-not (Test-Path $UnrealEditor)) { throw "UnrealEditor.exe not found: $UnrealEditor" }

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Rect {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$Args = @($ProjectPath, $MapPath, '-nop4', '-nosplash')
$Process = Start-Process -FilePath $UnrealEditor -ArgumentList $Args -PassThru
try {
  $deadline = (Get-Date).AddSeconds(150)
  $handle = [IntPtr]::Zero
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    $Process.Refresh()
    if ($Process.HasExited) { throw "Unreal Editor exited early with code $($Process.ExitCode)" }
    if ($Process.MainWindowHandle -ne 0) {
      $handle = $Process.MainWindowHandle
      break
    }
  }
  if ($handle -eq [IntPtr]::Zero) { throw 'Timed out waiting for Unreal Editor window' }
  Start-Sleep -Seconds 35
  foreach ($windowProcess in Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.Id -ne $Process.Id }) {
    [Win32Rect]::ShowWindow($windowProcess.MainWindowHandle, 6) | Out-Null
  }
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  Start-Sleep -Milliseconds 500
  [Win32Rect]::SetForegroundWindow($handle) | Out-Null
  Start-Sleep -Seconds 2
  $rect = New-Object Win32Rect+RECT
  [Win32Rect]::GetWindowRect($handle, [ref]$rect) | Out-Null
  $width = [Math]::Max(1, $rect.Right - $rect.Left)
  $height = [Math]::Max(1, $rect.Bottom - $rect.Top)
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  Write-Output "UNREAL_RENDERER_PROOF=$Output"
  Write-Output "WINDOW_SIZE=${width}x${height}"
}
finally {
  if ($Process -and -not $Process.HasExited) {
    $Process.CloseMainWindow() | Out-Null
    Start-Sleep -Seconds 8
    if (-not $Process.HasExited) { Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue }
  }
}
