## Domus Browser Pro v1.8.2 🌟

### Robustesse des Mises à Jour & Templates de Workspace Personnalisés

Cette mise à jour apporte une robustesse accrue au système de mise à jour automatique tout en étendant la personnalisation dans le Workspace Studio.

#### ✨ Nouveautés :
- **Mise à jour complète via `app.asar`** : Les mises à jour à chaud remplacent désormais la totalité de la logique et de l'interface graphique (au lieu de seulement `main.jsc`), évitant ainsi toute désynchronisation et assurant une stabilité parfaite à chaque transition de version.
- **Templates Personnalisés** : Possibilité de sauvegarder n'importe quel espace en tant que template réutilisable depuis le Workspace Studio via le bouton `⭐ Enregistrer comme Template`. Ils s'affichent sous "Mes Templates" et peuvent être supprimés d'un simple clic (`×`).
- **Nouveaux Templates Prédéfinis Premium** : Ajout de templates préconfigurés pour le divertissement et la technologie :
  - **Multimédia** (📺)
  - **Vidéos** (🎬)
  - **Réseaux Tech** (🌐)
  - **Créatif** (🎨)
  - **Presse** (📰)
  - **Perso** (🏠)

---

## Domus Browser Pro v1.7.2 🌐

### Refonte complète des Espaces de Travail

Cette mise à jour transforme en profondeur l'expérience des Espaces de Travail (Workspaces) pour la rendre simple, pratique et agréable au quotidien.

#### ✨ Nouveautés :
- **Switcher d'espace dans la barre d'onglets** : Toujours visible, couleur dynamique selon l'espace actif, dropdown élégant au clic
- **Workspace Studio Modal** entièrement repensé :
  - 6 templates en 1 clic (Travail, Études, Gaming, Finance, Musique, Shopping)
  - 36 icônes organisées par catégories (général, travail, études, loisirs, finance, vie perso)
  - 8 couleurs d'accent prédéfinies + sélecteur de couleur libre
  - Preview en temps réel de la carte de l'espace pendant la création
  - Toggle "Navigation privée" intégré
- **Raccourcis clavier** `Ctrl+1` à `Ctrl+9` pour basculer instantanément entre espaces
- **Couleur d'accent dynamique** : la navbar adopte la couleur de l'espace actif
- **Cards glassmorphism** : chaque espace est affiché comme une carte colorée dans le panneau latéral

#### 🧹 Simplification :
- **Plus d'espaces imposés** : finies les cases "Standard", "Travail", "Mode Privé" pré-créées. Un seul espace de départ "Mon Espace", l'utilisateur crée exactement ce dont il a besoin
- Tous les espaces personnalisés sont désormais supprimables

#### 🐛 Corrections :
- Correction du crash `pageSnapshotBg is not defined` (ReferenceError)

---

## Domus Browser Pro v1.5.0 🚀


Cette mise à jour majeure apporte des fonctionnalités essentielles demandées par nos utilisateurs pour hisser Domus Browser Pro au niveau des meilleurs navigateurs du marché.

### Nouvelles fonctionnalités :
- **Visionneuse PDF native intégrée** : Terminé les téléchargements forcés de PDF ! Les documents PDF s'ouvrent désormais directement et proprement dans un onglet grâce au support natif des plugins Chromium.
- **Barre de favoris horizontale (Ctrl+Shift+B)** : Une barre de favoris classique et élégante fait son apparition juste sous la barre d'adresse. Elle est entièrement personnalisable et son affichage peut être basculé rapidement à l'aide du raccourci clavier `Ctrl+Shift+B`.
- **Ajout rapide de favoris ⭐** : Un bouton Étoile a été intégré directement dans la barre d'adresse pour ajouter ou retirer le site courant de vos favoris en un seul clic. L'état est instantanément synchronisé avec la barre horizontale et le panneau latéral.
- **Mémorisation du Zoom par domaine** : Le navigateur se souvient désormais de vos préférences de zoom. Ajustez le zoom pour un site (ex: 120% pour Wikipedia), et chaque nouvelle page de ce domaine s'ouvrira automatiquement avec ce zoom.

### Améliorations de performance et stabilité :
- **Consistance de la version** : Stabilisation complète du processus de mise à jour automatique introduit en v1.4.1.
- **Micro-animations CSS** : Amélioration des effets de survol et transitions sur la barre de favoris.
