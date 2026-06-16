param(
  [string]$OutputA = '',
  [string]$OutputB = '',
  [string]$ContactSheet = ''
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
if (-not $OutputA) {
  $OutputA = Join-Path $RepoRoot 'artifacts\unreal-operator-map-stage4-snapshot-a.png'
}
if (-not $OutputB) {
  $OutputB = Join-Path $RepoRoot 'artifacts\unreal-operator-map-stage4-snapshot-b.png'
}
if (-not $ContactSheet) {
  $ContactSheet = Join-Path $RepoRoot 'artifacts\unreal-operator-map-stage4-motion-contact-sheet.png'
}
$OutputAPath = [System.IO.Path]::GetFullPath($OutputA)
$OutputBPath = [System.IO.Path]::GetFullPath($OutputB)
$ContactSheetPath = [System.IO.Path]::GetFullPath($ContactSheet)

foreach ($path in @($OutputAPath, $OutputBPath, $ContactSheetPath)) {
  $dir = Split-Path -Parent $path
  if ($dir) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

$ProjectPath = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\SmartIntersection.uproject'
$PythonScript = Join-Path $RepoRoot 'renderer\unreal\SmartIntersection\Content\Python\capture_operator_map_stage4.py'
$UnrealEditor = 'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
if (-not (Test-Path $UnrealEditor)) { throw "UnrealEditor.exe not found: $UnrealEditor" }
if (-not (Test-Path $ProjectPath)) { throw "Unreal project not found: $ProjectPath" }
if (-not (Test-Path $PythonScript)) { throw "Capture script not found: $PythonScript" }

function Set-Stage4PngOpaque {
  param([Parameter(Mandatory = $true)][string]$Path)

  if ([System.IO.Path]::GetExtension($Path).ToLowerInvariant() -ne '.png') {
    return
  }
  if (-not (Test-Path $Path)) {
    throw "PNG output not found: $Path"
  }

  Add-Type -AssemblyName System.Drawing
  if (-not ('OperatorStage4PngAlphaFixer' -as [type])) {
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class OperatorStage4PngAlphaFixer
{
    public static void ForceOpaque(string path)
    {
        var tempPath = path + ".opaque.tmp";
        using (var source = new Bitmap(path))
        using (var rgba = source.Clone(new Rectangle(0, 0, source.Width, source.Height), PixelFormat.Format32bppArgb))
        using (var rgb = new Bitmap(source.Width, source.Height, PixelFormat.Format24bppRgb))
        {
            var rect = new Rectangle(0, 0, source.Width, source.Height);
            BitmapData sourceData = null;
            BitmapData rgbData = null;
            try
            {
                sourceData = rgba.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                rgbData = rgb.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);

                var sourceStride = Math.Abs(sourceData.Stride);
                var rgbStride = Math.Abs(rgbData.Stride);
                var sourceBytes = new byte[sourceStride * source.Height];
                var rgbBytes = new byte[rgbStride * source.Height];
                Marshal.Copy(sourceData.Scan0, sourceBytes, 0, sourceBytes.Length);

                for (var y = 0; y < source.Height; y++)
                {
                    var sourceRow = y * sourceStride;
                    var rgbRow = y * rgbStride;
                    for (var x = 0; x < source.Width; x++)
                    {
                        var sourceIndex = sourceRow + x * 4;
                        var rgbIndex = rgbRow + x * 3;
                        rgbBytes[rgbIndex + 0] = sourceBytes[sourceIndex + 0];
                        rgbBytes[rgbIndex + 1] = sourceBytes[sourceIndex + 1];
                        rgbBytes[rgbIndex + 2] = sourceBytes[sourceIndex + 2];
                    }
                }

                Marshal.Copy(rgbBytes, 0, rgbData.Scan0, rgbBytes.Length);
            }
            finally
            {
                if (sourceData != null) rgba.UnlockBits(sourceData);
                if (rgbData != null) rgb.UnlockBits(rgbData);
            }

            rgb.Save(tempPath, ImageFormat.Png);
        }
        File.Delete(path);
        File.Move(tempPath, path);
    }
}
'@
  }

  [OperatorStage4PngAlphaFixer]::ForceOpaque($Path)
  Write-Output "OPERATOR_STAGE4_PROOF_OPAQUE output=$Path"
}

function New-Stage4ContactSheet {
  param(
    [Parameter(Mandatory = $true)][string]$LeftPath,
    [Parameter(Mandatory = $true)][string]$RightPath,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  Add-Type -AssemblyName System.Drawing
  $left = [System.Drawing.Image]::FromFile($LeftPath)
  $right = [System.Drawing.Image]::FromFile($RightPath)
  try {
    $sheet = New-Object System.Drawing.Bitmap ($left.Width * 2), $left.Height
    $graphics = [System.Drawing.Graphics]::FromImage($sheet)
    try {
      $graphics.DrawImage($left, 0, 0, $left.Width, $left.Height)
      $graphics.DrawImage($right, $left.Width, 0, $right.Width, $right.Height)
      $sheet.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $sheet.Dispose()
    }
  } finally {
    $left.Dispose()
    $right.Dispose()
  }
  Write-Output "OPERATOR_STAGE4_CONTACT_SHEET=$OutputPath"
}

$env:SMART_INTERSECTION_OPERATOR_STAGE4_PROOF_A_OUTPUT = $OutputAPath
$env:SMART_INTERSECTION_OPERATOR_STAGE4_PROOF_B_OUTPUT = $OutputBPath
$process = Start-Process -FilePath $UnrealEditor -ArgumentList @($ProjectPath, "-ExecutePythonScript=$PythonScript", '-unattended', '-nop4', '-nosplash') -Wait -PassThru -WindowStyle Hidden
if ($process.ExitCode -ne 0) {
  exit $process.ExitCode
}
foreach ($path in @($OutputAPath, $OutputBPath)) {
  if (-not (Test-Path $path)) {
    throw "PNG output not found: $path"
  }
  Set-Stage4PngOpaque -Path $path
}
New-Stage4ContactSheet -LeftPath $OutputAPath -RightPath $OutputBPath -OutputPath $ContactSheetPath
Set-Stage4PngOpaque -Path $ContactSheetPath
Write-Output "OPERATOR_STAGE4_PROOF_A_OUTPUT=$OutputAPath"
Write-Output "OPERATOR_STAGE4_PROOF_B_OUTPUT=$OutputBPath"
