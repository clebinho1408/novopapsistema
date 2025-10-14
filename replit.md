# PAP - Sistema (Detran Process Management System)

## Overview
This is a multi-tenant management system for driving license (Detran) processes in Brazil. It allows agencies to manage cities, accredited professionals, process steps, fees, and track driver's license application workflows.

## Technology Stack
- **Frontend**: React 19 with TypeScript, React Router, TailwindCSS
- **Backend**: Hono (running on Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Build Tool**: Vite
- **Deployment**: Cloudflare Workers

## Project Structure
```
├── src/
│   ├── react-app/          # React frontend application
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── worker/             # Cloudflare Worker backend
│   │   └── index.ts        # Hono API server
│   └── shared/             # Shared types between frontend/backend
│       └── types.ts        # Zod schemas and TypeScript types
├── migrations/             # Database migration files
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
npm run dev                      # Start dev server on port 5000
```

### Environment Configuration
- The application is configured to run on port 5000
- CORS is configured to work with Replit's proxy
- Frontend binds to 0.0.0.0:5000 for accessibility

### Database Migrations
Apply migrations to local database:
```bash
npx wrangler d1 migrations apply 0199c55d-a66a-73b2-b501-16d101636238 --local
```

Check migration status:
```bash
npx wrangler d1 migrations list 0199c55d-a66a-73b2-b501-16d101636238 --local
```

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

## Production Database Setup (October 13-14, 2025)
- ⚠️ **Critical Issue Resolved**: Published app was using temporary D1 database that reset, causing data loss
- 📦 Exported all configuration data: agencies, cities, process steps, fees, professionals (28 credenciados)
- 🗄️ SQL import script: MIGRACOES-COMPLETAS.sql (schema + data combined, tested and verified)
- ✅ **Solution**: Created permanent D1 production database (ID: f57092b8-0b17-4a0f-834a-be1c9c3d9b1a)
- ✅ Migration applied successfully via Cloudflare Dashboard Console
- ✅ User data preserved: 1 admin user, 7 cities, 5 fees, 5 steps, 28 professionals
- 👤 Default admin user: admin@bcamboriu.com / admin123 (user must change password after first login)
- 🔧 Updated wrangler.json to use production database (removed R2 bucket dependency)
- 🚀 **Status**: Ready to publish - needs workers.dev subdomain registration
- 📝 Publishing instructions: INSTRUCOES-PUBLICACAO.md

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
  - Deployment target: Autoscale (Cloud Run) with production build
  - All dependencies now compatible with React 19
  - Build command: npm install --legacy-peer-deps && npm run build
  - Run command: npm run preview (serves production build on port 5000)
  - Added preview script to package.json for production deployment
- Configured Vite to bind to 0.0.0.0:5000 for Replit environment
- Updated CORS configuration to support Replit proxy domains
- Set up development workflow
- Configured deployment for Cloudflare Workers (autoscale)
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
The application is configured for production deployment:
- Deployment target: Autoscale (Cloud Run)
- Build command: `npm install --legacy-peer-deps && npm run build`
- Run command: `npm run preview` (serves production build)
- Build process:
  1. Generates Cloudflare Worker types (`wrangler types`)
  2. Compiles TypeScript
  3. Builds Vite production bundle
- Uses Cloudflare D1 for database
- Uses Cloudflare R2 for file storage
