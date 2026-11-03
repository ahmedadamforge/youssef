# CMC Robotics Lab — project structure

The website uses Next.js App Router. Inventory and Circuit Tester share the dark horizontal navigation in `components/app-shell.tsx`. The existing mobile scaffold is separate from the working web application.

## Inventory boundaries

- `app/page.tsx`: inventory entry point.
- `components/inventory-catalog.tsx`: filters, tabs, notifications, and dialog selection.
- `components/use-inventory.ts`: one coherent snapshot request, cancellable reads, and authoritative mutation results.
- `components/inventory-item-card.tsx`: memoized product card and contextual stock actions.
- `lib/inventory-catalog-model.ts`: category summaries, normalized search index, and pure filters.
- Loan, add-material, QR, and active-loans components load on demand through `next/dynamic`.
- `components/use-dialog-focus.ts`: dialog focus, Escape handling, and focus restoration.

## Data and routes

`lib/auth.ts` owns password hashing, session cookies, same-origin checks and server role guards. `lib/auth-store.ts` persists accounts and hashed session tokens locally or in MySQL. `lib/auth-page.ts` guards server pages; `components/session-provider.tsx` supplies the public account to client controls. `/setup` creates the first administrator, `/login` supports login and ordinary registration, and `/admin` manages accounts. API routes enforce the same permissions independently of the UI.

`GET /api/inventory/snapshot` returns items and authorized loans from a single storage snapshot, with `Cache-Control: no-store`. Ordinary users receive only loans matching their account ID. It does not expose maintenance logs. Item writes, maintenance, export and account management require an administrator.

`lib/inventory-service.ts` owns validation and stock rules. `lib/inventory-store.ts` owns local atomic writes or MySQL transactions. `lib/excel-sync.ts` exports the saved records. Configuration and storage instructions are in `docs/RUNNING.md`.

A confirmed write updates the affected local records from the server response, without fetching the full catalog again. Focus refreshes reconcile changes made elsewhere. Superseded reads are aborted; writes are not silently cancelled. The stock action guard prevents overlapping clicks before the disabled button state renders.

Search text is normalized once per inventory change and includes French category labels, names, references, descriptions, and specifications. Filtering uses a deferred query so typing remains responsive. Existing product objects retain their identity when another item changes, allowing memoized cards to skip unrelated renders.

## Circuit Tester

`app/circuit-tester/page.tsx` hosts `components/circuit-tester.tsx` and the Arduino ultrasonic bench. USB measurements require real compatible hardware and firmware; the UI does not generate sensor values.

## Verification

`npm run test:inventory` covers stock protection, concurrent borrowing, idempotent returns, persistence, Excel export, storage failures, coherent catalog snapshots, and normalized search/filter edge cases. It writes only to isolated `.work` test directories.

`npm run build` validates production compilation and TypeScript. After the loading changes, Next.js reported initial Inventory JavaScript of approximately 101 kB, compared with the prior 151 kB. This is a build-size comparison, not a network latency or device performance benchmark. Dialog code still downloads when used. Circuit Tester is a separate route and is not included in this reduction claim.
