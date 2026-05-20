const fs = require('fs');
const path = require('path');
const vm = require('vm');
const v8 = require('v8');

/**
 * Script de Blindage Domus
 * Transforme les fichiers .js en .jsc (Bytecode V8)
 */

function compileFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // On enveloppe le code pour qu'il soit compatible avec le chargement CommonJS
    const wrappedCode = `(function (exports, require, module, __filename, __dirname) { ${code}\n});`;
    
    const script = new vm.Script(wrappedCode, { produceCachedData: true });
    const bytecode = script.createCachedData();
    
    const targetPath = filePath + 'c'; // .jsc
    fs.writeFileSync(targetPath, bytecode);
    
    console.log(`[BLINDAGE] ${path.basename(filePath)} -> ${path.basename(targetPath)} [OK]`);
}

const filesToProtect = [
    path.join(__dirname, 'src/main.js'),
    path.join(__dirname, 'src/security.js'),
    path.join(__dirname, 'src/preload.js')
];

console.log("--- Lancement du Blindage Domus Pro ---");
filesToProtect.forEach(f => {
    if (fs.existsSync(f)) compileFile(f);
    else console.error(`Erreur : Fichier non trouvé ${f}`);
});
console.log("--- Blindage Terminé. Supprimez les fichiers .js originaux avant distribution. ---");
