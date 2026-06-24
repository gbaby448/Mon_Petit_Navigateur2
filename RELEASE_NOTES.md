## Domus Browser Pro v1.4.1 🚀

Cette mise à jour corrective résout un problème critique de boucle de mise à jour infinie.

### Correctifs de la version 1.4.1 :
- **Résolution de la boucle de mise à jour infinie** : Correction de l'algorithme d'identification de version du noyau compilé (`main.jsc`) en lisant dynamiquement les métadonnées de mise à jour appliquées dans l'AppData de l'utilisateur au lieu de se baser uniquement sur la version d'origine du package installé.
- **Toutes les fonctionnalités de la v1.4.0 incluses** :
  - **Recherche dans la page (Ctrl+F) non-bloquante** : Remplacement de l'ancienne boîte dialog native `prompt()` par une barre de recherche en overlay élégante avec gestion des boutons Suivant/Précédent et compteur de correspondances en temps réel.
  - **Restauration de Session (Crash Recovery)** : Restauration automatique et transparente de vos onglets après un démarrage ou le déverrouillage du coffre-fort.
  - **Gestion intelligente des Workspaces** : Les onglets restaurés retournent automatiquement dans leur espace de travail d'origine.
  - **Rouvrir les onglets fermés (Ctrl+Shift+T)** : Stockage et réouverture de vos 1000 derniers onglets fermés.
  - **Gestionnaire de permissions natif** : Caméra, micro et géolocalisation demandent explicitement confirmation via une modale sécurisée.
  - **Correcteur orthographique natif** : Activé par défaut en français et anglais.
  - **Page d'erreur réseau personnalisée** : Affichage d'une page d'erreur dark-mode stylisée en français.
