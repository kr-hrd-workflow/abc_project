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

function Set-PngOpaque {
  param([Parameter(Mandatory = $true)][string]$Path)

  if ([System.IO.Path]::GetExtension($Path).ToLowerInvariant() -ne '.png') {
    return
  }
  if (-not (Test-Path $Path)) {
    throw "PNG output not found: $Path"
  }

  Add-Type -AssemblyName System.Drawing
  if (-not ('PngAlphaFixer' -as [type])) {
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class PngAlphaFixer
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

  [PngAlphaFixer]::ForceOpaque($Path)
  Write-Host "ROAD_ONLY_RENDER_TARGET_OPAQUE output=$Path"
}

$env:SMART_INTERSECTION_CITY = $Profile
$env:SMART_INTERSECTION_PROOF_VIEW = $View
$env:SMART_INTERSECTION_PROOF_OUTPUT = $OutputPath
$process = Start-Process -FilePath $UnrealEditor -ArgumentList @($ProjectPath, "-ExecutePythonScript=$PythonScript", '-unattended', '-nop4', '-nosplash') -Wait -PassThru -WindowStyle Hidden
if ($process.ExitCode -eq 0) {
  Set-PngOpaque -Path $OutputPath
}
exit $process.ExitCode
