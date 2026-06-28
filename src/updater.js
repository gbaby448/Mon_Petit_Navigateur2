const { net, app } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * ============================================================
 *  DOMUS CLOUD UPDATER - GitHub Releases Engine v1.0
 *  Mise à jour silencieuse et atomique via GitHub Releases API
 * ============================================================
 */

const GITHUB_OWNER  = 'gbaby448';
const GITHUB_REPO   = 'Mon_Petit_Navigateur2';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// ✅ Dossier de staging toujours accessible en écriture (AppData/Roaming)
const UPDATE_STAGING_DIR = path.join(
    process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
    'DomusPro'
);

// S'assurer que le dossier de staging existe
if (!require('fs').existsSync(UPDATE_STAGING_DIR)) {
    require('fs').mkdirSync(UPDATE_STAGING_DIR, { recursive: true });
}


class DomusUpdater {
    constructor(mainWindow, appVersion) {
        this.win = mainWindow;
        this.appVersion = appVersion || app.getVersion();
        this.isChecking = false;
        this.updateReady = false;
    }

    /**
     * Compare deux versions sémantiques "x.y.z".
     * Retourne true si `remote` est plus récent que `local`.
     */
    isNewer(remote, local) {
        const clean = v => v.replace(/^v/i, '').split('.').map(Number);
        const r = clean(remote);
        const l = clean(local);
        for (let i = 0; i < Math.max(r.length, l.length); i++) {
            const rv = r[i] || 0, lv = l[i] || 0;
            if (rv > lv) return true;
            if (rv < lv) return false;
        }
        return false;
    }

    /**
     * Interroge l'API GitHub Releases pour obtenir la dernière version.
     * Retourne un objet { upToDate, newVersion, downloadUrl } ou { error }.
     */
    async checkForUpdates() {
        if (this.isChecking) return { status: 'busy' };
        this.isChecking = true;

        console.log('[DOMUS Updater] Vérification des mises à jour via GitHub...');

        return new Promise((resolve) => {
            const req = net.request({
                url: GITHUB_API_URL,
                headers: {
                    'User-Agent': `DomusBrowser/${this.appVersion}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            let body = '';

            req.on('response', (response) => {
                response.on('data', (chunk) => { body += chunk.toString(); });
                response.on('end', () => {
                    this.isChecking = false;
                    try {
                        const release = JSON.parse(body);

                        if (!release.tag_name) {
                            console.warn('[DOMUS Updater] Réponse GitHub invalide ou aucune release trouvée.');
                            return resolve({ status: 'error', message: 'Aucune release trouvée sur GitHub.' });
                        }

                        const remoteVersion = release.tag_name.replace(/^v/i, '');
                        const localVersion  = this.appVersion;

                        console.log(`[DOMUS Updater] Local: v${localVersion} | Distant: v${remoteVersion}`);

                        if (!this.isNewer(remoteVersion, localVersion)) {
                            console.log('[DOMUS Updater] Domus est déjà à jour. ✅');
                            return resolve({ status: 'up-to-date', version: localVersion });
                        }

                        // Chercher l'archive complète app.asar d'abord, puis main.jsc en secours
                        let asset = (release.assets || []).find(a => a.name === 'app.asar');
                        let isAsar = true;
                        
                        if (!asset) {
                            asset = (release.assets || []).find(a => a.name === 'main.jsc');
                            isAsar = false;
                        }

                        if (!asset) {
                            console.warn('[DOMUS Updater] La release GitHub ne contient ni app.asar ni main.jsc.');
                            return resolve({ status: 'error', message: 'Fichier de mise à jour absent de la release GitHub.' });
                        }

                        console.log(`[DOMUS Updater] Nouvelle version v${remoteVersion} disponible ! Téléchargement de ${asset.name}...`);

                        // Notifier l'UI que le téléchargement commence
                        this._sendToast(`⬇️ Mise à jour v${remoteVersion} en cours de téléchargement...`);

                        const destPath = isAsar ? 
                            path.join(UPDATE_STAGING_DIR, 'app.asar.update') : 
                            path.join(UPDATE_STAGING_DIR, 'main.jsc.update');

                        this._download(asset.browser_download_url, remoteVersion, destPath, resolve);

                    } catch (e) {
                        console.error('[DOMUS Updater] Erreur de parsing JSON GitHub :', e.message);
                        resolve({ status: 'error', message: 'Réponse GitHub illisible.' });
                    }
                });
            });

            req.on('error', (err) => {
                this.isChecking = false;
                console.error('[DOMUS Updater] Serveur GitHub injoignable :', err.message);
                resolve({ status: 'error', message: 'Impossible de contacter GitHub. Vérifiez votre connexion.' });
            });

            req.end();
        });
    }

    /**
     * Télécharge le binaire de mise à jour depuis GitHub Releases.
     */
    _download(url, newVersion, destPath, resolve) {
        const req = net.request({ url, headers: { 'User-Agent': `DomusBrowser/${this.appVersion}` } });

        req.on('response', (response) => {
            // GitHub redirige vers son CDN - gérer la redirection manuellement si nécessaire
            if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307 || response.statusCode === 308) {
                const redirectUrl = response.headers['location'];
                if (redirectUrl) return this._downloadDirect(redirectUrl, newVersion, destPath, resolve);
            }

            if (response.statusCode !== 200) {
                return resolve({ status: 'error', message: `Erreur HTTP ${response.statusCode}` });
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                try {
                    fs.writeFileSync(destPath, Buffer.concat(chunks));
                    
                    const metadataPath = path.join(UPDATE_STAGING_DIR, 'metadata.json.update');
                    fs.writeFileSync(metadataPath, JSON.stringify({ version: newVersion }));

                    this.updateReady = true;
                    console.log(`[DOMUS Updater] ✅ Mise à jour v${newVersion} téléchargée. Redémarrez pour l'appliquer.`);
                    this._sendToast(`🚀 Mise à jour v${newVersion} prête ! Redémarrez Domus pour l'appliquer.`);
                    resolve({ status: 'downloaded', version: newVersion });
                } catch (e) {
                    console.error('[DOMUS Updater] Impossible d\'écrire le fichier de mise à jour :', e.message);
                    resolve({ status: 'error', message: 'Échec de l\'écriture de la mise à jour.' });
                }
            });
        });

        req.on('error', (err) => {
            console.error('[DOMUS Updater] Échec du téléchargement :', err.message);
            resolve({ status: 'error', message: 'Échec du téléchargement de la mise à jour.' });
        });

        req.end();
    }

