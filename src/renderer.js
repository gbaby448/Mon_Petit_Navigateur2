/**
 * DOMUS BROWSER - Renderer Process
 * Version : 1.0.1 (Domus HD Acoustic Engine)
 */

document.addEventListener('DOMContentLoaded', () => {
    try {
        // --- SÉLECTEURS ÉLÉMENTS UI ---
    const tabsContainer = document.getElementById('tabs-container');
    const btnNewTab = document.getElementById('btn-new-tab');
    const btnNewShadowTab = document.getElementById('btn-new-shadow-tab');
    const urlInput = document.getElementById('url-input');
    const blockedCounter = document.getElementById('blocked-count');
    const tpmStatus = document.getElementById('tpm-status');
    const welcomeScreen = document.getElementById('welcome-screen');
    const webviewWrapper = document.getElementById('webview-wrapper');

    const btnBack = document.getElementById('back');
    const btnForward = document.getElementById('forward');
    const btnReload = document.getElementById('reload');
    
    // --- DÉMARRAGE IMMÉDIAT (ARCHITECTURE ULTRA-STABLE) ---
    window.addEventListener('error', (event) => {
        if (typeof showDomusToast === 'function') {
            showDomusToast(`[CRASH] ${event.message} at ${event.filename}:${event.lineno}`, 'error');
        }
        console.error("Global Error:", event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (typeof showDomusToast === 'function') {
            showDomusToast(`[PROMISE CRASH] ${event.reason}`, 'error');
        }
        console.error("Unhandled Rejection:", event.reason);
    });
    

    // END VISUAL DEBUG OVERLAY

    console.log("Renderer: Initialisation des modules...");

    const sidePanels = {
        dataMap: document.getElementById('data-map-panel'),
        audio: document.getElementById('audio-panel'),
        workspace: document.getElementById('workspace-panel'),
        password: document.getElementById('password-panel'),
        favorites: document.getElementById('favorites-panel'),
        timemachine: document.getElementById('timemachine-panel')
    };

    const audioList = document.getElementById('audio-list');

    const btnHome = document.getElementById('btn-home');
    const btnHistory = document.getElementById('btn-history');
    const btnDownloads = document.getElementById('btn-downloads');
    const btnExtensions = document.getElementById('btn-extensions');
    const btnDarkMode = document.getElementById('btn-dark-mode');
    const btnAudio = document.getElementById('btn-audio');
    const btnCinema = document.getElementById('btn-cinema');
    const btnSettings = document.getElementById('btn-settings');
    const btnPasswords = document.getElementById('btn-passwords');
    const btnFavorites = document.getElementById('btn-favorites');
    const btnTimeMachine = document.getElementById('btn-timemachine');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnSidebarReveal = document.getElementById('btn-sidebar-reveal');
    const btnOpenHub = document.getElementById('btn-open-hub');
    const btnOpenHubNav = document.getElementById('btn-open-hub-nav');
    const hubModal = document.getElementById('domus-hub-modal');
    const btnCloseHub = document.getElementById('btn-close-hub');
    const shieldContainer = document.getElementById('shield-container');
    
    // Modales additionnelles (Déplacées vers le haut pour éviter le ReferenceError)
    const securityModal = document.getElementById('security-modal');
    const addPwdModal = document.getElementById('add-pwd-modal');
    const profileFlyout = document.getElementById('profile-flyout');
    const wizardModal = document.getElementById('security-wizard-modal'); // Corrigé : l'ID réel

    let activeTabId = null;
    let activeTabElementId = null;
    const audibleTabs = new Map();
    let draggedTabElement = null;

    if (tabsContainer) {
        // Support de glisser à la fin
        tabsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        tabsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedTabElement && e.target === tabsContainer) {
                tabsContainer.appendChild(draggedTabElement);
            }
        });
    }
    let currentSettings = {};
    let currentProfile = 'default';
    let isZenMode = false;
    let splitTabId = null;
    let currentTheme = 'default';
    let isVideoAIEnabled = false;
    let isCinemaMode = false;
    const cinemaCSSKeys = new Map();

    // --- UTILS FAVORIS & ZOOM ---
    function getDomainFromUrl(url) {
        if (!url) return null;
        try {
            if (url.includes('domus://') || url.includes('file://') || url.startsWith('about:')) return null;
            const parsed = new URL(url);
            return parsed.hostname;
        } catch (e) {
            return null;
        }
    }

    function saveZoomForDomain(url, factor) {
        const domain = getDomainFromUrl(url);
        if (!domain) return;
        if (!currentSettings.domainZoom) currentSettings.domainZoom = {};
        currentSettings.domainZoom[domain] = factor;
        window.domusAPI.saveSettings(currentSettings);
    }

    function updateBookmarkStar(url) {
        const btnStar = document.getElementById('btn-add-bookmark');
        if (!btnStar) return;
        if (!url || url.includes('domus://') || url.includes('file://') || url.startsWith('about:')) {
            btnStar.style.display = 'none';
            return;
        }
        btnStar.style.display = 'inline-block';
        
        const favorites = currentSettings.favorites || [];
        const isFav = favorites.some(f => f.url === url);
        if (isFav) {
            btnStar.classList.add('active');
            btnStar.title = "Retirer des Favoris";
        } else {
            btnStar.classList.remove('active');
            btnStar.title = "Ajouter aux Favoris";
        }
    }

    function renderBookmarksBar(favorites) {
        const list = document.getElementById('bookmarks-bar-list');
        if (!list) return;
        if (!favorites || favorites.length === 0) {
            list.innerHTML = '<span style="opacity: 0.4; font-size: 11px; margin-left: 10px;">Aucun favori</span>';
            return;
        }
        list.innerHTML = favorites.map((f, index) => {
            const title = f.title || f.url;
            return `
                <div class="bookmark-bar-item" title="${f.url}" onclick="window.domusAPI.navigate('${f.url}')" oncontextmenu="window.showBookmarkContextMenu(event, ${index})">
                    <span class="fav-icon">⭐</span>
                    <span>${title}</span>
                </div>
            `;
        }).join('');
    }

    function showBookmarkContextMenu(e, favIndex) {
        e.preventDefault();
        e.stopPropagation();
        
        let menu = document.getElementById('domus-bookmark-context-menu');
        if (menu) menu.remove();

        menu = document.createElement('div');
        menu.id = 'domus-bookmark-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${e.clientY}px;
            left: ${e.clientX}px;
            background: rgba(13, 13, 16, 0.95);
            border: 1px solid var(--accent-color, #00ff88);
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            backdrop-filter: blur(15px);
            z-index: 9999999;
            padding: 6px 0;
            min-width: 180px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        const favorites = currentSettings.favorites || [];
        const fav = favorites[favIndex];
        if (!fav) return;

        const options = [
            {
                text: "🌐 Ouvrir dans un nouvel onglet",
                action: () => {
                    window.domusAPI.createTab({ url: fav.url });
                }
            },
            {
                text: "👻 Ouvrir en onglet Shadow",
                action: () => {
                    window.domusAPI.createTab({ url: fav.url, isShadow: true });
                }
            },
            {
                text: "✏️ Modifier le favori",
                action: async () => {
                    const newTitle = prompt("Nom du favori :", fav.title || "");
                    if (newTitle === null) return;
                    const newUrl = prompt("Adresse URL :", fav.url || "");
                    if (!newUrl) return;
                    
                    favorites[favIndex] = { title: newTitle, url: newUrl };
                    currentSettings.favorites = favorites;
                    await window.domusAPI.saveSettings(currentSettings);
                    renderBookmarksBar(favorites);
                    if (!sidePanels.favorites.classList.contains('hidden')) loadFavorites();
                    showDomusToast("⭐ Favori mis à jour.");
                }
            },
            {
                text: "🗑️ Supprimer",
                action: async () => {
                    favorites.splice(favIndex, 1);
                    currentSettings.favorites = favorites;
                    await window.domusAPI.saveSettings(currentSettings);
                    renderBookmarksBar(favorites);
                    if (!sidePanels.favorites.classList.contains('hidden')) loadFavorites();
                    const wv = getActiveWV();
                    if (wv) updateBookmarkStar(wv.getURL());
                    showDomusToast("⭐ Favori supprimé.");
                }
            }
        ];

        options.forEach(opt => {
            const item = document.createElement('div');
            item.textContent = opt.text;
            item.style.cssText = `
                padding: 10px 16px;
                font-size: 13px;
                color: #e0e0e6;
                cursor: pointer;
                transition: background 0.2s, color 0.2s;
            `;
            
            item.onmouseenter = () => {
                item.style.background = 'rgba(0, 255, 136, 0.1)';
                item.style.color = 'var(--accent-color, #00ff88)';
            };
            item.onmouseleave = () => {
                item.style.background = 'transparent';
                item.style.color = '#e0e0e6';
            };
            
            item.onclick = () => {
                opt.action();
                menu.remove();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }
    window.showBookmarkContextMenu = showBookmarkContextMenu;

    // =========================================================================
    // 🔔 SYSTÈME DE NOTIFICATION (TOAST)
    // =========================================================================
    function showDomusToast(msg) {
        let toastBox = document.getElementById('domus-toast-container');
        if (!toastBox) {
            toastBox = document.createElement('div');
            toastBox.id = 'domus-toast-container';
            toastBox.style.cssText = 'position: fixed; bottom: 30px; right: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 999999; pointer-events: none;';
            document.body.appendChild(toastBox);
        }

        const toast = document.createElement('div');
        // 🛡️ SÉCURITÉ (Bilan #10) : Neutralise toute injection HTML via textContent
        toast.textContent = msg;
        toast.style.cssText = 'background: rgba(13, 13, 16, 0.95); color: #fff; padding: 12px 20px; border-radius: 8px; border: 1px solid var(--accent-color, #00ff88); box-shadow: 0 5px 15px rgba(0,0,0,0.5); font-size: 14px; animation: fadein 0.3s ease-out; backdrop-filter: blur(10px);';

        toastBox.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // --- DIALOGUE DE CONFIRMATION DOMUS ---
    function showDomusConfirm(title, message, icon = '❓') {
        return new Promise((resolve) => {
            const modal = document.getElementById('domus-confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const msgEl = document.getElementById('confirm-message');
            const iconEl = document.getElementById('confirm-icon');
            const btnYes = document.getElementById('btn-confirm-yes');
            const btnNo = document.getElementById('btn-confirm-no');

            titleEl.textContent = title;
            msgEl.textContent = message;
            iconEl.textContent = icon;

            modal.classList.remove('hidden');
            window.domusAPI.resizeActiveTab({ isModalOpen: true });

            const cleanup = (value) => {
                modal.classList.add('hidden');
                window.domusAPI.resizeActiveTab({ isModalOpen: false });
                resolve(value);
            };

            btnYes.onclick = () => cleanup(true);
            btnNo.onclick = () => cleanup(false);
        });
    }

    if (window.domusAPI.onFloatToast) {
        window.domusAPI.onFloatToast((msg) => showDomusToast(msg));
    }

    // --- GESTION DES FENÊTRES (PRO CONTROLS) ---
    const winMin = document.getElementById('win-min');
    const winMax = document.getElementById('win-max');
    const winClose = document.getElementById('win-close');

    if (winMin) winMin.onclick = () => window.domusAPI.windowMinimize();
    if (winMax) winMax.onclick = () => window.domusAPI.windowMaximize();
    if (winClose) winClose.onclick = () => window.domusAPI.windowClose();

    // --- TIME MACHINE (ARCHIVAGE) ---
    const btnSaveArchive = document.getElementById('btn-save-archive');
    if (btnSaveArchive) {
        btnSaveArchive.onclick = () => {
            const activeWv = document.querySelector('webview.active');
            if (!activeWv) return;
            
            btnSaveArchive.style.transform = "scale(1.4) rotate(360deg)";
            btnSaveArchive.style.transition = "transform 0.6s ease";
            
            window.domusAPI.archivePageReader({
                title: activeWv.getTitle() || "Sans titre",
                url: activeWv.getURL()
            });
            
            setTimeout(() => { btnSaveArchive.style.transform = ""; }, 600);
        };
    }

    // =========================================================================
    // 🔍 SYSTÈME DE SUGGESTIONS (DUCKDUCKGO)
    // =========================================================================
    const domusSuggestBox = document.createElement('div');
    domusSuggestBox.id = 'domus-super-suggestions';
    domusSuggestBox.style.setProperty('display', 'none', 'important');
    document.body.appendChild(domusSuggestBox);

    let selectedSuggestionIndex = -1;
    let suggestionsVisible = false; // BUG 12 FIX : guard fiable pour hideSuggestions

    function showSuggestions(suggestions) {
        domusSuggestBox.innerHTML = '';
        selectedSuggestionIndex = -1;

        suggestions.slice(0, 8).forEach((sug, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.dataset.index = index;

            let displayText = '';
            let icon = '🔍';
            if (sug.type === 'favorite') {
                icon = '⭐';
                displayText = `${sug.title || sug.url} - ${sug.url}`;
                div.dataset.url = sug.url;
            } else if (sug.type === 'history') {
                icon = '🕰️';
                displayText = `${sug.title || sug.url} - ${sug.url}`;
                div.dataset.url = sug.url;
            } else {
                displayText = sug.text;
                div.dataset.text = sug.text;
            }

            div.innerHTML = `<span style="margin-right: 8px; opacity: 0.6;">${icon}</span><span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayText}</span>`;

            div.style.cssText = `
                display: flex !important;
                align-items: center !important;
                padding: 10px 16px !important;
                cursor: pointer !important;
                color: #e0e0e6 !important;
                border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                font-size: 13px !important;
                text-align: left !important;
                background: transparent !important;
                overflow: hidden !important;
            `;

            div.onmouseenter = () => {
                selectedSuggestionIndex = index;
                updateSuggestionHighlight();
            };

            div.onmousedown = (e) => {
                e.preventDefault();
                if (sug.type === 'favorite' || sug.type === 'history') {
                    const activeWv = document.querySelector('webview.active');
                    if (activeWv) activeWv.src = sug.url;
                } else {
                    urlInput.value = sug.text;
                    const activeWv = document.querySelector('webview.active');
                    if (activeWv) {
                        let engineUrl = 'https://www.google.com/search?q=';
                        if (currentSettings.searchEngine === 'duckduckgo') engineUrl = 'https://duckduckgo.com/?q=';
                        if (currentSettings.searchEngine === 'bing') engineUrl = 'https://www.bing.com/search?q=';
                        activeWv.src = `${engineUrl}${encodeURIComponent(sug.text)}`;
                    }
                }
                hideSuggestions();
                urlInput.blur();
            };
            domusSuggestBox.appendChild(div);
        });

        const rect = urlInput.getBoundingClientRect();
        domusSuggestBox.style.cssText = `
            position: fixed !important;
            top: ${rect.bottom + 5}px !important;
            left: ${rect.left}px !important;
            width: ${rect.width}px !important;
            background: #0d0d10 !important;
            border: 1px solid var(--accent-color, #00ff88) !important;
            border-radius: 8px !important;
            z-index: 2147483647 !important;
            box-shadow: 0 15px 40px rgba(0,0,0,0.9) !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 5px 0 !important;
        `;

        suggestionsVisible = true; // BUG 12 FIX
        window.domusAPI.resizeActiveTab({ suggestionsActive: true });
    }

    function hideSuggestions() {
        if (!suggestionsVisible) return; // BUG 12 FIX : guard fiable (setProperty !important était unreliable)
        suggestionsVisible = false;
        domusSuggestBox.style.setProperty('display', 'none', 'important');
        domusSuggestBox.innerHTML = '';
        selectedSuggestionIndex = -1;
        window.domusAPI.resizeActiveTab({ suggestionsActive: false });
    }

    function updateUrlBarSecurityStyle(url) {
        if (!urlInput) return;
        const securityIndicator = document.getElementById('security-indicator');
        
        if (url && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
            urlInput.style.borderColor = "#ff3b30";
            urlInput.style.boxShadow = "0 0 10px rgba(255, 59, 48, 0.4)";
            if (securityIndicator) {
                securityIndicator.textContent = "⚠️";
                securityIndicator.style.color = "#ff3b30";
                securityIndicator.style.filter = "drop-shadow(0 0 5px rgba(255, 59, 48, 0.6))";
                securityIndicator.title = "Attention : Connexion non sécurisée (HTTP)";
            }
        } else if (url && (url.startsWith('domus://') || url.startsWith('file://'))) {
            urlInput.style.borderColor = "";
            urlInput.style.boxShadow = "";
            if (securityIndicator) {
                securityIndicator.textContent = "⚙️";
                securityIndicator.style.color = "#00d2ff";
                securityIndicator.style.filter = "drop-shadow(0 0 5px rgba(0, 210, 255, 0.6))";
                securityIndicator.title = "Outil Système Sécurisé Domus";
            }
        } else {
            urlInput.style.borderColor = "";
            urlInput.style.boxShadow = "";
            if (securityIndicator) {
                securityIndicator.textContent = "🔒";
                securityIndicator.style.color = "#00ff88";
                securityIndicator.style.filter = "drop-shadow(0 0 5px rgba(0, 255, 136, 0.6))";
                securityIndicator.title = "Connexion sécurisée (HTTPS)";
            }
        }
    }

    function updateSuggestionHighlight() {
        const items = domusSuggestBox.querySelectorAll('.suggestion-item');
        items.forEach((item, i) => {
            if (i === selectedSuggestionIndex) {
                item.style.setProperty('background', 'rgba(0, 255, 136, 0.15)', 'important');
                item.style.setProperty('color', 'var(--accent-color, #00ff88)', 'important');
            } else {
                item.style.setProperty('background', 'transparent', 'important');
                item.style.setProperty('color', '#e0e0e6', 'important');
            }
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // =========================================================================
    // ⚙️ PARAMÈTRES & THÈMES
    // =========================================================================
    function applySettingsToUI(settings) {
        if (settings.theme === 'light') {
            document.body.classList.remove('domus-theme-dark');
            document.body.classList.add('domus-theme-light');
        } else {
            document.body.classList.remove('domus-theme-light');
            document.body.classList.add('domus-theme-dark');
        }

        if (settings.accentColor) {
            document.documentElement.style.setProperty('--accent-color', settings.accentColor);
            document.documentElement.style.setProperty('--accent', settings.accentColor);
        }

        const sidebar = document.getElementById('sidebar');
        if (sidebar && settings.sidebarPosition) {
            sidebar.style.order = settings.sidebarPosition === 'right' ? '2' : '0';
            sidebar.style.borderLeft = settings.sidebarPosition === 'right' ? '1px solid var(--border-color)' : 'none';
            sidebar.style.borderRight = settings.sidebarPosition === 'right' ? 'none' : '1px solid var(--border-color)';
        }

        if (btnDarkMode) {
            btnDarkMode.style.color = settings.forceDark ? 'var(--accent-color)' : '';
        }

        const bBar = document.getElementById('bookmarks-bar');
        if (bBar) {
            bBar.classList.toggle('hidden', !settings.showBookmarksBar);
            if (settings.showBookmarksBar) {
                renderBookmarksBar(settings.favorites || []);
            }
        }
    }

    window.domusAPI.getSettings().then(settings => {
        currentSettings = settings;
        applySettingsToUI(settings);
    });

    window.domusAPI.onSettingsChanged((settings) => {
        currentSettings = settings;
        applySettingsToUI(settings);
    });

    // =========================================================================
    // 📁 GESTION DES ONGLETS & HIBERNATION VISUELLE
    // =========================================================================
    btnNewTab.addEventListener('click', () => {
        const homeUrl = currentSettings.homePage || 'domus://newtab';
        window.domusAPI.newTab(homeUrl);
    });

    if (btnNewShadowTab) {
        btnNewShadowTab.addEventListener('click', () => {
            window.domusAPI.newTab('domus://newtab', true);
        });
    }

    /**
     * Crée un onglet avec indicateur d'hibernation "Pro"
     */
    function createTabElement(data) {
        try {
            const isForCurrentWorkspace = !data.workspace || data.workspace === currentProfile;

            if (isForCurrentWorkspace && welcomeScreen) {
                welcomeScreen.style.display = 'none';
                welcomeScreen.style.height = '0';
                welcomeScreen.style.opacity = '0';
                welcomeScreen.style.pointerEvents = 'none';
            }
            if (isForCurrentWorkspace && data.active) {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('webview').forEach(wv => wv.classList.remove('active'));
            }

            const tabEl = document.createElement('div');
            tabEl.className = 'tab' + (isForCurrentWorkspace && data.active ? ' active' : '') + (data.isShadow ? ' shadow-tab' : '');
            if (!isForCurrentWorkspace) {
                tabEl.classList.add('ws-hidden');
                tabEl.style.display = 'none';
            }
            tabEl.id = `ui-${data.id}`;
            const shadowBadge = data.isShadow ? '<span class="shadow-ghost-icon" title="Onglet Shadow Sécurisé" style="color:#d946ef; margin-right:4px;">👻</span>' : '';
            tabEl.innerHTML = `${shadowBadge}<span class="tab-title">${data.title || (data.isShadow ? 'Paiement Shadow' : 'Nouvel Onglet')}</span><span class="tab-audio-icon hidden" style="margin-right: 4px; font-size: 11px;">🔊</span><button class="tab-close">×</button>`;
            
            tabEl.onclick = () => window.domusAPI.switchTab(data.id);
            tabEl.oncontextmenu = (e) => showTabContextMenu(e, data.id);
            
            // Bouton de fermeture
            const btnClose = tabEl.querySelector('.tab-close');
            if (btnClose) {
                btnClose.onclick = (e) => {
                    e.stopPropagation();
                    window.domusAPI.closeTab(data.id);
                };
            }
            
            // Drag and Drop (Sauf Shadow Tabs pour sécurité)
            if (!data.isShadow) {
                tabEl.setAttribute('draggable', 'true');
                tabEl.addEventListener('dragstart', (e) => {
                    draggedTabElement = tabEl;
                    tabEl.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', tabEl.id); // Requis pour que le drag fonctionne correctement dans Electron/Chromium
                });
                tabEl.addEventListener('dragend', () => {
                    tabEl.style.opacity = '1';
                    draggedTabElement = null;
                    document.querySelectorAll('.tab').forEach(t => t.style.borderLeft = '');
                });
                tabEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (draggedTabElement && draggedTabElement !== tabEl) {
                        tabEl.style.borderLeft = '2px solid var(--accent-color, #00ff88)';
                    }
                });
                tabEl.addEventListener('dragleave', () => {
                    tabEl.style.borderLeft = '';
                });
                tabEl.addEventListener('drop', (e) => {
                    e.preventDefault();
                    tabEl.style.borderLeft = '';
                    if (draggedTabElement && draggedTabElement !== tabEl) {
                        tabsContainer.insertBefore(draggedTabElement, tabEl);
                    }
                });
            }
            
            tabsContainer.appendChild(tabEl);

            const wv = document.createElement('webview');
            wv.id = `view-${data.id}`;
            wv.className = (isForCurrentWorkspace && data.active) ? 'active' : '';
            
            wv.setAttribute('preload', './preload.js');
            wv.setAttribute('webpreferences', 'contextIsolation=yes');
            wv.setAttribute('allowpopups', 'yes');
            const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
            wv.setAttribute('useragent', defaultUA);

            if (data.isShadow) {
                wv.setAttribute('partition', `temp:shadow-${data.id}`);
            }
            
            // Gestion des URLs
            let finalUrl = data.url;
            let displayUrl = data.url;
            if (finalUrl.startsWith('domus://')) {
                finalUrl = `./${finalUrl.replace('domus://', '')}.html`;
            }
            wv.src = finalUrl;

            wv.addEventListener('dom-ready', () => {
                if (isVideoAIEnabled) {
                    updateVideoAIEngineForTab(wv, true);
                }
                if (isCinemaMode && wv.id === `view-${activeTabId}`) {
                    setTimeout(() => {
                        injectCinemaModeForWebview(wv);
                    }, 150);
                }
                // Appliquer le zoom dès que le DOM est prêt
                try {
                    const currentUrl = wv.getURL();
                    const domain = getDomainFromUrl(currentUrl);
                    if (domain && currentSettings.domainZoom && currentSettings.domainZoom[domain] !== undefined) {
                        wv.setZoomFactor(currentSettings.domainZoom[domain]);
                    }
                } catch(e) {}
            });


            // Détection et avertissement pour le protocole HTTP non sécurisé
            wv.addEventListener('did-start-navigation', (e) => {
                const url = e.url || '';
                if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
                    showDomusToast("⚠️ Attention : Connexion non sécurisée (HTTP) sur cette page.");
                }
                updateUrlBarSecurityStyle(url);
            });

            // Sync de l'URL bar quand on navigue
            wv.addEventListener('did-stop-loading', () => {
                const currentUrl = wv.getURL();
                if (wv.classList.contains('active')) {
                    if (currentUrl.includes('file://')) {
                        // Re-transformer le chemin de fichier en domus:// pour l'UI
                        const pageName = currentUrl.split('/').pop().replace('.html', '');
                        urlInput.value = `domus://${pageName}`;
                    } else {
                        urlInput.value = currentUrl;
                    }
                    updateUrlBarSecurityStyle(currentUrl);
                    // Mettre à jour l'étoile des favoris
                    updateBookmarkStar(currentUrl);
                }

                // Appliquer le zoom par domaine
                try {
                    const domain = getDomainFromUrl(currentUrl);
                    if (domain && currentSettings.domainZoom && currentSettings.domainZoom[domain] !== undefined) {
                        wv.setZoomFactor(currentSettings.domainZoom[domain]);
                    } else {
                        wv.setZoomFactor(1.0);
                    }
                } catch(e) {}

                // Mettre à jour les piles d'onglets suite au changement d'URL potentiel
                handleTabDomainChange(data.id);
                // Mettre à jour l'état de la session
                const currentTitle = wv.getTitle() || "Sans titre";
                window.domusAPI.updateTabState(data.id, { url: currentUrl, title: currentTitle });
            });

            // Sync du nom de l'onglet avec le titre de la page web
            wv.addEventListener('page-title-updated', (e) => {
                const titleSpan = tabEl.querySelector('.tab-title');
                if (titleSpan && e.title) {
                    titleSpan.textContent = e.title;
                    
                    // 🕒 ENREGISTREMENT HISTORIQUE DYNAMIQUE
                    const currentUrl = wv.getURL();
                    if (currentUrl && !currentUrl.includes('domus://') && !currentUrl.includes('file://') && !data.isShadow) {
                        window.domusAPI.saveToHistory({ title: e.title, url: currentUrl });
                    }
                    // Mettre à jour l'état de la session
                    window.domusAPI.updateTabState(data.id, { title: e.title });
                }
            });

            // Gérer les pannes de chargement réseau
            wv.addEventListener('did-fail-load', (e) => {
                if (e.isMainFrame && e.errorCode !== -3) {
                    const originalUrl = e.validatedURL || wv.getURL();
                    const errorDescription = e.errorDescription || "Unknown network error";
                    const errorCode = e.errorCode || 0;
                    wv.src = `./error.html?url=${encodeURIComponent(originalUrl)}&error=${encodeURIComponent(errorDescription)}&code=${errorCode}`;
                }
            });

            // Gérer la recherche dans la page
            wv.addEventListener('found-in-page', (e) => {
                if (wv.id === `view-${activeTabId}`) {
                    const result = e.result;
                    if (findResults) {
                        findResults.textContent = `${result.activeMatchOrdinal}/${result.matches}`;
                    }
                }
            });

            webviewWrapper.appendChild(wv);
            if (data.active) {
                activeTabElementId = tabEl.id;
                activeTabId = data.id;
            }
        } catch (e) {
            console.error("Renderer Error:", e);
        }
    }

    window.domusAPI.onTabCreated((data) => {
        console.log("Renderer: onTabCreated reçu", data);
        createTabElement(data);
    });

    // --- OPTIMISATIONS : PROGRESS BAR & RACCOURCIS ---
    window.domusAPI.onLoadStateChanged((data) => {
        const progressBar = document.getElementById('loading-progress');
        if (!progressBar) return;

        if (data.loading && data.id === activeTabId) {
            progressBar.style.opacity = '1';
            progressBar.style.width = '30%';
            setTimeout(() => { if (progressBar.style.width === '30%') progressBar.style.width = '70%'; }, 600);
        } else if (data.id === activeTabId) {
            progressBar.style.width = '100%';
            setTimeout(() => {
                progressBar.style.opacity = '0';
                setTimeout(() => { progressBar.style.width = '0%'; }, 300);
            }, 500);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F6' || (e.ctrlKey && e.key === 'l')) {
            e.preventDefault();
            urlInput.focus();
            urlInput.select();
        }
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (activeTabId) window.domusAPI.toggleSplitScreen(activeTabId);
        }
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            document.body.classList.toggle('zen-mode');
            showDomusToast(document.body.classList.contains('zen-mode') ? "Zen Mode Activé 🧘" : "Zen Mode Désactivé");
        }
        if (e.key === 'Escape') {
            closeProfileFlyout();
            hideSuggestions();
            if (hubModal && !hubModal.classList.contains('hidden')) {
                hubModal.classList.add('hidden');
                updateModalState();
            }
        }
    });

    // Gestion des thèmes
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.onclick = () => {
            const theme = dot.dataset.theme;
            document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
            if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
            
            document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            
            showDomusToast(`Atmosphère ${dot.title} activée.`);
        };
    });

    // Update Bio-Shield Stats
    setInterval(() => {
        const trackers = document.getElementById('stat-trackers');
        const ram = document.getElementById('stat-ram');
        if (trackers) trackers.textContent = blockedCounter ? blockedCounter.textContent : '0';
        
        const ramValue = document.getElementById('eco-ram') ? document.getElementById('eco-ram').textContent.replace('MB', '').trim() : '0';
        if (ram) ram.textContent = ramValue;
    }, 2000);

    window.domusAPI.onTabUpdated((data) => {
        const tabEl = document.getElementById(`ui-${data.id}`);
        if (!tabEl) return;
        
        const titleEl = tabEl.querySelector('.tab-title');
        const hibIcon = tabEl.querySelector('.tab-hibernation-icon');
        const isHibernated = data.title && (data.title.includes('En veille') || data.title.includes('💤'));

        if (titleEl && data.title) {
            titleEl.textContent = data.title.replace('En veille :', '').replace('💤', '').trim() || 'Nouvel Onglet';
        }

        if (isHibernated) {
            tabEl.style.opacity = '0.4';
            tabEl.style.filter = 'grayscale(0.8)';
            if (hibIcon) hibIcon.classList.remove('hidden');
        } else {
            tabEl.style.opacity = '1';
            tabEl.style.filter = 'none';
            if (hibIcon) hibIcon.classList.add('hidden');
        }
    });

    window.domusAPI.onTabSwitched((id) => {
        hideSuggestions();
        hideFindInPage();
        
        // Si le mode cinéma est actif, on nettoie l'ancien onglet avant de switcher
        if (isCinemaMode && activeTabId && activeTabId !== id) {
            const oldWv = document.getElementById(`view-${activeTabId}`);
            if (oldWv) {
                removeCinemaModeForWebview(oldWv);
            }
        }
        
        activeTabId = id;
        updateTabsVisibility();
        if (activeTabElementId) {
            const oldTab = document.getElementById(activeTabElementId);
            if (oldTab) oldTab.classList.remove('active');
        }
        activeTabElementId = `ui-${id}`;
        
        // Update Onglets UI
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.id === activeTabElementId);
        });

        // Update Webviews
        const allWebviews = document.querySelectorAll('webview');
        allWebviews.forEach(wv => {
            if (wv.id === `view-${id}`) {
                wv.classList.add('active');
                wv.style.opacity = '1';
                wv.style.pointerEvents = 'auto';
                wv.style.left = '0';
                
                // Si le mode cinéma est actif, on l'injecte dans le nouvel onglet activé!
                if (isCinemaMode) {
                    setTimeout(() => {
                        injectCinemaModeForWebview(wv);
                    }, 150);
                }
                
                try {
                    const currentUrl = wv.getURL();
                    if (currentUrl && !currentUrl.includes('domus://')) {
                        urlInput.value = currentUrl;
                        if (typeof updateUrlBarSecurityStyle === 'function') updateUrlBarSecurityStyle(currentUrl);
                    } else {
                        urlInput.value = 'domus://newtab';
                        if (typeof updateUrlBarSecurityStyle === 'function') updateUrlBarSecurityStyle('domus://newtab');
                    }
                    updateBookmarkStar(currentUrl);
                } catch(e) {
                    urlInput.value = 'domus://newtab';
                    if (typeof updateUrlBarSecurityStyle === 'function') updateUrlBarSecurityStyle('domus://newtab');
                    updateBookmarkStar('domus://newtab');
                }
            } else {
                wv.classList.remove('active');
                wv.style.opacity = '0';
                wv.style.pointerEvents = 'none';
                wv.style.left = '-9999px'; // Hard hide without breaking render process
            }
        });
    });

    window.domusAPI.onSplitStateChanged((id) => {
        // Retirer l'ancien état
        if (splitTabId) {
            const oldSplit = document.getElementById(`ui-${splitTabId}`);
            if (oldSplit) oldSplit.classList.remove('is-split');
        }

        splitTabId = id;

        // Appliquer le nouvel état
        if (splitTabId) {
            const newSplit = document.getElementById(`ui-${splitTabId}`);
            if (newSplit) {
                newSplit.classList.add('is-split');
                showDomusToast("Écran scindé activé.");
            }
        } else {
            showDomusToast("Écran scindé désactivé.");
        }
    });

    window.domusAPI.onTabClosed((id) => {
        hideFindInPage();
        const tabEl = document.getElementById(`ui-${id}`);
        if (tabEl) tabEl.remove();
        
        const wvEl = document.getElementById(`view-${id}`);
        if (wvEl) wvEl.remove();

        audibleTabs.delete(id);
        updateAudioPanel();

        updateTabsVisibility();

        if (tabsContainer.children.length === 0) {
            if (welcomeScreen) {
                welcomeScreen.style.display = 'flex';
                welcomeScreen.style.height = '100%';
                welcomeScreen.style.opacity = '1';
                welcomeScreen.style.pointerEvents = 'auto';
            }
            if (urlInput) urlInput.value = '';
        } else {
            console.log(`[Renderer] onTabClosed: id=${id}, activeTabId=${activeTabId}`);
            
            // On vérifie si l'onglet fermé était l'actif OU s'il n'y a plus aucun onglet actif visuellement
            const activeTabStillExists = document.querySelector('.tab.active') !== null;
            
            if (String(id) === String(activeTabId) || !activeTabStillExists) {
                const visibleTabs = Array.from(document.querySelectorAll('.tab')).filter(t => t.style.display !== 'none' && !t.classList.contains('ws-hidden'));
                console.log(`[Renderer] onTabClosed: visibleTabs.length = ${visibleTabs.length}`);
                if (visibleTabs.length > 0) {
                    const fallbackTab = visibleTabs[visibleTabs.length - 1];
                    const lastTabId = fallbackTab.id.replace('ui-', '');
                    
                    console.log(`[Renderer] onTabClosed: switching to lastTabId = ${lastTabId}`);
                    
                    // FORCER L'UI IMMÉDIATEMENT POUR ÉVITER L'ÉCRAN NOIR
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    fallbackTab.classList.add('active');
                    activeTabElementId = `ui-${lastTabId}`;
                    activeTabId = lastTabId;
                    
                    document.querySelectorAll('webview').forEach(wv => {
                        if (wv.id === `view-${lastTabId}`) {
                            wv.classList.add('active');
                            wv.style.opacity = '1';
                            wv.style.pointerEvents = 'auto';
                            wv.style.left = '0';
                        } else {
                            wv.classList.remove('active');
                            wv.style.opacity = '0';
                            wv.style.pointerEvents = 'none';
                            wv.style.left = '-9999px';
                        }
                    });
                    
                    window.domusAPI.switchTab(lastTabId);
                } else {
                    console.log(`[Renderer] onTabClosed: no visible tabs, showing welcome screen`);
                    if (welcomeScreen) {
                        welcomeScreen.style.display = 'flex';
                        welcomeScreen.style.height = '100%';
                        welcomeScreen.style.opacity = '1';
                        welcomeScreen.style.pointerEvents = 'auto';
                    }
                    if (urlInput) urlInput.value = '';
                }
            } else {
                console.log(`[Renderer] onTabClosed: closed tab is NOT active tab. Keeping current tab.`);
            }
        }
    });

    // =========================================================================
    // 💼 ESPACES DE TRAVAIL (WORKSPACES)
    // =========================================================================
    const wsBtns = document.querySelectorAll('.ws-btn');
    wsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const profile = btn.getAttribute('data-ws');
            window.domusAPI.switchProfile(profile);
        });
    });

    window.domusAPI.onWorkspaceSwitched((data) => {
        currentProfile = data.profile;
        
        // Cacher tous les onglets UI et webviews
        document.querySelectorAll('.tab').forEach(t => {
            t.style.display = 'none';
            t.classList.add('ws-hidden');
        });
        document.querySelectorAll('webview').forEach(wv => {
            wv.classList.remove('active');
            // La visibilité du webview est gérée par la classe .active dans style.css
        });
        
        // Afficher/Créer les onglets du workspace courant
        data.tabs.forEach(tabData => {
            const existingTab = document.getElementById(`ui-${tabData.id}`);
            if (existingTab) {
                existingTab.classList.remove('ws-hidden');
                existingTab.style.display = 'flex'; // Remettre visible
            } else {
                createTabElement(tabData);
            }
        });
        
        // Sélectionner un onglet valide pour ce workspace
        const activeTab = data.tabs.find(t => t.active) || data.tabs[data.tabs.length - 1];
        if (activeTab) {
            window.domusAPI.switchTab(activeTab.id);
        } else {
            window.domusAPI.createTab({ url: 'domus://newtab' });
        }
        
        // Gestion visuelle du mode privé
        if (data.isPrivate) {
            document.body.classList.add('domus-private-mode');
        } else {
            document.body.classList.remove('domus-private-mode');
        }
        
        const label = data.profile === 'private' ? 'Navigation Privée' : data.profile.toUpperCase();
        showDomusToast(`Session : ${label}`);
        
        // Mettre à jour l'état visuel du flyout si ouvert
        if (typeof renderWorkspaces === 'function') {
            renderWorkspaces();
        }
    });

    window.domusAPI.onWorkspaceCounts((data) => {
        const { counts, list } = data;
        const workspaceList = document.getElementById('workspace-list');
        if (!workspaceList) return;
        
        workspaceList.innerHTML = '';
        list.forEach((ws, index) => {
            const item = document.createElement('div');
            item.className = `geo-item ws-btn ${currentProfile === ws.id ? 'active' : ''}`;
            item.dataset.ws = ws.id;
            
            // Les espaces par défaut ne peuvent pas être supprimés
            const isDefault = ['default', 'work', 'private'].includes(ws.id);
            
            item.innerHTML = `
                <div class="ws-info" style="flex: 1; display: flex; align-items: center; gap: 8px;">
                    <span class="ws-icon">${ws.icon}</span>
                    <div style="display: flex; flex-direction: column;">
                        <span class="ws-name" style="font-weight: 500;">${ws.name}</span>
                        <span class="city" style="font-size: 10px; opacity: 0.6;">${counts[ws.id] || 0} onglet(s)</span>
                    </div>
                </div>
                <div class="ws-actions" style="display: none; gap: 5px; align-items: center;">
                    <button class="ws-move" data-dir="up" style="background: none; border: none; color: #aaa; cursor: pointer; padding: 2px;">▲</button>
                    <button class="ws-move" data-dir="down" style="background: none; border: none; color: #aaa; cursor: pointer; padding: 2px;">▼</button>
                    ${!isDefault ? `<button class="ws-delete" style="background: none; border: none; color: #ff4444; cursor: pointer; padding: 2px; margin-left: 5px;">🗑️</button>` : ''}
                </div>
            `;
            
            // Afficher les actions au survol
            item.onmouseenter = () => item.querySelector('.ws-actions').style.display = 'flex';
            item.onmouseleave = () => item.querySelector('.ws-actions').style.display = 'none';

            // Clic principal : Changer d'espace
            item.onclick = (e) => {
                if (e.target.closest('button')) return; // Ignorer si on clique sur un bouton d'action
                window.domusAPI.switchProfile(ws.id);
            };

            // Actions secondaires
            const btnDelete = item.querySelector('.ws-delete');
            if (btnDelete) btnDelete.onclick = async (e) => {
                e.stopPropagation();
                const ok = await showDomusConfirm("Supprimer l'espace", `Veux-tu vraiment supprimer l'espace "${ws.name}" ?`, "🗑️");
                if (ok) window.domusAPI.deleteWorkspace(ws.id);
            };

            item.querySelectorAll('.ws-move').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    window.domusAPI.moveWorkspace(ws.id, btn.dataset.dir);
                };
            });
            
            workspaceList.appendChild(item);
        });
    });


    // =========================================================================
    // 🛡️ LOGIQUE SÉCURITÉ & TPM
    // =========================================================================
    // =========================================================================
    // 🛡️ INITIALISATION & OOBE (Out-of-Box Experience)
    // =========================================================================
    async function initializeDomus() {
        const settings = await window.domusAPI.getSettings();
        currentSettings = settings;
        
        // --- LOGIQUE SIDEBAR DYNAMIQUE ---
        if (settings.useTimeMachineOnly) {
            if (btnFavorites) btnFavorites.style.display = 'none';
        }

        if (settings.sidebarHidden) {
            document.body.classList.add('sidebar-hidden');
            window.domusAPI.toggleSidebar(true);
        }

        // On affiche le wizard si la sécurité ou le wizard lui-même n'est pas validé
        if (!settings.securitySetup || !settings.wizardCompleted) {
            startUnifiedWizard();
        } else {
            // Déjà configuré : Vérification du TPM pour l'auto-déverrouillage matériel
            const tpm = await window.domusAPI.checkTPMStatus();
            const homeUrl = settings.homePage || 'domus://newtab';
            
            if (tpm && tpm.present) {
                // TPM présent : déverrouillage transparent sans mot de passe maître
                const res = await window.domusAPI.initVault('');
                if (res.success) {
                    const restored = await window.domusAPI.restoreSession();
                    if (!restored || !restored.success) {
                        window.domusAPI.newTab(homeUrl);
                    }
                    showDomusToast("Coffre-fort déverrouillé via TPM matériel ! 🛡️");
                } else {
                    // Si échec TPM pour une raison quelconque, on affiche la modale
                    if (securityModal) {
                        securityModal.classList.remove('hidden');
                        updateModalState();
                    }
                    if (masterPwdInput) masterPwdInput.focus();
                }
            } else {
                // Pas de TPM : On affiche la modale pour saisir le mot de passe maître
                if (securityModal) {
                    securityModal.classList.remove('hidden');
                    updateModalState();
                }
                if (masterPwdInput) masterPwdInput.focus();
            }
        }
    }

    async function startUnifiedWizard() {
        const modal = document.getElementById('security-wizard-modal');
        const slides = document.querySelectorAll('.wizard-slide');
        let currentSlideIdx = 0;

        modal.classList.remove('hidden');
        window.domusAPI.resizeActiveTab({ isModalOpen: true });

        const showSlide = (idx) => {
            slides.forEach((s, i) => s.classList.toggle('hidden', i !== idx));
            
            // Mise à jour de la barre de progression
            const progress = ((idx + 1) / slides.length) * 100;
            const progressBar = document.getElementById('wizard-progress-bar');
            if (progressBar) progressBar.style.width = `${progress}%`;

            // Actions spécifiques par slide
            if (idx === 1) runHardwareAudit();      // Slide 2: Innovation
            if (idx === 3) loadDetectedBrowsers(); // Slide 4: Migration
            if (idx === 6) runSecurityAudit();      // Slide 7: Audit Sécurité
        };

        // --- GESTION THÈMES WIZARD ---
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.onclick = () => {
                const theme = opt.dataset.theme;
                document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
                if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
                
                document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                // Synchro Hub
                const hubDot = document.querySelector(`.theme-dot[data-theme="${theme}"]`);
                if (hubDot) {
                    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
                    hubDot.classList.add('active');
                }
            };
        });

        // Navigation Suivant / Précédent
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.onclick = () => {
                if (currentSlideIdx < slides.length - 1) {
                    currentSlideIdx++;
                    showSlide(currentSlideIdx);
                }
            };
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.onclick = () => {
                if (currentSlideIdx > 0) {
                    currentSlideIdx--;
                    showSlide(currentSlideIdx);
                }
            };
        });

        // --- Slide 2: Audit Matériel Rapide ---
        async function runHardwareAudit() {
            const report = await window.domusAPI.checkHardwareFeatures();
            const cpuEl = document.getElementById('hw-cpu');
            const aesEl = document.getElementById('hw-aes');
            if (cpuEl) cpuEl.innerHTML = `CPU : <span style="color:var(--accent-color)">${report.cpu} (${report.cores} cœurs)</span>`;
            if (aesEl) aesEl.innerHTML = `Mémoire : <span style="color:var(--accent-color)">${report.totalMemory} GB RAM</span>`;
        }

        // --- Slide 4: Migration ---
        async function loadDetectedBrowsers() {
            const list = document.getElementById('browser-detected-list');
            if (!list) return;
            list.innerHTML = "Recherche...";
            const browsers = await window.domusAPI.detectBrowsers();
            
            if (browsers.length === 0) {
                list.innerHTML = "<p style='opacity:0.5; font-size:11px;'>Aucun navigateur trouvé.</p>";
            } else {
                list.innerHTML = browsers.map(b => `
                    <div class="browser-item" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
                        <input type="radio" name="target-browser" value="${b.id}" id="br-${b.id}" checked>
                        <label for="br-${b.id}" style="font-size:12px;">${b.name}</label>
                    </div>
                `).join('');
            }
        }

        document.getElementById('btn-start-mig').onclick = async () => {
            const selected = document.querySelector('input[name="target-browser"]:checked');
            const options = {
                fav: document.getElementById('mig-fav').checked,
                hist: document.getElementById('mig-hist').checked,
                pass: document.getElementById('mig-passwords').checked,
                tm: document.getElementById('mig-tm-only').checked
            };
            if (selected) window.domusAPI.startMigration(selected.value, options);
            
            // Appliquer immédiatement le mode TM si choisi
            if (options.tmOnly) {
                const settings = await window.domusAPI.getSettings();
                settings.useTimeMachineOnly = true;
                await window.domusAPI.saveSettings(settings);
                if (btnFavorites) btnFavorites.style.display = 'none';
            }

            currentSlideIdx++;
            showSlide(currentSlideIdx);
        };

        // --- Slide 5: Audit Sécurité & TPM ---
        async function runSecurityAudit() {
            const status = document.querySelector('.report-status');
            const details = document.getElementById('tpm-details');
            const guidance = document.getElementById('tpm-guidance');
            const pwdArea = document.getElementById('password-setup-area');
            const btnFinalize = document.getElementById('btn-finalize-security');
            
            if (status) status.innerHTML = "ANALYSE SÉCURITÉ...";
            const tpm = await window.domusAPI.checkTPMStatus();
            console.log("[DOMUS] Résultat Audit TPM :", tpm);
            
            if (tpm.present) {
                if (status) { status.innerHTML = "🛡️ TPM ACTIF"; status.style.color = "#00ff88"; }
                if (guidance) guidance.innerHTML = "Clé scellée matériellement. Pas de mot de passe requis.";
                if (pwdArea) pwdArea.classList.add('hidden');
            } else {
                if (status) { status.innerHTML = "❌ SÉCURITÉ LOGICIELLE"; status.style.color = "#ffcc00"; }
                if (guidance) guidance.innerHTML = "Utilisation du moteur AEGIS-256 (Master Password requis).";
                if (pwdArea) pwdArea.classList.remove('hidden');
            }

            btnFinalize.onclick = async () => {
                const pwd = document.getElementById('master-pwd-input').value;
                if (!tpm.present && pwd.length < 12) {
                    const err = document.getElementById('pwd-error-msg');
                    if (err) err.textContent = "12 caractères minimum.";
                    return;
                }
                
                window.domusAPI.finalizeSecurity({ password: tpm.present ? null : pwd });
                currentSlideIdx++;
                showSlide(currentSlideIdx);
            };
        }

        // --- Slide 6: Finalisation ---
        document.getElementById('btn-finish-wizard').onclick = async () => {
            const settings = await window.domusAPI.getSettings();
            settings.wizardCompleted = true;
            await window.domusAPI.saveSettings(settings);

            modal.classList.add('hidden');
            window.domusAPI.resizeActiveTab({ isModalOpen: false });
            
            const homeUrl = settings.homePage || 'domus://newtab';
            window.domusAPI.newTab(homeUrl);
            showDomusToast("Domus Pro est prêt !");
        };
    }

    async function loadFavorites() {
        const list = document.getElementById('favorites-list');
        if (!list) return;
        list.innerHTML = '<p style="opacity:0.5; font-size:11px;">Chargement...</p>';
        
        // Simulé pour l'instant ou via IPC si implémenté
        const favorites = await window.domusAPI.getSettings().then(s => s.favorites || []);
        
        if (favorites.length === 0) {
            list.innerHTML = '<p style="opacity:0.4; font-size:11px; text-align:center; margin-top:20px;">Aucun favori enregistré.</p>';
            return;
        }

        list.innerHTML = favorites.map(f => `
            <div class="fav-item" onclick="window.domusAPI.navigate('${f.url}')">
                <span class="fav-icon">⭐</span>
                <div style="flex:1; overflow:hidden;">
                    <div style="font-size:12px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.title}</div>
                    <div style="font-size:9px; opacity:0.5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.url}</div>
                </div>
            </div>
        `).join('');
    }

    async function loadTimeMachine() {
        const list = document.getElementById('tm-archive-list');
        if (!list) return;
        list.innerHTML = '<p style="opacity:0.5; font-size:11px;">Accès au cache chiffré...</p>';
        
        const archives = await window.domusAPI.getArchives();
        
        if (archives.length === 0) {
            list.innerHTML = '<p style="opacity:0.4; font-size:11px; text-align:center; margin-top:20px;">Coffre Time Machine vide.</p>';
            return;
        }

        list.innerHTML = archives.map(a => `
            <div class="tm-item" onclick="window.domusAPI.archivePageReader('${a.id}')">
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:bold;">${a.title}</div>
                    <div class="tm-meta">${a.date} • ${a.url}</div>
                </div>
                <span style="font-size:14px;">🕰️</span>
            </div>
        `).join('');
    }

    // --- RECHERCHE FAVORIS ---
    const favSearch = document.getElementById('fav-search');
    if (favSearch) {
        favSearch.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.fav-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(q) ? 'flex' : 'none';
            });
        };
    }

    // --- GESTION SIDEBAR ---
    if (btnToggleSidebar) btnToggleSidebar.onclick = () => {
        const isHidden = document.body.classList.toggle('sidebar-hidden');
        window.domusAPI.toggleSidebar(isHidden);
        if (isHidden) showDomusToast("Barre latérale masquée (Menu ☰ en haut à gauche)");
    };

    if (btnSidebarReveal) btnSidebarReveal.onclick = () => {
        const isHidden = document.body.classList.toggle('sidebar-hidden');
        window.domusAPI.toggleSidebar(isHidden);
    };

    // --- GESTION HUB DOMUS ---
    // Les sélecteurs sont déjà déclarés en haut du fichier
    
    const openHubFunc = () => {
        hubModal.classList.remove('hidden');
        updateModalState();
    };

    if (btnOpenHub) btnOpenHub.onclick = openHubFunc;
    if (btnOpenHubNav) btnOpenHubNav.onclick = openHubFunc;

    // --- GESTION PROFIL / ESPACES ---
    const btnProfile = document.getElementById('profile-btn');

    if (btnProfile) {
        btnProfile.onclick = (e) => {
            e.stopPropagation();
            profileFlyout.classList.toggle('hidden');
            updateModalState();
        };
    }

    const closeProfileFlyout = () => {
        if (profileFlyout && !profileFlyout.classList.contains('hidden')) {
            profileFlyout.classList.add('hidden');
            updateModalState();
        }
    };

    // Render dynamique des espaces
    const renderWorkspaces = async () => {
        const workspaceList = document.getElementById('workspace-list');
        if (!workspaceList) return;
        
        try {
            const workspaces = await window.domusAPI.getWorkspaces();
            workspaceList.innerHTML = '';
            
            workspaces.forEach(ws => {
                const opt = document.createElement('div');
                opt.className = 'profile-option' + (ws.isPrivate ? ' private' : '') + (ws.id === currentProfile ? ' active' : '');
                opt.dataset.profile = ws.id;
                opt.innerHTML = `<span>${ws.icon}</span> ${ws.name}`;
                
                // Si ce n'est pas un default, on ajoute un bouton suppression
                if (!['default', 'work', 'private'].includes(ws.id)) {
                    const delBtn = document.createElement('button');
                    delBtn.innerHTML = '✕';
                    delBtn.style.cssText = 'margin-left: auto; background: none; border: none; color: #ff4444; cursor: pointer;';
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer l'espace "${ws.name}" ? Les onglets seront renvoyés vers Standard.`)) {
                            window.domusAPI.deleteWorkspace(ws.id);
                        }
                    };
                    opt.appendChild(delBtn);
                }
                
                opt.onclick = () => {
                    window.domusAPI.switchProfile(ws.id);
                    closeProfileFlyout();
                    showDomusToast(`Basculement vers l'espace : ${ws.name}`);
                };
                
                workspaceList.appendChild(opt);
            });
        } catch (e) {
            console.error("Erreur chargement workspaces", e);
        }
    };

    // Charger les espaces au démarrage
    renderWorkspaces();

    // Mettre à jour si modifiés
    if (window.domusAPI.onWorkspacesUpdated) {
        window.domusAPI.onWorkspacesUpdated(() => {
            renderWorkspaces();
        });
    }

    // Modal Création Espace
    const createWsModal = document.getElementById('create-workspace-modal');
    const btnCreateWs = document.getElementById('btn-create-workspace');
    const btnConfirmCreateWs = document.getElementById('btn-confirm-create-ws');
    const wsIconSelector = document.getElementById('ws-icon-selector');
    const wsNameInput = document.getElementById('ws-name-input');
    
    const btnOpenAddWs = document.getElementById('btn-open-add-ws');
    
    if (btnCreateWs && createWsModal) {
        btnCreateWs.onclick = (e) => {
            e.stopPropagation();
            closeProfileFlyout();
            createWsModal.classList.remove('hidden');
        };
    }
    
    if (btnOpenAddWs && createWsModal) {
        btnOpenAddWs.onclick = () => {
            createWsModal.classList.remove('hidden');
        };
    }
    
    let selectedWsIcon = '🚀';
    if (wsIconSelector) {
        wsIconSelector.querySelectorAll('.icon-option').forEach(iconEl => {
            iconEl.onclick = () => {
                wsIconSelector.querySelectorAll('.icon-option').forEach(i => i.classList.remove('active'));
                iconEl.classList.add('active');
                selectedWsIcon = iconEl.dataset.icon;
            };
        });
    }
    
    if (btnConfirmCreateWs) {
        btnConfirmCreateWs.onclick = () => {
            const name = wsNameInput.value.trim();
            if (!name) return alert("Le nom est requis");
            window.domusAPI.addWorkspace(name, selectedWsIcon);
            createWsModal.classList.add('hidden');
            wsNameInput.value = '';
            showDomusToast(`Espace "${name}" créé !`);
        };
    }

    document.addEventListener('click', closeProfileFlyout);

    const btnCloseProfile = document.getElementById('btn-close-profile');
    if (btnCloseProfile) {
        btnCloseProfile.onclick = (e) => {
            e.stopPropagation();
            closeProfileFlyout();
        };
    }

    const isAnyModalOpen = () => {
        const modals = [hubModal, securityModal, addPwdModal, wizardModal, profileFlyout];
        return modals.some(m => m && m.classList && !m.classList.contains('hidden'));
    };

    const updateModalState = () => {
        const isOpen = isAnyModalOpen();
        window.domusAPI.resizeActiveTab({ isModalOpen: isOpen });
        
        // Synchronisation du snapshot container
        if (!isOpen && pageSnapshotBg) {
            pageSnapshotBg.classList.add('hidden');
        }
    };

    if (btnCloseHub) btnCloseHub.onclick = () => {
        hubModal.classList.add('hidden');
        updateModalState();
    };

    const btnCloseHubTop = document.getElementById('btn-close-hub-top');
    if (btnCloseHubTop) btnCloseHubTop.onclick = () => {
        hubModal.classList.add('hidden');
        updateModalState();
    };

    document.querySelectorAll('.hub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.dataset.panel;
            const action = btn.dataset.action;
            
            // Fermer le Hub pour toute action
            hubModal.classList.add('hidden');
            updateModalState();

            // Gestion des panneaux
            if (panelId && sidePanels[panelId]) {
                togglePanel(sidePanels[panelId]);
                if (panelId === 'password') loadPasswords();
                if (panelId === 'favorites') loadFavorites();
                if (panelId === 'timemachine') loadTimeMachine();
            }

            // Gestion des actions (Navigation/Tools)
            if (action) {
                switch(action) {
                    case 'history': window.domusAPI.openHistory(); break;
                    case 'downloads': window.domusAPI.openDownloads(); break;
                    case 'settings': window.domusAPI.openSettings(); break;
                    case 'cinema': toggleCinemaMode(); break;
                    case 'ecoShield': 
                        showDomusToast("Eco-Shield : Protection et performance optimisées 🛡️");
                        break;
                    case 'securityAudit':
                        window.domusAPI.newTab('domus://security-audit');
                        break;
                    case 'videoAI':
                        toggleVideoAIEngine();
                        break;
                }
            }
        });
    });

    const btnDevHub = document.getElementById('hub-btn-dev');
    if (btnDevHub) {
        btnDevHub.onclick = () => {
            hubModal.classList.add('hidden');
            updateModalState();
            showDomusToast("Dev Studio : Accès réservé (Version Pro Plus requis)");
        };
    }

    // --- GESTION DES TRANSITIONS ---
    const transitionOverlay = document.getElementById('page-transition-overlay');
    
    window.domusAPI.onStartFade(() => {
        if (transitionOverlay) {
            transitionOverlay.classList.remove('hidden');
            transitionOverlay.classList.add('active');
        }
    });

    window.domusAPI.onEndFade(() => {
        if (transitionOverlay) {
            setTimeout(() => {
                transitionOverlay.classList.remove('active');
                setTimeout(() => transitionOverlay.classList.add('hidden'), 300);
            }, 50);
        }
    });

    // Sécurité : Masquer le splash screen quoi qu'il arrive après 2.5s
    setTimeout(() => {
        if (welcomeScreen && welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
        }
    }, 2500);

    // Lancer l'initialisation
    initializeDomus().catch(err => {
        console.error("Échec initialisation Domus:", err);
        if (welcomeScreen) welcomeScreen.style.display = 'none';
    });


    // =========================================================================
    // ◀▶ NAVIGATION
    // =========================================================================
    if (btnBack) btnBack.onclick = () => { const av = document.querySelector('webview.active'); if (av) av.canGoBack() && av.goBack(); };
    if (btnForward) btnForward.onclick = () => { const av = document.querySelector('webview.active'); if (av) av.canGoForward() && av.goForward(); };
    if (btnReload) btnReload.onclick = () => { const av = document.querySelector('webview.active'); if (av) av.reload(); };

    let inhibitUrlCompletion = false;

    const POPULAR_DOMAINS = [
        "youtube.fr", "youtube.com",
        "google.fr", "google.com",
        "github.com",
        "wikipedia.org",
        "netflix.com",
        "amazon.fr", "amazon.com",
        "proton.me", "protonmail.com",
        "facebook.com",
        "twitter.com", "x.com",
        "linkedin.com",
        "reddit.com",
        "gmail.com",
        "outlook.com",
        "instagram.com",
        "discord.com"
    ];

    urlInput.addEventListener('input', (e) => {
        if (inhibitUrlCompletion) return;
        const text = urlInput.value;
        if (!text) return;

        // Si le texte commence par un protocole ou contient des slashes, on n'autocomplète pas
        if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('file://') || text.startsWith('domus://') || text.includes('/')) return;

        const textLower = text.toLowerCase();
        const match = POPULAR_DOMAINS.find(domain => domain.toLowerCase().startsWith(textLower) && domain.length > textLower.length);
        
        if (match) {
            const start = text.length;
            urlInput.value = text + match.substring(start);
            urlInput.setSelectionRange(start, urlInput.value.length);
        }
    });

    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            inhibitUrlCompletion = true;
        } else {
            inhibitUrlCompletion = false;
        }

        const items = domusSuggestBox.querySelectorAll('.suggestion-item');
        const isVisible = domusSuggestBox.style.display !== 'none' && items.length > 0;

        if (e.key === 'Escape') {
            hideSuggestions();
            return;
        }

        if (isVisible) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
                updateSuggestionHighlight();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
                updateSuggestionHighlight();
                return;
            } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                e.preventDefault();
                const item = items[selectedSuggestionIndex];
                if (item.dataset.url) {
                    urlInput.value = item.dataset.url;
                } else if (item.dataset.text) {
                    urlInput.value = item.dataset.text;
                } else {
                    urlInput.value = item.textContent;
                }
                hideSuggestions();
                urlInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                return;
            }
        }

        if (e.key === 'Enter') {
            let url = urlInput.value.trim();
            if (!url.includes('.') && !url.startsWith('http') && !url.startsWith('domus://')) {
                let engineUrl = 'https://www.google.com/search?q=';
                if (currentSettings.searchEngine === 'duckduckgo') engineUrl = 'https://duckduckgo.com/?q=';
                if (currentSettings.searchEngine === 'bing') engineUrl = 'https://www.bing.com/search?q=';
                url = `${engineUrl}${encodeURIComponent(url)}`;
            } else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('domus://')) {
                url = `https://${url}`;
            }
            // Navigation unifiée (Direct Webview)
            const activeWv = document.querySelector('webview.active');
            if (activeWv) activeWv.src = url;
            hideSuggestions();
            urlInput.blur();
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            hideSuggestions();
            urlInput.blur();
        }
    });

    urlInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 1) {
            try {
                // 1. Local favorites matching
                const favorites = currentSettings.favorites || [];
                const favMatches = favorites.filter(f => 
                    (f.title && f.title.toLowerCase().includes(query)) || 
                    (f.url && f.url.toLowerCase().includes(query))
                ).map(f => ({ type: 'favorite', title: f.title, url: f.url }));

                // 2. Local history matching
                const history = await window.domusAPI.getHistory() || [];
                const histMatches = [];
                const seenUrls = new Set();
                for (const h of history) {
                    if (histMatches.length >= 5) break;
                    if (seenUrls.has(h.url)) continue;
                    if ((h.title && h.title.toLowerCase().includes(query)) || 
                        (h.url && h.url.toLowerCase().includes(query))) {
                        histMatches.push({ type: 'history', title: h.title, url: h.url });
                        seenUrls.add(h.url);
                    }
                }

                // 3. Web suggestions matching
                let webMatches = [];
                try {
                    const rawWeb = await window.domusAPI.fetchSuggestions(query) || [];
                    webMatches = rawWeb.map(w => ({ type: 'web', text: w }));
                } catch (err) {}

                // Merge
                const merged = [...favMatches.slice(0, 3), ...histMatches.slice(0, 3), ...webMatches.slice(0, 5)];

                if (document.activeElement === urlInput && merged.length > 0) {
                    showSuggestions(merged);
                } else {
                    hideSuggestions();
                }
            } catch (err) { }
        } else {
            hideSuggestions();
        }
    }, 250));

    // --- ZEN MODE SHORTCUT (Alt+Z) ---
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            isZenMode = !isZenMode;
            document.body.classList.toggle('zen-mode', isZenMode);
            window.domusAPI.toggleZenMode(isZenMode);
            showDomusToast(isZenMode ? "Mode Zen Activé (Focus Content)" : "Mode Zen Désactivé");
        }
    });

    urlInput.addEventListener('blur', () => setTimeout(hideSuggestions, 150));

    window.domusAPI.onNavigationUpdate((data) => {
        // --- CINEMATIC NAVIGATION EFFECT ---
        document.body.classList.add('page-switching');
        setTimeout(() => document.body.classList.remove('page-switching'), 500);

        urlInput.value = data.url;
        hideSuggestions();
    });

    window.domusAPI.onEcoUpdate((data) => {
        const ecoRam = document.getElementById('eco-ram');
        if (ecoRam) ecoRam.innerText = `${data.saved}MB`;
    });

    // Suppression de l'ancienne logique redondante


    // =========================================================================
    // 🎚️ STUDIO AUDIO
    // =========================================================================
    window.domusAPI.onTabAudioUpdate((data) => {
        const { id, isAudible } = data;
        const tabEl = document.getElementById(`ui-${id}`);
        if (tabEl) {
            const icon = tabEl.querySelector('.tab-audio-icon');
            if (icon) icon.classList.toggle('hidden', !isAudible);
        }
        if (isAudible) audibleTabs.set(id, true);
        else audibleTabs.delete(id);
        updateAudioPanel();
    });

    function updateAudioPanel() {
        if (!audioList) return;
        audioList.innerHTML = '';

        if (audibleTabs.size === 0) {
            audioList.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.4;"><div style="font-size:30px; margin-bottom:10px;">🔇</div><p style="font-size:11px;">Aucune source sonore détectée.</p></div>';
            return;
        }

        audibleTabs.forEach((_, id) => {
            const tabEl = document.getElementById(`ui-${id}`);
            const title = tabEl ? tabEl.querySelector('.tab-title').textContent : "Onglet distant";
            
            const track = document.createElement('div');
            track.className = 'audio-track';
            
            track.innerHTML = `
                <div class="audio-track-info">
                    <span class="audio-track-title">${title}</span>
                    <div class="audio-visualizer">
                        <div class="audio-bar"></div>
                        <div class="audio-bar"></div>
                        <div class="audio-bar"></div>
                        <div class="audio-bar"></div>
                    </div>
                </div>
                <div class="volume-control">
                    <span style="font-size:10px;">🔈</span>
                    <input type="range" class="volume-slider" min="0" max="100" value="100" data-id="${id}">
                    <span style="font-size:10px;">🔊</span>
                </div>
                <div class="audio-actions">
                    <button class="action-btn btn-mute-tab" data-id="${id}" style="font-size:10px; padding:4px 8px;">Couper</button>
                    <button class="action-btn secondary btn-solo-tab" data-id="${id}" style="font-size:10px; padding:4px 8px;">Solo</button>
                </div>
            `;

            // Slider Volume
            const slider = track.querySelector('.volume-slider');
            slider.oninput = (e) => {
                window.domusAPI.setTabVolume(id, parseInt(e.target.value));
            };

            // Bouton Muet
            track.querySelector('.btn-mute-tab').onclick = (e) => {
                const isMuting = e.target.textContent === 'Couper';
                window.domusAPI.setTabMute(id, isMuting);
                e.target.textContent = isMuting ? 'Activer' : 'Couper';
                e.target.style.background = isMuting ? '#444' : 'var(--accent-color)';
            };

            // Bouton Solo
            track.querySelector('.btn-solo-tab').onclick = () => {
                audibleTabs.forEach((_, otherId) => {
                    window.domusAPI.setTabMute(otherId, otherId !== id);
                });
                updateAudioPanel();
            };

            audioList.appendChild(track);
        });
    }

    // Gestionnaire Silence Global
    const btnMuteAll = document.getElementById('btn-mute-all');
    if (btnMuteAll) {
        btnMuteAll.onclick = () => {
            audibleTabs.forEach((_, id) => window.domusAPI.setTabMute(id, true));
            showDomusToast("Silence radio activé sur tous les onglets.");
        };
    }

    // =========================================================================
    // 🏛️ NAVIGATION DES PANNEAUX
    // =========================================================================
    function togglePanel(targetPanel) {
        if (!targetPanel) return;
        const isCurrentlyHidden = targetPanel.classList.contains('hidden');
        Object.values(sidePanels).forEach(p => { if (p) p.classList.add('hidden'); });
        if (isCurrentlyHidden) {
            targetPanel.classList.remove('hidden');
            window.domusAPI.resizeActiveTab({ hasPanel: true });
        } else {
            window.domusAPI.resizeActiveTab({ hasPanel: false });
        }
    }

    // Gestionnaire global pour les boutons de fermeture des panneaux
    document.querySelectorAll('.panel-close').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const panelId = btn.dataset.close;
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('hidden');
                window.domusAPI.resizeActiveTab({ hasPanel: false });
            }
        };
    });

    // Boutons de fermeture des modales
    const btnCloseWizard = document.getElementById('btn-close-wizard');
    if (btnCloseWizard) {
        btnCloseWizard.onclick = () => {
            wizardModal.classList.add('hidden');
            updateModalState();
        };
    }

    const btnCloseAddPwd = document.getElementById('btn-close-add-pwd');
    if (btnCloseAddPwd) {
        btnCloseAddPwd.onclick = () => {
            addPwdModal.classList.add('hidden');
            updateModalState();
            if (typeof resetPwdGenerator === 'function') resetPwdGenerator();
        };
    }

    const btnCloseSecurity = document.getElementById('btn-close-security');
    if (btnCloseSecurity) {
        btnCloseSecurity.onclick = () => {
            securityModal.classList.add('hidden');
            updateModalState();
        };
    }

    // =========================================================================
    // ⚡ VIDEO AI ENGINE (HDR & UPSCALING SIMULATION)
    // =========================================================================
    function updateVideoAIEngineForTab(wv, enabled) {
        if (!wv) return;
        if (enabled) {
            // Injection CSS globale native - 100% exécutée par le GPU basse consommation et 0% de CPU
            // OPTIMISÉ : filtre plus clair et plus lumineux (contrast 1.02, saturate 1.15, brightness 1.08) pour éviter l'assombrissement
            wv.insertCSS(`
                video {
                    filter: contrast(1.02) saturate(1.15) brightness(1.08) !important;
                    transition: filter 0.3s ease !important;
                }
            `).then(key => {
                wv._domusCSSKey = key;
            }).catch(e => console.log("Video AI CSS inject error:", e));
        } else {
            if (wv._domusCSSKey) {
                wv.removeInsertedCSS(wv._domusCSSKey).catch(e => console.log("Video AI CSS remove error:", e));
                wv._domusCSSKey = null;
            }
            // Annulation du filtre en écrasant la règle pour restaurer l'état natif
            wv.insertCSS(`
                video {
                    filter: none !important;
                }
            `).catch(e => {});
        }
    }

    function toggleVideoAIEngine() {
        isVideoAIEnabled = !isVideoAIEnabled;
        const btnVideoAI = document.getElementById('btn-video-ai');
        if (btnVideoAI) {
            btnVideoAI.classList.toggle('active', isVideoAIEnabled);
            btnVideoAI.style.color = isVideoAIEnabled ? 'var(--accent-color)' : '';
        }
        
        // Appliquer à tous les webviews existants
        document.querySelectorAll('webview').forEach(wv => {
            updateVideoAIEngineForTab(wv, isVideoAIEnabled);
        });

        showDomusToast(isVideoAIEnabled 
            ? "Video AI Engine : Simulation HDR & Sharpness 100% Active ⚡" 
            : "Video AI Engine : Traitement d'image Désactivé"
        );
    }

    const btnVideoAI = document.getElementById('btn-video-ai');
    if (btnVideoAI) btnVideoAI.addEventListener('click', () => toggleVideoAIEngine());

    // =========================================================================
    // 🎬 MOTEUR CINÉMATIQUE IMMERSIF (FOCUS VIDÉO)
    // =========================================================================
    let cinemaExitBtn = null;

    function updateCinemaFloatingButton() {
        if (isCinemaMode) {
            if (!cinemaExitBtn) {
                cinemaExitBtn = document.createElement('div');
                cinemaExitBtn.id = 'cinema-exit-btn';
                cinemaExitBtn.innerHTML = 'Quitter le Mode Cinéma ✕';
                cinemaExitBtn.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.85);
                    color: #00ff88;
                    border: 1px solid rgba(0, 255, 136, 0.4);
                    padding: 10px 18px;
                    border-radius: 30px;
                    font-family: inherit;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    z-index: 9999999;
                    box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
                    transition: all 0.3s ease;
                    opacity: 0.8;
                    user-select: none;
                `;
                cinemaExitBtn.onmouseenter = () => {
                    cinemaExitBtn.style.opacity = '1';
                    cinemaExitBtn.style.boxShadow = '0 0 25px rgba(0, 255, 136, 0.5)';
                    cinemaExitBtn.style.transform = 'scale(1.05)';
                };
                cinemaExitBtn.onmouseleave = () => {
                    cinemaExitBtn.style.opacity = '0.8';
                    cinemaExitBtn.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.2)';
                    cinemaExitBtn.style.transform = 'scale(1)';
                };
                cinemaExitBtn.onclick = () => {
                    toggleCinemaMode();
                };
                document.body.appendChild(cinemaExitBtn);
            }
            cinemaExitBtn.style.display = 'block';
        } else {
            if (cinemaExitBtn) {
                cinemaExitBtn.style.display = 'none';
            }
        }
    }

    function injectCinemaModeForWebview(wv) {
        if (!wv) return;
        
        // CSS d'isolation et d'assombrissement avec effet Premium Domus
        wv.insertCSS(`
            .domus-cinema-overlay {
                position: fixed !important;
                z-index: 999999999 !important;
                pointer-events: none !important;
                box-sizing: border-box !important;
                border: 2px solid rgba(0, 255, 136, 0) !important;
                border-radius: 12px !important;
                box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0), 0 0 0px rgba(0, 255, 136, 0) !important;
                transition: box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.4s ease, top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease !important;
            }
            .domus-cinema-overlay.active {
                border-color: rgba(0, 255, 136, 0.5) !important;
                box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.88), 0 0 35px rgba(0, 255, 136, 0.45) !important;
            }
        `).then(key => {
            cinemaCSSKeys.set(activeTabId, key);
        }).catch(e => console.log("Cinema CSS error:", e));

        wv.executeJavaScript(`
            (function() {
                function findVideoContainer() {
                    let known = document.querySelector('#movie_player') || 
                                 document.querySelector('.html5-video-player') || 
                                 document.querySelector('.video-player') || 
                                 document.querySelector('.jwplayer') || 
                                 document.querySelector('.vjs-tech') || 
                                 document.querySelector('.plyr');
                    if (known) return known;
                    
                    let video = document.querySelector('video');
                    if (!video) return null;
                    
                    let container = video;
                    let parent = video.parentElement;
                    let videoRect = video.getBoundingClientRect();
                    
                    while (parent && parent !== document.body) {
                        let parentRect = parent.getBoundingClientRect();
                        if (Math.abs(parentRect.width - videoRect.width) < 20 && Math.abs(parentRect.height - videoRect.height) < 20) {
                            container = parent;
                        } else {
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    return container;
                }
                
                let target = findVideoContainer();
                if (!target) return;
                
                // Nettoyer l'état précédent
                if (typeof window._domusCinemaCleanup === 'function') {
                    window._domusCinemaCleanup();
                }
                
                // Créer l'overlay
                let overlay = document.createElement('div');
                overlay.className = 'domus-cinema-overlay';
                document.body.appendChild(overlay);
                
                function updateHole() {
                    if (!target || !overlay) return;
                    let rect = target.getBoundingClientRect();
                    
                    if (rect.width === 0 || rect.height === 0) {
                        overlay.style.display = 'none';
                        return;
                    }
                    
                    overlay.style.display = 'block';
                    overlay.style.top = rect.top + 'px';
                    overlay.style.left = rect.left + 'px';
                    overlay.style.width = rect.width + 'px';
                    overlay.style.height = rect.height + 'px';
                    
                    let targetStyle = window.getComputedStyle(target);
                    overlay.style.borderRadius = targetStyle.borderRadius || '8px';
                }
                
                updateHole();
                
                setTimeout(() => {
                    if (overlay) overlay.classList.add('active');
                }, 10);
                
                let resizeObserver = new ResizeObserver(() => {
                    updateHole();
                });
                resizeObserver.observe(target);
                
                window.addEventListener('scroll', updateHole, { passive: true, capture: true });
                window.addEventListener('resize', updateHole, { passive: true });
                
                window._domusCinemaCleanup = function() {
                    if (resizeObserver) {
                        resizeObserver.disconnect();
                    }
                    window.removeEventListener('scroll', updateHole, { capture: true });
                    window.removeEventListener('resize', updateHole);
                    if (overlay) {
                        overlay.remove();
                    }
                    window._domusCinemaCleanup = null;
                };
            })();
        `).catch(e => console.log("Cinema JS error:", e));
    }

    function removeCinemaModeForWebview(wv) {
        if (!wv) return;
        
        // Retirer le style et l'overlay de la webview de manière propre et animée
        wv.executeJavaScript(`
            (function() {
                let overlay = document.querySelector('.domus-cinema-overlay');
                if (overlay) {
                    overlay.classList.remove('active');
                    setTimeout(() => {
                        if (typeof window._domusCinemaCleanup === 'function') {
                            window._domusCinemaCleanup();
                        } else if (overlay) {
                            overlay.remove();
                        }
                    }, 400);
                } else {
                    if (typeof window._domusCinemaCleanup === 'function') {
                        window._domusCinemaCleanup();
                    }
                }
            })();
        `).catch(e => {});

        // Attendre la fin de l'animation de sortie avant de supprimer le CSS
        const key = cinemaCSSKeys.get(activeTabId);
        if (key) {
            setTimeout(() => {
                wv.removeInsertedCSS(key).catch(e => {});
            }, 450);
            cinemaCSSKeys.delete(activeTabId);
        }
    }

    function toggleCinemaMode() {
        isCinemaMode = !isCinemaMode;
        
        const btnCinema = document.getElementById('btn-cinema');
        if (btnCinema) {
            btnCinema.classList.toggle('active', isCinemaMode);
            btnCinema.style.color = isCinemaMode ? 'var(--accent-color)' : '';
        }
        
        document.body.classList.toggle('cinema-mode', isCinemaMode);
        
        const activeWv = document.getElementById(`view-${activeTabId}`);
        if (activeWv) {
            if (isCinemaMode) {
                injectCinemaModeForWebview(activeWv);
            } else {
                removeCinemaModeForWebview(activeWv);
            }
        }
        
        showDomusToast(isCinemaMode 
            ? "Mode Cinématique Activé (Focus Vidéo 🎬)" 
            : "Mode Cinématique Désactivé"
        );
        
        updateCinemaFloatingButton();
    }

    // Écouteur global pour quitter le mode cinéma avec la touche Echap
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isCinemaMode) {
            e.preventDefault();
            toggleCinemaMode();
        }
    });

    // =========================================================================
    // 📚 TAB STACKING (GROUPEMENT PAR DOMAINE)
    // =========================================================================
    function getTabDomain(tabId) {
        const wv = document.getElementById(`view-${tabId}`);
        if (!wv) return null;
        try {
            const url = wv.getURL();
            if (!url || url.startsWith('domus://') || url.startsWith('file://')) return null;
            const parsed = new URL(url);
            return parsed.hostname.replace('www.', '');
        } catch (e) {
            return null;
        }
    }

    function handleTabDomainChange(tabId) {
        updateTabsVisibility();
    }

    function updateTabsVisibility() {
        document.querySelectorAll('.tab').forEach(tabEl => {
            if (tabEl.classList.contains('ws-hidden')) return;
            tabEl.classList.remove('stacked-tab', 'stack-leader', 'stack-collapsed', 'stack-expanded');
            tabEl.style.display = '';
            const badge = tabEl.querySelector('.stack-badge');
            if (badge) badge.remove();
        });
    }

    function showTabContextMenu(e, tabId) {
        e.preventDefault();
        
        let menu = document.getElementById('domus-tab-context-menu');
        if (menu) menu.remove();

        menu = document.createElement('div');
        menu.id = 'domus-tab-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${e.clientY}px;
            left: ${e.clientX}px;
            background: rgba(13, 13, 16, 0.95);
            border: 1px solid var(--accent-color, #00ff88);
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            backdrop-filter: blur(15px);
            z-index: 9999999;
            padding: 6px 0;
            min-width: 180px;
        `;

        const options = [];

        options.push({
            text: "✕ Fermer cet onglet",
            action: () => {
                window.domusAPI.closeTab(tabId);
            }
        });

        options.push({
            text: "🔄 Recharger cet onglet",
            action: () => {
                const wv = document.getElementById('view-' + tabId);
                if (wv) wv.reload();
            }
        });

        options.push({
            text: "👥 Dupliquer cet onglet",
            action: () => {
                const wv = document.getElementById('view-' + tabId);
                if (wv) {
                    try {
                        window.domusAPI.createTab({ url: wv.getURL() });
                    } catch(e) {}
                }
            }
        });

        options.push({
            text: "Ghost/Incognito",
            isSubMenu: true,
            action: (itemDiv) => {
                let subMenu = document.getElementById('domus-ws-submenu');
                if (subMenu) subMenu.remove();
                
                subMenu = document.createElement('div');
                subMenu.id = 'domus-ws-submenu';
                const rect = itemDiv.getBoundingClientRect();
                subMenu.style.cssText = `
                    position: fixed; top: ${rect.top}px; left: ${rect.right + 2}px;
                    background: rgba(13, 13, 16, 0.95); border: 1px solid var(--accent-color, #00ff88);
                    border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                    backdrop-filter: blur(15px); z-index: 10000000; padding: 6px 0; min-width: 150px;
                `;
                
                const shadowItem = document.createElement('div');
                shadowItem.textContent = "👻 Onglet Shadow (Privé)";
                shadowItem.style.cssText = "padding: 10px 16px; font-size: 13px; color: #e0e0e6; cursor: pointer; transition: background 0.2s, color 0.2s;";
                shadowItem.onmouseenter = () => { shadowItem.style.background = 'rgba(0, 255, 136, 0.1)'; shadowItem.style.color = 'var(--accent-color, #00ff88)'; };
                shadowItem.onmouseleave = () => { shadowItem.style.background = 'transparent'; shadowItem.style.color = '#e0e0e6'; };
                shadowItem.onclick = (ev) => {
                    ev.stopPropagation();
                    const wv = document.getElementById('view-' + tabId);
                    if (wv) {
                        try {
                            window.domusAPI.createTab({ url: wv.getURL(), isShadow: true });
                        } catch(e) {}
                    }
                    subMenu.remove();
                    menu.remove();
                };
                subMenu.appendChild(shadowItem);
                document.body.appendChild(subMenu);
            }
        });

        options.push({
            text: "🔒 Fermer les autres onglets",
            action: () => {
                const allTabs = Array.from(document.querySelectorAll('.tab'));
                allTabs.forEach(t => {
                    const id = t.id.replace('ui-', '');
                    if (id !== String(tabId)) {
                        window.domusAPI.closeTab(id);
                    }
                });
            }
        });

        options.push({
            text: "➡️ Fermer les onglets à droite",
            action: () => {
                const allTabs = Array.from(document.querySelectorAll('.tab'));
                let found = false;
                allTabs.forEach(t => {
                    const id = t.id.replace('ui-', '');
                    if (id === String(tabId)) {
                        found = true;
                        return;
                    }
                    if (found) {
                        window.domusAPI.closeTab(id);
                    }
                });
            }
        });

        // Option: Déplacer vers l'espace...
        options.push({
            text: "Déplacer vers l'espace...",
            isSubMenu: true,
            action: async (itemDiv) => {
                const workspaces = await window.domusAPI.getWorkspaces();
                
                // Créer le sous-menu
                let subMenu = document.getElementById('domus-ws-submenu');
                if (subMenu) subMenu.remove();
                
                subMenu = document.createElement('div');
                subMenu.id = 'domus-ws-submenu';
                
                const rect = itemDiv.getBoundingClientRect();
                subMenu.style.cssText = `
                    position: fixed;
                    top: ${rect.top}px;
                    left: ${rect.right + 2}px;
                    background: rgba(13, 13, 16, 0.95);
                    border: 1px solid var(--accent-color, #00ff88);
                    border-radius: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                    backdrop-filter: blur(15px);
                    z-index: 10000000;
                    padding: 6px 0;
                    min-width: 150px;
                `;
                
                workspaces.forEach(ws => {
                    if (ws.id === currentProfile) return; // Ne pas afficher l'espace actuel
                    
                    const subItem = document.createElement('div');
                    subItem.textContent = `${ws.icon} ${ws.name}`;
                    subItem.style.cssText = `
                        padding: 10px 16px;
                        font-size: 13px;
                        color: #e0e0e6;
                        cursor: pointer;
                        transition: background 0.2s, color 0.2s;
                    `;
                    subItem.onmouseenter = () => {
                        subItem.style.background = 'rgba(0, 255, 136, 0.1)';
                        subItem.style.color = 'var(--accent-color, #00ff88)';
                    };
                    subItem.onmouseleave = () => {
                        subItem.style.background = 'transparent';
                        subItem.style.color = '#e0e0e6';
                    };
                    subItem.onclick = (ev) => {
                        ev.stopPropagation();
                        window.domusAPI.moveTabToWorkspace(tabId, ws.id);
                        
                        // Retirer visuellement l'onglet s'il n'est plus dans le workspace courant
                        const tabEl = document.getElementById(`ui-${tabId}`);
                        if (tabEl) tabEl.remove();
                        const wv = document.getElementById(`view-${tabId}`);
                        if (wv) wv.style.display = 'none';
                        
                        // Sélectionner le dernier onglet restant ou créer un nouveau si vide
                        const remainingTabs = Array.from(document.querySelectorAll('.tab'));
                        if (remainingTabs.length > 0) {
                            remainingTabs[remainingTabs.length - 1].click();
                        } else {
                            window.domusAPI.createTab({ url: 'domus://newtab' });
                        }
                        
                        showDomusToast(`Onglet déplacé vers ${ws.name}`);
                        
                        subMenu.remove();
                        menu.remove();
                    };
                    subMenu.appendChild(subItem);
                });
                
                document.body.appendChild(subMenu);
            }
        });

        options.forEach(opt => {
            const item = document.createElement('div');
            item.textContent = opt.text;
            item.style.cssText = `
                padding: 10px 16px;
                font-size: 13px;
                color: #e0e0e6;
                cursor: pointer;
                transition: background 0.2s, color 0.2s;
            `;
            
            item.onmouseenter = () => {
                item.style.background = 'rgba(0, 255, 136, 0.1)';
                item.style.color = 'var(--accent-color, #00ff88)';
            };
            item.onmouseleave = () => {
                item.style.background = 'transparent';
                item.style.color = '#e0e0e6';
            };
            
            item.onclick = (ev) => {
                if (opt.isSubMenu) {
                    ev.stopPropagation(); // Keep menu open for sub-menu
                    opt.action(item);
                } else {
                    opt.action();
                    menu.remove();
                }
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const closeMenu = (ev) => {
            if (ev.target.closest('#domus-ws-submenu')) return; // ignore clicks inside submenu
            menu.remove();
            const subMenu = document.getElementById('domus-ws-submenu');
            if (subMenu) subMenu.remove();
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }

    function showWebviewContextMenu(e, params, wv) {
        let menu = document.getElementById('domus-webview-context-menu');
        if (menu) menu.remove();

        menu = document.createElement('div');
        menu.id = 'domus-webview-context-menu';

        // Coordonnées corrigées : utiliser les coords client de l'event JS plutôt que params.x/y relatifs à la webview
        const clientX = e.clientX || (wv.getBoundingClientRect().left + params.x);
        const clientY = e.clientY || (wv.getBoundingClientRect().top  + params.y);

        menu.style.cssText = `
            position: fixed;
            top: ${clientY}px;
            left: ${clientX}px;
            background: rgba(13, 13, 16, 0.97);
            border: 1px solid var(--accent-color, #00ff88);
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            backdrop-filter: blur(15px);
            z-index: 9999999;
            padding: 4px 0;
            min-width: 230px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        const currentUrl = params.pageURL || wv.getURL();
        const linkUrl    = params.linkURL  || '';
        const srcUrl     = params.srcURL   || '';
        const mediaType  = params.mediaType || 'none';
        const selection  = params.selectionText || '';
        const isEditable = params.isEditable || false;

        const options = [];

        // ── Lien ──────────────────────────────────────────────────────────────
        if (linkUrl && linkUrl !== currentUrl) {
            options.push({ icon: '🔗', text: "Ouvrir le lien dans un nouvel onglet", action: () => window.domusAPI.createTab({ url: linkUrl }) });
            options.push({ icon: '📋', text: "Copier l'adresse du lien", action: () => { navigator.clipboard.writeText(linkUrl); showDomusToast('Lien copié.'); } });
            options.push({ separator: true });
        }

        // ── Image ──────────────────────────────────────────────────────────────
        if (mediaType === 'image' && srcUrl) {
            options.push({ icon: '🖼️', text: "Ouvrir l'image dans un nouvel onglet", action: () => window.domusAPI.createTab({ url: srcUrl }) });
            options.push({ icon: '💾', text: "Enregistrer l'image",                  action: () => wv.downloadURL(srcUrl) });
            options.push({ icon: '📋', text: "Copier l'adresse de l'image",          action: () => { navigator.clipboard.writeText(srcUrl); showDomusToast("URL de l'image copiée."); } });
            options.push({ separator: true });
        }

        // ── Vidéo ──────────────────────────────────────────────────────────────
        if (mediaType === 'video' && srcUrl) {
            options.push({ icon: '▶️', text: "Ouvrir la vidéo dans un nouvel onglet", action: () => window.domusAPI.createTab({ url: srcUrl }) });
            options.push({ icon: '💾', text: "Enregistrer la vidéo",                  action: () => wv.downloadURL(srcUrl) });
            options.push({ separator: true });
        }

        // ── Texte sélectionné ──────────────────────────────────────────────────
        if (selection && selection.trim().length > 0) {
            const shortSel = selection.length > 30 ? selection.substring(0, 30) + '…' : selection;
            options.push({ icon: '📋', text: `Copier "${shortSel}"`,     action: () => { navigator.clipboard.writeText(selection); showDomusToast('Texte copié.'); } });
            options.push({ icon: '🔍', text: `Rechercher "${shortSel}"`, action: () => window.domusAPI.createTab({ url: `https://www.google.com/search?q=${encodeURIComponent(selection)}` }) });
            options.push({ separator: true });
        }

        // ── Champ éditable ─────────────────────────────────────────────────────
        if (isEditable) {
            options.push({ icon: '✂️', text: 'Couper',            action: () => wv.executeJavaScript('document.execCommand("cut")') });
            options.push({ icon: '📋', text: 'Copier',            action: () => wv.executeJavaScript('document.execCommand("copy")') });
            options.push({ icon: '📌', text: 'Coller',            action: async () => { const t = await navigator.clipboard.readText(); wv.executeJavaScript(`document.execCommand('insertText',false,${JSON.stringify(t)})`); } });
            options.push({ icon: '🔠', text: 'Tout sélectionner', action: () => wv.executeJavaScript('document.execCommand("selectAll")') });
            options.push({ separator: true });
        }

        // ── Navigation ─────────────────────────────────────────────────────────
        if (wv.canGoBack())    options.push({ icon: '⬅️', text: 'Page précédente', action: () => wv.goBack() });
        if (wv.canGoForward()) options.push({ icon: '➡️', text: 'Page suivante',   action: () => wv.goForward() });

        if (!currentUrl.startsWith('domus://') && !currentUrl.startsWith('file://')) {
            options.push({ icon: '🔄', text: 'Actualiser',                   action: () => wv.reload() });
            options.push({ separator: true });
            options.push({ icon: '🖨️', text: 'Imprimer…',                    action: () => wv.print() });
            options.push({ separator: true });
            options.push({ icon: '🌐', text: 'Traduire en français',         action: () => { wv.src = `https://translate.google.com/translate?sl=auto&tl=fr&u=${encodeURIComponent(currentUrl)}`; showDomusToast('Traduction en cours…'); } });
            options.push({ icon: '📋', text: "Copier l'adresse de la page", action: () => { navigator.clipboard.writeText(currentUrl); showDomusToast('URL copiée.'); } });
            options.push({ icon: '🔗', text: 'Ouvrir dans un nouvel onglet', action: () => window.domusAPI.createTab({ url: currentUrl }) });
            options.push({ separator: true });
            options.push({ icon: '🛠️', text: 'Inspecter',                   action: () => wv.openDevTools() });
            options.push({ icon: '📄', text: 'Afficher le code source',      action: () => window.domusAPI.createTab({ url: `view-source:${currentUrl}` }) });
        } else {
            options.push({ icon: '🔄', text: 'Actualiser', action: () => wv.reload() });
        }

        // ── Rendu ──────────────────────────────────────────────────────────────
        options.forEach(opt => {
            if (opt.separator) {
                const sep = document.createElement('div');
                sep.style.cssText = 'height:1px; background:rgba(255,255,255,0.08); margin:3px 0;';
                menu.appendChild(sep);
                return;
            }
            const item = document.createElement('div');
            item.style.cssText = `
                display:flex; align-items:center; gap:10px;
                padding:8px 14px; font-size:13px; color:#e0e0e6;
                cursor:pointer; transition:background 0.15s, color 0.15s;
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
            `;
            const iconSpan = document.createElement('span');
            iconSpan.textContent = opt.icon || '';
            iconSpan.style.cssText = 'width:18px;text-align:center;flex-shrink:0;font-size:14px;';
            const textSpan = document.createElement('span');
            textSpan.textContent = opt.text;
            textSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;';
            item.appendChild(iconSpan);
            item.appendChild(textSpan);
            item.onmouseenter = () => { item.style.background='rgba(0,255,136,0.12)'; item.style.color='var(--accent-color,#00ff88)'; };
            item.onmouseleave = () => { item.style.background='transparent'; item.style.color='#e0e0e6'; };
            item.onclick = () => { opt.action(); menu.remove(); };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Réajustement si hors-écran
        const mr = menu.getBoundingClientRect();
        if (clientX + mr.width  > window.innerWidth)  menu.style.left = `${window.innerWidth  - mr.width  - 10}px`;
        if (clientY + mr.height > window.innerHeight) menu.style.top  = `${window.innerHeight - mr.height - 10}px`;

        const closeMenu = () => {
            if (document.contains(menu)) menu.remove();
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('contextmenu', closeMenu);
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
            document.addEventListener('contextmenu', closeMenu);
        }, 100);
    }

    if (btnDarkMode) btnDarkMode.addEventListener('click', async () => {
        const settings = await window.domusAPI.getSettings();
        settings.forceDark = !settings.forceDark;
        await window.domusAPI.saveSettings(settings);
    });

    if (btnHistory) btnHistory.addEventListener('click', () => window.domusAPI.openHistory());
    if (btnDownloads) btnDownloads.addEventListener('click', () => window.domusAPI.openDownloads());
    if (btnExtensions) btnExtensions.addEventListener('click', () => window.domusAPI.openExtensions());
    if (btnSettings) btnSettings.addEventListener('click', () => window.domusAPI.openSettings());
    if (btnCinema) btnCinema.addEventListener('click', () => toggleCinemaMode());

    if (btnHome) btnHome.addEventListener('click', () => togglePanel(sidePanels.workspace));
    if (btnAudio) btnAudio.addEventListener('click', () => togglePanel(sidePanels.audio));
    const shieldFlyout = document.getElementById('shield-flyout');
    const shieldDomain = document.getElementById('shield-domain');
    const shieldStatus = document.getElementById('shield-status');
    const shieldBlockedCount = document.getElementById('shield-blocked-count');
    const btnToggleShield = document.getElementById('btn-toggle-shield');

    if (shieldContainer && shieldFlyout) {
        shieldContainer.addEventListener('click', (e) => {
            if (e.target.closest('#shield-flyout')) return;

            e.stopPropagation();
            const isHidden = shieldFlyout.classList.contains('hidden');
            const profileFlyout = document.getElementById('profile-flyout');
            if (profileFlyout) profileFlyout.classList.add('hidden');

            if (isHidden) {
                const getActiveWV = function() { return activeTabId ? document.getElementById('view-' + activeTabId) : null; };
                const wv = getActiveWV();
                const currentUrl = wv ? wv.getURL() : '';
                const domain = getDomainFromUrl(currentUrl) || 'Domaine inconnu';
                shieldDomain.textContent = domain;

                const disabledShieldDomains = currentSettings.disabledShieldDomains || [];
                const isBlockedDisabled = disabledShieldDomains.includes(domain);

                if (isBlockedDisabled) {
                    shieldStatus.textContent = "Désactivé";
                    shieldStatus.style.color = "#ff3b30";
                    btnToggleShield.textContent = "Activer sur ce site";
                    btnToggleShield.style.background = "rgba(0,255,136,0.15)";
                    btnToggleShield.style.borderColor = "var(--accent-color)";
                    btnToggleShield.style.color = "var(--accent-color)";
                } else {
                    shieldStatus.textContent = "Actif";
                    shieldStatus.style.color = "var(--accent-color)";
                    btnToggleShield.textContent = "Désactiver sur ce site";
                    btnToggleShield.style.background = "rgba(255,59,48,0.15)";
                    btnToggleShield.style.borderColor = "#ff3b30";
                    btnToggleShield.style.color = "#ff3b30";
                }

                const blockedCounter = document.getElementById('blocked-count');
                shieldBlockedCount.textContent = blockedCounter ? blockedCounter.textContent : '0';

                shieldFlyout.classList.remove('hidden');
            } else {
                shieldFlyout.classList.add('hidden');
            }
        });
    }

    if (btnToggleShield) {
        btnToggleShield.addEventListener('click', async (e) => {
            e.stopPropagation();
            const getActiveWV = function() { return activeTabId ? document.getElementById('view-' + activeTabId) : null; };
            const wv = getActiveWV();
            if (!wv) return;
            const currentUrl = wv.getURL();
            const domain = getDomainFromUrl(currentUrl);
            if (!domain) return;

            if (!currentSettings.disabledShieldDomains) {
                currentSettings.disabledShieldDomains = [];
            }

            const idx = currentSettings.disabledShieldDomains.indexOf(domain);
            if (idx >= 0) {
                currentSettings.disabledShieldDomains.splice(idx, 1);
                showDomusToast(`🛡️ Shield réactivé pour ${domain}`);
            } else {
                currentSettings.disabledShieldDomains.push(domain);
                showDomusToast(`⚠️ Shield désactivé pour ${domain}`);
            }

            await window.domusAPI.saveSettings(currentSettings);
            shieldFlyout.classList.add('hidden');
            wv.reload();
        });
    }

    document.addEventListener('click', (e) => {
        if (shieldFlyout && !shieldFlyout.classList.contains('hidden') && !e.target.closest('#shield-container')) {
            shieldFlyout.classList.add('hidden');
        }
    });
    if (btnPasswords) btnPasswords.addEventListener('click', () => {
        togglePanel(sidePanels.password);
        if (!sidePanels.password.classList.contains('hidden')) loadPasswords();
    });

    if (btnFavorites) btnFavorites.addEventListener('click', () => {
        togglePanel(sidePanels.favorites);
        if (!sidePanels.favorites.classList.contains('hidden')) loadFavorites();
    });

    const btnAddBookmark = document.getElementById('btn-add-bookmark');
    if (btnAddBookmark) {
        btnAddBookmark.addEventListener('click', async () => {
            const wv = getActiveWV();
            if (!wv) return;
            const currentUrl = wv.getURL();
            const currentTitle = wv.getTitle() || "Sans titre";
            
            if (!currentUrl || currentUrl.includes('domus://') || currentUrl.includes('file://') || currentUrl.startsWith('about:')) return;
            
            const favorites = currentSettings.favorites || [];
            const idx = favorites.findIndex(f => f.url === currentUrl);
            
            if (idx !== -1) {
                favorites.splice(idx, 1);
                showDomusToast("⭐ Favori retiré.");
            } else {
                favorites.push({ title: currentTitle, url: currentUrl });
                showDomusToast("⭐ Favori ajouté.");
            }
            
            currentSettings.favorites = favorites;
            await window.domusAPI.saveSettings(currentSettings);
            updateBookmarkStar(currentUrl);
            if (currentSettings.showBookmarksBar) {
                renderBookmarksBar(favorites);
            }
            if (!sidePanels.favorites.classList.contains('hidden')) {
                loadFavorites();
            }
        });
    }

    if (btnTimeMachine) btnTimeMachine.addEventListener('click', () => {
        togglePanel(sidePanels.timemachine);
        if (!sidePanels.timemachine.classList.contains('hidden')) loadTimeMachine();
    });

    // --- LOGIQUE COFFRE-FORT (PASSWORD & CARD MANAGER) ---
    const passwordList = document.getElementById('password-list');
    const passwordSearch = document.getElementById('password-search');
    const btnAddPassword = document.getElementById('btn-add-password');
    const btnImportPasswords = document.getElementById('btn-import-passwords');
    const btnCancelPwd = document.getElementById('btn-cancel-pwd');
    const btnSavePwd = document.getElementById('btn-save-pwd');

    // Nouveaux éléments Cartes Bancaires
    const tabVaultPasswords = document.getElementById('tab-vault-passwords');
    const tabVaultCards = document.getElementById('tab-vault-cards');
    const vaultPasswordsSection = document.getElementById('vault-passwords-section');
    const vaultCardsSection = document.getElementById('vault-cards-section');
    const cardsList = document.getElementById('cards-list');
    const cardSearch = document.getElementById('card-search');
    
    const addCardModal = document.getElementById('add-card-modal');
    const btnCloseAddCard = document.getElementById('btn-close-add-card');
    const btnCancelCard = document.getElementById('btn-cancel-card');
    const btnSaveCard = document.getElementById('btn-save-card');

    let currentVaultTab = 'passwords'; // 'passwords' ou 'cards'

    if (tabVaultPasswords && tabVaultCards) {
        tabVaultPasswords.onclick = () => {
            currentVaultTab = 'passwords';
            tabVaultPasswords.classList.add('active');
            tabVaultCards.classList.remove('active');
            vaultPasswordsSection.classList.remove('hidden');
            vaultCardsSection.classList.add('hidden');
            if (btnImportPasswords) btnImportPasswords.style.display = 'block';
        };
        tabVaultCards.onclick = () => {
            currentVaultTab = 'cards';
            tabVaultCards.classList.add('active');
            tabVaultPasswords.classList.remove('active');
            vaultPasswordsSection.classList.add('hidden');
            vaultCardsSection.classList.remove('hidden');
            if (btnImportPasswords) btnImportPasswords.style.display = 'none';
            loadCards();
        };
    }

    let allPasswords = [];

    async function loadPasswords() {
        allPasswords = await window.domusAPI.getPasswords();
        renderPasswords(allPasswords);
    }

    function renderPasswords(list) {
        if (!passwordList) return;
        passwordList.innerHTML = '';
        if (list.length === 0) {
            passwordList.innerHTML = '<p style="opacity:0.5; font-size:11px; text-align:center; padding: 20px;">Aucun mot de passe enregistré.</p>';
            return;
        }

        list.forEach(p => {
            const item = document.createElement('div');
            item.className = 'geo-item';
            item.style.position = 'relative';
            item.innerHTML = `
                <div style="font-weight:bold; color:var(--accent-color); margin-bottom:5px;">${p.site}</div>
                <div style="font-size:11px; opacity:0.8;">${p.user}</div>
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="action-btn copy-user" style="padding:4px; font-size:10px; flex:1;">User</button>
                    <button class="action-btn copy-pass" style="padding:4px; font-size:10px; flex:1;">Pass</button>
                    <button class="action-btn delete-pwd" style="padding:4px; font-size:10px; background:#444; width:30px;">🗑️</button>
                </div>
            `;
            item.querySelector('.copy-user').onclick = () => {
                navigator.clipboard.writeText(p.user);
                showDomusToast("Utilisateur copié !");
            };
            item.querySelector('.copy-pass').onclick = () => {
                navigator.clipboard.writeText(p.pass);
                showDomusToast("Mot de passe copié !");
            };
            item.querySelector('.delete-pwd').onclick = async () => {
                const ok = await showDomusConfirm("Supprimer", `Supprimer le compte pour ${p.site} ?`, "🗑️");
                if (ok) {
                    await window.domusAPI.deletePassword(p.id);
                    loadPasswords();
                }
            };
            passwordList.appendChild(item);
        });
    }

    if (passwordSearch) {
        passwordSearch.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allPasswords.filter(p => p.site.toLowerCase().includes(q) || p.user.toLowerCase().includes(q));
            renderPasswords(filtered);
        };
    }

    if (btnAddPassword) {
        btnAddPassword.onclick = () => {
            if (currentVaultTab === 'passwords') {
                addPwdModal.classList.remove('hidden');
            } else {
                if (addCardModal) addCardModal.classList.remove('hidden');
            }
            updateModalState();
        };
    }

    if (btnImportPasswords) {
        btnImportPasswords.onclick = async () => {
            const res = await window.domusAPI.importPasswordsCSV();
            if (res.success) {
                showDomusToast(`${res.count} comptes importés avec succès.`);
                loadPasswords();
            } else if (res.error) {
                showDomusToast(`Erreur : ${res.error}`);
            }
        };
    }

    if (btnCancelPwd) {
        btnCancelPwd.onclick = () => {
            addPwdModal.classList.add('hidden');
            updateModalState();
            resetPwdGenerator();
        };
    }

    if (btnSavePwd) {
        btnSavePwd.onclick = async () => {
            const site = document.getElementById('pwd-site-input').value.trim();
            const user = document.getElementById('pwd-user-input').value.trim();
            const pass = document.getElementById('pwd-pass-input').value.trim();

            if (!site || !user || !pass) return showDomusToast("Tous les champs sont requis.");

            await window.domusAPI.savePassword({ site, user, pass });
            addPwdModal.classList.add('hidden');
            updateModalState();
            
            // Clear inputs
            document.getElementById('pwd-site-input').value = '';
            document.getElementById('pwd-user-input').value = '';
            document.getElementById('pwd-pass-input').value = '';

            loadPasswords();
            showDomusToast("Compte enregistré.");
            resetPwdGenerator();
        };
    }

    // --- LOGIQUE GÉNÉRATEUR DE MOTS DE PASSE DOMUS PASS ---
    const togglePwdGenerator = document.getElementById('toggle-pwd-generator');
    const pwdGeneratorPanel = document.getElementById('pwd-generator-panel');
    const btnToggleViewPwd = document.getElementById('btn-toggle-view-pwd');
    const pwdPassInput = document.getElementById('pwd-pass-input');
    
    const genTypeRandom = document.getElementById('gen-type-random');
    const genTypePassphrase = document.getElementById('gen-type-passphrase');
    const genLenLabel = document.getElementById('gen-len-label');
    const genLengthSlider = document.getElementById('gen-length-slider');
    const genOptionsCharset = document.getElementById('gen-options-charset');
    
    const genOptUpper = document.getElementById('gen-opt-upper');
    const genOptLower = document.getElementById('gen-opt-lower');
    const genOptNumbers = document.getElementById('gen-opt-numbers');
    const genOptSymbols = document.getElementById('gen-opt-symbols');
    
    const genStrengthText = document.getElementById('gen-strength-text');
    const genStrengthBar = document.getElementById('gen-strength-bar');
    const btnGenerateNow = document.getElementById('btn-generate-now');

    let currentGenType = 'random'; // 'random' ou 'passphrase'

    const passphraseWords = [
        'soleil', 'arbre', 'etoile', 'riviere', 'ocean', 'montagne', 'nuage', 'guitare', 'cafe', 'livre', 
        'fenetre', 'route', 'vitesse', 'force', 'lumiere', 'ombre', 'monde', 'espace', 'bleu', 'vert', 
        'rouge', 'jaune', 'calme', 'rapide', 'grand', 'petit', 'nouveau', 'ancien', 'jeune', 'vieux', 
        'sky', 'wind', 'fire', 'water', 'earth', 'stone', 'wood', 'iron', 'gold', 'star', 
        'moon', 'sun', 'cloud', 'rain', 'snow', 'leaf', 'flower', 'bird', 'fish', 'cat', 
        'dog', 'horse', 'lion', 'bear', 'wolf', 'eagle', 'fox', 'deer', 'rabbit', 'frog'
    ];

    function evaluateStrength(pwd, type) {
        let score = 0;
        if (type === 'passphrase') {
            const wordsCount = pwd.split('-').length;
            score = wordsCount * 20; // 3 mots = 60, 4 = 80, 5 = 100, 6 = 120
        } else {
            const len = pwd.length;
            score = len * 3.5;
            
            if (/[A-Z]/.test(pwd)) score += 10;
            if (/[a-z]/.test(pwd)) score += 10;
            if (/[0-9]/.test(pwd)) score += 10;
            if (/[^A-Za-z0-9]/.test(pwd)) score += 15;
        }

        score = Math.min(100, Math.max(0, score));

        let label = "Faible";
        let color = "#ff4d4d";

        if (score >= 90) {
            label = "Aegis-Grade 💎";
            color = "#00d2ff";
        } else if (score >= 70) {
            label = "Fort";
            color = "#00ff88";
        } else if (score >= 40) {
            label = "Moyen";
            color = "#ffa500";
        }

        if (genStrengthText) {
            genStrengthText.textContent = label;
            genStrengthText.style.color = color;
        }
        if (genStrengthBar) {
            genStrengthBar.style.width = score + "%";
            genStrengthBar.style.backgroundColor = color;
        }
    }

    function generatePassword() {
        if (!pwdPassInput) return;
        
        let pwd = "";
        const len = parseInt(genLengthSlider ? genLengthSlider.value : 16);

        if (currentGenType === 'passphrase') {
            const words = [];
            for (let i = 0; i < len; i++) {
                const idx = Math.floor(Math.random() * passphraseWords.length);
                words.push(passphraseWords[idx]);
            }
            pwd = words.join('-');
        } else {
            const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const lowers = "abcdefghijklmnopqrstuvwxyz";
            const numbers = "0123456789";
            const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
            
            let charPool = "";
            const guaranteed = [];

            if (genOptUpper && genOptUpper.checked) {
                charPool += uppers;
                guaranteed.push(uppers[Math.floor(Math.random() * uppers.length)]);
            }
            if (genOptLower && genOptLower.checked) {
                charPool += lowers;
                guaranteed.push(lowers[Math.floor(Math.random() * lowers.length)]);
            }
            if (genOptNumbers && genOptNumbers.checked) {
                charPool += numbers;
                guaranteed.push(numbers[Math.floor(Math.random() * numbers.length)]);
            }
            if (genOptSymbols && genOptSymbols.checked) {
                charPool += symbols;
                guaranteed.push(symbols[Math.floor(Math.random() * symbols.length)]);
            }

            if (charPool === "") {
                charPool += lowers;
                guaranteed.push(lowers[Math.floor(Math.random() * lowers.length)]);
                if (genOptLower) genOptLower.checked = true;
            }

            let remainingLength = len - guaranteed.length;
            let randomChars = "";
            for (let i = 0; i < remainingLength; i++) {
                const idx = Math.floor(Math.random() * charPool.length);
                randomChars += charPool[idx];
            }

            const combined = guaranteed.join('') + randomChars;
            pwd = combined.split('').sort(() => 0.5 - Math.random()).join('');
        }

        pwdPassInput.value = pwd;
        evaluateStrength(pwd, currentGenType);
    }

    if (togglePwdGenerator && pwdGeneratorPanel) {
        togglePwdGenerator.onclick = () => {
            pwdGeneratorPanel.classList.toggle('hidden');
            if (!pwdGeneratorPanel.classList.contains('hidden')) {
                generatePassword();
            }
        };
    }

    if (btnToggleViewPwd && pwdPassInput) {
        btnToggleViewPwd.onclick = () => {
            if (pwdPassInput.type === 'password') {
                pwdPassInput.type = 'text';
                btnToggleViewPwd.textContent = '🙈';
            } else {
                pwdPassInput.type = 'password';
                btnToggleViewPwd.textContent = '👁️';
            }
        };
    }

    if (genTypeRandom && genTypePassphrase) {
        genTypeRandom.onclick = () => {
            if (currentGenType === 'random') return;
            currentGenType = 'random';
            genTypeRandom.classList.add('active');
            genTypePassphrase.classList.remove('active');
            
            if (genOptionsCharset) genOptionsCharset.classList.remove('hidden');
            
            if (genLengthSlider) {
                genLengthSlider.min = 12;
                genLengthSlider.max = 32;
                if (parseInt(genLengthSlider.value) < 12 || parseInt(genLengthSlider.value) > 32) {
                    genLengthSlider.value = 16;
                }
                if (genLenLabel) genLenLabel.textContent = "Longueur : " + genLengthSlider.value;
            }
            generatePassword();
        };

        genTypePassphrase.onclick = () => {
            if (currentGenType === 'passphrase') return;
            currentGenType = 'passphrase';
            genTypePassphrase.classList.add('active');
            genTypeRandom.classList.remove('active');
            
            if (genOptionsCharset) genOptionsCharset.classList.add('hidden');
            
            if (genLengthSlider) {
                genLengthSlider.min = 3;
                genLengthSlider.max = 6;
                if (parseInt(genLengthSlider.value) < 3 || parseInt(genLengthSlider.value) > 6) {
                    genLengthSlider.value = 4;
                }
                if (genLenLabel) genLenLabel.textContent = "Mots : " + genLengthSlider.value;
            }
            generatePassword();
        };
    }

    if (genLengthSlider) {
        genLengthSlider.oninput = (e) => {
            const val = e.target.value;
            if (genLenLabel) {
                genLenLabel.textContent = (currentGenType === 'passphrase' ? "Mots : " : "Longueur : ") + val;
            }
            generatePassword();
        };
    }

    [genOptUpper, genOptLower, genOptNumbers, genOptSymbols].forEach(opt => {
        if (opt) {
            opt.onchange = () => {
                generatePassword();
            };
        }
    });

    if (btnGenerateNow) {
        btnGenerateNow.onclick = () => {
            generatePassword();
        };
    }

    function resetPwdGenerator() {
        if (pwdGeneratorPanel) pwdGeneratorPanel.classList.add('hidden');
        if (pwdPassInput) {
            pwdPassInput.type = 'password';
            pwdPassInput.value = '';
        }
        if (btnToggleViewPwd) btnToggleViewPwd.textContent = '👁️';
        currentGenType = 'random';
        if (genTypeRandom) genTypeRandom.classList.add('active');
        if (genTypePassphrase) genTypePassphrase.classList.remove('active');
        if (genOptionsCharset) genOptionsCharset.classList.remove('hidden');
        if (genLengthSlider) {
            genLengthSlider.min = 12;
            genLengthSlider.max = 32;
            genLengthSlider.value = 16;
        }
        if (genLenLabel) genLenLabel.textContent = "Longueur : 16";
        if (genOptUpper) genOptUpper.checked = true;
        if (genOptLower) genOptLower.checked = true;
        if (genOptNumbers) genOptNumbers.checked = true;
        if (genOptSymbols) genOptSymbols.checked = true;
    }

    // --- LOGIQUE BANDEAU DE SAUVEGARDE AUTOMATIQUE DU COFFRE ---
    const vaultSavePrompt = document.getElementById('domus-vault-save-prompt');
    const savePromptDesc = document.getElementById('save-prompt-desc');
    const btnSavePromptIgnore = document.getElementById('btn-save-prompt-ignore');
    const btnSavePromptOk = document.getElementById('btn-save-prompt-ok');
    let pendingSaveData = null;

    if (window.domusAPI && typeof window.domusAPI.onShowSavePrompt === 'function') {
        window.domusAPI.onShowSavePrompt((data) => {
            if (!data || !data.site || !data.user || !data.pass) return;
            
            pendingSaveData = data;
            if (savePromptDesc) {
                savePromptDesc.textContent = `Compte détecté pour ${data.site} (utilisateur : ${data.user})`;
            }
            if (vaultSavePrompt) {
                vaultSavePrompt.classList.remove('hidden');
                setTimeout(() => {
                    vaultSavePrompt.classList.add('active');
                }, 10);
            }
        });
    }

    if (btnSavePromptIgnore) {
        btnSavePromptIgnore.onclick = () => {
            closeSavePrompt();
        };
    }

    if (btnSavePromptOk) {
        btnSavePromptOk.onclick = async () => {
            if (pendingSaveData) {
                await window.domusAPI.savePassword(pendingSaveData);
                closeSavePrompt();
                showDomusToast("Identifiants enregistrés dans Domus Vault !");
                if (typeof loadPasswords === 'function') {
                    loadPasswords();
                }
            }
        };
    }

    function closeSavePrompt() {
        if (vaultSavePrompt) {
            vaultSavePrompt.classList.remove('active');
            setTimeout(() => {
                vaultSavePrompt.classList.add('hidden');
                pendingSaveData = null;
            }, 300);
        }
    }

    // --- SÉCURITÉ CARTES BANCAIRES ---
    let allCards = [];

    async function loadCards() {
        if (!cardsList) return;
        allCards = await window.domusAPI.getCards();
        renderCards(allCards);
    }

    function renderCards(list) {
        if (!cardsList) return;
        cardsList.innerHTML = '';
        if (list.length === 0) {
            cardsList.innerHTML = '<p style="opacity:0.5; font-size:11px; text-align:center; padding: 20px;">Aucune carte enregistrée.</p>';
            return;
        }

        list.forEach(c => {
            const item = document.createElement('div');
            item.className = 'credit-card-item';
            
            let displayNum = c.number || '';
            if (displayNum.length >= 16) {
                const cleaned = displayNum.replace(/\s+/g, '');
                displayNum = `•••• •••• •••• ${cleaned.slice(-4)}`;
            } else if (displayNum && !displayNum.includes('•') && !displayNum.includes('Chiffré')) {
                displayNum = `•••• •••• •••• ${displayNum.slice(-4)}`;
            }

            let brand = 'CB';
            const firstDigit = c.number ? c.number.charAt(0) : '';
            if (firstDigit === '4') brand = 'VISA';
            else if (firstDigit === '5') brand = 'MASTERCARD';
            else if (firstDigit === '3') brand = 'AMEX';

            item.innerHTML = `
                <div class="credit-card-header">
                    <div class="credit-card-chip"></div>
                    <span class="credit-card-brand">${brand}</span>
                </div>
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: var(--accent-color);">${c.label || 'Carte Bancaire'}</div>
                <div class="credit-card-number">${displayNum}</div>
                <div class="credit-card-holder">${c.holder || 'Titulaire Inconnu'}</div>
                <div class="credit-card-meta">
                    <span>Exp : ${c.expiry || '••/••'}</span>
                    <span>CVV : •••</span>
                </div>
                <div class="credit-card-actions">
                    <button class="action-btn copy-card-num" style="padding:4px; font-size:10px; flex:1;">N° Copier</button>
                    <button class="action-btn copy-card-cvv" style="padding:4px; font-size:10px; flex:1;">CVV</button>
                    <button class="action-btn delete-card" style="padding:4px; font-size:10px; background:#444; width:30px;">🗑️</button>
                </div>
            `;

            item.querySelector('.copy-card-num').onclick = async () => {
                const fullCards = await window.domusAPI.getCards();
                const matched = fullCards.find(x => x.id === c.id);
                if (matched && matched.number) {
                    navigator.clipboard.writeText(matched.number);
                    showDomusToast("Numéro de carte copié !");
                } else {
                    showDomusToast("Erreur ou coffre verrouillé.");
                }
            };

            item.querySelector('.copy-card-cvv').onclick = async () => {
                const fullCards = await window.domusAPI.getCards();
                const matched = fullCards.find(x => x.id === c.id);
                if (matched && matched.cvv) {
                    navigator.clipboard.writeText(matched.cvv);
                    showDomusToast("CVV copié !");
                } else {
                    showDomusToast("Erreur ou coffre verrouillé.");
                }
            };

            item.querySelector('.delete-card').onclick = async () => {
                const ok = await showDomusConfirm("Supprimer la carte", `Supprimer "${c.label}" ?`, "🗑️");
                if (ok) {
                    await window.domusAPI.deleteCard(c.id);
                    loadCards();
                }
            };

            cardsList.appendChild(item);
        });
    }

    if (cardSearch) {
        cardSearch.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allCards.filter(c => 
                (c.label && c.label.toLowerCase().includes(q)) || 
                (c.holder && c.holder.toLowerCase().includes(q))
            );
            renderCards(filtered);
        };
    }

    if (btnCloseAddCard) btnCloseAddCard.onclick = () => { addCardModal.classList.add('hidden'); updateModalState(); };
    if (btnCancelCard) btnCancelCard.onclick = () => { addCardModal.classList.add('hidden'); updateModalState(); };

    // Formatage auto numéro carte
    const cardNumInput = document.getElementById('card-number-input');
    if (cardNumInput) {
        cardNumInput.oninput = (e) => {
            let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let matches = v.match(/\d{4,16}/g);
            let match = matches && matches[0] || '';
            let parts = [];
            for (let i=0, len=match.length; i<len; i+=4) {
                parts.push(match.substring(i, i+4));
            }
            if (parts.length > 0) {
                e.target.value = parts.join(' ');
            } else {
                e.target.value = v;
            }
        };
    }

    // Formatage auto exp
    const cardExpInput = document.getElementById('card-expiry-input');
    if (cardExpInput) {
        cardExpInput.oninput = (e) => {
            let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            if (v.length >= 2) {
                e.target.value = v.substring(0, 2) + '/' + v.substring(2, 4);
            } else {
                e.target.value = v;
            }
        };
    }

    if (btnSaveCard) {
        btnSaveCard.onclick = async () => {
            const label = document.getElementById('card-label-input').value.trim();
            const holder = document.getElementById('card-holder-input').value.trim();
            const number = document.getElementById('card-number-input').value.replace(/\s+/g, '').trim();
            const expiry = document.getElementById('card-expiry-input').value.trim();
            const cvv = document.getElementById('card-cvv-input').value.trim();

            if (!label || !holder || !number || !expiry || !cvv) {
                return showDomusToast("Tous les champs sont requis.");
            }
            if (number.length < 15 || number.length > 16) {
                return showDomusToast("Numéro de carte invalide.");
            }

            await window.domusAPI.saveCard({ label, holder, number, expiry, cvv });
            addCardModal.classList.add('hidden');
            updateModalState();
            
            // Clear inputs
            document.getElementById('card-label-input').value = '';
            document.getElementById('card-holder-input').value = '';
            document.getElementById('card-number-input').value = '';
            document.getElementById('card-expiry-input').value = '';
            document.getElementById('card-cvv-input').value = '';

            loadCards();
            showDomusToast("Carte bancaire sécurisée dans le coffre !");
        };
    }

    // =========================================================================
    // 🔐 COFFRE-FORT & MOT DE PASSE
    // =========================================================================
    const masterPwdInput = document.getElementById('master-password-input');
    const unlockBtn = document.getElementById('unlock-btn');

    const handleUnlock = async () => {
        if (!masterPwdInput) return;
        const pwd = masterPwdInput.value;
        if (!pwd) {
            return showDomusToast("Veuillez saisir votre Master Password.");
        }
        
        unlockBtn.disabled = true;
        const origText = unlockBtn.innerText;
        unlockBtn.innerText = "Déverrouillage...";
        
        try {
            const res = await window.domusAPI.initVault(pwd);
            if (res.success) {
                if (securityModal) {
                    securityModal.classList.add('hidden');
                    updateModalState();
                }
                masterPwdInput.value = '';
                
                const homeUrl = currentSettings.homePage || 'domus://newtab';
                const restored = await window.domusAPI.restoreSession();
                if (!restored || !restored.success) {
                    window.domusAPI.newTab(homeUrl);
                }
                
                showDomusToast("Coffre-fort déverrouillé avec succès ! 🛡️");
            } else {
                showDomusToast("Erreur : " + (res.error || "Master Password incorrect."));
                masterPwdInput.value = '';
                masterPwdInput.focus();
            }
        } catch (err) {
            showDomusToast("Erreur de déverrouillage : " + err.message);
        } finally {
            unlockBtn.disabled = false;
            unlockBtn.innerText = origText;
        }
    };

    if (unlockBtn) {
        unlockBtn.onclick = handleUnlock;
    }
    if (masterPwdInput) {
        masterPwdInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleUnlock();
            }
        };
    }

    // TPM Status
    window.domusAPI.checkTPMStatus().then(status => {
        if (tpmStatus) {
            tpmStatus.innerText = status?.present ? "🛡️ TPM : Actif" : "🛡️ Sécurité : Master Pass";
            tpmStatus.style.color = status?.present ? "#00ff88" : "#ffcc00";
        }
    });

    window.domusAPI.onGeoUpdate((data) => {
        const geoList = document.getElementById('geo-list');
        if (!geoList) return;
        const item = document.createElement('div');
        item.className = 'geo-item';
        item.innerHTML = `<span class="country">📍 ${data.country}</span><span class="city">${data.city || 'Anonyme'}</span>`;
        geoList.prepend(item);
        if (geoList.children.length > 8) geoList.lastChild.remove();
    });

    window.domusAPI.onBlockedUpdate((data) => { if (blockedCounter) blockedCounter.innerText = data.count; });
 
    // =========================================================================
    // 🎚️ MOTEUR ACOUSTIQUE DOMUS PRO HD CONTROLLER
    // =========================================================================
    const boosterToggle = document.getElementById('booster-toggle');
    const boosterPreset = document.getElementById('booster-preset');
    const boosterCard = document.querySelector('.audio-booster-card');

    async function initAudioBoosterUI() {
        if (!boosterToggle || !boosterPreset) return;

        const config = await window.domusAPI.getSettings();
        const isEnabled = config.audioBoosterEnabled !== false;
        const activePreset = config.audioBoosterPreset || 'balanced';

        boosterToggle.checked = isEnabled;
        boosterPreset.value = activePreset;

        updateBoosterUIState(isEnabled, activePreset);

        boosterToggle.addEventListener('change', () => handleBoosterChange());
        boosterPreset.addEventListener('change', () => handleBoosterChange());
    }

    function updateBoosterUIState(enabled, preset) {
        if (!boosterCard) return;
        
        const isActive = enabled && preset !== 'off';
        boosterCard.classList.toggle('active', isActive);
        boosterCard.classList.toggle('disabled', !enabled);
    }

    async function handleBoosterChange() {
        const enabled = boosterToggle.checked;
        const preset = boosterPreset.value;

        updateBoosterUIState(enabled, preset);

        const config = await window.domusAPI.getSettings();
        config.audioBoosterEnabled = enabled;
        config.audioBoosterPreset = preset;
        await window.domusAPI.saveSettings(config);

        const webviews = document.querySelectorAll('webview');
        webviews.forEach(wv => {
            try {
                wv.send('audio-booster-update', { enabled, preset });
            } catch (err) {
                console.log("Renderer Audio Booster: webview notification skipped:", err.message);
            }
        });
    }

    initAudioBoosterUI();

    // BUG 3 FIX : double onTabCreated supprimé (memory leak + comportement impévisible)
    // Le moteur audio est notifié via handleBoosterChange() lors de chaque changement de paramètres,
    // et runAudioEnhancer() dans preload.js lit les settings au chargement de chaque page.




    // =========================================================================
    // RACCOURCIS CLAVIER - Standard navigateur
    // =========================================================================
    if (window.domusAPI && window.domusAPI.onKeyboardShortcut) {
        window.domusAPI.onKeyboardShortcut(function(action) {

            var getActiveWV = function() { return activeTabId ? document.getElementById('view-' + activeTabId) : null; };

            var getTabIds = function() {
            // BUG 5 FIX : l'ancien sélecteur '.tab-item[data-tab-id]' n'existait pas dans le DOM
                return Array.from(document.querySelectorAll('.tab:not(.ws-hidden)')).map(function(el) { return el.id.replace('ui-', ''); });
            };

            if (action.startsWith('goto-tab-')) {
                var n = parseInt(action.split('-').pop(), 10);
                var ids = getTabIds();
                var target = n === 9 ? ids[ids.length - 1] : ids[n - 1];
                if (target) window.domusAPI.switchTab(target);
                return;
            }

            var wv;
            switch (action) {
                case 'new-tab':
                    window.domusAPI.createTab({ url: 'about:blank' });
                    break;
                case 'close-tab':
                    if (activeTabId) window.domusAPI.closeTab(activeTabId);
                    break;
                case 'next-tab':
                    var ids2 = getTabIds();
                    if (ids2.length >= 2) { var i2 = ids2.indexOf(String(activeTabId)); window.domusAPI.switchTab(ids2[(i2 + 1) % ids2.length]); }
                    break;
                case 'prev-tab':
                    var ids3 = getTabIds();
                    if (ids3.length >= 2) { var i3 = ids3.indexOf(String(activeTabId)); window.domusAPI.switchTab(ids3[(i3 - 1 + ids3.length) % ids3.length]); }
                    break;
                case 'focus-urlbar':
                    if (urlInput) { urlInput.focus(); urlInput.select(); }
                    break;
                case 'back':
                    wv = getActiveWV(); if (wv && wv.canGoBack()) wv.goBack(); break;
                case 'forward':
                    wv = getActiveWV(); if (wv && wv.canGoForward()) wv.goForward(); break;
                case 'reload':
                    wv = getActiveWV(); if (wv) wv.reload(); break;
                case 'hard-reload':
                    wv = getActiveWV(); if (wv) wv.reloadIgnoringCache(); break;
                case 'stop': // BUG 13 FIX : 'escape' n'existait pas dans la liste des shortcuts, c'est 'stop'
                    wv = getActiveWV(); if (wv) wv.stop();
                    Object.values(sidePanels).forEach(function(p) { if (p && !p.classList.contains('hidden')) p.classList.add('hidden'); });
                    if (wv) wv.focus();
                    break;
                case 'zoom-in':
                    wv = getActiveWV(); if (wv) { var z1 = Math.min((wv.getZoomFactor() || 1) + 0.1, 5); wv.setZoomFactor(z1); showDomusToast('Zoom : ' + Math.round(z1 * 100) + '%'); saveZoomForDomain(wv.getURL(), z1); }
                    break;
                case 'zoom-out':
                    wv = getActiveWV(); if (wv) { var z2 = Math.max((wv.getZoomFactor() || 1) - 0.1, 0.25); wv.setZoomFactor(z2); showDomusToast('Zoom : ' + Math.round(z2 * 100) + '%'); saveZoomForDomain(wv.getURL(), z2); }
                    break;
                case 'zoom-reset':
                    wv = getActiveWV(); if (wv) { wv.setZoomFactor(1); showDomusToast('Zoom 100%'); saveZoomForDomain(wv.getURL(), 1); }
                    break;
                case 'devtools':
                    wv = getActiveWV(); if (wv) wv.openDevTools(); break;
                case 'find':
                    showFindInPage();
                    break;
                case 'reopen-closed-tab':
                    window.domusAPI.reopenClosedTab();
                    break;
                case 'history':
                    if (btnHistory) btnHistory.click(); break;
                case 'downloads':
                    if (btnDownloads) btnDownloads.click(); break;
                case 'view-source':
                    wv = getActiveWV(); if (wv) window.domusAPI.createTab({ url: 'view-source:' + wv.getURL() }); break;
                case 'bookmark':
                    if (btnFavorites) btnFavorites.click(); showDomusToast('Ouvrez les Favoris pour ajouter cette page.'); break;
                case 'toggle-bookmarks-bar':
                    const bBar = document.getElementById('bookmarks-bar');
                    if (bBar) {
                        const isHidden = bBar.classList.toggle('hidden');
                        currentSettings.showBookmarksBar = !isHidden;
                        window.domusAPI.saveSettings(currentSettings);
                        if (!isHidden) {
                            renderBookmarksBar(currentSettings.favorites || []);
                        }
                    }
                    break;
                case 'clear-data':
                    if (btnSettings) btnSettings.click(); showDomusToast('Allez dans Parametres pour effacer le cache.'); break;
            }
        });
    }

    if (window.domusAPI && window.domusAPI.onExecuteGesture) {
        window.domusAPI.onExecuteGesture((gesture) => {
            const getActiveWV = function() { return activeTabId ? document.getElementById('view-' + activeTabId) : null; };
            const wv = getActiveWV();
            if (!wv) return;

            if (gesture === 'L') {
                if (wv.canGoBack()) {
                    wv.goBack();
                    showDomusToast("⬅️ Retour");
                }
            } else if (gesture === 'R') {
                if (wv.canGoForward()) {
                    wv.goForward();
                    showDomusToast("➡️ Suivant");
                }
            } else if (gesture === 'UD') {
                wv.reload();
                showDomusToast("🔄 Recharger");
            } else if (gesture === 'DR') {
                window.domusAPI.closeTab(activeTabId);
                showDomusToast("✕ Onglet fermé");
            }
        });
    }

    // --- DIALOGUE DE RECHERCHE DANS LA PAGE (CTRL+F OVERLAY) ---
    const findInPageBox = document.getElementById('find-in-page-box');
    const findInput = document.getElementById('find-input');
    const findResults = document.getElementById('find-results');
    const findPrev = document.getElementById('find-prev');
    const findNext = document.getElementById('find-next');
    const findClose = document.getElementById('find-close');

    let currentSearchQuery = "";

    function showFindInPage() {
        if (!findInPageBox) return;
        findInPageBox.classList.remove('hidden');
        if (findInput) {
            findInput.focus();
            findInput.select();
            if (findInput.value.trim()) {
                performSearch(findInput.value.trim(), true);
            }
        }
    }

    function hideFindInPage() {
        if (!findInPageBox) return;
        findInPageBox.classList.add('hidden');
        const activeWv = activeTabId ? document.getElementById(`view-${activeTabId}`) : null;
        if (activeWv) {
            activeWv.stopFindInPage('clearSelection');
        }
        if (findResults) findResults.textContent = "0/0";
    }

    function performSearch(query, forward = true, findNextMatch = false) {
        const activeWv = activeTabId ? document.getElementById(`view-${activeTabId}`) : null;
        if (!activeWv || !query) return;
        activeWv.findInPage(query, { forward, findNext: findNextMatch });
        currentSearchQuery = query;
    }

    if (findInput) {
        findInput.addEventListener('input', () => {
            const query = findInput.value.trim();
            if (query) {
                performSearch(query, true, false);
            } else {
                const activeWv = activeTabId ? document.getElementById(`view-${activeTabId}`) : null;
                if (activeWv) activeWv.stopFindInPage('clearSelection');
                if (findResults) findResults.textContent = "0/0";
                currentSearchQuery = "";
            }
        });

        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = findInput.value.trim();
                if (query) {
                    performSearch(query, !e.shiftKey, true);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideFindInPage();
                const activeWv = activeTabId ? document.getElementById(`view-${activeTabId}`) : null;
                if (activeWv) activeWv.focus();
            }
        });
    }

    if (findPrev) {
        findPrev.onclick = () => {
            const query = findInput ? findInput.value.trim() : "";
            if (query) performSearch(query, false, true);
        };
    }

    if (findNext) {
        findNext.onclick = () => {
            const query = findInput ? findInput.value.trim() : "";
            if (query) performSearch(query, true, true);
        };
    }

    if (findClose) {
        findClose.onclick = () => {
            hideFindInPage();
        };
    }

    } catch (e) {
        console.error("FATAL RENDERER ERROR:", e);
    }
});