# GAD Survey-App

Interne Next.js-App für die GAD-Mini-Studie zu Vertrauen in medizinische KI-Entscheidungen.

## Lokal starten

```bash
npm install
SURVEY_PASSWORD=survey ADMIN_PASSWORD=admin npm run dev -- --hostname 127.0.0.1 --port 3000
```

Lokale URL: `http://127.0.0.1:3000`

Für lokale Entwicklung ohne Upstash-Env-Vars speichert die App Antworten in `data/local-responses.json`. Diese Datei ist ignoriert und nicht für produktive Erhebung gedacht. In Production muss Upstash Redis über Vercel verbunden sein.

## Env Vars

```bash
SURVEY_PASSWORD=
ADMIN_PASSWORD=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`SURVEY_PASSWORD` und `ADMIN_PASSWORD` müssen unterschiedlich gewählt und nur in `.env.local` oder in Vercel gesetzt werden. Die Upstash-Werte setzt Vercel bei nativer Upstash-Installation normalerweise automatisch. Unterstützt werden auch `KV_REST_API_URL` und `KV_REST_API_TOKEN`, falls Vercel diese Namen verwendet. Keine Secrets in Git committen.

## Checks

```bash
npm test
npm run lint
npm run build
npm audit --omit=dev
```

## Deployment

- Repository privat auf GitHub anlegen.
- `.env.local` nicht committen.
- Upstash Redis nativ im Vercel-Projekt installieren.
- `SURVEY_PASSWORD` und `ADMIN_PASSWORD` in Vercel setzen.
- Nach dem Deployment einmal `/`, `/admin` und den CSV-Export prüfen.
