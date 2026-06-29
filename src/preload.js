// --- PRELOAD POLYFILL POUR TAURI V2 ---
// Remplace ipcRenderer (Electron) par window.__TAURI__ (Rust) de manière transparente.

const isSystemPage = window.location.protocol === 'file:' || window.location.protocol === 'domus:' || window.location.protocol === 'tauri:';

// Simulation de ipcRenderer pour le renderer.js
const ipcRenderer = {
    invoke: async (channel, ...args) => {
        try {
            // Mapping des commandes Electron vers Tauri
            if (channel === 'get-settings') return await window.__TAURI__.core.invoke('get_setting', { key: 'global_settings' });
            if (channel === 'save-settings') return await window.__TAURI__.core.invoke('save_setting', { key: 'global_settings', value: JSON.stringify(args[0]) });
            
            // Securité
            if (channel === 'save-password') {
                return await window.__TAURI__.core.invoke('save_secure_credential', { 
                    service: args[0].site, username: args[0].user, password: args[0].pass 
                });
            }
            if (channel === 'delete-password') {
                // Le Backend a besoin de savoir le service et le username, adapter selon besoin
                return; 
            }
            
            console.log(`[Tauri Bridge] Commande invoke non gérée: ${channel}`);
            return null;
        } catch (e) {
            console.error(`[Tauri Bridge] Erreur invoke ${channel}:`, e);
            return null;
        }
    },
    send: (channel, ...args) => {
        try {
            if (channel === 'new-tab') {
                const id = "tab_" + Date.now();
                window.__TAURI__.core.invoke('create_native_tab', { id: id, url: args[0].url || 'https://google.com' });
                // Simuler la création dans l'UI
                window.dispatchEvent(new CustomEvent('domus-tab-created', { detail: { id, url: args[0].url, active: true }}));
                return;
            }
            if (channel === 'switch-tab') {
                window.__TAURI__.core.invoke('switch_native_tab', { id: args[0] });
                return;
            }
            console.log(`[Tauri Bridge] Commande send non gérée: ${channel}`);
        } catch (e) {
            console.error(`[Tauri Bridge] Erreur send ${channel}:`, e);
        }
    },
    on: (channel, callback) => {
        window.addEventListener(`domus-${channel}`, (e) => callback(e, e.detail));
        // Lier également aux événements Tauri natifs si besoin
        if (window.__TAURI__ && window.__TAURI__.event) {
            window.__TAURI__.event.listen(channel, (event) => {
                callback(event, event.payload);
            });
        }
    }
};

if (isSystemPage) {
    // Expose l'API comme avant pour que renderer.js ne se rende compte de rien
    window.domusAPI = {
        getAppVersion: () => "2.0.0-Tauri",
        
        // --- NAVIGATION ---
        navigate: (url) => ipcRenderer.send('navigate-to', url),
        onNavigationUpdate: (callback) => ipcRenderer.on('nav-update', (event, data) => callback(data)),
        goBack: () => ipcRenderer.send('browser-back'),
        goForward: () => ipcRenderer.send('browser-forward'),
        reload: () => ipcRenderer.send('browser-reload'),
        loadURL: (url) => ipcRenderer.send('navigate-to', url),
        
        // --- GESTION DES ONGLET ---
        newTab: (url, isShadow = false) => ipcRenderer.send('new-tab', { url, isShadow }),
        switchTab: (id) => ipcRenderer.send('switch-tab', id),
        closeTab: (id) => ipcRenderer.send('close-tab', id),
        onTabCreated: (callback) => ipcRenderer.on('tab-created', (event, data) => callback(data)),
        onTabUpdated: (callback) => ipcRenderer.on('tab-updated', (event, data) => callback(data)),
        onTabClosed: (callback) => ipcRenderer.on('tab-closed', (event, id) => callback(id)),
        onTabSwitched: (callback) => ipcRenderer.on('tab-switched', (event, id) => callback(id)),
        onLoadStateChanged: (callback) => ipcRenderer.on('load-state-changed', (event, data) => callback(data)),
        
        // --- SYSTÈME & PARAMÈTRES ---
        saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
        getSettings: () => ipcRenderer.invoke('get-settings'),
        onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (event, data) => callback(data)),
        
        // UI & Autres
        resizeActiveTab: (options) => ipcRenderer.send('resize-active-tab', options),
        onFloatToast: (callback) => ipcRenderer.on('show-float-toast', (event, msg) => callback(msg)),
        onKeyboardShortcut: (callback) => {}
    };
}