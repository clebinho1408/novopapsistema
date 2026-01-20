import z from "zod";

// Agency types
export const AgencySchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Agency = z.infer<typeof AgencySchema>;

// User types
export const UserRoleSchema = z.enum(['administrator', 'supervisor', 'collaborator']);

export const UserSchema = z.object({
  id: z.number(),
  agency_id: z.number(),
  mocha_user_id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: UserRoleSchema,
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

// City types
export const CitySchema = z.object({
  id: z.number(),
  agency_id: z.number(),
  name: z.string(),
  state: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type City = z.infer<typeof CitySchema>;

// Professional types
export const ProfessionalTypeSchema = z.enum(['foto', 'medico', 'psicologo', 'prova', 'curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica']);

export const AttendanceTypeSchema = z.enum(['AGENDAMENTO', 'POR ORDEM DE CHEGADA']);

export const ProfessionalSchema = z.object({
  id: z.number(),
  agency_id: z.number(),
  name: z.string(),
  type: ProfessionalTypeSchema,
  city_id: z.number(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  observations: z.string().optional(),
  attendance_type: AttendanceTypeSchema.optional(),
  working_days: z.string().optional(),
  working_hours: z.string().optional(),
  city_name: z.string().optional(), // For joined queries
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Professional = z.infer<typeof ProfessionalSchema>;
export type ProfessionalType = z.infer<typeof ProfessionalTypeSchema>;
export type AttendanceType = z.infer<typeof AttendanceTypeSchema>;

// Process step types
export const ProcessStepSchema = z.object({
  id: z.number(),
  agency_id: z.number(),
  name: z.string(),
  type: z.string(),
  is_required: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProcessStep = z.infer<typeof ProcessStepSchema>;

// Fee types
export const FeeSchema = z.object({
  id: z.number(),
  agency_id: z.number(),
  name: z.string(),
  amount: z.string(), // Database returns as string (decimal/numeric)
  linked_professional_type: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Fee = z.infer<typeof FeeSchema>;

// Step process types
export const StepProcessSchema = z.object({
  id: z.number(),
  agency_id: z.number(),
  name: z.string(),
  type: z.string(),
  is_required: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type StepProcess = z.infer<typeof StepProcessSchema>;

// API request/response types
export const CreateCityRequestSchema = z.object({
  name: z.string().min(1, "Nome da cidade é obrigatório"),
});

export const CreateProfessionalRequestSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: ProfessionalTypeSchema,
  city_id: z.number().min(1, "Cidade é obrigatória"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  observations: z.string().optional(),
  attendance_type: AttendanceTypeSchema.optional(),
  working_days: z.string().optional(),
  working_hours: z.string().optional(),
});

export const CreateStepProcessRequestSchema = z.object({
  city_id: z.number().min(1, "Cidade é obrigatória"),
  client_name: z.string().optional(),
  selected_steps: z.array(z.number()),
  selected_professionals: z.record(z.string(), z.number()),
  selected_fees: z.array(z.number()),
  show_toxicologico_message: z.boolean().optional(),
});

export type CreateCityRequest = z.infer<typeof CreateCityRequestSchema>;
export type CreateProfessionalRequest = z.infer<typeof CreateProfessionalRequestSchema>;
export type CreateStepProcessRequest = z.infer<typeof CreateStepProcessRequestSchema>;

// Professional type labels for UI
export const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  foto: 'Foto',
  medico: 'Médico',
  psicologo: 'Psicólogo',
  prova: 'Prova',
  curso_teorico: 'Curso Teórico',
  prova_teorica: 'Prova Teórica',
  curso_pratico: 'Curso Prático',
  prova_pratica: 'Prova Prática'
};
