# CMC Robotics Lab

Application web de gestion d’un laboratoire de robotique : inventaire électronique, emprunts de matériel, suivi des stocks, export Excel et banc de test USB pour Arduino et ESP32.

Le projet utilise une interface sombre inspirée d’un atelier technique moderne, avec navigation horizontale, accents cyan/orange et catalogue visuel des composants.

## Fonctionnalités

### Inventaire et matériel

- Catalogue responsive de composants électroniques et de matériel robotique.
- Recherche par nom, référence, description, spécifications ou catégorie.
- Filtres par type de matériel et disponibilité.
- Affichage de l’illustration, des spécifications, du stock total et de la quantité disponible.
- Ajout de matériel réservé aux administrateurs.
- Liste déroulante complète des types : capteurs, moteurs, microcontrôleurs, drivers, alimentation, prototypage, communication, affichage, actionneurs, mécanique, connectique, outils, quincaillerie et protection ESD.
- Liste déroulante d’illustrations nommées avec aperçu et possibilité d’utiliser une URL personnalisée.
- Ajustement du stock avec protection contre les quantités invalides.
- Étiquettes QR imprimables pour les composants.
- Export Excel des données d’inventaire, emprunts et maintenance.

### Emprunts

- Emprunt et retour du matériel.
- Suivi des emprunts actifs.
- Les utilisateurs voient leurs propres emprunts.
- Les administrateurs peuvent consulter et gérer les emprunts de tous les membres.
- Le matériel emprunté est retiré de la quantité disponible.
- Les retours sont idempotents et protégés contre les doublons.
- L’état initial du matériel est conservé comme « Non testé » jusqu’à confirmation.

### Comptes et permissions

- Création initiale du premier administrateur via `/setup`.
- Connexion et inscription des membres via `/login`.
- Gestion des comptes, rôles et désactivation depuis `/admin`.
- Rôles `admin` et `member` appliqués côté serveur et côté interface.
- Sessions stockées dans des cookies HttpOnly avec expiration.
- Mots de passe protégés par hachage scrypt.
- Verrouillage temporaire après plusieurs tentatives de connexion incorrectes.
- Protection du dernier administrateur contre la désactivation ou la rétrogradation.

### Circuit Tester

La route `/circuit-tester` fournit un banc de test matériel utilisant la Web Serial API du navigateur.

- Connexion à une carte Arduino ou ESP32 par USB.
- Terminal série temps réel.
- Envoi de commandes AT ou de commandes personnalisées.
- Lecture des réponses série et des mesures capteur.
- Tests guidés pour servo, capteur ultrasonique et LED.
- États `Working`, `Faulty` et `Awaiting signal`.
- Enregistrement des tests et possibilité de placer une unité défectueuse en quarantaine.
- Aucun signal de capteur n’est simulé localement : les mesures viennent d’un matériel réel compatible.

## Stack technique

- Next.js 14 avec App Router.
- React 18 et TypeScript.
- Tailwind CSS et CSS global pour l’interface.
- Framer Motion pour les transitions de dialogues.
- Web Serial API pour le banc USB.
- MySQL optionnel via `mysql2`.
- Stockage local JSON disponible sans base de données.
- `xlsx` pour les exports Excel.
- Une structure mobile Expo/NativeWind est conservée dans `mobile/` pour une évolution ultérieure.

## Prérequis

- Node.js compatible avec Next.js 14.
- npm 10 ou version équivalente.
- Pour le Circuit Tester : navigateur compatible Web Serial, câble USB et firmware approprié.
- Pour la persistance MySQL : une base MySQL accessible et une variable `DATABASE_URL` valide.

## Installation et démarrage

```bash
npm install
npm run build
npm start
```

