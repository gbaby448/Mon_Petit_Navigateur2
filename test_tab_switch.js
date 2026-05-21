const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;
app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 800, height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src', 'preload.js')
        }
    });
    
    // Fake the main logic just for testing renderer
    let tabs = new Map();
    let activeTabId = null;
    
    ipcMain.on('new-tab', (e, data) => {
        const id = Date.now().toString();
        const url = data?.url || 'domus://settings';
        tabs.set(id, { id, url, active: true });
        activeTabId = id;
        win.webContents.send('tab-created', { id, url, active: true });
    });
    
    ipcMain.on('switch-tab', (e, id) => {
        console.log("[TEST] Received switch-tab for ID:", id);
        activeTabId = id;
        win.webContents.send('tab-switched', id);
    });
    
    ipcMain.on('close-tab', (e, id) => {
        console.log("[TEST] Received close-tab for ID:", id);
        tabs.delete(id);
        win.webContents.send('tab-closed', id);
    });
    
    win.webContents.on('console-message', (e, level, msg) => {
        console.log("[RENDERER]", msg);
    });
    
    win.loadFile('src/index.html');
    
    win.webContents.on('did-finish-load', () => {
        console.log("[TEST] Window loaded. Creating Tab A...");
        win.webContents.send('tab-created', { id: 'tabA', url: 'domus://settings', active: true });
        
        setTimeout(() => {
            console.log("[TEST] Creating Tab B...");
            win.webContents.send('tab-created', { id: 'tabB', url: 'domus://settings', active: true });
            
            setTimeout(() => {
                console.log("[TEST] Simulating click on Tab A...");
                win.webContents.executeJavaScript(`
                    console.log("Clicking Tab A...");
                    document.getElementById('ui-tabA').click();
                `);
                
                setTimeout(() => {
                    console.log("[TEST] Shutting down.");
                    app.quit();
                }, 2000);
            }, 2000);
        }, 2000);
    });
});
