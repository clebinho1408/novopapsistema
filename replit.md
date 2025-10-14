# PAP - Sistema (Detran Process Management System)

## Overview
This is a multi-tenant management system for driving license (Detran) processes in Brazil. It allows agencies to manage cities, accredited professionals, process steps, fees, and track driver's license application workflows.

## Technology Stack
- **Frontend**: React 19 with TypeScript, React Router, TailwindCSS
- **Backend**: Hono on Node.js server
- **Database**: Replit PostgreSQL
- **ORM**: Drizzle ORM
- **Build Tool**: Vite
- **Development Architecture**: Dual server (Vite on port 5000, Node.js API on port 3000)
- **Deployment**: Replit Autoscale
- **Legacy Support**: Maintains Cloudflare Workers compatibility (worker/index.ts) for optional deployment

## Project Structure
```
├── src/
│   ├── react-app/          # React frontend application
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── server/             # Node.js backend (development)
│   │   ├── app.ts          # Hono API server (shared with worker)
│   │   ├── node-entry.ts   # Node.js entry point
│   │   ├── storage.ts      # PostgreSQL client (Drizzle)
│   │   └── d1-adapter.ts   # D1-to-PostgreSQL adapter
│   ├── worker/             # Cloudflare Worker backend (legacy/optional)
│   │   └── index.ts        # Worker entry point
│   └── shared/             # Shared code between frontend/backend
│       ├── schema.ts       # Drizzle schema definitions
│       └── types.ts        # Zod schemas and TypeScript types
├── drizzle.config.ts       # Drizzle ORM configuration
└── public/                 # Static assets
```

## Key Features
1. **Agency Management**: Multi-tenant architecture with isolated agency data
2. **User Management**: Administrator and collaborator roles
3. **City Management**: Register and manage cities
4. **Professional Management**: Manage doctors, psychologists, and testing centers
5. **Process Steps**: Configure workflow steps for license applications
6. **Fee Configuration**: Set up and manage fees/taxes
7. **Step-by-Step Processes**: Create and track license application workflows

## Development Setup

### Running Locally
```bash
npm install --legacy-peer-deps  # Install dependencies
npm run dev                      # Start dual server (Vite + Node.js API)
```

This starts two servers concurrently:
- **Vite frontend**: http://localhost:5000 (user-facing)
- **Node.js API server**: http://localhost:3000 (backend API)

The Vite server proxies all `/api/*` requests to the Node.js server.

### Environment Configuration
- Frontend: Vite dev server on port 5000 (binds to 0.0.0.0)
- Backend: Node.js Hono server on port 3000
- Database: PostgreSQL via DATABASE_URL environment variable
- CORS is configured to work with Replit's proxy

### Database Setup
The application uses **Drizzle ORM** with PostgreSQL. The schema is defined in `src/shared/schema.ts`.

**Schema is already applied** to the PostgreSQL database. To modify the schema:
1. Edit `src/shared/schema.ts`
2. Run `npm run db:push` to sync changes
3. If prompted about data loss, use `npm run db:push --force`

**Important**: The schema uses PostgreSQL-specific syntax:
- Columns use `text` type (not `varchar`)
- Booleans use `true/false` literals (not `1/0`)
- Timestamps use `CURRENT_TIMESTAMP` (not `datetime('now')`)

## Database Schema
The application uses the following main tables:
- `agencies` - Multi-tenant agency data
- `system_users` - User authentication and roles
- `user_sessions` - Session management
- `cities` - City registry per agency
- `professionals` - Accredited professionals (doctors, psychologists, etc.)
- `process_steps` - Configurable workflow steps
- `fees` - Fee/tax configuration
- `step_processes` - Individual process instances
- `process_selected_steps` - Steps selected for each process
- `process_selected_fees` - Fees selected for each process

## User Roles and Permissions
The system supports three levels of access:
- **Administrator**: Full access to all features and pages (can create, edit, and delete)
- **Supervisor**: Access to Passo a Passo and Profissionais pages (can create and edit, but cannot delete)
- **Collaborator**: Access only to Passo a Passo page (their own processes)

## Database Migration: D1 → PostgreSQL (October 14, 2025)
**Critical Issue**: Application was experiencing data loss on every Replit deployment due to using temporary D1 database storage.

**Solution**: Migrated from Cloudflare D1 (SQLite) to Replit PostgreSQL for persistent storage.

