# Notes de version - Domus Browser Pro

## ✍️ Version 1.3.12 — Correcteur Orthographique Natif
*Date : 24 juin 2026*

Activation du correcteur orthographique **Chromium natif** (identique à Chrome) sur tous les champs de formulaire des sites web.

### ✨ Nouveauté
- **Spell Check FR + EN-US** : Les fautes de frappe sont désormais soulignées en rouge dans tous les `<input>`, `<textarea>` et champs éditables rencontrés sur les pages web.
- **Clic droit → Suggestions** : Cliquer droit sur un mot souligné propose des corrections, exactement comme dans Chrome ou Firefox.
- **Propagation automatique** : Le correcteur est activé sur la fenêtre principale ET toutes les webviews via `will-attach-webview`.
- **Bilingue garanti** : Les langues `fr` et `en-US` sont toutes les deux actives, pas de conflit si un champ est en anglais ou en français.

### 📦 Fichier modifié
- `src/main.js` : `spellcheck: true` dans `webPreferences` + `setSpellCheckerLanguages(['fr', 'en-US'])` + handler `will-attach-webview`

---

## 🛠️ Version 1.3.11 — Patch de Stabilité Majeur (9 bugs corrigés)
*Date : 24 juin 2026*

Cette version est un **patch de stabilisation critique** qui corrige 9 bugs identifiés lors d'un audit approfondi du moteur Domus.

### 🔴 Corrections Critiques
- **[main.js] `isTrustedSender` trop restrictif** : Le coffre-fort (mots de passe, cartes bancaires) était inaccessible depuis les pages internes (historique, téléchargements, paramètres). Corrigé en autorisant les pages internes `file://`.
- **[preload.js] Time Machine cassé** : `archivePageReader()` n'envoyait jamais les données (titre/URL) au processus principal. La page était archivée sans contenu.
- **[preload.js] Raccourcis Ctrl+1-9 déclenchés 9 fois** : Une boucle `for` incorrecte créait 9 listeners identiques sur `shortcut-goto-tab`. Chaque pression du raccourci activait la logique 9 fois simultanément.
- **[renderer.js] Ctrl+Tab et Ctrl+1-9 inopérants** : Le sélecteur CSS `.tab-item[data-tab-id]` n'existait pas dans le DOM (les onglets utilisent la classe `.tab`). Tous les raccourcis de navigation entre onglets étaient silencieusement inactifs.

### 🟠 Corrections Majeures
- **[main.js] Boutons ▲▼ des espaces de travail sans effet** : Le handler IPC `move-workspace` était complètement absent. La réorganisation des espaces n'était jamais persistée.
- **[renderer.js] Double `onTabCreated` — memory leak** : Deux listeners `onTabCreated` actifs simultanément causaient un empilement de callbacks à chaque création d'onglet.
- **[index.html] Liste navigateurs invisible dans le Wizard** : L'ID HTML `detected-browsers` ne correspondait pas à l'ID `browser-detected-list` attendu par le renderer. La liste de migration restait vide.
- **[renderer.js] Touche Échap inopérante** : Le `case 'escape'` dans le switch des raccourcis n'existait pas dans la liste des actions (le canal IPC envoie `'stop'`).
- **[renderer.js] Guard de fermeture des suggestions défaillante** : `hideSuggestions()` utilisait `style.display === 'none'` pour vérifier l'état, mais après un `setProperty(..., 'important')`, la comparaison pouvait échouer. Remplacé par un booléen dédié.

### 📦 Fichiers modifiés
- `src/main.js` : Correctifs isTrustedSender + ajout handler move-workspace + bump v1.3.11
- `src/preload.js` : Correctifs archivePageReader + shortcut-goto-tab
- `src/renderer.js` : Correctifs getTabIds + double onTabCreated + hideSuggestions + case 'stop'
- `src/index.html` : Correctif ID browser-detected-list

---

