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
const updatePath = path.join(__dirname, 'main.jsc.update');
if (fs.existsSync(updatePath)) {
    try {
        console.log("[DOMUS] Application d'une mise à jour système...");
        if (fs.existsSync(mainJscPath)) fs.unlinkSync(mainJscPath);
        fs.renameSync(updatePath, mainJscPath);
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
