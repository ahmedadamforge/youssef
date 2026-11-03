# Guide du banc Circuit Tester — CMC Robotics Lab

Ce guide accompagne la page `/circuit-tester`. Le banc envoie une commande série terminée par `\n` et attend une réponse contenant `PASS`, `OK`, `READY` ou `PONG`. Une absence de réponse après 3 secondes est enregistrée comme `timeout`.

## Procédure commune

1. Couper l’alimentation avant de modifier un branchement.
2. Vérifier le brochage sur le module, car certaines cartes ont des labels différents.
3. Relier les masses (`GND`) avant de connecter les signaux.
4. Téléverser le firmware de référence depuis le banc, puis fermer le Moniteur Série Arduino.
5. Ouvrir `/circuit-tester` dans Chrome ou Edge sur ordinateur.
6. Choisir le port USB et le même débit que le firmware, par défaut `115200` bauds.
7. Sélectionner le matériel concerné dans l’inventaire avant de lancer le test : le résultat sera alors rattaché à sa fiche.
8. Lancer `PING` en premier, puis le test du composant.
9. Contrôler le résultat visuel, la mesure affichée et la ligne reçue dans le terminal.

## Photos et guides intégrés

L’interface affiche un guide dépliable pour chaque protocole avec une photo du module, le câblage, la procédure et les alertes de sécurité. Les photos utilisées sont les visuels des composants de `public/inventory`. Elles servent à identifier le module ; le repérage des broches dans la liste de câblage reste la référence opérationnelle.

## Tableau des commandes

| Commande | Réponse attendue | Mesure contrôlée |
|---|---|---|
| `PING` | `PONG BOARD PASS` | Carte et liaison USB |
| `TEST ULTRASONIC` | `ULTRASONIC PASS distance:24.8 cm` | Distance HC-SR04 |
| `TEST PIR` | `PIR PASS motion:0/1` | Détection de mouvement |
| `TEST LINE` | `LINE PASS values:1,0,1,1,0` | Cinq voies IR |
| `TEST DHT11` | `DHT11 PASS temperature:23 C humidity:48` | Température et humidité |
| `TEST IMU` | `IMU PASS accel:... gyro:...` | Accéléromètre et gyroscope |
| `TEST SERVO` | `SERVO PASS servo:0` | Balayage 0°–180° |
| `TEST DC MOTOR` | `DC MOTOR PASS` | Marche avant/arrière |
| `TEST STEPPER` | `STEPPER PASS` | Rotation dans les deux sens |
| `TEST DRIVER` | `DRIVER PASS` | Deux canaux du pont H |
| `TEST RELAY` | `RELAY PASS state:ON` | Commutation logique |
| `TEST LED` | `LED PASS led:OFF` | Sortie GPIO |
| `TEST POWER` | `POWER PASS voltage:5.00 V` | Tension du rail |

## Branchement et contrôle par composant

### 1. Carte Arduino / ESP32 — `PING`

- USB → ordinateur.
- GND commun avec le montage.
- Vérifier que le débit de l’interface et du firmware est identique.
- Résultat accepté : `PONG`, `READY` ou `HANDSHAKE OK`.

### 2. HC-SR04 — `TEST ULTRASONIC`

- VCC → 5 V.
- GND → GND.
- TRIG → D9.
- ECHO → D10 sur Arduino Uno.
- Placer une cible entre 10 et 100 cm et vérifier une mesure stable.
- Sur une carte logique 3,3 V, protéger ECHO par un diviseur de tension.

### 3. PIR — `TEST PIR`

- VCC → alimentation conforme au module.
- GND → GND.
- OUT → D2.
- Attendre la stabilisation du capteur avant de mesurer.
- Faire un test sans mouvement puis un test avec passage de la main.

### 4. Barrette IR — `TEST LINE`

- VCC → 5 V.
- GND → GND.
- S1–S5 → A0–A4.
- Placer la barrette à 5–10 mm du support.
- Tester une surface blanche puis une ligne noire ; les cinq valeurs doivent évoluer.

### 5. DHT11 — `TEST DHT11`

- VCC → alimentation conforme au module.
- GND → GND.
- DATA → D4.
- Ajouter une résistance pull-up de 4,7–10 kΩ entre DATA et VCC si elle n’est pas intégrée.
- Ne pas interroger le capteur trop rapidement.

### 6. MPU6050 — `TEST IMU`

- VCC selon la tension acceptée par le breakout.
- GND → GND.
- SDA → A4 et SCL → A5 sur Arduino Uno.
- Sur ESP32, utiliser les GPIO I²C configurés par le firmware, souvent SDA 21 / SCL 22.
- Maintenir le module immobile ; au repos, l’accélération doit rester proche de 1 g sur un axe.

### 7. Servo SG90 — `TEST SERVO`

- Rouge → 5 V externe recommandé.
- Marron/Noir → GND.
- Orange/Jaune signal → D6.
- Relier le GND de l’alimentation externe au GND Arduino.
- Vérifier le balayage 0° → 90° → 180° → 0° sans forcer la mécanique.

### 8. Moteurs TT — `TEST DC MOTOR`

- Alimenter les moteurs par une source séparée.
- Moteur gauche → OUT1/OUT2.
- Moteur droit → OUT3/OUT4.
- GND de la puissance et GND logique communs.
- Tester sans charge puis en marche avant/arrière ; arrêter en cas d’échauffement.

### 9. 28BYJ-48 + ULN2003 — `TEST STEPPER`

- Connecteur moteur → ULN2003.
- IN1–IN4 → quatre GPIO, par exemple D8–D11.
- VCC du driver → alimentation 5 V adaptée.
- GND driver et GND Arduino communs.
- Vérifier les deux sens de rotation et la température du driver.

### 10. L298N — `TEST DRIVER`

- ENA/ENB → sorties PWM.
- IN1–IN4 → quatre GPIO.
- Moteurs → OUT1–OUT4.
- Alimentation moteur sur VS ; logique sur 5 V selon le jumper et la carte.
- Ne jamais court-circuiter les sorties du pont H.

### 11. Relais 1 canal — `TEST RELAY`

- VCC → 5 V.
- GND → GND.
- IN → D7.
- Tester d’abord sans charge sur COM/NO/NC.
- Pour du 230 V, intervention obligatoire d’une personne qualifiée ; le banc ne remplace pas une validation électrique.

### 12. LED / GPIO — `TEST LED`

- GPIO → résistance 220–330 Ω → anode LED.
- Cathode → GND.
- Vérifier trois clignotements.
- Une LED nue ne doit jamais être branchée directement sur un GPIO.

### 13. Rail d’alimentation — `TEST POWER`

- Multimètre en tension continue.
- Pointe rouge sur VCC et pointe noire sur GND.
- Utiliser le pont diviseur prévu par le firmware pour une tension supérieure à la référence ADC.
- Ne jamais mesurer une tension en mode courant.
- Comparer la valeur affichée avec le multimètre avant de déclarer le rail fonctionnel.

## Historique et maintenance

Quand un test reçoit une réponse positive ou négative, le Circuit Tester enregistre :

- la date et l’heure ;
- l’utilisateur connecté ;
- le matériel sélectionné ;
- le protocole et la commande ;
- le statut `passed`, `failed` ou `timeout` ;
- les mesures décodées ;
- la réponse brute reçue ;
- l’erreur éventuelle.

Un résultat `failed` peut ensuite être envoyé vers le signalement de panne et la mise en quarantaine existante. Un résultat `timeout` signifie uniquement qu’aucune réponse valide n’a été reçue dans le délai : il faut vérifier le câblage, le débit série et le firmware avant de conclure à une panne.
