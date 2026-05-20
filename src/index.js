const path = require('path');
const fs = require('fs');

/**
 * Domus Secure Entry Point
 */

// Initialisation du Loader de Bytecode
require('./loader');

const mainJsPath = path.join(__dirname, 'main.js');
const mainJscPath = path.join(__dirname, 'main.jsc');

// 🔄 GESTION DES MISES À JOUR ATOMIQUES (SWAP)
// Lecture depuis le dossier de staging AppData (toujours accessible en écriture)
const UPDATE_STAGING_DIR = path.join(
    process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
    'DomusPro'
);
const updatePath     = path.join(UPDATE_STAGING_DIR, 'main.jsc.update');
const updateFlagPath = path.join(UPDATE_STAGING_DIR, 'just-updated.flag');


if (fs.existsSync(updatePath)) {
    try {
        console.log("[DOMUS] Application d'une mise à jour système...");
        if (fs.existsSync(mainJscPath)) fs.unlinkSync(mainJscPath);
        fs.renameSync(updatePath, mainJscPath);
        // 🏁 Écrire le drapeau "vient d'être mis à jour" pour afficher le toast au démarrage
        fs.writeFileSync(updateFlagPath, JSON.stringify({ updatedAt: new Date().toISOString() }));
        console.log("[DOMUS] Mise à jour installée avec succès.");
    } catch (err) {
        console.error("[DOMUS] Échec de l'application de la mise à jour :", err.message);
    }
}

if (fs.existsSync(mainJscPath)) {
    // Mode Production : On charge le binaire
    console.log("[DOMUS] Démarrage en mode BLINDÉ (Production)");
    try {
        require('./main.jsc');
    } catch (err) {
        const errorLog = path.join(require('os').homedir(), 'domus-error.log');
        fs.writeFileSync(errorLog, `[CRITICAL ERROR] ${new Date().toISOString()}\n${err.stack}\n`);
        process.exit(1);
    }
} else {
    // Mode Développement : On charge le JS clair
    console.log("[DOMUS] Démarrage en mode SOURCE (Développement)");
    require('./main.js');
}