L’application est ensuite disponible sur [http://127.0.0.1:3000](http://127.0.0.1:3000).

Pour le développement :

```bash
npm run dev
```

Au premier lancement, ouvrir `/setup` pour créer le premier administrateur. Il n’existe pas de compte par défaut.

## Configuration du stockage

Sans `DATABASE_URL`, les données sont enregistrées localement dans le dossier `data/` :

- `data/inventory.json` pour le matériel, les emprunts et la maintenance.
- `data/accounts.json` pour les comptes et sessions.

Pour choisir un autre emplacement local :

```bash
INVENTORY_DATA_DIR=C:\chemin\vers\data npm start
```

Pour utiliser MySQL :

```bash
DATABASE_URL="mysql://user:password@host:3306/database" npm run db:inventory
DATABASE_URL="mysql://user:password@host:3306/database" npm start
```

La migration crée les tables nécessaires sans injecter automatiquement les données d’exemple. Les fichiers historiques restent disponibles dans `db/`.

Ne committez jamais de fichier `.env`, de mot de passe ou de clé privée. Les fichiers d’environnement sont exclus par `.gitignore`.

## Tests et validation

Tests fonctionnels de l’inventaire, de l’authentification et des permissions :

```bash
npm run test:inventory
```

Compilation de production et vérification TypeScript :

```bash
npm run build
```

La suite de tests utilise des dossiers `.work` isolés. Elle couvre notamment la validation des stocks, les emprunts concurrents, les retours en double, la persistance, l’export Excel, les rôles, la révocation de session, le verrouillage de compte et la propriété des emprunts.

## Circuit Tester : câblage Arduino Uno

Pour le test ultrasonique avec Arduino Uno :

- VCC du HC-SR04 vers `5V`.
- GND vers `GND`.
- TRIG vers `D9`.
- ECHO vers `D10`.
- Vitesse série : `115200 baud`.

Téléverser le sketch fourni avec l’interface à l’aide de l’Arduino IDE, fermer le moniteur série Arduino, puis connecter la carte au navigateur. Le câblage Arduino Uno ne doit pas être appliqué directement à une entrée ESP32 3,3 V sans adaptation appropriée.

## Structure principale

```text
app/
  page.tsx                         Catalogue d’inventaire
  login/                           Connexion et inscription
  setup/                           Création du premier administrateur
  admin/                           Gestion des utilisateurs
  dashboard/                       Vue opérationnelle
  circuit-tester/                  Route du banc de test matériel
  api/                             Routes API d’authentification, stock et tests

components/
  inventory-catalog.tsx            Catalogue, filtres et dialogues
  add-material-modal.tsx           Formulaire d’ajout avec listes déroulantes
  inventory-item-card.tsx          Carte d’un composant
  loan-modal.tsx                   Dialogue d’emprunt
  active-loans-list.tsx             Liste des emprunts actifs
  circuit-tester.tsx               Interface Web Serial
  arduino-ultrasonic-bench.tsx     Banc Arduino ultrasonique
  auth-form.tsx                    Connexion, inscription et setup

lib/
  auth.ts                          Sessions, rôles, cookies et sécurité
  auth-store.ts                    Persistance des comptes et sessions
  inventory-service.ts             Validation et règles métier
  inventory-store.ts               Stockage local ou MySQL
  inventory-catalog-model.ts       Catégories, recherche et filtres
  excel-sync.ts                    Génération des exports Excel

db/
  migrations/                      Migrations MySQL
  inventory-seed.json              Données d’exemple historiques
  legacy-inventory.xlsx            Classeur historique

public/inventory/
  Illustrations des composants du catalogue

mobile/
  Structure Expo/NativeWind préparatoire

docs/
  Documentation de fonctionnement, architecture et protocole matériel
```

## Routes principales

- `/` : catalogue d’inventaire.
- `/dashboard` : tableau de bord opérationnel.
- `/login` : connexion et inscription.
- `/setup` : création initiale de l’administrateur.
- `/admin` : administration des comptes.
- `/circuit-tester` : banc de test Arduino/ESP32.

Les routes API sont regroupées sous `/api/auth`, `/api/admin`, `/api/inventory`, `/api/maintenance` et `/api/test-runs`.

## Limites connues

- Le banc de test nécessite du matériel réel, un navigateur compatible et un firmware correspondant.
- La récupération de mot de passe et la vérification d’adresse e-mail ne sont pas incluses.
- La structure mobile Expo est préparatoire et n’est pas encore une application mobile de production.
- La base MySQL doit être configurée séparément avec `DATABASE_URL`.
- Les données de test ne sont jamais injectées automatiquement dans une nouvelle installation.

## Documentation complémentaire

- [`docs/RUNNING.md`](docs/RUNNING.md) : démarrage, comptes, stockage et câblage.
- [`docs/project-structure.md`](docs/project-structure.md) : architecture détaillée.
- [`docs/hardware-test-protocol.md`](docs/hardware-test-protocol.md) : protocole du Circuit Tester.
- [`docs/inventory-database.md`](docs/inventory-database.md) : persistance de l’inventaire.
- [`TODO.md`](TODO.md) : fonctionnalités livrées et prochaines étapes.