    /**
     * Téléchargement direct depuis une URL CDN (après redirection GitHub).
     */
    _downloadDirect(url, newVersion, destPath, resolve) {
        const https = require('https');
        const http = url.startsWith('http:') ? require('http') : require('https');
        
        const req = http.get(url, { headers: { 'User-Agent': `DomusBrowser/${this.appVersion}` } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                const redirectUrl = res.headers['location'];
                if (redirectUrl) return this._downloadDirect(redirectUrl, newVersion, destPath, resolve);
            }
            
            if (res.statusCode !== 200) {
                return resolve({ status: 'error', message: `Erreur CDN HTTP ${res.statusCode}` });
            }

            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    try {
                        const metadataPath = path.join(UPDATE_STAGING_DIR, 'metadata.json.update');
                        fs.writeFileSync(metadataPath, JSON.stringify({ version: newVersion }));
                    } catch (err) {
                        console.error('[DOMUS Updater] Impossible d\'écrire les métadonnées :', err.message);
                    }
                    this.updateReady = true;
                    console.log(`[DOMUS Updater] ✅ Mise à jour v${newVersion} téléchargée. Redémarrez pour l'appliquer.`);
                    this._sendToast(`🚀 Mise à jour v${newVersion} prête ! Redémarrez Domus pour l'appliquer.`);
                    resolve({ status: 'downloaded', version: newVersion });
                });
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            console.error('[DOMUS Updater] Erreur CDN :', err.message);
            resolve({ status: 'error', message: 'Erreur lors du téléchargement CDN.' });
        });
    }

    /**
     * Envoie une notification toast à la fenêtre principale.
     */
    _sendToast(msg) {
        if (this.win && !this.win.isDestroyed()) {
            this.win.webContents.send('show-float-toast', msg);
        }
    }
}

module.exports = DomusUpdater;
