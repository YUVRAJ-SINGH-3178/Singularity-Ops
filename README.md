# Singularity Ops

Singularity Ops is an enterprise task validation platform for the Singularity Lab workflow. Teams create tasks by lab, submit evidence, review work through votes, and manage access through wallet-based authentication.

## Overview

The platform is organized around two layers:

- Enterprise workflow: task creation, evidence submission, review votes, and role requests.
- Legacy accountability layer: commitment, proof, and voting APIs supported by the backend and contract stack.

The primary product experience is the enterprise workflow. Legacy endpoints remain available for compatibility.

## Tech Stack

| Layer      | Stack                                    |
| ---------- | ---------------------------------------- |
| Frontend   | React, Vite, Tailwind CSS                |
| Backend    | Node.js, Express, MongoDB, Mongoose      |
| Auth       | Wallet signature login with JWT sessions |
| Blockchain | Solidity, Hardhat, Sepolia               |
| Monitoring | Optional Sentry                          |

## Core Features

- Wallet-based login and session persistence
- Singularity Lab profile and role management
- Lab-scoped task creation and assignment
- Evidence submission and reviewer voting
- Automatic rejection of overdue open and in-review tasks
- Admin pool operations for forfeited contract funds

## Repository Structure

```text
DDAT/
  ddat-backend/
  ddat-contract/
  ddat-frontend/
```

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB
- MetaMask for wallet authentication
- Sepolia RPC access if testing blockchain flows

### Backend

```bash
cd ddat-backend
npm install
cp .env.example .env
npm run dev
```

Recommended backend environment values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ddat
CORS_ORIGINS=http://localhost:5173
AUTH_JWT_SECRET=replace_with_a_strong_random_secret
ADMIN_API_KEY=set_a_strong_random_secret
ENFORCE_HTTPS=false
```

### Frontend

```bash
cd ddat-frontend
npm install
cp .env.example .env
npm run dev
```

Recommended frontend environment values:

```env
VITE_API_BASE=/api
VITE_APP_ORGANIZATION=Singularity Lab
```

### Contract

```bash
cd ddat-contract
npm install
npx hardhat test
```

## Main API Areas

### Enterprise workflow

| Method | Endpoint                         | Purpose                               |
| ------ | -------------------------------- | ------------------------------------- |
| GET    | /api/tasks/labs/list             | List lab catalog                      |
| GET    | /api/tasks                       | List tasks                            |
| POST   | /api/tasks                       | Create task                           |
| POST   | /api/tasks/:taskId/submit        | Submit evidence                       |
| POST   | /api/tasks/:taskId/vote          | Cast vote                             |
| POST   | /api/tasks/finalize-in-review    | Finalize ready review tasks           |
| GET    | /api/user/:wallet/profile        | Load or bootstrap profile             |
| POST   | /api/user/:wallet/profile        | Update profile or request role change |
| GET    | /api/user/members/by-lab/:labKey | List assignable members               |
| GET    | /api/user/role-requests/pending  | List pending role requests            |
| POST   | /api/user/:wallet/approve-role   | Approve or deny role request          |

### Admin operations

| Method | Endpoint                           | Purpose                     |
| ------ | ---------------------------------- | --------------------------- |
| GET    | /api/admin/forfeited-pool          | View forfeited pool balance |
| POST   | /api/admin/forfeited-pool/withdraw | Withdraw forfeited funds    |

## Security Notes

- Wallet signature authentication protects protected routes
- JWT sessions are used after login
- Helmet, CORS, and rate limiting are enabled
- HTTPS enforcement is configurable for production

## Validation

Run the available checks:

```bash
cd ddat-contract && npm test
cd ../ddat-backend && npm test
cd ../ddat-frontend && npm run build
```

## Deployment Guidance

This repository is suitable for internal pilots and controlled production-style hosting after environment variables are configured correctly.

Before going live, verify:

1. Strong secrets are set in production.
2. MongoDB and backend URLs are correct.
3. The frontend points to the deployed API.
4. The contract address and network match the deployed environment.
5. You have a rollback and monitoring plan.
