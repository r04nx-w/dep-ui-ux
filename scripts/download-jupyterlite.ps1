# DEP Workbench - JupyterLite Download and Setup Script
# Run from the dep-ui-ux directory:
#   powershell -ExecutionPolicy Bypass -File scripts/download-jupyterlite.ps1

$ErrorActionPreference = "Stop"
$DEST = "public\jupyterlite"
$RELEASE_URL = "https://github.com/jupyterlite/demo/releases/download/v0.4.3/jupyterlite-demo.tar.gz"
$ARCHIVE = "jupyterlite-demo.tar.gz"

Write-Host "DEP Workbench - JupyterLite Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Step 1: Download archive
Write-Host "[1/4] Downloading JupyterLite demo release..." -ForegroundColor Yellow
if (!(Test-Path $ARCHIVE)) {
    Invoke-WebRequest -Uri $RELEASE_URL -OutFile $ARCHIVE -UseBasicParsing
    Write-Host "      OK: Downloaded $ARCHIVE" -ForegroundColor Green
} else {
    Write-Host "      OK: Archive already exists, skipping download" -ForegroundColor Green
}

# Step 2: Back up our custom DEP config files before extracting
Write-Host "[2/4] Backing up DEP custom config files..." -ForegroundColor Yellow
$customFiles = @(
    "jupyter-lite.json",
    "overrides.json",
    "files\dep_startup.py"
)

$backups = @{}
foreach ($f in $customFiles) {
    $fullPath = Join-Path $DEST $f
    if (Test-Path $fullPath) {
        $backups[$f] = Get-Content $fullPath -Raw -Encoding UTF8
        Write-Host "      Saved: $f" -ForegroundColor Green
    }
}

# Step 3: Extract into a temp folder then merge
Write-Host "[3/4] Extracting archive..." -ForegroundColor Yellow
$tempDest = "public\jupyterlite-tmp"
if (Test-Path $tempDest) { Remove-Item -Recurse -Force $tempDest }
New-Item -ItemType Directory -Force -Path $tempDest | Out-Null
tar -xzf $ARCHIVE -C $tempDest

# Find the extracted root (may be wrapped in a subfolder)
$children = Get-ChildItem $tempDest
if ($children.Count -eq 1 -and $children[0].PSIsContainer) {
    $sourceDir = $children[0].FullName
} else {
    $sourceDir = $tempDest
}

if (!(Test-Path $DEST)) { New-Item -ItemType Directory -Force -Path $DEST | Out-Null }
Copy-Item -Recurse -Force "$sourceDir\*" $DEST
Write-Host "      OK: Extracted to $DEST" -ForegroundColor Green

# Step 4: Restore our custom DEP config files
Write-Host "[4/4] Restoring DEP custom config files..." -ForegroundColor Yellow
foreach ($f in $backups.Keys) {
    $fullPath = Join-Path $DEST $f
    $dir = Split-Path $fullPath
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Set-Content -Path $fullPath -Value $backups[$f] -Encoding UTF8
    Write-Host "      Restored: $f" -ForegroundColor Green
}

# Clean up temp files
Remove-Item -Recurse -Force $tempDest
Remove-Item -Force $ARCHIVE

Write-Host ""
Write-Host "SUCCESS: JupyterLite is ready at public/jupyterlite/" -ForegroundColor Green
Write-Host "Access at: http://localhost:3000/jupyterlite/lab/" -ForegroundColor Green
Write-Host ""
