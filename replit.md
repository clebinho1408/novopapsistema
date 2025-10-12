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

## Recent Changes (October 12, 2025)
- ✅ Code import completed successfully
- ✅ Applied all 16 database migrations to local D1 database
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
