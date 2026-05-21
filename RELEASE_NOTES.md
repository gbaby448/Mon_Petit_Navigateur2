# 🌐 Domus Browser Pro — Version 1.2.3 Stable Release

Nous sommes fiers de vous présenter la version **1.2.3** de Domus Browser Pro. Cette mise à jour résout un problème critique de navigation en éliminant les écoutes de canaux IPC en doublon dans le processus principal. Cela stabilise à 100% le changement d'onglet (tab-switch) et la fermeture d'onglet, tout en conservant toutes les fonctionnalités premium : menu clic droit natif OS ultra-stable, sécurité renforcée Aegis, et auto-update delta.

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
