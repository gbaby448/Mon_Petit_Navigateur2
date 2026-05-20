const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * DOMUS UPDATE SERVER (Mock)
 * Ce serveur simule la distribution des mises à jour.
 */

const PORT = 3000;
const VERSION = "0.9.4.5"; // Version supérieure à l'actuelle pour forcer la MAJ

const server = http.createServer((req, res) => {
    console.log(`[SERVER] Requête reçue : ${req.url}`);

    if (req.url === '/check') {
        // Renvoie les infos de la dernière version
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            version: VERSION,
            url: `http://localhost:${PORT}/main.jsc`,
            notes: "Optimisations ROG Master Edition et correctifs de sécurité."
        }));
    } 
    else if (req.url === '/main.jsc') {
        // Sert le fichier de mise à jour (Ici on sert le fichier actuel pour le test)
        const filePath = path.join(__dirname, '..', 'src', 'main.js'); // Simulation avec .js
        if (fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end();
        }
    } 
    else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 SERVEUR DE MAJ DOMUS ACTIF`);
    console.log(`URL : http://localhost:${PORT}/check`);
    console.log(`Prêt pour le test de demain !\n`);
});