## Version 1.3.0 (Stabilité Ultime & Isolation Espaces)
- **FIX CRITIQUE** : Résolution du "fantôme des espaces de travail". Lors de la fermeture d'un onglet, une fonction de mise à jour rendait accidentellement visibles les onglets cachés des autres espaces de travail. Cela causait un écran noir profond, car le navigateur essayait d'afficher un onglet appartenant à un espace non-actif. L'isolation visuelle et logique des espaces est désormais 100% étanche.
## Version 1.2.8 (Correctif Fermeture Onglet & Bouton Espace)
- **FIX** : Résolution du bug de l'écran noir lors de la fermeture de l'onglet actif. Le navigateur bascule désormais intelligemment sur le dernier onglet visible de l'espace courant.
- **FIX** : Rétablissement du bouton "Nouvel Espace" dans le menu de gauche qui avait perdu son interactivité suite au récent nettoyage du code.
## Version 1.2.7 (Correctif Espaces & Drag-and-Drop)
- **FIX MAJEUR** : Résolution de l'erreur de syntaxe (`wsNameInput`) causant un écran noir et bloquant l'affichage des onglets.
- **FIX** : Affichage correct des pages web lors du changement d'espace (les onglets inactifs sont désormais proprement masqués).
- **FIX** : Autorisation explicite du système d'exploitation Chromium (`dataTransfer.setData`) pour permettre le glisser-déposer fluide des onglets.
## Version 1.2.6 (Espaces de travail & Glisser-Déposer)
- **NOUVEAU - Espaces de Travail (Workspaces)** : Création, gestion et basculement à chaud (Hot Swap) entre espaces de travail personnalisés.
- **NOUVEAU - Fichier de Sauvegarde Modulaire** : Les espaces sont enregistrés dans un fichier dédié `domus-workspaces.json` pour isoler vos données de l'application.
- **NOUVEAU - Glisser-Déposer (Drag and Drop)** : Réorganisation fluide des onglets dans la barre supérieure, avec indicateurs visuels sécurisés (les onglets Shadow ne peuvent pas être déplacés pour des raisons de sécurité).
- **NOUVEAU - Menu Contextuel Onglets** : Ajout de l'option "Déplacer vers l'espace" via le clic droit pour transférer instantanément un onglet d'une session à l'autre.
## Version 1.2.5 (Correctif Critique UI)
- **FIX MAJEUR** : Résolution du bug bloquant qui empêchait le changement d'onglet sans les fermer au préalable. Le problème provenait d'une erreur de portée (scope JavaScript) dans le processus de rendu qui faisait planter silencieusement l'interface lors du clic.
- **IMPORTANT** : Si vous aviez ce bug sur la version 1.2.4, l'auto-updater silencieux ne peut pas mettre à jour le fichier d'interface. Vous **devez absolument** double-cliquer sur le nouveau fichier d'installation `.exe` de la version 1.2.5 pour appliquer ce correctif.

## Version 1.2.4 (Correctif UI)

Nous sommes fiers de vous présenter la version **1.2.4** de Domus Browser Pro. Cette mise à jour mineure mais critique corrige le bug de l'impossibilité de changer d'onglet, causé par le "drag region bleeding" propre à Windows. Les onglets ont désormais la garantie d'intercepter vos clics sans être bloqués par le comportement natif de déplacement de fenêtre !

---

## 🚀 Nouveautés & Améliorations Majeures

