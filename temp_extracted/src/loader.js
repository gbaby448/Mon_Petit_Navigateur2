const fs = require('fs');
const vm = require('vm');
const v8 = require('v8');
const path = require('path');
const Module = require('module');

/**
 * Domus Bytecode Loader
 * Permet d'importer des fichiers .jsc
 */

v8.setFlagsFromString('--no-lazy'); // Nécessaire pour le bytecode

// 🛡️ HOOK DE RÉSOLUTION : Permet à require('./file') de trouver 'file.jsc' si 'file.js' est absent
const oldResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
    try {
        return oldResolveFilename.apply(this, arguments);
    } catch (err) {
        if (request.startsWith('.') && !request.endsWith('.jsc')) {
            try {
                const newRequest = request + '.jsc';
                return oldResolveFilename.apply(this, [newRequest, parent, isMain, options]);
            } catch (err2) {
                // Échec silencieux pour l'extension .jsc, on lève l'erreur originale
            }
        }
        throw err;
    }
};

function loadBytecode(filePath) {
    const fullBuffer = fs.readFileSync(filePath);
    const sourceLength = fullBuffer.readUInt32LE(0);
    const bytecode = fullBuffer.slice(4);
    
    const dummyCode = ' '.repeat(sourceLength); 
    const script = new vm.Script(dummyCode, { cachedData: bytecode });
    
    if (script.cachedDataRejected) {
        throw new Error(`[LOADER] Le bytecode de ${path.basename(filePath)} est invalide ou incompatible avec cette version de Domus.`);
    }
    
    return script.runInThisContext();
}

// Extension du système 'require' de Node pour supporter .jsc
require.extensions['.jsc'] = function(m, filename) {
    const fn = loadBytecode(filename);
    
    // On crée un 'require' lié au module en cours de chargement
    // pour que les chemins relatifs soient corrects.
    const requireProxy = function(id) {
        return m.require(id);
    };
    
    // On expose également les propriétés du require standard
    requireProxy.resolve = (id) => Module._resolveFilename(id, m);
    requireProxy.main = process.mainModule;
    requireProxy.extensions = require.extensions;
    requireProxy.cache = require.cache;

    fn(m.exports, requireProxy, m, filename, path.dirname(filename));
};

console.log("[DOMUS] Loader de Bytecode Actif.");
module.exports = { loadBytecode };
