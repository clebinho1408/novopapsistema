# PAP - Sistema (Detran Process Management System)

## Overview
This is a multi-tenant management system designed to manage driving license (Detran) processes in Brazil. It enables agencies to efficiently handle cities, accredited professionals, process steps, fees, and track the workflow of driver's license applications. The project aims to provide a stable and scalable solution for process management, addressing previous issues with data persistence and deployment stability.

## User Preferences
I prefer detailed explanations.
Do not make changes to the `worker/` folder unless explicitly instructed, as it contains legacy Cloudflare Workers code.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 19 with TypeScript.
- **Styling**: TailwindCSS for a utility-first CSS approach.
- **Routing**: React Router for client-side navigation.
- **Print Layouts**: Enhanced components for printing, including improved formatting, professional card display, preserved HTML in instructions, and optimized line spacing.
- **Terminology**: System-wide use of "Credenciados" instead of "Profissionais".

### Technical Implementations
- **Multi-tenancy**: Isolated data for each agency.
- **User Roles**: Three-tier permission system: Administrator (full access), Supervisor (access to specific pages, create/edit but no delete), and Collaborator (access to own processes).
- **Process Automation**:
    - Intelligent auto-selection of steps and fees based on selected service:
        * **Alteração de Dados**: Auto-selects Foto, Taxa steps + Emissão da CNH fee
        * **Alteração de Dados + EAR**: Auto-selects Foto, Taxa, Exame Psicológico steps + Emissão da CNH fee
        * **Renovação**: Auto-selects Foto, Taxa, Exame Médico steps + Emissão da CNH fee
        * **Renovação + EAR**: Auto-selects Foto, Taxa, Exame Psicológico, Exame Médico steps + Emissão da CNH fee
        * **Transferência + Renovação**: Auto-selects Foto, Taxa, Exame Médico steps + Emissão da CNH, Transferência fees
        * **Transferência + Renovação + EAR**: Auto-selects Foto, Taxa, Exame Psicológico, Exame Médico steps + Emissão da CNH, Transferência fees
        * **Transferência + Alteração de Dados**: Auto-selects Foto, Taxa steps + Emissão da CNH, Transferência fees
        * **Transferência + Alteração de Dados + EAR**: Auto-selects Foto, Taxa, Exame Psicológico steps + Emissão da CNH, Transferência fees
        * **Transferência + Definitiva**: Auto-selects Foto, Taxa steps + Emissão da CNH, Transferência fees
        * **Estrangeiro**: Auto-selects Foto, Taxa, Exame Psicológico, Exame Médico steps + Emissão da CNH fee
        * **Transferência + 2º Via**: Auto-selects Foto, Taxa steps + 2º Via, Transferência fees
    - Automatic selection of "Foto" professional for a city if available and the "Foto" step is selected.
    - Automatic selection/deselection of "Prova" fee when a "Prova" credenciado is chosen/unchosen (fee is always disabled for manual selection).
    - Fee selection disabled when "Taxa" step is not selected.
- **Authentication**: Custom session-based system with HTTP-only cookies, bcryptjs for password hashing, and 30-day session expiration.
- **Development Architecture**: Dual server setup: Vite for frontend (port 5000) and Hono/Node.js for backend API (port 3000), with Vite proxying `/api/*` requests.
- **Production Architecture**: Single Node.js server (port 5000) serving both static frontend files (from `dist/client/`) and API endpoints via Hono, using `@hono/node-server/serve-static`.
- **Database Interaction**: Drizzle ORM for PostgreSQL, with schema defined in `src/shared/schema.ts`.
- **API Compatibility**: D1-to-PostgreSQL adapter (`src/server/d1-adapter.ts`) for historical compatibility.

### Feature Specifications
- **Agency Management**: Creation and management of agencies.
- **User Management**: Administrator and collaborator roles with distinct permissions.
- **City Management**: Register and manage cities associated with agencies.
- **Credenciado Management**: Management of accredited professionals (doctors, psychologists, testing centers).
- **Process Step Configuration**: Fixed sequence of workflow steps (non-editable, non-reorderable, always active):
    1. Foto
    2. Taxa
    3. Exame Psicológico
    4. Exame Médico
    5. Prova
- **Fee Configuration**: Fixed sequence of fees (value-editable only, non-deletable):
    1. Emissão da CNH (no linkage)
    2. Transferência (no linkage)
    3. Prova (auto-managed, linked to 'prova' credenciado selection)
    4. Médico (linked to 'medico' credenciado)
    5. Psicólogo (linked to 'psicologo' credenciado)
    6. 2º Via (no linkage, default system tax)
- **Step-by-Step Processes**: Create, track, and manage individual driver's license application workflows.
- **Dynamic Forms**: "Serviço" dropdown with 9 service options in specific order: Alteração de Dados, Alteração de Dados + EAR, Renovação, Renovação + EAR, Transferência + Renovação, Transferência + Renovação + EAR, Transferência + Alteração de Dados, Transferência + Alteração de Dados + EAR, Transferência + Definitiva.
- **Print Optimization**: Intelligent auto-sizing system that automatically reduces instruction font size (14px → 5px) and line-height (1.1 → 1.0) to fit all content on a single page. Reduced line spacing for more compact display.
- **Print Instructions**: Hide semicolons (;) in print view only, no user warnings, always proceed with print.
- **Special Messages**: When Exame Psicológico is not selected, displays "ATENÇÃO: O CONDUTOR OPTOU POR NÃO COLOCAR O EAR NA SUA CNH" instead of X mark.

### System Design Choices
- **Backend Framework**: Hono on Node.js for API services.
- **ORM**: Drizzle ORM for type-safe database interactions.
- **Build Tool**: Vite for fast development and optimized production builds.
- **Deployment Strategy**: Configured for Replit Autoscale, utilizing a single-server Node.js setup in production.

## External Dependencies
- **Database**: Neon PostgreSQL 16 (São Paulo, Brazil - external, primary database).
- **Deployment Platform**: Replit Autoscale.
- **ORM**: Drizzle ORM.
- **Frontend Libraries**: React, React Router.
- **Styling Framework**: TailwindCSS.
- **Backend Libraries**: Hono, `@hono/node-server/serve-static`.
- **Utility Libraries**: `bcryptjs` for password hashing, `tsx` for running TypeScript in Node.js.

## Database Configuration (October 15, 2025)
**Consolidated to Single Neon PostgreSQL Database**

**Issue**: Previously had two databases (Replit PostgreSQL + Neon PostgreSQL) causing confusion and data inconsistency.

**Solution**: Consolidated to use only Neon PostgreSQL 16 in São Paulo region for stability, low latency, and data consistency.

**Current Setup**:
- **Database**: Neon PostgreSQL 16 (South America - São Paulo, sa-east-1) - SINGLE database only
- **Connection**: NEON_DATABASE_URL environment variable (only)
- **Admin user**: admin@bcamboriu.com / admin123
- **Data**: All production data (28 credenciados, 7 cidades, 5 etapas, 6 taxas)
- **Retry logic**: 3 attempts with exponential backoff for connection errors
- **Status**: ✅ Stable and operational
- **Important**: Removed DATABASE_URL fallback to prevent dual-database issues