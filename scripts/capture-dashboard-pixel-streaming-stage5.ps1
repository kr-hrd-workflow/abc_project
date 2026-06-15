param(
  [string]$DashboardUrl = 'http://127.0.0.1:3000/dashboard',
  [string]$StreamUrl = 'http://127.0.0.1',
  [string]$ScreenshotPath = 'artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png',
  [string]$DetailsPath = 'artifacts/unreal-operator-map-stage5-dashboard-stream-details.json',
  [string]$ManifestPath = 'renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage5_pixel_streaming_manifest.json'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

$env:STAGE5_DASHBOARD_URL = $DashboardUrl
$env:STAGE5_STREAM_URL = $StreamUrl
$env:STAGE5_SCREENSHOT_PATH = $ScreenshotPath
$env:STAGE5_DETAILS_PATH = $DetailsPath
$env:STAGE5_MANIFEST_PATH = $ManifestPath

node scripts/capture-dashboard-pixel-streaming-stage5.mjs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Output "Stage 5 dashboard proof captured: $ScreenshotPath"
Write-Output "Stage 5 dashboard details captured: $DetailsPath"
Write-Output "Stage 5 Pixel Streaming manifest captured: $ManifestPath"
