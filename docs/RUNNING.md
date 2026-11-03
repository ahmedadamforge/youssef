# Running CMC Robotics Lab

This is a local inventory and USB workbench application. Start it with `npm install`, `npm run build`, then `npm start`. Open http://127.0.0.1:3000.

## Accounts and permissions

On first launch, open `/setup` on localhost and choose the first administrator's name, email and password (10–128 characters). There are no default credentials. Setup closes once the first account exists. For setup from a remote hostname, configure `AUTH_SETUP_TOKEN` on the server and enter that code in the setup form.

Members can then register from `/login`. Registration always creates an ordinary user. Administrators manage roles and deactivate accounts from **Comptes**.

| Action | Utilisateur | Admin |
| --- | --- | --- |
| View inventory, specifications and QR labels | Yes | Yes |
| Borrow and return own equipment | Yes | Yes |
| View and return other members' loans | No | Yes |
| Add equipment, adjust stock and export Excel | No | Yes |
| Use Circuit Tester and maintenance | No | Yes |
| Manage accounts and roles | No | Yes |

Permissions are enforced on the server. Ordinary users see only their own loans; old loans without an account owner remain accessible to administrators. Changing a role or deactivating an account revokes that account's sessions. The last active administrator cannot be demoted or disabled.

Passwords are salted and hashed with scrypt. Sessions expire after eight hours and use HttpOnly, SameSite cookies (Secure over HTTPS). Five incorrect login attempts lock an account for 15 minutes. Use HTTPS when hosting remotely. Password recovery and email verification are not included.

## Storage

Without DATABASE_URL, inventory records are saved in `data/inventory.json` and accounts and sessions in `data/accounts.json`. Set INVENTORY_DATA_DIR to use another durable directory. Back up this directory and protect access to account backups. Stock changes, loans and maintenance commit together using a file lock and atomic rename; accounts use a separate lock and atomic writes. A new installation starts empty. The historical `db/inventory-seed.json` is preserved, but is never loaded automatically or overwritten by the app.

After an unexpected process termination, if writes report storage unavailable, stop all application processes and check for `inventory.lock` in the data directory. Remove that lock only when no server is running, then restart. Do not edit inventory.json while the server is running.

For MySQL, set DATABASE_URL and run `npm run db:inventory` before starting the server. The migration creates tables without injecting sample data and adds the loan owner column to an existing installation. Accounts and sessions use `app_auth_state`. Existing database records are preserved. Database errors are surfaced instead of silently switching to another store. Switching storage configuration does not migrate records. MySQL changes use transactions and database-scoped advisory locks.

Excel downloads are generated on demand from the same saved inventory, loan and maintenance snapshot. The historical static workbook is preserved under db/legacy-inventory.xlsx and is not served as a current export.

## Hardware

Open Circuit Tester in a browser supporting Web Serial. Download the Arduino Uno sketch in the USB bench, upload with Arduino IDE, close its serial monitor and connect at 115200 baud. Connect HC-SR04 VCC to 5V, GND to GND, TRIG to D9 and ECHO to D10 on an Arduino Uno. This wiring is for the Uno, not a 3.3V ESP32 input.

The included firmware supports board handshake, ultrasonic distance and LED tests. Other component tests require corresponding firmware commands. No sensor values are generated locally. Select a real inventory article before reporting a fault; this quarantines one available unit.

## Verification and scope

Run `npm run test:inventory`. It calls the real API route handlers using Request/Response objects in an isolated .work directory, tests concurrent loans and duplicate returns, launches a fresh process to verify persistence, and checks the Excel workbook. It also checks login, setup, role restrictions, loan ownership, session revocation, expiry, account lockout and origin validation. Test accounts exist only in isolated test directories. This does not require network access or change your inventory. A live MySQL server is not exercised by this test suite.

The server binds to localhost by default. The separate mobile scaffold has not been converted into a production mobile app.
