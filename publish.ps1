# =============================================================================
# Domus Browser Pro - Script de publication automatique GitHub Release
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
Write-Host "  Domus Browser Pro - Publication v$version" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# --- Etape 1 : Compiler les binaires .jsc ---
Write-Host "[1/5] Compilation des binaires V8 bytecode..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Compilation echouee." -ForegroundColor Red; exit 1 }
Write-Host "      OK - main.jsc, preload.jsc, security.jsc generes." -ForegroundColor Green

# --- Etape 2 : Build de l'installeur ---
Write-Host "[2/5] Build de l'installeur Windows..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Build echoue." -ForegroundColor Red; exit 1 }
$installer = "dist\DomusPro Setup $version.exe"
if (-not (Test-Path $installer)) { Write-Host "ERREUR : Installeur introuvable : $installer" -ForegroundColor Red; exit 1 }
Write-Host "      OK - $installer" -ForegroundColor Green

# --- Etape 3 : Commit et tag Git ---
Write-Host "[3/5] Commit et tag Git..." -ForegroundColor Yellow
git add -A
git commit -m "release: Domus Browser Pro v$version" 2>$null
git tag $tag 2>$null
git push origin main --tags
Write-Host "      OK - Tag $tag pousse sur GitHub." -ForegroundColor Green

# --- Etape 4 : Creer la GitHub Release et uploader les assets ---
Write-Host "[4/5] Creation de la GitHub Release $tag..." -ForegroundColor Yellow

$jscPath  = "src\main.jsc"
$notesFile = "RELEASE_NOTES.md"

# Notes de release par defaut si le fichier n'existe pas
if (-not (Test-Path $notesFile)) {
    "## Domus Browser Pro $version`n`nMise a jour automatique via le systeme de mise a jour integre." | Out-File $notesFile -Encoding utf8
}

gh release create $tag `
    "$installer" `
    "$jscPath" `
    --title "Domus Browser Pro $version" `
    --notes-file $notesFile

if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Creation de la release GitHub echouee." -ForegroundColor Red; exit 1 }
Write-Host "      OK - Release $tag publiee avec main.jsc + installeur." -ForegroundColor Green

# --- Etape 5 : Resume ---
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Publication terminee avec succes !" -ForegroundColor Green
Write-Host "  Version : $version" -ForegroundColor Green
Write-Host "  Release : https://github.com/gbaby448/Mon_Petit_Navigateur2/releases/tag/$tag" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Les utilisateurs recevront la mise a jour automatiquement au prochain demarrage." -ForegroundColor Cyan
