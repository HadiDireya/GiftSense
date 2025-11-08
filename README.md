# GiftSense, AI Gift Recommender

Full-stack React + Express application that curates gift ideas via chat, surfaces affiliate-ready product cards from Amazon, AliExpress, eBay, Etsy and Best Buy, and lets shoppers maintain a guest or user-scoped wish list with Google login.

## Stack

- **Frontend:** React (Vite + TypeScript), Tailwind CSS, React Router, React Query
- **Backend:** Node.js 20, Express, TypeScript, Zod validation, Axios
- **Shared:** Affiliate adapters with in-memory caching and scoring, session wish list storage, LLM orchestrator with heuristic fallback

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Environment

Create `.env` files from the provided examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Populate the affiliate tag placeholders with your real partner IDs. `LLM_API_URL` and `LLM_API_KEY` are optional; when omitted the backend uses a deterministic heuristic to build product queries and explanations.

Auth (optional but recommended):

- Configure these variables in `server/.env`:
	- `GOOGLE_CLIENT_ID` – OAuth 2.0 Web client ID
	- `GOOGLE_CLIENT_SECRET` – OAuth 2.0 client secret
	- `SERVER_BASE_URL` – e.g. `https://api.example.com` (must be HTTPS for Secure cookies)
	- `CLIENT_BASE_URL` – e.g. `https://app.example.com`
	- `ORIGIN_ALLOWLIST` – comma-separated list of allowed origins (e.g. `https://app.example.com,http://localhost:5173`)
	- `JWT_SECRET` and `REFRESH_SECRET` – secrets to sign access/refresh tokens
	- `ACCESS_TOKEN_TTL_MIN` (default 15) and `REFRESH_TOKEN_TTL_DAYS` (default 7)

- Configure the client with `client/.env`:
	- `VITE_API_URL` – base URL of the server (e.g. `https://api.example.com`)

Local development note: the server issues HttpOnly, Secure, SameSite=Lax cookies. Browsers only set Secure cookies over HTTPS. For local testing, use an HTTPS dev proxy (e.g. `mkcert` + reverse proxy) or temporarily run behind a secure tunnel like `ngrok`.

### Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend (in a separate shell)
cd ../client
npm install
```

### Development

Run the backend API:

```bash
cd server
npm run dev
```

By default the server listens on `http://localhost:5000` and enables CORS for the origins listed in `ORIGIN_ALLOWLIST`.

Run the Vite dev server:

```bash
cd client
npm run dev
```

Visit `http://localhost:5173` to use the app. The frontend proxies requests to the API base defined by `VITE_API_URL` (defaults to the local server).

### Production Build

```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```

Generated assets live in `client/dist` and `server/dist`.

## Key Features

- Conversational intake that captures age, gender, occasion, budget, relationship, interests, color, and brand preferences before prompting for extra refinement.
- Backend orchestrator converts the profile into a product query spec, fans out to store adapters (with per-spec LRU caching), and re-ranks results with budget and profile scoring.
- Real product cards with affiliate-safe links, rating, price, store badge, and “Why this pick” explanations.
- Quick refinement chips and persisted wish list that can trigger another recommendation pass.
- Google OAuth login with server-side Authorization Code flow. We verify Google ID tokens, upsert users, issue short-lived HttpOnly cookies, and never expose tokens to the client.
- Guest wish list with a `guest_session_id` cookie seamlessly merges into the user’s wish list on first login; deduplication by `(product_id, store)` preserves affiliate URLs.
- Theme toggle with localStorage persistence and accessible focus states.

## Testing & Verification

- `npm run build` (server) runs TypeScript compilation to verify backend types.
- `npm run build` (client) runs TypeScript + Vite production build for the frontend bundle.

Endpoints added:

- `GET /auth/google` – start Google login
- `GET /auth/google/callback` – OAuth redirect handler (server exchanges code and verifies ID token)
- `GET /api/me` – current user (or null)
- `GET /api/wishlist` – current wish list (guest or user)
- `POST /api/wishlist/add` – add last-recommended product `{ productId, store? }`
- `POST /api/wishlist/remove` – remove `{ productId, store? }`

Consider adding integration tests around the recommendation endpoint once real affiliate APIs are wired up.
"#GiftSense_V3
