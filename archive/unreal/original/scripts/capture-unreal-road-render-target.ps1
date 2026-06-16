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

function Invoke-ParisSkyClipTone {
  param([Parameter(Mandatory = $true)][string]$Path)

  if ([System.IO.Path]::GetExtension($Path).ToLowerInvariant() -ne '.png') {
    return
  }
  if (-not (Test-Path $Path)) {
    throw "PNG output not found: $Path"
  }

  Add-Type -AssemblyName System.Drawing
  if (-not ('ParisSkyClipToner' -as [type])) {
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class ParisSkyClipToner
{
    private static double SmoothStep(double value)
    {
        if (value <= 0.0) return 0.0;
        if (value >= 1.0) return 1.0;
        return value * value * (3.0 - 2.0 * value);
    }

    private static byte ClampByte(double value)
    {
        if (value <= 0.0) return 0;
        if (value >= 255.0) return 255;
        return (byte)Math.Round(value);
    }

    public static long[] Tone(string path)
    {
        var tempPath = path + ".paris-sky-tone.tmp";
        long affected = 0;
        long capped = 0;

        using (var source = new Bitmap(path))
        using (var rgb = source.Clone(new Rectangle(0, 0, source.Width, source.Height), PixelFormat.Format24bppRgb))
        {
            var rect = new Rectangle(0, 0, rgb.Width, rgb.Height);
            BitmapData data = null;
            try
            {
                data = rgb.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb);
                var stride = Math.Abs(data.Stride);
                var bytes = new byte[stride * rgb.Height];
                Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

                var widthMax = Math.Max(1.0, rgb.Width - 1.0);
                var heightMax = Math.Max(1.0, rgb.Height - 1.0);

                for (var y = 0; y < rgb.Height; y++)
                {
                    var yn = y / heightMax;
                    var yMask = SmoothStep((0.42 - yn) / 0.24);
                    if (yMask <= 0.0) continue;
                    var row = y * stride;

                    for (var x = 0; x < rgb.Width; x++)
                    {
                        var xn = x / widthMax;
                        var xMask = SmoothStep((xn - 0.32) / 0.48);
                        if (xMask <= 0.0) continue;

                        var index = row + x * 3;
                        var b = bytes[index + 0];
                        var g = bytes[index + 1];
                        var r = bytes[index + 2];
                        var max = Math.Max(r, Math.Max(g, b));
                        var min = Math.Min(r, Math.Min(g, b));
                        var chroma = max - min;
                        var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        if (luma < 206.0 || chroma > 48) continue;

                        var brightMask = SmoothStep((luma - 206.0) / 50.0);
                        var mask = xMask * yMask * brightMask;
                        if (mask <= 0.015) continue;

                        var cloudVariation = 1.0
                            + 0.040 * Math.Sin((x * 0.010) + (y * 0.009))
                            + 0.026 * Math.Sin((x * 0.027) - (y * 0.015))
                            + 0.014 * Math.Sin((x * 0.055) + (y * 0.021));
                        var compressedLuma = Math.Min(
                            236.0,
                            Math.Max(146.0, (146.0 + Math.Min(86.0, Math.Max(0.0, (luma - 206.0) * 1.25))) * cloudVariation)
                        );
                        var targetR = compressedLuma * 0.95;
                        var targetG = compressedLuma * 0.99;
                        var targetB = Math.Min(242.0, compressedLuma * 1.02);
                        var blend = Math.Min(0.72, mask * 0.82);

                        var outR = r * (1.0 - blend) + targetR * blend;
                        var outG = g * (1.0 - blend) + targetG * blend;
                        var outB = b * (1.0 - blend) + targetB * blend;

                        var maxAllowed = 255.0 - (15.0 * SmoothStep(mask));
                        if (outR > maxAllowed) { outR = maxAllowed; capped++; }
                        if (outG > maxAllowed) { outG = maxAllowed; capped++; }
                        if (outB > maxAllowed) { outB = maxAllowed; capped++; }

                        bytes[index + 0] = ClampByte(outB);
                        bytes[index + 1] = ClampByte(outG);
                        bytes[index + 2] = ClampByte(outR);
                        affected++;
                    }
                }

                Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
            }
            finally
            {
                if (data != null) rgb.UnlockBits(data);
            }

            rgb.Save(tempPath, ImageFormat.Png);
        }

        File.Delete(path);
        File.Move(tempPath, path);
        return new long[] { affected, capped };
    }
}
'@
  }

  $result = [ParisSkyClipToner]::Tone($Path)
  Write-Host "ROAD_ONLY_RENDER_TARGET_PARIS_SKY_TONE output=$Path affected_pixels=$($result[0]) capped_channels=$($result[1])"
}

$env:SMART_INTERSECTION_CITY = $Profile
$env:SMART_INTERSECTION_PROOF_VIEW = $View
$env:SMART_INTERSECTION_PROOF_OUTPUT = $OutputPath
$process = Start-Process -FilePath $UnrealEditor -ArgumentList @($ProjectPath, "-ExecutePythonScript=$PythonScript", '-unattended', '-nop4', '-nosplash') -Wait -PassThru -WindowStyle Hidden
if ($process.ExitCode -eq 0) {
  Set-PngOpaque -Path $OutputPath
  if ($Profile -eq 'paris' -and $View -eq 'lit_oblique') {
    Invoke-ParisSkyClipTone -Path $OutputPath
  }
}
exit $process.ExitCode
