# 📜 Suivi des Versions - Domus Browser Pro

Ce fichier trace l'évolution, le changelog et les audits fonctionnels du navigateur souverain **Domus Browser Pro**.

---

## 🌟 v1.7.8 - Robustesse des MAJ & Templates de Workspace Personnalisés
*Date de sortie : 28 juin 2026*

Cette mise à jour apporte une robustesse accrue au système de mise à jour automatique tout en étendant la personnalisation dans le Workspace Studio.

### 🔄 Système de mise à jour robuste (app.asar)
- Migration complète vers des archives `app.asar` pour les mises à jour à chaud de l'application (logique et interface).
- Résout définitivement les désynchronisations de version et les crashs de transition (ex: v1.7.1 -> v1.7.2).
- Maintien de la rétrocompatibilité avec le format partiel `main.jsc`.

### 🎨 Templates de Workspace Personnalisés & Premium
- Enregistrement à chaud de la configuration d'un espace en tant que template réutilisable.
- Nouvelle section "Mes Templates" dynamique dans le Workspace Studio.
- Suppression facile des templates créés via une icône dédiée.
- Ajout de 6 nouveaux templates premium : Multimédia, Vidéos, Réseaux Tech, Créatif, Presse et Perso.

---

## 🌐 v1.7.2 - Refonte Complète des Espaces de Travail
*Date de sortie : 27 juin 2026*

Mise en place d'un switcher d'espace dans la barre d'onglets, du Workspace Studio modal et des cartes glassmorphism.

---

## 🚀 v1.0.1 - Moteur Acoustique HD (Version Actuelle)
*Date de sortie : 20 mai 2026*

Cette version apporte une optimisation acoustique majeure pour tous les onglets web de lecture vidéo et musicale (YouTube, Spotify, Netflix, etc.).

### 🎼 Nouvelles fonctionnalités
- **Moteur Acoustique Domus HD (DSP)** :
  - Intégration en temps réel du processeur audio (Web Audio API) sur toutes les balises `<video>` et `<audio>` chargées.
  - **Égaliseur paramétrique hifi 3 bandes** :
    - Filtre Grave (Low Shelf) à 150 Hz (+4.5 dB) pour des basses chaudes et enveloppantes.
    - Filtre Médium (Peaking) à 1.5 kHz (+1.5 dB) pour faire ressortir les voix et dialogues de manière cristalline.
    - Filtre Aigu (High Shelf) à 8 kHz (+3.0 dB) pour redonner de la clarté et de la brillance aux détails acoustiques.
  - **Compresseur de Dynamique Studio** :
    - Équilibre dynamiquement le son (seuil de -20 dB, ratio 3.5:1, genou de 25 dB, attaque ultra-rapide 5ms et relâchement 250ms).
    - Normalise le volume pour supprimer les variations agressives de son entre les dialogues et les explosions.
  - **Gain de compensation (Makeup Gain)** : Ajustement sûr de +2 dB pour compenser les pertes de dynamique et rehausser les petits détails.
- **Presets Audio sélectionnables à chaud** :
  - `balanced` : 🎧 Équilibré & Punchy (Optimisation hifi générale)
  - `vocal` : 🗣️ Voix Claire & Cinéma (Fait ressortir les voix, atténue les grondements)
  - `bass` : 🔥 Bass Boost & Club (Amplification profonde des graves)
  - `off` : 🚫 Désactivé (Rendu sonore natif)
- **Tableau de Bord Studio Audio** :
  - Carte de commande dédiée rétroéclairée verte Matrix.
  - Toggles instantanés et sélecteur de presets synchronisés en temps réel.
  - Jauge visuelle animée style égaliseur s'activant dynamiquement en cours de lecture.
- **Paramètres Avancés** :
  - Préférences globales intégrées dans **Domus Labs** pour configurer l'activation par défaut et le profil de démarrage.

---

## 📦 v1.0.0 - Intégration des Extensions & Domus Pro Core
*Date de sortie : 9 mai 2026*

Première version de distribution blindée et sécurisée.

### 🧩 Nouvelles fonctionnalités
- **Support complet des Extensions Chrome** :
  - Téléchargement et extraction automatisés depuis le **Chrome Web Store** via ID ou URL.
  - Décodeur d'en-tête de package CRX3 propriétaire (recherche du marqueur ZIP `PK\x03\x04`).
  - Extraction disque asynchrone Windows via PowerShell `Expand-Archive`.
  - Chargement asynchrone en mémoire via `session.loadExtension()`.
  - Chargement et conversion automatique des icônes locales en URI Base64.
  - Interface utilisateur premium autonome accessible via `domus://extensions` pour activer, désactiver, consulter et supprimer ses extensions.
- **Time Machine (Navigation hors-ligne)** :
  - Base SQLite et fichiers HTML/ressources mis en cache localement.
  - Lecteur sécurisé intégré pour revoir ses pages web archivées sans connexion.
- **Out-of-Box Experience (OOBE)** :
  - Assistant d'accueil pas-à-pas avec audit matériel TPM 2.0.
  - Migration chiffrée sécurisée DPAPI de vos historiques et comptes.
- **Domus Pass (Coffre-fort)** :
  - Cryptographie de niveau militaire AES-256 de vos mots de passe.
  - Générateur de mots de passe complexes intégré.
