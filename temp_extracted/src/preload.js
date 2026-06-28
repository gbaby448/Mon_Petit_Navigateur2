const { contextBridge, ipcRenderer } = require('electron');

const isSystemPage = window.location.protocol === 'file:' || window.location.protocol === 'domus:';

if (isSystemPage) {
    // --- CONTEXTE SYSTÈME DE CONFIANCE (DOMUS UI) ---
    contextBridge.exposeInMainWorld('domusAPI', {
        getAppVersion: () => ipcRenderer.invoke('get-app-version'),

        // --- NAVIGATION ---
        navigate: (url) => ipcRenderer.send('navigate-to', url),
        onNavigationUpdate: (callback) => ipcRenderer.on('nav-update', (event, data) => callback(data)),
        goBack: () => ipcRenderer.send('browser-back'),
        goForward: () => ipcRenderer.send('browser-forward'),
        reload: () => ipcRenderer.send('browser-reload'),
        loadURL: (url) => ipcRenderer.send('navigate-to', url),

        // --- RECHERCHE & SUGGESTIONS ---
        fetchSuggestions: (query) => ipcRenderer.invoke('fetch-suggestions', query),

        // --- GESTION DES PROFILS & ESPACES DE TRAVAIL ---
        switchProfile: (profile) => ipcRenderer.send('switch-profile', profile),
        onWorkspaceSwitched: (callback) => ipcRenderer.on('workspace-switched', (event, data) => callback(data)),
        onWorkspaceCounts: (callback) => ipcRenderer.on('workspace-counts', (event, data) => callback(data)),
        onWorkspacesUpdated: (callback) => ipcRenderer.on('workspaces-updated', (event, data) => callback(data)),
        onBlockedUpdate: (callback) => ipcRenderer.on('blocked-update', (event, data) => callback(data)),
        onGeoUpdate: (callback) => ipcRenderer.on('geo-update', (event, data) => callback(data)),

        // --- COFFRE-FORT & CRYPTO ---
        initVault: (pwd) => ipcRenderer.invoke('init-vault', pwd),
        encryptData: (text) => ipcRenderer.invoke('encrypt-data', text),
        decryptData: (obj) => ipcRenderer.invoke('decrypt-data', obj),
        exportBackup: (data) => ipcRenderer.invoke('export-backup', data),
        importBackup: () => ipcRenderer.invoke('import-backup'),
        getPasswords: () => ipcRenderer.invoke('get-passwords'),
        savePassword: (entry) => ipcRenderer.invoke('save-password', entry),
        deletePassword: (id) => ipcRenderer.invoke('delete-password', id),
        getCards: () => ipcRenderer.invoke('get-cards'),
        saveCard: (card) => ipcRenderer.invoke('save-card', card),
        deleteCard: (id) => ipcRenderer.invoke('delete-card', id),
        importPasswordsCSV: () => ipcRenderer.invoke('import-passwords-csv'),

        // --- GESTION DES ONGLETS ---
        newTab: (url, isShadow = false) => ipcRenderer.send('new-tab', { url, isShadow }),
        switchTab: (id) => ipcRenderer.send('switch-tab', id),
        closeTab: (id) => ipcRenderer.send('close-tab', id),
        onTabCreated: (callback) => ipcRenderer.on('tab-created', (event, data) => callback(data)),
        onTabUpdated: (callback) => ipcRenderer.on('tab-updated', (event, data) => callback(data)),
        onTabClosed: (callback) => ipcRenderer.on('tab-closed', (event, id) => callback(id)),
        onTabSwitched: (callback) => ipcRenderer.on('tab-switched', (event, id) => callback(id)),
        onLoadStateChanged: (callback) => ipcRenderer.on('load-state-changed', (event, data) => callback(data)),
        showTabMenu: (id) => ipcRenderer.send('show-tab-menu', id),
        toggleSplitScreen: (id) => ipcRenderer.send('toggle-split-screen', id),
        onSplitStateChanged: (callback) => ipcRenderer.on('split-state-changed', (event, id) => callback(id)),
        restoreSession: () => ipcRenderer.invoke('restore-session'),
        updateTabState: (id, data) => ipcRenderer.send('update-tab-state', { id, ...data }),
        reopenClosedTab: () => ipcRenderer.send('reopen-closed-tab'),

        // --- UI & PANNEAUX LATÉRAUX ---
        resizeActiveTab: (options) => ipcRenderer.send('resize-active-tab', options),
        toggleSidebar: (hidden) => ipcRenderer.send('toggle-sidebar', hidden),
        addWorkspace: (name, icon, color, isPrivate) => ipcRenderer.send('add-workspace', { name, icon, color, isPrivate }),
        deleteWorkspace: (id) => ipcRenderer.send('delete-workspace', id),
        moveWorkspace: (id, direction) => ipcRenderer.send('move-workspace', { id, direction }), // To reorder workspaces
        moveTabToWorkspace: (tabId, targetWorkspace) => ipcRenderer.send('move-tab-to-workspace', { tabId, targetWorkspace }),
        switchProfile: (profile) => ipcRenderer.send('switch-profile', profile),
        getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
        checkTPMStatus: () => ipcRenderer.invoke('check-tpm-status'),
        validateMasterPwd: (pwd) => ipcRenderer.invoke('validate-master-pwd', pwd),
        finalizeSecurity: (data) => ipcRenderer.send('finalize-security', data),
        onPageSnapshot: (callback) => ipcRenderer.on('page-snapshot', (event, url) => callback(url)),
        onFloatToast: (callback) => ipcRenderer.on('show-float-toast', (event, msg) => callback(msg)),
        onShowSavePrompt: (callback) => ipcRenderer.on('show-save-prompt', (event, data) => callback(data)),

        // --- MISES À JOUR GITHUB ---
        checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

        // --- PHASE 2 : WIZARD & MIGRATION ---
        checkHardwareFeatures: () => ipcRenderer.invoke('check-hardware-features'),
        detectBrowsers: () => ipcRenderer.invoke('detect-browsers'),
        startMigration: (browserId, options) => ipcRenderer.send('start-migration', { browserId, options }),
        onEcoUpdate: (callback) => ipcRenderer.on('eco-update', (event, data) => callback(data)),

        // --- MOTEUR CINÉMATIQUE, DARK MODE & AUDIO ---
        toggleZenMode: (enabled) => ipcRenderer.send('toggle-zen-mode', enabled),
        toggleCinemaMode: () => ipcRenderer.send('toggle-cinema-mode'),
        toggleForceDark: async () => {
            const currentSettings = await ipcRenderer.invoke('get-settings');
            currentSettings.forceDark = !currentSettings.forceDark;
            return ipcRenderer.invoke('save-settings', currentSettings);
        },
        setTabMute: (id, mute) => ipcRenderer.send('tab-mute', { id, mute }),
        setTabVolume: (id, volume) => ipcRenderer.invoke('set-tab-volume', { id, volume }),
        onTabAudioUpdate: (callback) => ipcRenderer.on('tab-audio-update', (event, data) => callback(data)),

        // --- TIME MACHINE & HISTORIQUE ---
        archivePageReader: (data) => ipcRenderer.send('archive-page-reader', data), // BUG 1 FIX : transmet titre+url
        getArchives: () => ipcRenderer.invoke('get-archives'),
        getArchiveData: (id) => ipcRenderer.invoke('get-archive-data', id),
        deleteArchive: (id) => ipcRenderer.invoke('delete-archive', id),
        onArchiveSuccess: (callback) => ipcRenderer.on('archive-success', (event, data) => callback(data)),

        // PONTS POUR L'HISTORIQUE DE NAVIGATION
        saveToHistory: (item) => ipcRenderer.send('save-to-history', item),
        getHistory: () => ipcRenderer.invoke('get-history'),
        deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
        clearHistory: () => ipcRenderer.invoke('clear-history'),

        // --- GESTIONNAIRE DE TÉLÉCHARGEMENTS ---
        getDownloads: () => ipcRenderer.invoke('get-downloads'),
        clearDownloads: () => ipcRenderer.invoke('clear-downloads'),
        openDownloadFolder: () => ipcRenderer.invoke('open-download-folder'),
        openFile: (path) => ipcRenderer.invoke('open-file', path),
        showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
        pauseDownload: (id) => ipcRenderer.invoke('pause-download', id),
        resumeDownload: (id) => ipcRenderer.invoke('resume-download', id),
        cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
        capturePage: (tabId) => ipcRenderer.invoke('capture-page', tabId),
        printPage: () => ipcRenderer.send('print-page'),
        onDownloadUpdate: (callback) => ipcRenderer.on('download-update', (event, data) => callback(data)),
        onStartFade: (callback) => ipcRenderer.on('start-fade', () => callback()),
        onEndFade: (callback) => ipcRenderer.on('end-fade', () => callback()),

        // --- SYSTÈME & PARAMÈTRES ---
        clearCache: () => ipcRenderer.invoke('clear-cache'),
        openSettings: () => ipcRenderer.send('open-settings'),
        openHistory: () => ipcRenderer.send('open-history'),
        openDownloads: () => ipcRenderer.send('open-downloads'),
        saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
        getSettings: () => ipcRenderer.invoke('get-settings'),
        resetBrowser: () => ipcRenderer.invoke('reset-browser'),
        onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (event, data) => callback(data)),
        onExecuteGesture: (callback) => ipcRenderer.on('execute-gesture', (event, gesture) => callback(gesture)),

        // --- GESTION DES EXTENSIONS ---
        getExtensions: () => ipcRenderer.invoke('list-extensions'),
        installExtensionFromCWS: (id) => ipcRenderer.invoke('install-extension-from-cws', id),
        installExtensionFromFolder: () => ipcRenderer.invoke('install-extension-from-folder'),
        toggleExtension: (id, active) => ipcRenderer.invoke('toggle-extension', { id, active }),
        deleteExtension: (id) => ipcRenderer.invoke('delete-extension', id),
        openExtensions: () => ipcRenderer.send('open-extensions'),

        // --- GESTION DES FENÊTRES ---
        windowMinimize: () => ipcRenderer.send('window-minimize'),
        windowMaximize: () => ipcRenderer.send('window-maximize'),
        windowClose: () => ipcRenderer.send('window-close'),

        // --- CRÉATION D'ONGLET (depuis menu contextuel) ---
        createTab: ({ url, isShadow }) => ipcRenderer.send('new-tab', { url, isShadow: !!isShadow }),

        // --- RACCOURCIS CLAVIER ---
        // Écoute tous les canaux shortcut-* et appelle le callback avec l'action sans le préfixe
        onKeyboardShortcut: (callback) => {
            const shortcuts = [
                'new-tab','close-tab','next-tab','prev-tab','focus-urlbar',
                'reload','hard-reload','find','history','downloads',
                'devtools','back','forward','zoom-in','zoom-out','zoom-reset','stop',
                'reopen-closed-tab','toggle-bookmarks-bar','print'
            ];
            shortcuts.forEach(action => {
                ipcRenderer.on(`shortcut-${action}`, () => callback(action));
            });
            // BUG 4 FIX : un seul listener (la boucle créait 9 listeners identiques → déclenché 9×)
            ipcRenderer.on('shortcut-goto-tab', (_, n) => callback(`goto-tab-${n}`));
        }
    });
} else {
    // --- CONTEXTE TIERS ISOLÉ (SITES WEB STANDARDS) ---
    // N'exposer absolument rien à la page web pour une sécurité maximale.
    // Lancer à la place l'autofill sécurisé en tâche de fond.
    window.addEventListener('DOMContentLoaded', () => {
        runAutofillEngine();
        runAudioEnhancer();
    });

    // --- DÉTECTEUR DE GESTES SOURIS (MOUSE GESTURES) ---
    let rightMouseDown = false;
    let startX = 0;
    let startY = 0;
    let gesturePath = [];

    window.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            rightMouseDown = true;
            startX = e.clientX;
            startY = e.clientY;
            gesturePath = [];
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!rightMouseDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance > 35) {
            let dir = '';
            if (Math.abs(dx) > Math.abs(dy)) {
                dir = dx > 0 ? 'R' : 'L';
            } else {
                dir = dy > 0 ? 'D' : 'U';
            }
            if (gesturePath.length === 0 || gesturePath[gesturePath.length - 1] !== dir) {
                gesturePath.push(dir);
            }
            startX = e.clientX;
            startY = e.clientY;
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2 && rightMouseDown) {
            rightMouseDown = false;
            if (gesturePath.length > 0) {
                const gesture = gesturePath.join('');
                ipcRenderer.send('webview-gesture', gesture);
                setTimeout(() => { gesturePath = []; }, 50);
            }
        }
    });

    window.addEventListener('contextmenu', (e) => {
        if (gesturePath.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            gesturePath = [];
        }
    }, true);
}