### Migration Steps Completed:
1. ✅ Created Drizzle ORM schema (`src/shared/schema.ts`) matching existing PostgreSQL database
2. ✅ Built D1-to-PostgreSQL adapter (`src/server/d1-adapter.ts`) to maintain API compatibility
3. ✅ Separated backend into standalone `app.ts` with Node.js entry point (`node-entry.ts`)
4. ✅ Converted all SQL queries from SQLite syntax to PostgreSQL:
   - Changed `datetime('now')` → `CURRENT_TIMESTAMP`
   - Changed `is_active = 1/0` → `is_active = true/false`
   - Changed `varchar` → `text` for string columns
5. ✅ Configured dual server architecture (Vite + Node.js) with proxy
6. ✅ Tested CRUD operations - all working with PostgreSQL

### Architecture:
- **Development**: PostgreSQL (persistent across deployments)
- **Backend**: Hono API on Node.js server (port 3000)
- **Frontend**: Vite dev server (port 5000) with API proxy
- **Database Client**: Drizzle ORM with postgres.js driver

### Data Preserved:
- ✅ 1 agency (Balneário Camboriú)
- ✅ 7 cities
- ✅ 28 professionals (credenciados)
- ✅ 5 process steps
- ✅ 5 fees
- ✅ 1 admin user (admin@bcamboriu.com)

**Status**: Migration complete and tested. Data now persists across all deployments.

## Production Database Setup (Historical - October 13-14, 2025)
**Note**: This section describes the previous Cloudflare D1 setup. Current production uses Replit PostgreSQL (see migration section above).

- ⚠️ **Legacy Setup**: Previously used Cloudflare D1 database (ID: f57092b8-0b17-4a0f-834a-be1c9c3d9b1a)
- 📦 Data export: MIGRACOES-COMPLETAS.sql (schema + data combined, tested and verified)
- 👤 Default admin user: admin@bcamboriu.com / admin123
- **Current Status**: System migrated to Replit PostgreSQL for better data persistence

## Recent Changes (October 12, 2025)
- ✅ Code import completed successfully
- ✅ Applied all 17 database migrations to local D1 database (including supervisor role migration)
- ✅ Server running without errors on port 5000
- ✅ Enhanced PrintableStepProcess component with improved formatting
- ✅ Fixed print layout to display all professional cards (with X for unselected)
- ✅ Preserved HTML formatting in instructions when printing
- ✅ Optimized line spacing in printed instructions (line-height: 1.1)
- ✅ Removed fixed font-size to respect editor settings in print
- ✅ Email functionality: Semicolons (;) create line breaks in email, hidden in print
- ✅ Updated email title from "PASSO A PASSO" to "SIGA O PASSO A PASSO"
- ✅ Fixed deployment issues:
  - Removed react-quill (incompatible with React 19), using quill directly
  - Updated @vitejs/plugin-react to v5.0.4 (vite 7.x compatible)
  - Deployment target: Replit Autoscale with production build
  - All dependencies now compatible with React 19
  - Build command: npm install --legacy-peer-deps && npm run build
  - Run command: npm run preview (serves production build on port 5000)
  - Added preview script to package.json for production deployment
- Configured Vite to bind to 0.0.0.0:5000 for Replit environment
- Updated CORS configuration to support Replit proxy domains
- Set up development workflow for dual server architecture
- Configured deployment for Replit Autoscale
- Installed dependencies with --legacy-peer-deps flag (React 19 compatibility)
- ✅ Print layout improvements:
  - Increased prova card width from 380px to 480px for better visibility
  - Increased font sizes in prova card (text-sm) for better readability
  - Card uses flexible height (min-h-24) to adapt to content
- ✅ Step Process form enhancements:
  - Transformed "Nome do Cliente" field into "Serviço" dropdown
  - Added service options: "Renovação" and "Renovação + Transferência"
  - Implemented automatic fee selection:
    - "Renovação" → auto-selects "Emissão da CNH" fee
    - "Renovação + Transferência" → auto-selects "Emissão da CNH" + "Transferência" fees
  - Service selection is optional; no fees auto-selected when empty
  - Service name is not displayed in print/email output (only used for fee selection)
  - Fixed Cancel button to properly reset form data and return to step 1
