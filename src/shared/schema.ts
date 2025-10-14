import { pgTable, serial, text, boolean, timestamp, integer, decimal, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Agencies table for multi-tenant architecture
export const agencies = pgTable('agencies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  logoKey: text('logo_key'),
});

// System users table with email/password authentication
export const systemUsers = pgTable('system_users', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdByUserId: integer('created_by_user_id'),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  agencyIdx: index('idx_system_users_agency').on(table.agencyId),
}));

// User sessions table
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => systemUsers.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tokenIdx: index('idx_user_sessions_token').on(table.sessionToken),
  userIdx: index('idx_user_sessions_user').on(table.userId),
  expiresIdx: index('idx_user_sessions_expires').on(table.expiresAt),
}));

// Cities table for each agency
export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  name: text('name').notNull(),
  state: text('state').default('SC'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  agencyIdx: index('idx_cities_agency_id').on(table.agencyId),
}));

// Professionals table
export const professionals = pgTable('professionals', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  cityId: integer('city_id').notNull().references(() => cities.id),
  phone: text('phone'),
  address: text('address'),
  observations: text('observations'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  attendanceType: text('attendance_type').default('AGENDAMENTO'),
  workingDays: text('working_days'),
  workingHours: text('working_hours'),
  email: text('email'),
}, (table) => ({
  agencyIdx: index('idx_professionals_agency_id').on(table.agencyId),
  cityIdx: index('idx_professionals_city_id').on(table.cityId),
}));

// Process steps configuration
export const processSteps = pgTable('process_steps', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  isRequired: boolean('is_required').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  agencyIdx: index('idx_process_steps_agency_id').on(table.agencyId),
}));

// Fees/taxes configuration
export const fees = pgTable('fees', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  name: text('name').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  linkedProfessionalType: text('linked_professional_type'),
}, (table) => ({
  agencyIdx: index('idx_fees_agency_id').on(table.agencyId),
}));

// Step by step processes
export const stepProcesses = pgTable('step_processes', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  userId: integer('user_id').notNull().references(() => systemUsers.id),
  cityId: integer('city_id').notNull().references(() => cities.id),
  clientName: text('client_name'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).default('0'),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  showToxicologicoMessage: boolean('show_toxicologico_message').default(false),
}, (table) => ({
  agencyIdx: index('idx_step_processes_agency_id').on(table.agencyId),
  userIdx: index('idx_step_processes_user_id').on(table.userId),
}));

// Selected steps for each process
export const processSelectedSteps = pgTable('process_selected_steps', {
  id: serial('id').primaryKey(),
  processId: integer('process_id').notNull().references(() => stepProcesses.id, { onDelete: 'cascade' }),
  stepId: integer('step_id').notNull().references(() => processSteps.id),
  professionalId: integer('professional_id').references(() => professionals.id),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Selected fees for each process
export const processSelectedFees = pgTable('process_selected_fees', {
  id: serial('id').primaryKey(),
  processId: integer('process_id').notNull().references(() => stepProcesses.id, { onDelete: 'cascade' }),
  feeId: integer('fee_id').notNull().references(() => fees.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Agency instructions
export const agencyInstructions = pgTable('agency_instructions', {
  id: serial('id').primaryKey(),
  agencyId: integer('agency_id').notNull().references(() => agencies.id),
  generalInstructions: text('general_instructions'),
  requiredDocuments: text('required_documents'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const agenciesRelations = relations(agencies, ({ many }) => ({
  users: many(systemUsers),
  cities: many(cities),
  professionals: many(professionals),
  processSteps: many(processSteps),
  fees: many(fees),
  stepProcesses: many(stepProcesses),
}));

export const systemUsersRelations = relations(systemUsers, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [systemUsers.agencyId],
    references: [agencies.id],
  }),
  sessions: many(userSessions),
  stepProcesses: many(stepProcesses),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(systemUsers, {
    fields: [userSessions.userId],
    references: [systemUsers.id],
  }),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [cities.agencyId],
    references: [agencies.id],
  }),
  professionals: many(professionals),
}));

export const professionalsRelations = relations(professionals, ({ one }) => ({
  agency: one(agencies, {
    fields: [professionals.agencyId],
    references: [agencies.id],
  }),
  city: one(cities, {
    fields: [professionals.cityId],
    references: [cities.id],
  }),
}));

export const processStepsRelations = relations(processSteps, ({ one }) => ({
  agency: one(agencies, {
    fields: [processSteps.agencyId],
    references: [agencies.id],
  }),
}));

export const feesRelations = relations(fees, ({ one }) => ({
  agency: one(agencies, {
    fields: [fees.agencyId],
    references: [agencies.id],
  }),
}));

export const stepProcessesRelations = relations(stepProcesses, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [stepProcesses.agencyId],
    references: [agencies.id],
  }),
  user: one(systemUsers, {
    fields: [stepProcesses.userId],
    references: [systemUsers.id],
  }),
  city: one(cities, {
    fields: [stepProcesses.cityId],
    references: [cities.id],
  }),
  selectedSteps: many(processSelectedSteps),
  selectedFees: many(processSelectedFees),
}));

export const processSelectedStepsRelations = relations(processSelectedSteps, ({ one }) => ({
  process: one(stepProcesses, {
    fields: [processSelectedSteps.processId],
    references: [stepProcesses.id],
  }),
  step: one(processSteps, {
    fields: [processSelectedSteps.stepId],
    references: [processSteps.id],
  }),
  professional: one(professionals, {
    fields: [processSelectedSteps.professionalId],
    references: [professionals.id],
  }),
}));

export const processSelectedFeesRelations = relations(processSelectedFees, ({ one }) => ({
  process: one(stepProcesses, {
    fields: [processSelectedFees.processId],
    references: [stepProcesses.id],
  }),
  fee: one(fees, {
    fields: [processSelectedFees.feeId],
    references: [fees.id],
  }),
}));

export const agencyInstructionsRelations = relations(agencyInstructions, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyInstructions.agencyId],
    references: [agencies.id],
  }),
}));
