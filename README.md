# Moment — Service

Frontend-only fine-dining coordination between **Manager**, **Server**, and **Cook**, plus a **Control** panel for demos. No backend — state syncs across tabs via `localStorage` + `BroadcastChannel`.

## Live preview

**https://oskar-q.github.io/moment/**

## Demo

```bash
npm install
npm run dev
```

1. Open **Control**
2. Click **Open ends** → Manager / Server / Cook (separate windows)
3. Step through **Guided flow** (Next beat) — each step emphasizes one role
4. Or load presets: Empty floor / Mid-service / Rush on II

Redeploy after changes: `npm run build && npx gh-pages -d dist`

## Routes

| Path | Role |
|------|------|
| `/` | Role picker |
| `/control` | Demo remote |
| `/manager` | Oversight + kanban + comms |
| `/server` | Course sequence + floor signals |
| `/kitchen` | Cook focus + progress |

## Stack

Vite · React · TypeScript · Zustand · React Router · @dnd-kit
