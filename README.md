# UNO Multijoueur

Un jeu de UNO en ligne jouable en temps réel, développé dans le cadre d'un projet universitaire.

L'architecture repose sur un client web réactif et un serveur autoritaire pour empêcher la triche.

## Fonctionnalités

- **Multijoueur en temps réel :** Synchronisation de l'état du jeu via WebSockets et STOMP.
- **Serveur Autoritaire :** La logique métier est 100% côté serveur (validation des coups, filtrage par DTOs pour masquer les mains adverses).
- **Intelligence Artificielle :** Remplacement dynamique des joueurs déconnectés par des bots et complétion automatique des salons.
- **UI/UX Moderne :** Animations fluides (Framer Motion), placement dynamique des cartes en éventail et application monopage (SPA).

## Stack Technique

**Back-end :**

- Java 17 / Spring Boot
- Spring WebSocket / STOMP
- Architecture N-Tiers & Design Patterns (DTO, Factory, Observer)

**Front-end :**

- React 18 / Vite
- React Router DOM
- Framer Motion
- SockJS & StompJS

## Installation et Lancement local

### 1. Serveur (Back-end)

Placez-vous dans le dossier du backend et lancez Spring Boot :

```bash
./mvnw spring-boot:run
```

Le serveur écoute par défaut sur le port 8080.

### 2. Client (Front-end)

Placez-vous dans le dossier du frontend et créez un fichier .env à la racine :
VITE_API_URL=http://localhost:8080  
Installez les dépendances et lancez le serveur de développement :

```bash
npm install
npm run dev
```

Le jeu est accessible sur http://localhost:5173.

## Déploiement

- Jouer (Vercel) : https://uno-upjv.vercel.app

## Auteurs

- Matthieu C. Back-end
- Sofiane F. Front-end
