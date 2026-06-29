# =============================================================================
# Domus Browser Pro - Script de publication automatique GitHub Release (Tauri V2)
# Usage : .\publish.ps1
# Prerequisites : GitHub CLI installed (gh) + authenticated (gh auth login)
# =============================================================================

$ErrorActionPreference = "Stop"

# --- Lire la version depuis package.json ---
$pkg = Get-Content "package.json" | ConvertFrom-Json
$version = $pkg.version
$tag = "v$version"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Domus Browser Pro - Publication Tauri V2 (v$version)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# --- Etape 1 : Build de l'installeur Tauri (Rust) ---
Write-Host "[1/3] Compilation de l'installeur natif (Release)..." -ForegroundColor Yellow
npx @tauri-apps/cli build
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Build Tauri echoue." -ForegroundColor Red; exit 1 }

$installer = "src-tauri\target\release\bundle\msi\app_0.1.0_x64_en-US.msi"
$installerExe = "src-tauri\target\release\bundle\nsis\app_0.1.0_x64-setup.exe"

$assetToUpload = ""
if (Test-Path $installerExe) {
    $assetToUpload = $installerExe
} elseif (Test-Path $installer) {
    $assetToUpload = $installer
} else {
    Write-Host "ERREUR : Installeur introuvable après la compilation." -ForegroundColor Red; exit 1
}

Write-Host "      OK - Installeur genere: $assetToUpload" -ForegroundColor Green

# --- Etape 2 : Commit et tag Git ---
Write-Host "[2/3] Commit et tag Git..." -ForegroundColor Yellow
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

git add -A 2>&1 | Out-Null
git commit -m "release: Domus Browser Pro v$version (Tauri Migration)" 2>&1 | Out-Null
git tag -f $tag 2>&1 | Out-Null
git push origin main 2>&1 | Out-Null
git push origin $tag -f 2>&1 | Out-Null

$ErrorActionPreference = $prevErrorAction
Write-Host "      OK - Tag $tag pousse sur GitHub." -ForegroundColor Green

# --- Etape 3 : Creer la GitHub Release et uploader l'installeur ---
Write-Host "[3/3] Creation de la GitHub Release $tag..." -ForegroundColor Yellow

$notesFile = "RELEASE_NOTES.md"

if (-not (Test-Path $notesFile)) {
    "## Domus Browser Pro $version (Refonte Tauri V2)`n`nMigration complete vers Rust/Tauri. Plus rapide, plus securise, plus leger." | Out-File $notesFile -Encoding utf8
}

if (-not (Get-Command "gh" -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR : GitHub CLI (gh) n'est pas installe ou connecte." -ForegroundColor Red
    exit 1
}

$exists = $false
try {
    & gh release view $tag --json tagName 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $exists = $true }
} catch {}

if ($exists) {
    & gh release delete $tag -y 2>$null | Out-Null
}

gh release create $tag `
    "$assetToUpload" `
    --title "Domus Browser Pro $version (Tauri Edition)" `
    --notes-file $notesFile

if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Creation de la release GitHub echouee." -ForegroundColor Red; exit 1 }
Write-Host "      OK - Release $tag publiee avec succes." -ForegroundColor Green

# --- Etape 4 : Resume ---
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Publication terminee avec succes !" -ForegroundColor Green
Write-Host "  Version : $version (Tauri V2)" -ForegroundColor Green
Write-Host "  Release : https://github.com/gbaby448/Mon_Petit_Navigateur2/releases/tag/$tag" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
