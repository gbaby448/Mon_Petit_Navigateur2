const { net, app } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Domus Cloud Updater - Pro Engine
 * Gère les mises à jour silencieuses du bytecode (.jsc)
 */

// URL de distribution (GitHub / S3 / VPS). Pour l'instant on reste en local pour tes tests ROG.
const UPDATE_URL = "http://localhost:3000/check"; 
const VERSION_FILE = path.join(__dirname, 'version.json');

class DomusUpdater {
    constructor(mainWindow) {
        this.win = mainWindow;
        this.isChecking = false;
    }

    async checkForUpdates() {
        if (this.isChecking) return;
        this.isChecking = true;

        console.log("[UPDATER] Vérification des mises à jour...");
        
        return new Promise((resolve) => {
            const req = net.request(UPDATE_URL);
            
            req.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        const remote = JSON.parse(data);
                        const localVersion = app.getVersion();
                        
                        if (this.isNewer(remote.version, localVersion)) {
                            console.log(`[UPDATER] Nouvelle version détectée : ${remote.version}`);
                            this.downloadUpdate(remote.url);
                        } else {
                            console.log("[UPDATER] Domus est à jour.");
                        }
                    } catch (e) {
                        console.error("[UPDATER] Erreur lors de l'analyse du fichier de version.");
                    }
                    this.isChecking = false;
                    resolve();
                });
            });

            req.on('error', (err) => {
                console.error("[UPDATER] Serveur de mise à jour injoignable.");
                this.isChecking = false;
                resolve();
            });
            
            req.end();
        });
    }

    isNewer(remote, local) {
        const r = remote.split('.').map(Number);
        const l = local.split('.').map(Number);
        for (let i = 0; i < 4; i++) {
            if (r[i] > l[i]) return true;
            if (r[i] < l[i]) return false;
        }
        return false;
    }

    downloadUpdate(url) {
        const dest = path.join(__dirname, 'main.jsc.update');
        const req = net.request(url);
        
        req.on('response', (response) => {
            const fileStream = fs.createWriteStream(dest);
            response.on('data', (chunk) => {
                fileStream.write(chunk);
            });
            response.on('end', () => {
                fileStream.end();
                console.log("[UPDATER] Mise à jour téléchargée. Elle sera appliquée au prochain démarrage.");
                if (this.win && !this.win.isDestroyed()) {
                    this.win.webContents.send('show-float-toast', "🚀 Mise à jour Domus prête ! Redémarrez pour l'appliquer.");
                }
            });
        });
        
        req.on('error', (err) => {
            console.error("[UPDATER] Échec du téléchargement.");
        });
        
        req.end();
    }
}

module.exports = DomusUpdater;