function runAutofillEngine() {
    let activeCredentials = [];
    let activeInput = null;
    let usernameInput = null;
    let passwordInput = null;
    
    const hostname = window.location.hostname;
    if (!hostname) return;

    ipcRenderer.invoke('get-passwords-for-domain', hostname).then(creds => {
        activeCredentials = creds || [];
        setupFormDetection();
    }).catch(err => {
        console.error("[DOMUS Vault] Impossible de charger les identifiants", err);
    });
    
    let shadowContainer = null;
    let shadowRoot = null;
    
    function getOrCreateShadowRoot() {
        if (shadowContainer) return shadowRoot;
        
        shadowContainer = document.createElement('div');
        shadowContainer.id = 'domus-vault-autofill-container';
        shadowContainer.style.position = 'absolute';
        shadowContainer.style.zIndex = '2147483647';
        shadowContainer.style.pointerEvents = 'none';
        document.body.appendChild(shadowContainer);
        
        shadowRoot = shadowContainer.attachShadow({ mode: 'closed' });
        return shadowRoot;
    }
    
    function hideDropdown() {
        if (shadowContainer) {
            shadowContainer.style.display = 'none';
        }
    }
    
    function showDropdown(targetInput, type) {
        activeInput = targetInput;
        const root = getOrCreateShadowRoot();
        
        const form = targetInput.form || targetInput.closest('form');
        if (form) {
            passwordInput = form.querySelector('input[type="password"]');
            usernameInput = form.querySelector('input[type="text"], input[type="email"], input:not([type])');
        } else {
            passwordInput = targetInput.type === 'password' ? targetInput : targetInput.parentElement.querySelector('input[type="password"]');
            usernameInput = targetInput.type !== 'password' ? targetInput : targetInput.parentElement.querySelector('input[type="text"], input[type="email"]');
        }
        
        const rect = targetInput.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        shadowContainer.style.display = 'block';
        shadowContainer.style.top = `${rect.bottom + scrollTop + 4}px`;
        shadowContainer.style.left = `${rect.left + scrollLeft}px`;
        shadowContainer.style.width = `${Math.max(rect.width, 240)}px`;
        shadowContainer.style.pointerEvents = 'auto';
        
        renderDropdownContent(root, type);
    }
    
    function quickGeneratePassword() {
        const length = 16;
        const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lower = "abcdefghijklmnopqrstuvwxyz";
        const nums = "0123456789";
        const syms = "!@#$%^&*()_-+=";
        const all = upper + lower + nums + syms;
        
        let pass = "";
        pass += upper[Math.floor(Math.random() * upper.length)];
        pass += lower[Math.floor(Math.random() * lower.length)];
        pass += nums[Math.floor(Math.random() * nums.length)];
        pass += syms[Math.floor(Math.random() * syms.length)];
        
        for (let i = 4; i < length; i++) {
            pass += all.charAt(Math.floor(Math.random() * all.length));
        }
        
        // Mélanger
        return pass.split('').sort(() => 0.5 - Math.random()).join('');
    }
    
    function renderDropdownContent(root, type) {
        root.innerHTML = '';
        
        const style = document.createElement('style');
        style.textContent = `
            .dropdown {
                background: rgba(10, 10, 12, 0.96);
                border: 1px solid rgba(0, 255, 136, 0.25);
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(12px);
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                padding: 6px 0;
                overflow: hidden;
                box-sizing: border-box;
                animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .header {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                font-weight: 600;
                color: #00ff88;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .item:hover {
                background: rgba(0, 255, 136, 0.08);
            }
            .item-user {
                font-weight: 600;
                color: #ffffff;
            }
            .item-desc {
                font-size: 11px;
                color: #a0a0a0;
                margin-top: 2px;
            }
            .action {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 12px;
                color: #00ff88;
                cursor: pointer;
                font-weight: 500;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                transition: background 0.2s;
            }
            .action:hover {
                background: rgba(0, 255, 136, 0.08);
            }
            .empty {
                padding: 12px;
                color: #a0a0a0;
                text-align: center;
                font-size: 12px;
            }
        `;
        root.appendChild(style);
        
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        
        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `<span>🔐 Domus Vault</span>`;
        dropdown.appendChild(header);
        
        if (activeCredentials.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = "Aucun compte enregistré";
            dropdown.appendChild(empty);
        } else {
            activeCredentials.forEach(cred => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `
                    <div>
                        <div class="item-user">${escapeHtml(cred.user)}</div>
                        <div class="item-desc">Remplir ce compte</div>
                    </div>
                    <span style="font-size: 14px;">🔑</span>
                `;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (usernameInput) {
                        usernameInput.value = cred.user;
                        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (passwordInput) {
                        passwordInput.value = cred.pass;
                        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    hideDropdown();
                });
                dropdown.appendChild(item);
            });
        }
        
        if (type === 'password') {
            const action = document.createElement('div');
            action.className = 'action';
            action.innerHTML = `<span>⚡</span> <span>Générer un mot de passe complexe</span>`;
            action.addEventListener('click', (e) => {
                e.stopPropagation();
                const newPass = quickGeneratePassword();
                if (activeInput) {
                    activeInput.value = newPass;
                    activeInput.type = 'text';
                    setTimeout(() => {
                        if (activeInput) activeInput.type = 'password';
                    }, 2500);
                    
                    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
                    activeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    navigator.clipboard.writeText(newPass).then(() => {
                        console.log("[Domus] Mot de passe généré copié dans le presse-papier");
                    }).catch(err => {});
                }
                hideDropdown();
            });
            dropdown.appendChild(action);
        }
        
        root.appendChild(dropdown);
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    
    function setupFormDetection() {
        const scan = () => {
            const passwordInputs = document.querySelectorAll('input[type="password"]');
            passwordInputs.forEach(pwd => {
                if (pwd.dataset.domusTracked) return;
                pwd.dataset.domusTracked = "true";
                
                // Indicateur visuel d'autofill : petite clé verte en arrière-plan
                pwd.style.backgroundImage = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%2300ff88\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"></rect><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path></svg>')";
                pwd.style.backgroundRepeat = "no-repeat";
                pwd.style.backgroundPosition = "right 10px center";
                pwd.style.backgroundSize = "16px";
                
                pwd.addEventListener('focus', () => showDropdown(pwd, 'password'));
                pwd.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDropdown(pwd, 'password');
                });
                
                const form = pwd.form || pwd.closest('form');
                if (form) {
                    const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input:not([type])');
                    textInputs.forEach(txt => {
                        if (txt.dataset.domusTracked) return;
                        txt.dataset.domusTracked = "true";
                        
                        txt.style.backgroundImage = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%2300ff88\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"></path><circle cx=\"12\" cy=\"7\" r=\"4\"></circle></svg>')";
                        txt.style.backgroundRepeat = "no-repeat";
                        txt.style.backgroundPosition = "right 10px center";
                        txt.style.backgroundSize = "16px";
                        
                        txt.addEventListener('focus', () => showDropdown(txt, 'username'));
                        txt.addEventListener('click', (e) => {
                            e.stopPropagation();
                            showDropdown(txt, 'username');
                        });
                    });
                }
            });
        };
        
        scan();
        
        const observer = new MutationObserver(scan);
        observer.observe(document.body, { childList: true, subtree: true });
        
        document.addEventListener('click', () => hideDropdown());
        window.addEventListener('resize', () => hideDropdown());
        
        // Détecter la soumission
        const handleFormSubmit = (form) => {
            const pwdInput = form.querySelector('input[type="password"]');
            const userInput = form.querySelector('input[type="text"], input[type="email"], input:not([type])');
            
            if (pwdInput && pwdInput.value) {
                const userVal = userInput ? userInput.value.trim() : "";
                const pwdVal = pwdInput.value;
                
                if (pwdVal && pwdVal.length >= 4) {
                    ipcRenderer.send('notify-new-credentials', {
                        site: hostname,
                        user: userVal,
                        pass: pwdVal
                    });
                }
            }
        };

        document.addEventListener('submit', (e) => {
            handleFormSubmit(e.target);
        }, true);

        // Fallback pour les formulaires AJAX qui ne déclenchent pas submit
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, input[type="submit"], input[type="button"]');
            if (!btn) return;
            
            const btnText = (btn.innerText || btn.value || "").toLowerCase();
            const keywords = ["connexion", "connecter", "valider", "submit", "log in", "login", "sign in", "signin", "s'inscrire", "enregistrer", "suivant", "next"];
            
            const matchesKeyword = keywords.some(k => btnText.includes(k));
            if (matchesKeyword) {
                const form = btn.closest('form');
                if (form) {
                    handleFormSubmit(form);
                } else {
                    const passwords = document.querySelectorAll('input[type="password"]');
                    passwords.forEach(pwd => {
                        const container = pwd.closest('div, section');
                        if (container) {
                            const userInput = container.querySelector('input[type="text"], input[type="email"], input:not([type])');
                            if (pwd.value) {
                                ipcRenderer.send('notify-new-credentials', {
                                    site: hostname,
                                    user: userInput ? userInput.value.trim() : "",
                                    pass: pwd.value
                                });
                            }
                        }
                    });
                }
            }
        }, true);
    }
}

