# Singularity Ops

Singularity Ops is a task management and validation platform built for Singularity Lab. It enables teams to create tasks, submit evidence, review work through voting, and manage authentication using wallet signatures.

## Features

- Wallet-based authentication (ECDSA + JWT)
- Lab-based task management
- Evidence submission
- Reviewer voting workflow
- User profiles and role requests
- Admin dashboard for system operations
- Smart contract integration

## Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express, MongoDB |
| Authentication | Wallet Signatures, JWT |
| Blockchain | Solidity, Hardhat |

## Project Structure

```text
DDAT/
├── ddat-frontend/
├── ddat-backend/
└── ddat-contract/
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- MetaMask

### Backend

```bash
cd ddat-backend
npm install
cp .env.example .env
npm run dev
```

Required environment variables:

```env
PORT=5000
MONGODB_URI=
AUTH_JWT_SECRET=
ADMIN_API_KEY=
CORS_ORIGINS=http://localhost:5173
```

### Frontend

```bash
cd ddat-frontend
npm install
cp .env.example .env
npm run dev
```

### Smart Contracts

```bash
cd ddat-contract
npm install
npx hardhat test
```

## Main API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| POST | `/api/tasks/:taskId/submit` | Submit evidence |
| POST | `/api/tasks/:taskId/vote` | Vote on a task |
| GET | `/api/user/:wallet/profile` | Get user profile |
| POST | `/api/user/:wallet/profile` | Update profile |

## Testing

```bash
cd ddat-contract && npm test
cd ../ddat-backend && npm test
cd ../ddat-frontend && npm run build
```

## Deployment

The project can be deployed on Railway or any Node.js hosting platform.

```
Push repository
Configure environment variables
Deploy
```
