# Bramble - Homeschool Co-op SaaS Platform

## Overview

Bramble is a multi-tenant SaaS platform designed to manage homeschool co-ops. It facilitates the management of classes, events, families, instructors, payments, and communications for various co-op organizations. The platform acts as a merchant of record, utilizing Stripe for payment processing and a ledger-based system for distributing funds to co-ops and instructors.

The application features two distinct frontends: an Operator Dashboard for platform-level administration and a Tenant App for co-op admins, instructors, and families.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite build tool)
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Typography**: Libre Baskerville (headings), Inter (UI/body)

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js REST API
- **Authentication**: JWT-based (access/refresh tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Zod schemas

### Database Layer
- **ORM**: Prisma (primary), Drizzle Kit (migrations)
- **Database**: PostgreSQL
- **Multi-tenancy**: All tenant-scoped models include `tenantId`

### Authentication & Authorization
- **JWT Tokens**: Short-lived access, longer-lived refresh tokens.
- **Role-Based Access Control (RBAC)**:
  - `BRAMBLE_OPERATOR`: Platform-wide access.
  - `COOP_ADMIN`: Tenant-level administrative access.
  - `INSTRUCTOR`: Class management and roster access.
  - `FAMILY`: Enrollment and profile management.
- **Middleware**: Handles authentication, role checking, tenant scoping, and audit logging.

### Frontend Route Structure
- **Public Website**: `/`, `/start`, `/about`, `/privacy`, `/terms`, `/directory`, `/setup`.
- **Operator Dashboard**: `/operator/*` for BRAMBLE_OPERATOR users (e.g., applications, tenants, payments).
- **Tenant App**: `/app/*` for role-based access:
  - `/app/admin/*`: Co-op Admin functions.
  - `/app/instructor/*`: Instructor functions.
  - `/app/family/*`: Family functions.
- **Layouts**: `OperatorLayout.tsx`, `TenantLayout.tsx`, and `RoleSwitcher` for multi-role users.

### API Structure
Organized by domain:
- `/api/auth/*`: Authentication.
- `/api/coop-applications/*`: Co-op application management.
- `/api/tenant/*`: Co-op admin operations.
- `/api/directory/*`: Public co-op discovery.
- `/api/me/*`: User profile and family management.
- `/api/instructor/*`: Instructor-specific operations.
- `/api/t/:tenantSlug/*`: Tenant-scoped public operations.

### Course/Offering Architecture
The class system uses a three-level hierarchy:
- **Course**: Reusable course template (title, description, prerequisites & notes, age range) stored in the Course Library
- **Offering**: Specific instance of a course for a season (links to Course, instructor, price, capacity, status, season label)
- **OfferingClass**: Individual meeting within an offering (date, time, location, location details)

This architecture enables:
- Reusing course templates across semesters without re-entering details
- Tracking offerings by season (e.g., "Fall 2026", "Spring 2027")
- Independent enrollment per offering

### Key Features
- **Role Switching**: Users with multiple roles can switch between portals.
- **Admin & Instructor Tools**: Calendars, course library, offering management, instructor/family management, email templates, automations.
- **Communication**: Class group messaging, email hub with templates and logs.
- **Enrollment & Scheduling**: Session scheduler with recurrence, class re-approval workflow, improved enrollment/RSVP status.
- **User Management**: Suspend/reactivate users, soft-delete/archive system for records.
- **UI/UX Enhancements**: Redesigned dashboards, consistent form validation, reusable common components (e.g., `SessionScheduler`, `EmptyState`, `ConfirmDialog`).
- **Co-op Onboarding**: Public application flow for new co-ops with operator review and magic link setup for admins.

### Payment Processing
- **Provider**: Stripe (merchant of record model).
- **Functionality**: Payment intents, webhook handling, ledger entries for revenue split (Bramble, instructor, co-op).
- **Payouts**: Weekly cron job for payouts based on ledger.

### Background Jobs
- **Scheduler**: node-cron.
- **Jobs**: Weekly payout processing.

## External Dependencies

### Third-Party Services
- **Stripe**: Payment gateway.
- **PostgreSQL**: Primary database.
- **SMTP2GO**: Email sending service via Nodemailer.

### Key NPM Packages
- `@prisma/client`, `drizzle-orm`, `drizzle-kit`: Database ORM and migrations.
- `stripe`: Stripe API integration.
- `jsonwebtoken`, `bcryptjs`: Authentication and password hashing.
- `node-cron`: Background task scheduling.
- `@tanstack/react-query`, `wouter`, `zod`: Frontend data fetching, routing, and schema validation.

## Global Rules

🔒 **All user passwords must be created by the user via a secure link**.
- No admin sets passwords manually
- No default or temporary passwords
- Always use tokenized invite/setup URLs

## Polish Before Launch

Items to complete before public launch:

1. **Redesign public apply flow** - Remove password field from application form. After admin approval, send secure setup link for user to create their own password (matching the co-op admin onboarding pattern).

2. **Add Google sign-in** - Consider using Replit Auth integration for Google, GitHub, Apple login options.

3. **Stripe integration** - Configure STRIPE_SECRET_KEY and complete checkout flow for class enrollment and payouts.

## UI Terminology

The application uses consistent terminology throughout:
- **Course**: Reusable template in the Course Library
- **Offering**: Specific run of a course for a season (with instructor, pricing, schedule)
- **Schedule**: The set of dates/times for an offering
- **Class**: Individual meeting date within an offering (NOT "session")

NEVER use "session" in user-facing text. Always use "class" for individual meetings.

## Recent Changes

- **Jan 28, 2026**: Updated all UI terminology from "session" to "class" throughout the application. All user-facing labels, dialogs, and toast messages now use "class" for individual meetings and "schedule" for the set of dates.
- **Jan 28, 2026**: Implemented Course → Offering → OfferingClass architecture. Course Library for reusable course templates, Offerings for seasonal class runs with instructor/schedule/pricing, OfferingClass for individual meetings. Migrated 12 existing classes to new structure. Added CourseManager.tsx admin UI. Updated backend routes for admin, instructor, and family access to offerings.
- **Jan 28, 2026**: Added two location fields (Address + Location Details) to classes and events. ClassSession and Event models now have locationDetails field. Address is for structured address (e.g., "1400 Sullivan Rd"), Location Details is for directions (e.g., "Near playground and volleyball nets"). Fixed child profile dialog scroll by increasing max-height to 90vh.
- **Jan 28, 2026**: Added instructor approval email notification (sent when class status changes from "Pending Approval" to "Published"). Fixed My Children view - enrolled classes are now clickable and navigate to class details in the Classes tab. Fixed email service import issue in tenant routes.
- **Jan 28, 2026**: Fixed Edit Child functionality for admins with dialog and PATCH endpoint. Fixed Edit Class duplicate sessions bug (now replaces sessions instead of adding duplicates). Fixed multi-role instructor dropdown to include users with INSTRUCTOR as primary or secondary role.
- **Jan 28, 2026**: Added application notification emails (confirmation to applicants, notification to co-op admins). Added "Interested in teaching?" instructor signup link to all public landing page layouts. Fixed suspended badge not showing for families in FamilyManager.
- **Jan 28, 2026**: Completed Phase 2 approval/security features - ConfirmDialog component, archive/unarchive system, suspend/reactivate users, move-to-pending for rejected applications, denial email notifications.
- **Jan 28, 2026**: Implemented Local Provider Directory feature. LocalProvider database model for tenant-scoped provider listings (name, website, description, category, contact info). Admin ProviderManager UI at /app/admin/providers with CRUD operations, search, category filtering, and "Sync Instructors" button to auto-create provider listings for approved instructors. Family-facing ProvidersTab in FamilyDashboard for browsing local providers and services.
- **Jan 29, 2026**: Simplified class scheduling system. Replaced complex daily/weekly/custom recurrence with simple model: start date, end date, day/time pairs (each day can have different times). System auto-generates class dates. Added individual class management: reschedule (new date/time), cancel (with restore option), add one-off class (for makeups). Single main schedule per offering enforced.
- **Jan 29, 2026**: Redesigned schedule editing with display-first UX. When editing an offering, the schedule displays as a summary card ("Meets Mon & Wed, 10am-12pm, Jan 15 - May 30") with an Edit button. User clicks Edit to modify the schedule. Schedule pattern is auto-detected from existing classes and pre-populates the editor. Added isOneOff flag to distinguish manually-added one-off classes from schedule-generated classes; schedule regeneration replaces pattern-based classes while preserving one-offs.