# Singularity Ops Frontend

This is the React + Vite frontend for Singularity Ops.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

For local development, keep:

```env
VITE_API_BASE=/api
VITE_APP_ORGANIZATION=Singularity Lab
```

The Vite proxy forwards `/api` to the local backend.

## Hosted Deployment

Set the frontend environment variables in your host:

```env
VITE_API_BASE=https://your-backend-domain/api
VITE_APP_ORGANIZATION=Singularity Lab
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Notes

- `VITE_API_BASE` must point to the deployed backend in production.
- `VITE_APP_ORGANIZATION` should match the backend organization name.
- Wallet login requires MetaMask and the backend auth endpoints.
