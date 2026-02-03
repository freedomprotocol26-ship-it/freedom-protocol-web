# Freedom Protocol – Codex Context

## What this project is
Freedom Protocol is a health platform that connects:
- Patients
- Doctors
- Facilities
- Platform Admin

The system supports role-based access, onboarding flows, and
financial attribution (no payouts yet).

## Current tech stack
- Backend: Node.js + Express
- Database: PostgreSQL (Supabase)
- Auth: JWT-based authentication with role middleware
- Deployment: Render
- Repo: GitHub

## Current project state
- Authentication is implemented
- Roles exist (admin, doctor, patient)
- Partner/doctor routes exist
- Revenue and payout services exist but are not finalized
- No live money movement yet

## Folder structure (simplified)
src/
- controllers/
- services/
- routes/
- middleware/
- db/
- utils/

## Architectural rules (non-negotiable)
- Business logic must live in services
- Controllers must be thin
- No direct DB access from controllers
- UUIDs for primary keys
- Financial logic must be auditable and explicit
- No payouts or transfers yet

## Roles
- admin
- doctor
- patient
- facility (linked to doctor, not standalone)

## Codex permissions
Codex may:
- Modify services, controllers, routes
- Propose and add schema migrations
- Add tests or test scaffolding

Codex may NOT:
- Redesign authentication
- Change role hierarchy
- Modify environment variables
- Touch deployment configuration
