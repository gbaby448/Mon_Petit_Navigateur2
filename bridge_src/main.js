const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 450,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-migration', (event) => {
    // 1. Télécharger le nouvel installeur Tauri (v2.0.0) depuis le dépôt GitHub ou un lien générique.
    // Pour cet exemple, on suppose que l'installeur Domus_v2_setup.exe sera téléchargé
    const installerUrl = 'https://github.com/gbaby448/Domus_Browser/releases/download/v2.0.0/Domus_Browser_2.0.0_x64_en-US.msi';
    const downloadPath = path.join(app.getPath('temp'), 'Domus_v2_setup.msi');

    const file = fs.createWriteStream(downloadPath);
    
    // Fonction récursive pour gérer les redirections GitHub
    const downloadFile = (url) => {
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location);
                return;
            }
            
            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progress = Math.round((downloadedBytes / totalBytes) * 100);
                if (mainWindow) {
                    mainWindow.webContents.send('download-progress', progress);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                if (mainWindow) {
                    mainWindow.webContents.send('download-complete');
                }
                
                // 2. Lancer l'installeur
                setTimeout(() => {
                    exec(`"${downloadPath}"`, (err) => {
                        if (err) console.error("Erreur de lancement de l'installeur:", err);
                        // 3. Fermer le bridge
                        app.quit();
                    });
                }, 1000);
            });
        }).on('error', (err) => {
            fs.unlink(downloadPath, () => {}); // Supprime le fichier partiel
            if (mainWindow) {
                mainWindow.webContents.send('download-error', err.message);
            }
        });
    };

    downloadFile(installerUrl);
});
