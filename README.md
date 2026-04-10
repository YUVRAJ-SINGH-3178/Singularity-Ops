# Singularity Ops

Singularity Ops is an enterprise task validation platform for the Singularity Lab workflow. Teams create tasks by lab, submit evidence, review work through votes, and manage access through wallet-based ECDSA signature authentication and JWT sessions.

> **Status**: Production-ready. Security hardened, paginated, and fully tested. See [Production Readiness](#production-readiness) for launch checklist.

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
# Edit .env with your values:
npm run dev
```

**Required environment variables** (backend will not start without these):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ddat
CORS_ORIGINS=http://localhost:5173
AUTH_JWT_SECRET=dev-jwt-secret-change-in-production
ADMIN_API_KEY=dev-admin-key-change-in-production
ENFORCE_HTTPS=false
```

**Optional**:

```env
AUTH_NONCE_TTL_MS=300000           # 5 minutes (nonce expiry)
AUTH_JWT_EXPIRES_IN=12h             # JWT token expiry
VOTE_THRESHOLD=1                    # Min votes before auto-settle
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

### Authentication

- **Wallet Signature Verification**: ECDSA signature login with nonce challenge-response flow
- **Nonce Storage**: Backed by MongoDB with automatic 5-minute TTL cleanup (fallback to in-memory if DB unavailable during startup)
- **JWT Sessions**: 12-hour token expiry, required on all protected endpoints
- **Secure Defaults**: No fallback secrets; `AUTH_JWT_SECRET` required in all environments
- **Timing-Safe Admin Operations**: Admin key verification uses `crypto.timingSafeEqual()` to prevent timing attacks

### Input Validation & Sanitization

- **Regex Escaping**: User input filters properly escaped to prevent ReDoS attacks
- **URL Validation**: Evidence URLs validated for safe HTTP(S) schemes; unsafe schemes rejected
- **Wallet Address Normalization**: All addresses normalized and validated via ethers.js
- **Admin Key Protection**: Timing-safe comparison prevents timing-based brute force attacks

### API Security

- **Helmet** for HTTP security headers (enabled in production)
- **CORS** strictly configured per environment
- **HTTPS Enforcement**: Configurable per deployment (required in production)
- **Pagination Defaults**: All list endpoints paginated (50 items/page, max 100) to prevent abuse
- **Error Message Hardening**: Generic error responses prevent information leakage

### Database

- **Compound Indexes**: Task (org+status+date), Proof (commitment+status+date), Commitment (wallet+date), User (org+role)
- **TTL Cleanup**: AuthNonce automatically cleaned up after 5 minutes
- **No Default Credentials**: MongoDB connection requires valid MONGODB_URI

## Validation

Run the available checks:

```bash
cd ddat-contract && npm test
cd ../ddat-backend && npm test
cd ../ddat-frontend && npm run build
```

## Production Readiness

### ✅ Code-Level Security & Scalability

All production-critical fixes implemented and tested:

- ✅ JWT secret enforcement (no insecure fallback)
- ✅ Durable nonce storage (MongoDB-backed with TTL)
- ✅ Pagination on all list endpoints (prevents abuse)
- ✅ Input sanitization (regex escaping, URL validation)
- ✅ Auth enforcement on all sensitive routes
- ✅ Database indexes for query performance
- ✅ Reduced frontend polling load (5s → 20s)
- ✅ Finalize operation throttling (60s min interval)
- ✅ Improved error visibility for debugging
- ✅ Backend tests: 7/7 passing
- ✅ Frontend production build: clean

### 🚀 Pre-Launch Checklist

Before deploying to production:

#### Secrets & Environment

- [ ] Set `AUTH_JWT_SECRET` to a strong random value (32+ characters)
  - Can be generated: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Set `ADMIN_API_KEY` to a strong random value
- [ ] Verify `MONGODB_URI` points to production MongoDB instance
- [ ] Verify `CORS_ORIGINS` set to your frontend domain(s) (e.g., `https://singularity-ops.com`)
- [ ] Set `ENFORCE_HTTPS=true` in production
- [ ] Verify blockchain config (`SEPOLIA_RPC_URL`, `CONTRACT_ADDRESS`, `PRIVATE_KEY`)

#### Database

- [ ] MongoDB connection validated and tested
- [ ] Database backups configured and scheduling
- [ ] Restore procedure documented and tested
- [ ] TTL indexes active on `AuthNonce` (verify via `db.authnonces.getIndexes()`)
- [ ] Monitoring/alerts set up for connection failures

#### Deployment Infrastructure

- [ ] Railway.app (or target platform) configured with environment variables
- [ ] HTTPS/SSL certificate configured
- [ ] Domain DNS pointing to deployment
- [ ] Uptime monitoring enabled (e.g., Pingdom, Datadog)

#### Testing Before Launch

```bash
# Run full validation suite
cd ddat-backend && npm test
cd ../ddat-frontend && npm run build

# Manual testing checklist:
# 1. Nonce → Sign → Verify auth flow (connect wallet)
# 2. Create, submit, vote on a task
# 3. Finalize in-review tasks
# 4. Test pagination (verify page/pageSize params work)
# 5. Verify offline error messaging
# 6. Test admin endpoints with valid key
```

#### Monitoring & Observability

- [ ] Sentry error tracking configured (if using)
- [ ] Backend logs accessible (e.g., Railway.app dashboard)
- [ ] Database slow-query logs enabled
- [ ] Alert configured for auth failures (potential brute force)
- [ ] Incident response plan documented

#### Post-Launch

- [ ] Monitor error rates for 24h
- [ ] Check database query performance
- [ ] Verify nonce TTL cleanup is working (monitor `authnonces` collection size)
- [ ] Enable rate limiting if abuse detected

## Deployment Guidance

This repository is suitable for production deployment after the checklist above is completed.

### Railway.app Deployment

1. Push to GitHub
2. Connect Railway.app to repo
3. Set environment variables in Railway dashboard
4. Deploy — nixpacks configuration will auto-build the full stack

### Key Configuration Files

- `nixpacks.toml`: Build configuration for Railway
- `railway.json`: Railway service definitions
- `.env`: Local development only (never commit secrets)
