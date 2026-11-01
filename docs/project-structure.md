# CMC Robotics Lab — project structure

The first delivery establishes a shared design system and the web-only Circuit Tester. The repository is intentionally organized so the responsive dashboard, project gallery, events calendar, inventory catalog, and member leaderboard can be added without moving the tester code.

```text
app/
  globals.css          Tailwind layers, surfaces, utilities, serial states
  layout.tsx           Global typography and document shell
  page.tsx             Circuit Tester route
components/
  circuit-tester.tsx   Web Serial connection, terminal, sensor feed, test cards
lib/
  design-tokens.ts     Shared brand colors, type, and motion values
public/
  manus-routes.json    Preview route manifest
  assets/              Future supplied or uploaded club media
mobile/
  app/                 Expo Router screens for dashboard, inventory, and profile
  lib/                 Shared mobile design tokens
  package.json         Expo + NativeWind dependency boundary
server/
  db/                  Planned managed database adapters and migrations
  auth/                Planned member session and role adapters
docs/
  project-structure.md This file
```

## Brand translation

The reference site is translated into a working palette instead of copied as a static screenshot: deep blue-black ink, blue-teal panel surfaces, cyan edge light, and orange for active or attention states. Typography uses a geometric sans for editorial headings and a monospace face only where machine output benefits from it.

The Circuit Tester is a deliberate dashboard exception to the marketing site’s large editorial hero. It keeps the same wide spacing, low-contrast borders, pill CTAs, and glass panels while prioritizing live hardware feedback and readable serial output.

## Next slices

1. Add shared shell navigation and Supabase/Firebase auth boundaries.
2. Add project and event records with managed database adapters.
3. Add inventory availability and borrowing transactions.
4. Add member points, profile activity, and leaderboard ranking.
5. Extract the shared token package for the Expo + NativeWind mobile client.
