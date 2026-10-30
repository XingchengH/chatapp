# Chat app

A React + TypeScript chat client with an Express, MongoDB, Socket.IO and Cloudinary backend. Supports password and optional Google sign-in, image messages, live presence, searchable contacts and paginated conversation history.

## Local setup

Use Node.js 24 LTS (see `.nvmrc`).

```sh
npm ci --prefix backend
npm ci --prefix frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Configure MongoDB in `backend/.env`. Generate a unique session secret with `openssl rand -hex 32`; do not use the example value. Start MongoDB locally or supply an Atlas connection string. Cloudinary is optional for local text chat: leave all three credentials empty to disable image uploads, or configure all three to enable them. Upload attempts without configuration return a clear error. Production requires all three credentials.

In separate terminals:

```sh
npm run dev --prefix backend
npm run dev --prefix frontend
```

Open http://localhost:5173. The development API and socket server default to http://localhost:8080. If changing the API address, set `VITE_API_ORIGIN` and set backend `CLIENT_ORIGIN` to the browser's exact origin. Cookies require the frontend and backend to be on the same site.

Google sign-in is optional. Set `GOOGLE_CLIENT_ID` on the backend and the matching `VITE_GOOGLE_CLIENT_ID` before building the frontend. Register the browser origin in the Google OAuth client configuration. Existing Google accounts can continue using Google; password sign-in is unavailable for Google-only accounts. Existing password accounts with a third-party-email Google identity must use their original sign-in method; those identities are not silently linked.

## Verification

```sh
npm run check
npm audit --prefix backend
npm audit --prefix frontend
```

Checks run backend tests, frontend tests, ESLint and a production build. Socket tests start an ephemeral localhost server and use synthetic JWTs. Database and Cloudinary calls in regression tests are mocked; these checks require no production credentials. Test coverage includes rejected socket impersonation, session expiry/logout, multiple tabs, safe user responses, validation, bounded pagination, concurrent message updates, account-state clearing and draft-preserving retries.

## Deployment

The intended deployment is one Node process serving both the built frontend and API from one HTTPS origin.

1. Use Node.js 24 and configure the backend environment variables through the hosting service.
2. Set `NODE_ENV=production`, `CLIENT_ORIGIN=https://your-host.example` (no trailing slash), MongoDB, a strong `JWT_SECRET`, and all three Cloudinary credentials. Google IDs are optional.
3. Set `TRUST_PROXY_HOPS` only to the known number of trusted reverse proxies in front of the app. Leave it at 0 for a direct connection. Do not use a blanket trust-all configuration.
4. Build from the repository root with `npm run build`. The build uses the committed lockfiles through `npm ci` and explicitly installs frontend build tools even when `NODE_ENV=production`. Frontend `VITE_*` variables are public and baked in at build time; never put secrets in them.
5. Create the database indexes before starting this version: `npm run db:indexes --prefix backend`. This adds indexes without dropping existing ones, including the unique retry key. Production auto-index creation is disabled.
6. Start with `npm start`. Use `/health/ready` for the hosting readiness check and `/health/live` for liveness.

The server validates configuration and waits for MongoDB before listening. It shuts down sockets and the database on SIGTERM/SIGINT. The frontend path is resolved from the source file, independent of the launch directory. Unknown API routes return JSON 404 responses.

**Upgrade note:** the history and contacts endpoints now return paginated objects instead of arrays. Deploy frontend and backend together. Existing messages need no rewrite. Back up the database before applying migrations. `npm run db:normalize-emails --prefix backend` previews normalization of existing email addresses and rejects case/whitespace collisions. Run `npm run db:normalize-emails --prefix backend -- --apply` only after reviewing that output; login includes a legacy-address fallback.

Presence and rate-limit counters are currently in process memory. Before adding multiple backend replicas, configure a shared Socket.IO adapter, shared presence, a shared rate-limit store and the appropriate load-balancer behavior.

## API behavior

All protected routes and sockets use the HTTP-only `jwt` cookie. Socket user IDs supplied by clients are ignored. Each authenticated user joins a private server-managed room; all their tabs/devices receive events. Logout disconnects sockets for that session, and sockets close at JWT expiry.

- `GET /api/messages/users?search=alice&after=<id>&limit=30` returns `{ users, nextCursor }`. Contacts contain only ID, display name and avatar. Limits must be 1–100.
- `GET /api/messages/:id?before=<cursor>&limit=50` returns `{ messages, nextCursor }`. Pages arrive in chronological order, with timestamp and ID as the stable ordering key. Pass the opaque cursor back unchanged for older messages.
- `POST /api/messages/send/:id` accepts text, an optional image data URL and a UUID `clientMessageId`. A retry with the same sender/request ID returns the original message. The browser preserves drafts on failure and reuses that ID for an unchanged retry.
- Text is limited to 10,000 characters. Attachments must be PNG, JPEG, GIF or WebP and at most 5 MB before base64 encoding. The server checks MIME format, file signatures and size before uploading.
- Authentication attempts are limited to 30 per IP per 15 minutes. Sending is limited to 60 requests per user per minute; avatar changes to 10 per user per minute. Limits include retries.

## Project structure

- `backend/src/controllers`: validated API handlers
- `backend/src/lib`: session authentication, socket rooms, validation, configuration and services
- `backend/src/models`: Mongoose schemas and indexes
- `backend/test`: API-unit and real-socket regression tests
- `frontend/src/store`: authentication and conversation-specific state
- `frontend/src/components`: chat UI, uploads and contact navigation
- `frontend/src/pages`: lazily loaded screens