function runAudioEnhancer() {
    let audioCtx = null;
    let activePreset = "balanced";
    let isEnabled = true;

    const elementDSPChains = new WeakMap();

    // Récupérer les paramètres par défaut
    ipcRenderer.invoke('get-settings').then(settings => {
        if (settings) {
            isEnabled = settings.audioBoosterEnabled !== false;
            activePreset = settings.audioBoosterPreset || "balanced";
            updateAllChains();
        }
    }).catch(err => console.log("[DOMUS Audio] Settings fetch skipped:", err.message));

    // Écouter les changements en temps réel du panneau Audio
    ipcRenderer.on('audio-booster-update', (event, data) => {
        isEnabled = data.enabled;
        activePreset = data.preset;
        updateAllChains();
    });

    const presetSettings = {
        balanced: { low: 4.5, mid: 1.5, high: 3.0, compThreshold: -20, compRatio: 3.5, makeup: 1.25 },
        vocal:    { low: -2.0, mid: 4.0, high: 2.0, compThreshold: -16, compRatio: 3.0, makeup: 1.30 },
        bass:     { low: 7.0, mid: 0.5, high: 3.5, compThreshold: -22, compRatio: 4.0, makeup: 1.20 },
        off:      { low: 0, mid: 0, high: 0, compThreshold: 0, compRatio: 1.0, makeup: 1.0 }
    };

    function updateDSPParameters(dsp) {
        const config = (isEnabled && activePreset !== "off") ? presetSettings[activePreset] : presetSettings.off;
        
        try {
            const t = audioCtx.currentTime + 0.1;
            
            dsp.lowShelf.gain.linearRampToValueAtTime(config.low, t);
            dsp.midPeak.gain.linearRampToValueAtTime(config.mid, t);
            dsp.highShelf.gain.linearRampToValueAtTime(config.high, t);
            
            dsp.compressor.threshold.linearRampToValueAtTime(config.compThreshold, t);
            dsp.compressor.ratio.linearRampToValueAtTime(config.compRatio, t);
            
            dsp.makeupGain.gain.linearRampToValueAtTime(config.makeup, t);
        } catch (e) {
            dsp.lowShelf.gain.value = config.low;
            dsp.midPeak.gain.value = config.mid;
            dsp.highShelf.gain.value = config.high;
            dsp.compressor.threshold.value = config.compThreshold;
            dsp.compressor.ratio.value = config.compRatio;
            dsp.makeupGain.gain.value = config.makeup;
        }
    }

    function updateAllChains() {
        // L'égaliseur mettra à jour les filtres au prochain cycle ou sur les éléments en cours
        scan();
    }

    function enhanceElementAudio(mediaElement) {
        if (elementDSPChains.has(mediaElement)) {
            const dsp = elementDSPChains.get(mediaElement);
            if (dsp && dsp !== true) {
                updateDSPParameters(dsp);
            }
            return;
        }

        elementDSPChains.set(mediaElement, true);

        const initContext = () => {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        };

        const runDSP = () => {
            try {
                initContext();

                // Intercepter l'élément multimédia
                const source = audioCtx.createMediaElementSource(mediaElement);

                // Égalisation paramétrique
                const lowShelf = audioCtx.createBiquadFilter();
                lowShelf.type = 'lowshelf';
                lowShelf.frequency.value = 150;

                const midPeak = audioCtx.createBiquadFilter();
                midPeak.type = 'peaking';
                midPeak.frequency.value = 1500;
                midPeak.Q.value = 1.0;

                const highShelf = audioCtx.createBiquadFilter();
                highShelf.type = 'highshelf';
                highShelf.frequency.value = 8000;

                // Compression de dynamique
                const compressor = audioCtx.createDynamicsCompressor();
                compressor.knee.value = 25;
                compressor.attack.value = 0.005;
                compressor.release.value = 0.25;

                // Makeup Gain
                const makeupGain = audioCtx.createGain();

                // Branchement
                source.connect(lowShelf);
                lowShelf.connect(midPeak);
                midPeak.connect(highShelf);
                highShelf.connect(compressor);
                compressor.connect(makeupGain);
                makeupGain.connect(audioCtx.destination);

                const dsp = { lowShelf, midPeak, highShelf, compressor, makeupGain };
                elementDSPChains.set(mediaElement, dsp);
                updateDSPParameters(dsp);

                console.log("[DOMUS Audio DSP] Acoustique HD connectée sur :", mediaElement);
            } catch (err) {
                // En cas de CORS, on laisse la lecture normale se faire
                console.log("[DOMUS Audio DSP] Mode natif préservé :", err.message);
            }
        };

        mediaElement.addEventListener('play', () => {
            initContext();
            if (audioCtx) runDSP();
        }, { once: true });

        if (!mediaElement.paused) {
            runDSP();
        }
    }

    function scan() {
        const mediaElements = document.querySelectorAll('video, audio');
        mediaElements.forEach(enhanceElementAudio);
    }

    setInterval(scan, 1500);
}