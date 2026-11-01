# Inventory database

The stock catalog now uses the managed database through `DATABASE_URL`.

## Schema

`db/migrations/001_inventory.sql` creates `inventory_items` with:

- `id`, `name`, `category`, `description`, and `image`
- `stock` for the tracked total quantity
- `available` for the quantity not currently reserved
- `unit`, `specs` JSON, and `accent`
- `updated_at` for auditability

The `available` value is constrained to remain no greater than `stock`.

## Server API

- `GET /api/inventory` returns all records ordered by category and name.
- `PATCH /api/inventory/:id` accepts `{ "action": "reserve" }` or `{ "action": "release" }`.
- Reserve and release are atomic SQL updates. The endpoint returns HTTP `409` when no unit can be reserved or no reservation can be released.
- Responses use `Cache-Control: no-store` so the inventory screen reads current quantities.

## Seed and migration

The shared seed is in `db/inventory-seed.json`. Run the idempotent migration with:

```powershell
npm run db:inventory
```

The script creates the table and upserts the 16 current component records. Existing availability is preserved on re-runs so a seed refresh does not overwrite active reservations.

The browser UI first requests the database API. If the runtime cannot reach the managed database, it shows the shared local snapshot and labels the catalog **Local snapshot** instead of claiming that the data is synchronized.