### 1. 🖱️ Menu Contextuel Natif (Clic Droit) — Alignement Premium & Zéro Décalage
*   **Refonte ergonomique** : L'ancien menu HTML/CSS personnalisé (sujet aux bugs d'affichage, aux décalages de coordonnées et aux blocages sur Gmail) a été entièrement remplacé par un **menu contextuel natif géré par le système d'exploitation** via le processus principal (`main.js`).
*   **Fonctionnalités Chrome/Firefox identiques** :
    *   **Liens** : Clic droit sur un lien pour l'ouvrir dans un nouvel onglet ou copier son adresse instantanément.
    *   **Images & Médias** : Enregistrer l'image/vidéo ou l'ouvrir dans un nouvel onglet.
    *   **Sélection de texte** : Copie rapide ou recherche Google instantanée en un clic.
    *   **Champs d'édition (Formulaires)** : Intégration du Presse-papiers natif (Couper, Copier, Coller, Tout sélectionner) 100 % fonctionnel.
    *   **Outils standard** : Navigation historique (Précédent / Suivant), Actualisation forcée, Impression.
    *   **Traduction** : Option pour traduire la page active en français via le moteur sécurisé.
    *   **Inspecter l'élément** : Diagnostic ultra-précis grâce au ciblage direct des coordonnées exactes du pointeur (`inspectElement(x, y)`).

### 2. ⌨️ Raccourcis Clavier Complets
Ajout d'une gestion centralisée des raccourcis clavier via `globalShortcut` dans le processus principal et transmission au `renderer.js` :
*   `Ctrl + T` : Nouvel onglet
*   `Ctrl + W` : Fermer l'onglet actif
*   `Ctrl + L` / `F6` : Focus de la barre d'adresse
*   `Ctrl + R` / `F5` : Recharger la page
*   `Ctrl + Shift + R` : Recharger en ignorant le cache
*   `Ctrl + F` : Ouvrir la recherche dans la page
*   `Ctrl + Plus (+)` / `Ctrl + Moins (-)` / `Ctrl + 0` : Zoom avant, arrière et réinitialisation
*   `F11` : Mode Plein Écran basculable
*   `Alt + Gauche` / `Alt + Droite` : Retour et Avance rapide dans l'historique
*   `Ctrl + 1..9` : Commutation ultra-rapide entre les onglets

### 3. 🛡️ Audit de Sécurité Critique & Anti-Fuite
*   **Sandboxing Chromium Activé** : Rétablissement de l'isolation complète des processus Chromium pour bloquer les tentatives RCE (Remote Code Execution) matérielles.
*   **Sécurisation IPC par Provenance** : Les canaux IPC critiques d'accès aux identifiants et données de cartes bancaires sont maintenant blindés avec validation systématique `isTrustedSender()` pour interdire toute intrusion ou extraction de données depuis des scripts web tiers.
*   **Protection du Coffre-Fort (Vault)** : L'importation de fichiers de mots de passe (CSV) est désormais bloquée et rejetée tant que l'utilisateur n'a pas déverrouillé son coffre avec son mot de passe maître (Master Password).
*   **Politique SSL/TLS Stricte** : Interdiction absolue de la navigation sur les sites distants présentant des certificats SSL périmés, corrompus ou invalides pour prémunir les utilisateurs des attaques de type Man-in-the-Middle (MitM).

### 4. 🔄 Fiabilisation du Processus de Mise à Jour
*   **Transition vers le redémarrage manuel** : Remplacement du bouton instable "Redémarrer pour appliquer" (qui provoquait des blocages d'accès aux fichiers `.jsc` en cours d'utilisation) par un badge explicite et sécurisé invitant à relancer l'application manuellement. Cela assure une intégrité parfaite des binaires lors de la mise à jour à chaud.

---

## 🛠️ Détail des Fichiers Modifiés (Release Trail)
*   `src/main.js` : Implémentation du menu contextuel natif OS, intégration des raccourcis clavier physiques, blindage des handlers IPC de coffre-fort et suppression de l'API de relaunch obsolète.
*   `src/preload.js` : Nettoyage des bridges inutilisés.
*   `src/renderer.js` : Suppression de l'interception DOM du clic droit au profit des menus natifs d'arrière-plan.
*   `src/settings.html` : Simplification de l'interface des mises à jour pour le restart manuel.
*   `publish.ps1` : Amélioration de l'automatisation pour écraser proprement les releases précédentes lors de la publication.
