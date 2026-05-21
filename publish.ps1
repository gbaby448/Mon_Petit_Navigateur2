# =============================================================================
# Domus Browser Pro — Script de publication automatique GitHub Release
# Usage : .\publish.ps1
# Prérequis : GitHub CLI installé (gh) + authentifié (gh auth login)
# =============================================================================

$ErrorActionPreference = "Stop"

# --- Lire la version depuis package.json ---
$pkg = Get-Content "package.json" | ConvertFrom-Json
$version = $pkg.version
$tag = "v$version"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Domus Browser Pro — Publication v$version" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# --- Étape 1 : Compiler les binaires .jsc ---
Write-Host "[1/5] Compilation des binaires V8 bytecode..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Compilation échouée." -ForegroundColor Red; exit 1 }
Write-Host "      OK - main.jsc, preload.jsc, security.jsc générés." -ForegroundColor Green

# --- Étape 2 : Build de l'installeur ---
Write-Host "[2/5] Build de l'installeur Windows..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Build échoué." -ForegroundColor Red; exit 1 }
$installer = "dist\DomusPro Setup $version.exe"
if (-not (Test-Path $installer)) { Write-Host "ERREUR : Installeur introuvable : $installer" -ForegroundColor Red; exit 1 }
Write-Host "      OK - $installer" -ForegroundColor Green

# --- Étape 3 : Commit et tag Git ---
Write-Host "[3/5] Commit et tag Git..." -ForegroundColor Yellow
git add -A
git commit -m "release: Domus Browser Pro v$version" 2>$null
git tag $tag 2>$null
git push origin main --tags
Write-Host "      OK - Tag $tag poussé sur GitHub." -ForegroundColor Green

# --- Étape 4 : Créer la GitHub Release et uploader les assets ---
Write-Host "[4/5] Création de la GitHub Release $tag..." -ForegroundColor Yellow

$jscPath  = "src\main.jsc"
$notesFile = "RELEASE_NOTES.md"

# Notes de release par défaut si le fichier n'existe pas
if (-not (Test-Path $notesFile)) {
    "## Domus Browser Pro $version`n`nMise à jour automatique via le système de mise à jour intégré." | Out-File $notesFile -Encoding utf8
}

gh release create $tag `
    "$installer" `
    "$jscPath" `
    --title "Domus Browser Pro $version" `
    --notes-file $notesFile

if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR : Création de la release GitHub échouée." -ForegroundColor Red; exit 1 }
Write-Host "      OK - Release $tag publiée avec main.jsc + installeur." -ForegroundColor Green

# --- Étape 5 : Résumé ---
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Publication terminée avec succès !" -ForegroundColor Green
Write-Host "  Version : $version" -ForegroundColor Green
Write-Host "  Release : https://github.com/gbaby448/Mon_Petit_Navigateur2/releases/tag/$tag" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Les utilisateurs recevront la mise à jour automatiquement au prochain démarrage." -ForegroundColor Cyan
