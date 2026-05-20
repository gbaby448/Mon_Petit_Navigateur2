# 🏠 Domus Browser - Journal de Bord & Roadmap

Ce fichier est la mémoire du projet. Il contient toutes les idées, les versions et le suivi du développement.

## 🚀 Vision du Projet
Créer un navigateur indépendant, souverain et ultra-sécurisé, alliant la puissance de Chromium, la personnalisation de Vivaldi et la protection de Brave.

---

## 🛠 Fonctionnalités Clés (Prévues)

### 🎨 Design & UI (Esprit DomusCore)
- [ ] **Workspaces (Espaces de travail) :** Rangement pro des onglets par thématique.
- [ ] **Tab Stacking :** Empilement intelligent des onglets.
- [ ] **Sidebar Premium :** Accès rapide aux outils et Web Panels.
- [ ] **Look & Feel :** Minimalisme, Glassmorphism, animations fluides.

### 🛡 Sécurité (La Forteresse)
- [ ] **Détection TPM :** Chiffrement matériel si disponible.
- [ ] **Master Password :** Alternative de chiffrement robuste pour les anciens PC.
- [ ] **Shadow-Tabs :** Onglets de paiement isolés et autodestructibles.
- [ ] **Protection CB :** Chiffrement inviolable (AES-256) pour l'auto-remplissage.
- [ ] **Audit Tool :** Page interne `browser://security-audit` pour détecter les fuites.

### 🎬 Performance & Vie Privée (Brave Style)
- [ ] **Video AI Engine :** Upscaling local et amélioration des couleurs (HDR).
- [ ] **Bouclier Réseau :** Blocage des pubs et traqueurs au niveau du réseau.
- [ ] **Data Map :** Visualisation temps réel de la destination des données.
- [ ] **Indépendance Google :** Suppression totale de la télémétrie Google.

---

## 📈 Historique des Versions

### v0.1.0.0 (En cours) - Fondation
- [x] Initialisation du projet Electron.
- [x] Création de la structure de dossiers.
- [x] Mise en place du fichier Roadmap.
- [x] Création de la fenêtre principale (Main Window).
- [x] Intégration du moteur de rendu web réel.
- [x] Détection initiale du TPM (via PowerShell).
- [x] Gestion des profils utilisateurs (Espaces de travail isolés).
- [x] Bouclier anti-pub réseau (Filtrage des domaines publicitaires).
- [x] Coffre-fort chiffré (AES-256-GCM) avec Master Password.
- [x] Data Map en temps réel (Localisation IP géographique locale).
- [x] Système de backup/restauration chiffré (.domus-backup).
- [x] Durcissement du noyau (v0.1.1.0 Security Patch).

---

## 📝 Notes & Idées à ne pas oublier
- Ne jamais stocker de données en clair.
- Garder le choix à l'utilisateur mais rester indépendant par défaut.
- Système de mise à jour robuste (Majeure, Mineure, Patch, Build).
