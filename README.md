# Event Planning & Vendor Coordination Platform — Foundation

A clean monorepo foundation for the locked flagship portfolio project. The temporary repository name is intentionally generic and can be replaced after branding is finalised.

## Included

- React + TypeScript + Vite frontend
- Tailwind CSS, React Router, TanStack Query, React Hook Form and Zod
- Node.js + Express + TypeScript REST API
- PostgreSQL + Prisma starter schema
- JWT-ready authentication structure
- role and ownership middleware foundations
- modular-monolith folder organisation
- shared types package
- health endpoint, error handling and request validation
- starter public pages and authenticated dashboard shell
- Jest/Supertest-ready backend test configuration
- Docker Compose for local PostgreSQL
- CI starter workflow

## Start locally

1. Install Node.js 20+ and Docker Desktop.
2. Copy `.env.example` to `apps/api/.env`.
3. Create `apps/web/.env` with `VITE_API_URL=http://localhost:4000/api/v1`.
4. Run `docker compose up -d db`.
5. Run `npm install`.
6. Run `npm run prisma:generate -w @event-platform/api`.
7. Run `npm run prisma:migrate -w @event-platform/api -- --name init`.
8. Run `npm run dev`.

Frontend: `http://localhost:5173`  
API: `http://localhost:4000/api/v1`  
Health check: `http://localhost:4000/api/v1/health`

## Important scope note

This is a technical foundation, not the completed product. Authentication, vendor verification, quotation lifecycle, booking availability, financial calculations and all other workflows must be implemented incrementally with tests and backend-enforced business rules.

See `docs/FOUNDATION_DECISIONS.md` and `docs/NEXT_STEPS.md`.