- ✅ Added new "Supervisor" user role:
  - Created three-tier permission system: Administrator > Supervisor > Collaborator
  - Supervisors have access to Passo a Passo and Profissionais pages
  - Supervisors can view all processes and create/edit professionals (cannot delete)
  - UI Delete button is hidden for supervisors in Professionals page
  - Backend enforces administrator-only permissions for DELETE operations
  - Supervisors can use POST/PATCH endpoints (create and edit)
  - Updated Layout navigation to show appropriate menu items for each role
  - Updated ProtectedRoute to enforce role-based access control
  - Applied migration 17 to add supervisor role to database schema
- ✅ Print layout footer enhancement:
  - Footer appears naturally after content on the first page
  - Removed fixed positioning that was pushing footer to second page
  - Footer flows with content without creating page breaks
- ✅ Fixed TypeScript compilation errors for deployment:
  - Resolved type mismatch in Configurations.tsx (lines 380 and 404)
  - Changed disabled attribute from `boolean | null` to explicit boolean using `!!` operator
  - Build now compiles without TypeScript errors
- ✅ Print layout improvements:
  - Added "TAXA:" label before linked fee amounts in professional cards
  - Clearer display of fees associated with each professional type
  - Increased logo size in print view (80px height, 160px width)
- ✅ System-wide terminology update (October 13, 2025):
  - Changed "Profissionais" to "Credenciados" throughout the system
  - Changed "Profissional" to "Credenciado" in all UI elements
  - Updated navigation menus, page titles, labels, and messages
  - Maintained internal code structure (table names, API routes remain unchanged)
- ✅ Print layout - Fee display:
  - Fees linked to medico/psicologo display inside their respective cards
  - Fees linked to prova display in the general fees card (TAXAS A PAGAR)
  - Fees without links display in the general fees card
- ✅ Auto-select prova fee (October 13, 2025):
  - When selecting a credenciado for Prova, automatically selects the linked prova fee
  - When deselecting a credenciado for Prova, automatically deselects the linked prova fee
  - Improves workflow by reducing manual steps in the registration process
  - Fixed database: Updated "Prova" fee to have linked_professional_type = 'prova'
- ✅ Auto-select foto professional (October 14, 2025):
  - When selecting a city in Passo a Passo form, automatically selects the Foto credenciado of that city
  - Auto-selection only occurs if the Foto step is selected
  - When city changes, replaces the foto professional if the current selection belongs to a different city
  - Preserves manual selection if user chooses a different foto professional from the same city
  - Clears selection when switching to a city without a foto professional
  - User can always manually override the auto-selection
- ✅ Production deployment configuration (October 14, 2025):
  - Configured single-server production mode with Node.js Hono
  - Added `@hono/node-server/serve-static` for static file serving
  - Fixed TypeScript compilation errors in d1-adapter.ts and storage.ts
  - Updated build to output frontend to `dist/client/`
  - Production server (port 5000) serves both API and static files
  - Ready for Replit Autoscale deployment

## Known Issues
- TypeScript LSP shows type errors in worker/index.ts (Cloudflare types) - these don't affect runtime
- Minor security vulnerabilities in dependencies (2 low, 1 moderate) - not critical for development

## Authentication
The application uses a custom session-based authentication system:
- Session tokens stored in HTTP-only cookies
- Password hashing with bcryptjs
- 30-day session expiration
- Multi-tenant isolation enforced at database level

## Deployment
The application is configured for production deployment on Replit:
- **Deployment target**: Replit Autoscale
- **Build command**: `npm install --legacy-peer-deps && npm run build`
- **Run command**: `npm start` (runs Node.js server with tsx on port 5000)

### Production Architecture
- **Single server**: Node.js Hono server on port 5000
- **Static files**: Served from `dist/client/` using `@hono/node-server/serve-static`
- **API endpoints**: All `/api/*` routes handled by Hono
- **SPA routing**: Falls back to `index.html` for client-side routing
- **Runtime**: TypeScript executed via `tsx` (no compilation needed in production)
- **Database**: Replit PostgreSQL (persistent storage)

### Build Process
1. `npm install --legacy-peer-deps` - Installs dependencies (React 19 compatibility)
2. `tsc -b` - Compiles TypeScript (type checking)
3. `vite build` - Builds frontend to `dist/client/`
4. Production server serves:
   - Frontend assets from `dist/client/`
   - Backend API from Hono routes

### Development vs Production
- **Development**: Dual server (Vite on 5000, Node.js API on 3000)
- **Production**: Single server (Node.js serves both frontend and API on 5000)
