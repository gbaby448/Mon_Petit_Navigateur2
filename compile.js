const fs = require('fs');
const path = require('path');
const vm = require('vm');
const v8 = require('v8');

/**
 * Domus Pro - Bytecode Compiler
 * Transforme le code source JS en binaire V8 (JSC)
 */

v8.setFlagsFromString('--no-lazy');

function compileFile(srcPath) {
    console.log(`[COMPILER] Compilation de ${path.basename(srcPath)}...`);
    
    const code = fs.readFileSync(srcPath, 'utf8');
    
    // Wrapper Node.js standard pour que le bytecode soit compatible avec 'require'
    const wrapper = [
        '(function (exports, require, module, __filename, __dirname) { ',
        '\n});'
    ];
    const wrappedCode = wrapper[0] + code + wrapper[1];
    
    const script = new vm.Script(wrappedCode, { produceCachedData: true });
    const bytecode = script.cachedData;
    
    if (!bytecode) {
        throw new Error("Échec de la génération du bytecode.");
    }

    // On ajoute un header de 4 octets pour stocker la longueur du code source original
    // V8 a besoin que la longueur du "dummy code" corresponde à la longueur originale.
    const header = Buffer.alloc(4);
    header.writeUInt32LE(wrappedCode.length, 0);
    const finalBuffer = Buffer.concat([header, bytecode]);
    
    const destPath = srcPath.replace('.js', '.jsc');
    fs.writeFileSync(destPath, finalBuffer);
    console.log(`[COMPILER] Terminé : ${path.basename(destPath)} (${(finalBuffer.length / 1024).toFixed(1)} Ko)`);
}

// Compilation des fichiers coeur
try {
    const srcDir = path.join(__dirname, 'src');
    compileFile(path.join(srcDir, 'main.js'));
    compileFile(path.join(srcDir, 'security.js'));
    compileFile(path.join(srcDir, 'preload.js'));
    
    console.log("\n[DOMUS] BRAVO ! Votre navigateur est maintenant prêt pour la distribution.");
    console.log("[DOMUS] Pour tester le mode binaire, supprimez 'main.js' ou renommez-le.");
    console.log("[DOMUS] 'index.js' chargera automatiquement 'main.jsc' s'il est présent.");
    process.exit(0);
} catch (err) {
    console.error("[COMPILER] Erreur critique :", err.message);
    process.exit(1);
}
