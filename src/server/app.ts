import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import {
  CreateCityRequestSchema,
  CreateProfessionalRequestSchema,
} from "../shared/types";
import { d1Adapter } from "./d1-adapter";

// Replace c.env.DB with d1Adapter globally
const mockEnv = { DB: d1Adapter };

const app = new Hono();

app.use("*", cors({
  origin: (origin) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5000",
      "https://localhost:5000",
    ];

    if (!origin) return allowedOrigins[0];

    const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
    if (replitDomain) {
      allowedOrigins.push(`https://${replitDomain}`);
      allowedOrigins.push(`http://${replitDomain}`);
    }

    if (allowedOrigins.includes(origin)) return origin;
    if (origin.includes('.replit.dev')) return origin;

    return allowedOrigins[0];
  },
  credentials: true,
}));

// Generate session token
function generateSessionToken() {
  return Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join('');
}

// Auth middleware for new system
async function systemAuthMiddleware(c: any, next: any) {
  const sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    return c.json({ error: "No session token" }, 401);
  }

  // Check if session is valid and not expired
  const session = await mockEnv.DB.prepare(
    "SELECT s.*, u.*, a.name as agency_name FROM user_sessions s JOIN system_users u ON s.user_id = u.id JOIN agencies a ON u.agency_id = a.id WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true"
  ).bind(sessionToken).first();

  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  c.set("user", session as any);
  await next();
}

// Helper function to get user with agency
function getUserWithAgency(c: any) {
  const user = c.get("user") as any;
  return user || null;
}

// Public endpoints (no auth required)
app.get('/api/public/agencies', async (c) => {
  const { results } = await mockEnv.DB.prepare(
    "SELECT id, name FROM agencies WHERE is_active = true ORDER BY name"
  ).all();

  return c.json(results || []);
});

// Auth endpoints
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    const requiredFields = ['agency_name', 'agency_email', 'admin_name', 'admin_email', 'admin_password'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return c.json({ error: `Campo obrigatório: ${field}` }, 400);
      }
    }

    // Check if agency email already exists
    const existingAgency = await mockEnv.DB.prepare(
      "SELECT id FROM agencies WHERE email = ?"
    ).bind(body.agency_email).first();

    if (existingAgency) {
      return c.json({ error: "Email da agência já está em uso" }, 400);
    }

    // Check if admin email already exists
    const existingUser = await mockEnv.DB.prepare(
      "SELECT id FROM system_users WHERE email = ?"
    ).bind(body.admin_email).first();

    if (existingUser) {
      return c.json({ error: "Email do administrador já está em uso" }, 400);
    }

    // Create agency
    const agencyResult = await mockEnv.DB.prepare(
      "INSERT INTO agencies (name, email, phone, address, city, state) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(
      body.agency_name,
      body.agency_email,
      body.agency_phone || null,
      body.agency_address || null,
      body.agency_city || null,
      body.agency_state || 'SC'
    ).first();

    if (!agencyResult) {
      return c.json({ error: "Erro ao criar agência" }, 500);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.admin_password, 12);

    // Create admin user
    const userResult = await mockEnv.DB.prepare(
      "INSERT INTO system_users (agency_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?) RETURNING id"
    ).bind(agencyResult.id, body.admin_email, passwordHash, body.admin_name, 'administrator').first();

    if (!userResult) {
      return c.json({ error: "Erro ao criar usuário administrador" }, 500);
    }

    // Create default process steps (fixed sequence)
    const defaultSteps = [
      { name: 'Foto', type: 'foto', sort_order: 1 },
      { name: 'Taxa', type: 'taxa', sort_order: 2 },
      { name: 'Exame Psicológico', type: 'psicologo', sort_order: 3 },
      { name: 'Exame Médico', type: 'medico', sort_order: 4 },
      { name: 'Prova', type: 'prova', sort_order: 5 },
    ];

    for (const step of defaultSteps) {
      await mockEnv.DB.prepare(
        "INSERT INTO process_steps (agency_id, name, type, sort_order, is_active) VALUES (?, ?, ?, ?, ?)"
      ).bind(agencyResult.id, step.name, step.type, step.sort_order, true).run();
    }

    // Create default fees (fixed sequence)
    const defaultFees = [
      { name: 'Emissão da CNH', amount: 101.51, linked_professional_type: null },
      { name: 'Transferência', amount: 53.37, linked_professional_type: null },
      { name: 'Prova', amount: 0, linked_professional_type: null },
      { name: 'Médico', amount: 0, linked_professional_type: 'medico' },
      { name: 'Psicólogo', amount: 0, linked_professional_type: 'psicologo' },
      { name: '2º Via', amount: 0, linked_professional_type: null },
    ];

    for (const fee of defaultFees) {
      await mockEnv.DB.prepare(
        "INSERT INTO fees (agency_id, name, amount, linked_professional_type, is_active) VALUES (?, ?, ?, ?, ?)"
      ).bind(agencyResult.id, fee.name, fee.amount, fee.linked_professional_type, true).run();
    }

    // Create session for the new user
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await mockEnv.DB.prepare(
      "INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)"
    ).bind(userResult.id, sessionToken, expiresAt.toISOString()).run();

    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    console.log('🔐 Login attempt:', { email, passwordLength: password?.length });

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // Find user by email (agency is determined automatically)
    const user = await mockEnv.DB.prepare(
      "SELECT u.*, a.name as agency_name FROM system_users u JOIN agencies a ON u.agency_id = a.id WHERE u.email = ? AND u.is_active = true"
    ).bind(email).first();

    console.log('👤 User found:', user ? `Yes (id: ${user.id})` : 'No');

    if (!user) {
      return c.json({ error: "Credenciais inválidas" }, 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash as string);
    console.log('🔑 Password valid:', isValid);
    
    if (!isValid) {
      return c.json({ error: "Credenciais inválidas" }, 401);
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await mockEnv.DB.prepare(
      "INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)"
    ).bind(user.id, sessionToken, expiresAt.toISOString()).run();

    // Update last login
    await mockEnv.DB.prepare(
      "UPDATE system_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(user.id).run();

    // Set cookie
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.post('/api/auth/logout', async (c) => {
  const sessionToken = getCookie(c, 'session_token');

  if (sessionToken) {
    await mockEnv.DB.prepare(
      "DELETE FROM user_sessions WHERE session_token = ?"
    ).bind(sessionToken).run();
  }

  setCookie(c, 'session_token', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });

  return c.json({ success: true });
});

app.get('/api/auth/me', systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  return c.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    agency_id: user.agency_id,
    agency_name: user.agency_name
  });
});

// User management endpoints
app.get('/api/auth/users', systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user || user.role !== 'administrator') {
    return c.json({ error: "Acesso negado" }, 403);
  }

  const { results } = await mockEnv.DB.prepare(
    "SELECT id, name, email, role, is_active, last_login_at, created_at FROM system_users WHERE agency_id = ? ORDER BY created_at DESC"
  ).bind(user.agency_id).all();

  return c.json(results || []);
});

app.post('/api/auth/users', systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user || user.role !== 'administrator') {
    return c.json({ error: "Acesso negado" }, 403);
  }

  try {
    const body = await c.req.json();

    if (!body.name || !body.email || !body.password) {
      return c.json({ error: "Nome, email e senha são obrigatórios" }, 400);
    }

    // Check if email already exists
    const existingUser = await mockEnv.DB.prepare(
      "SELECT id FROM system_users WHERE email = ?"
    ).bind(body.email).first();

    if (existingUser) {
      return c.json({ error: "Email já está em uso" }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create user
    const result = await mockEnv.DB.prepare(
      "INSERT INTO system_users (agency_id, email, password_hash, name, role, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
    ).bind(
      user.agency_id,
      body.email,
      passwordHash,
      body.name,
      body.role || 'collaborator',
      user.id
    ).first() as any;

    if (!result) {
      return c.json({ error: "Erro ao criar usuário" }, 500);
    }

    return c.json({
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      is_active: result.is_active,
      created_at: result.created_at
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.patch('/api/auth/users/:id', systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user || user.role !== 'administrator') {
    return c.json({ error: "Acesso negado" }, 403);
  }

  const userId = parseInt(c.req.param("id"));
  const body = await c.req.json();

  // Don't allow admin to deactivate themselves
  if (userId === user.id && body.is_active === false) {
    return c.json({ error: "Você não pode desativar sua própria conta" }, 400);
  }

  try {
    const updateFields = [];
    const updateValues = [];

    if (body.name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(body.name);
    }
    if (body.email !== undefined) {
      updateFields.push("email = ?");
      updateValues.push(body.email);
    }
    if (body.role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(body.role);
    }
    if (body.is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(body.is_active);
    }

    if (updateFields.length === 0) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(userId, user.agency_id);

    const result = await mockEnv.DB.prepare(
      `UPDATE system_users SET ${updateFields.join(", ")} WHERE id = ? AND agency_id = ? RETURNING *`
    ).bind(...updateValues).first();

    if (!result) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    return c.json({
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      is_active: result.is_active,
      updated_at: result.updated_at
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.patch('/api/auth/users/:id/password', systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user || user.role !== 'administrator') {
    return c.json({ error: "Acesso negado" }, 403);
  }

  const userId = parseInt(c.req.param("id"));
  const body = await c.req.json();

  if (!body.password || body.password.length < 6) {
    return c.json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    const result = await mockEnv.DB.prepare(
      "UPDATE system_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ? RETURNING id"
    ).bind(passwordHash, userId, user.agency_id).first();

    if (!result) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating password:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.delete('/api/auth/users/:id', systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user || user.role !== 'administrator') {
    return c.json({ error: "Acesso negado" }, 403);
  }

  const userId = parseInt(c.req.param("id"));

  // Don't allow admin to delete themselves
  if (userId === user.id) {
    return c.json({ error: "Você não pode excluir sua própria conta" }, 400);
  }

  try {
    // Delete user sessions first
    await mockEnv.DB.prepare(
      "DELETE FROM user_sessions WHERE user_id = ?"
    ).bind(userId).run();

    // Delete user
    const result = await mockEnv.DB.prepare(
      "DELETE FROM system_users WHERE id = ? AND agency_id = ?"
    ).bind(userId, user.agency_id).run();

    if ((result as any).changes === 0) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Cities endpoints
app.get("/api/cities", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const { results } = await mockEnv.DB.prepare(
    "SELECT * FROM cities WHERE agency_id = ? AND is_active = true ORDER BY name"
  ).bind(user.agency_id).all();

  return c.json(results || []);
});

app.post("/api/cities", systemAuthMiddleware, zValidator("json", CreateCityRequestSchema), async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const body = c.req.valid("json");

  const result = await mockEnv.DB.prepare(
    "INSERT INTO cities (agency_id, name, state) VALUES (?, ?, ?) RETURNING *"
  ).bind(user.agency_id, body.name, 'SC').first();

  return c.json(result);
});

app.patch("/api/cities/:id", systemAuthMiddleware, zValidator("json", CreateCityRequestSchema), async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const cityId = c.req.param("id");
  const body = c.req.valid("json");

  const result = await mockEnv.DB.prepare(
    "UPDATE cities SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ? RETURNING *"
  ).bind(body.name, cityId, user.agency_id).first();

  if (!result) {
    return c.json({ error: "Cidade não encontrada" }, 404);
  }

  return c.json(result);
});

app.delete("/api/cities/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const cityId = c.req.param("id");

  await mockEnv.DB.prepare(
    "UPDATE cities SET is_active = false WHERE id = ? AND agency_id = ?"
  ).bind(cityId, user.agency_id).run();

  return c.json({ success: true });
});

// Professionals endpoints
app.get("/api/professionals", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const { results } = await mockEnv.DB.prepare(`
    SELECT p.*, c.name as city_name 
    FROM professionals p 
    JOIN cities c ON p.city_id = c.id 
    WHERE p.agency_id = ? AND p.is_active = true 
    ORDER BY p.name
  `).bind(user.agency_id).all();

  return c.json(results || []);
});

app.post("/api/professionals", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator' && user.role !== 'supervisor') return c.json({ error: "Acesso negado" }, 403);

  try {
    // Parse the raw request body for detailed debugging
    const rawBody = await c.req.text();
    console.log('=== BACKEND DEBUGGING ===');
    console.log('Raw request body:', rawBody);

    let body;
    try {
      body = JSON.parse(rawBody);
      console.log('Parsed body:', body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return c.json({ error: "Dados JSON inválidos" }, 400);
    }

    // Validate with Zod manually to get detailed error messages
    const validation = CreateProfessionalRequestSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation failed:', validation.error.format());
      const errorMessages = validation.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      return c.json({ 
        error: `Dados inválidos: ${errorMessages}`,
        details: validation.error.format()
      }, 400);
    }

    const validatedBody = validation.data;
    console.log('Validated body:', validatedBody);

    const result = await mockEnv.DB.prepare(
      "INSERT INTO professionals (agency_id, name, type, city_id, phone, email, address, observations, attendance_type, working_days, working_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
    ).bind(
      user.agency_id,
      validatedBody.name,
      validatedBody.type,
      validatedBody.city_id,
      validatedBody.phone || null,
      validatedBody.email || null,
      validatedBody.address || null,
      validatedBody.observations || null,
      validatedBody.attendance_type || 'AGENDAMENTO',
      validatedBody.working_days || null,
      validatedBody.working_hours || null
    ).first();

    if (!result) {
      return c.json({ error: "Falha ao criar credenciado" }, 500);
    }

    console.log('Professional created successfully:', result);
    return c.json(result);
  } catch (error) {
    console.error('Error creating professional:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.patch("/api/professionals/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator' && user.role !== 'supervisor') return c.json({ error: "Acesso negado" }, 403);

  const professionalId = c.req.param("id");
  const body = await c.req.json();

  try {
    console.log('=== UPDATING PROFESSIONAL ===');
    console.log('Professional ID:', professionalId);
    console.log('Request body:', body);
    
    // Validate required fields
    if (!body.name || !body.type || !body.city_id) {
      return c.json({ error: "Campos obrigatórios faltando: name, type, city_id" }, 400);
    }

    // Parse city_id safely
    const cityId = typeof body.city_id === 'number' ? body.city_id : parseInt(body.city_id);
    if (isNaN(cityId)) {
      return c.json({ error: "city_id inválido" }, 400);
    }

    const result = await mockEnv.DB.prepare(`
      UPDATE professionals 
      SET name = ?, type = ?, city_id = ?, phone = ?, email = ?, address = ?, 
          observations = ?, attendance_type = ?, working_days = ?, working_hours = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND agency_id = ?
      RETURNING *
    `).bind(
      body.name,
      body.type,
      cityId,
      body.phone || null,
      body.email || null,
      body.address || null,
      body.observations || null,
      body.attendance_type || 'AGENDAMENTO',
      body.working_days || null,
      body.working_hours || null,
      professionalId,
      user.agency_id
    ).first();

    if (!result) {
      return c.json({ error: "Credenciado não encontrado" }, 404);
    }

    console.log('Professional updated successfully:', result);
    return c.json(result);
  } catch (error) {
    console.error('Error updating professional:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

app.delete("/api/professionals/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const professionalId = c.req.param("id");

  await mockEnv.DB.prepare(
    "UPDATE professionals SET is_active = false WHERE id = ? AND agency_id = ?"
  ).bind(professionalId, user.agency_id).run();

  return c.json({ success: true });
});

// Process steps endpoints
app.get("/api/process-steps", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const activeOnly = c.req.query('active_only') === 'true';

  const query = activeOnly 
    ? "SELECT * FROM process_steps WHERE agency_id = ? AND is_active = true ORDER BY sort_order"
    : "SELECT * FROM process_steps WHERE agency_id = ? ORDER BY sort_order";

  const { results } = await mockEnv.DB.prepare(query).bind(user.agency_id).all();

  return c.json(results);
});

app.patch("/api/process-steps/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const stepId = c.req.param("id");
  const body = await c.req.json();

  if (body.is_active !== undefined) {
    await mockEnv.DB.prepare(
      "UPDATE process_steps SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ?"
    ).bind(body.is_active, stepId, user.agency_id).run();
  }

  return c.json({ success: true });
});

app.patch("/api/process-steps/:id/reorder", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const stepId = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const direction = body.direction; // 'up' or 'down'

  try {
    // Get current step
    const currentStep = await mockEnv.DB.prepare(
      "SELECT * FROM process_steps WHERE id = ? AND agency_id = ?"
    ).bind(stepId, user.agency_id).first();

    if (!currentStep) {
      return c.json({ error: "Etapa não encontrada" }, 404);
    }

    // Get all steps for this agency
    const { results: allSteps } = await mockEnv.DB.prepare(
      "SELECT * FROM process_steps WHERE agency_id = ? ORDER BY sort_order"
    ).bind(user.agency_id).all();

    const steps = allSteps as any[];
    const currentIndex = steps.findIndex(s => s.id === stepId);

    if (currentIndex === -1) {
      return c.json({ error: "Etapa não encontrada" }, 404);
    }

    let targetIndex: number;
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < steps.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      return c.json({ error: "Movimento inválido" }, 400);
    }

    // Swap sort_order values
    const targetStep = steps[targetIndex];

    await mockEnv.DB.prepare(
      "UPDATE process_steps SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(targetStep.sort_order, stepId).run();

    await mockEnv.DB.prepare(
      "UPDATE process_steps SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(currentStep.sort_order, targetStep.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error reordering steps:', error);
    return c.json({ error: "Erro ao reordenar etapas" }, 500);
  }
});

// Fees endpoints
app.get("/api/fees", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const { results } = await mockEnv.DB.prepare(
    "SELECT * FROM fees WHERE agency_id = ? ORDER BY id"
  ).bind(user.agency_id).all();

  return c.json(results);
});

app.post("/api/fees", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const body = await c.req.json();

  if (!body.name || body.amount === undefined) {
    return c.json({ error: "Nome e valor são obrigatórios" }, 400);
  }

  const result = await mockEnv.DB.prepare(
    "INSERT INTO fees (agency_id, name, amount, linked_professional_type) VALUES (?, ?, ?, ?) RETURNING *"
  ).bind(user.agency_id, body.name, body.amount, body.linked_professional_type || null).first();

  return c.json(result);
});

app.patch("/api/fees/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const feeId = c.req.param("id");
  const body = await c.req.json();

  // Verificar se a taxa existe
  const fee = await mockEnv.DB.prepare(
    "SELECT id FROM fees WHERE id = ? AND agency_id = ?"
  ).bind(feeId, user.agency_id).first();

  if (!fee) {
    return c.json({ error: "Taxa não encontrada" }, 404);
  }

  // Taxas fixas do sistema: apenas permitir alteração de valor
  if (body.amount === undefined) {
    return c.json({ error: "Apenas o valor pode ser alterado" }, 400);
  }

  const result = await mockEnv.DB.prepare(
    "UPDATE fees SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ? RETURNING *"
  ).bind(body.amount, feeId, user.agency_id).first();

  if (!result) {
    return c.json({ error: "Taxa não encontrada" }, 404);
  }

  return c.json(result);
});

app.delete("/api/fees/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  // Taxas do sistema são fixas e não podem ser excluídas
  return c.json({ error: "As taxas do sistema não podem ser excluídas" }, 400);
});

// Email sending function
async function sendEmailWithHTML(to: string, subject: string, htmlContent: string) {
  // For now, we'll return a simulated success since we don't have email configuration
  // In a real implementation, you would use an email service like SendGrid, Resend, etc.

  console.log(`Would send email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML Content length: ${htmlContent.length}`);

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { success: true };
}

// Step processes endpoints
app.get("/api/step-processes", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const query = (user.role === 'administrator' || user.role === 'supervisor')
    ? "SELECT sp.*, c.name as city_name, u.name as user_name FROM step_processes sp JOIN cities c ON sp.city_id = c.id JOIN system_users u ON sp.user_id = u.id WHERE sp.agency_id = ? ORDER BY sp.created_at DESC"
    : "SELECT sp.*, c.name as city_name FROM step_processes sp JOIN cities c ON sp.city_id = c.id WHERE sp.agency_id = ? AND sp.user_id = ? ORDER BY sp.created_at DESC";

  let results: any[];
  if (user.role === 'administrator' || user.role === 'supervisor') {
    const res = await mockEnv.DB.prepare(query).bind(user.agency_id).all();
    results = res.results || [];
  } else {
    const res = await mockEnv.DB.prepare(query).bind(user.agency_id, user.id).all();
    results = res.results || [];
  }

  return c.json(results);
});

app.post("/api/step-processes", systemAuthMiddleware, async (c) => {
  try {
    const user = getUserWithAgency(c);
    if (!user) return c.json({ error: "User not found" }, 404);

    const body = await c.req.json();
    console.log('Request body:', body);

    // Validate required fields
    if (!body.city_id) {
      return c.json({ error: "Cidade é obrigatória" }, 400);
    }

    if (!body.selected_steps || !Array.isArray(body.selected_steps) || body.selected_steps.length === 0) {
      return c.json({ error: "Pelo menos uma etapa deve ser selecionada" }, 400);
    }

    // Ensure city_id is a number
    const cityId = parseInt(body.city_id.toString());
    if (isNaN(cityId)) {
      return c.json({ error: "ID da cidade inválido" }, 400);
    }

    // Ensure selected_fees is an array
    const selectedFees = Array.isArray(body.selected_fees) ? body.selected_fees : [];

    // Calculate total amount
    let totalAmount = 0;
    if (selectedFees.length > 0) {
      const placeholders = selectedFees.map(() => '?').join(',');
      const { results: fees } = await mockEnv.DB.prepare(
        `SELECT SUM(amount) as total FROM fees WHERE id IN (${placeholders}) AND agency_id = ?`
      ).bind(...selectedFees, user.agency_id).all();
      totalAmount = Number(fees?.[0]?.total) || 0;
    }

    // Create step process
    const result = await mockEnv.DB.prepare(
      "INSERT INTO step_processes (agency_id, user_id, city_id, client_name, total_amount, show_toxicologico_message, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *"
    ).bind(user.agency_id, user.id, cityId, body.client_name || null, totalAmount, body.show_toxicologico_message || false, 'completed').first() as any;

    if (!result) {
      return c.json({ error: "Failed to create process" }, 500);
    }

    // Add selected steps - only reference existing professionals, never create new ones
    const newProcessId = result.id as number;
    for (const stepId of body.selected_steps) {
      const professionalId = body.selected_professionals?.[stepId.toString()];

      // Validate that the professional exists and belongs to this agency (if provided)
      if (professionalId) {
        const professionalExists = await mockEnv.DB.prepare(
          "SELECT id FROM professionals WHERE id = ? AND agency_id = ? AND is_active = true"
        ).bind(professionalId, user.agency_id).first();

        if (!professionalExists) {
          console.warn(`Professional ${professionalId} not found or not active for agency ${user.agency_id}`);
          // Insert step without professional if professional doesn't exist
          await mockEnv.DB.prepare(
            "INSERT INTO process_selected_steps (process_id, step_id, professional_id) VALUES (?, ?, ?)"
          ).bind(newProcessId, stepId, null).run();
          continue;
        }
      }

      await mockEnv.DB.prepare(
        "INSERT INTO process_selected_steps (process_id, step_id, professional_id) VALUES (?, ?, ?)"
      ).bind(newProcessId, stepId, professionalId || null).run();
    }

    // Add selected fees (manually selected ones)
    for (const feeId of selectedFees) {
      const fee = await mockEnv.DB.prepare(
        "SELECT amount FROM fees WHERE id = ? AND agency_id = ?"
      ).bind(feeId, user.agency_id).first();

      if (fee) {
        await mockEnv.DB.prepare(
          "INSERT INTO process_selected_fees (process_id, fee_id, amount) VALUES (?, ?, ?)"
        ).bind(newProcessId, feeId, (fee as any).amount).run();
      }
    }

    // Get process steps to find linked fees
    const { results: processSteps } = await mockEnv.DB.prepare(
      "SELECT * FROM process_steps WHERE agency_id = ?"
    ).bind(user.agency_id).all();

    // Add linked fees based on selected professionals
    const { results: allFees } = await mockEnv.DB.prepare(
      "SELECT * FROM fees WHERE agency_id = ? AND is_active = true AND linked_professional_type IS NOT NULL"
    ).bind(user.agency_id).all();

    for (const fee of (allFees as any[]) || []) {
      // Check if there's a professional of this type selected
      const hasLinkedProfessional = body.selected_steps.some((stepId: number) => {
        const professionalId = body.selected_professionals?.[stepId.toString()];
        if (!professionalId) return false;

        // Get the step type to match with fee's linked_professional_type
        const stepType = (processSteps as any[])?.find((s: any) => s.id === stepId)?.type;
        return stepType === fee.linked_professional_type;
      });

      if (hasLinkedProfessional) {
        // Check if this fee is not already added (avoid duplicates)
        const alreadyAdded = selectedFees.includes(fee.id);
        if (!alreadyAdded) {
          await mockEnv.DB.prepare(
            "INSERT INTO process_selected_fees (process_id, fee_id, amount) VALUES (?, ?, ?)"
          ).bind(newProcessId, fee.id as number, fee.amount as number).run();

          // Update total amount to include linked fee
          totalAmount += fee.amount;
        }
      }
    }

    // Update the total amount in the process if linked fees were added
    if (totalAmount > 0) {
      await mockEnv.DB.prepare(
        "UPDATE step_processes SET total_amount = ? WHERE id = ?"
      ).bind(totalAmount, newProcessId).run();
    }

    return c.json(result);
  } catch (error) {
    console.error('Error creating step process:', error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return c.json({ error: message }, 500);
  }
});

// Get single step process with details
app.get("/api/step-processes/:id", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const processId = parseInt(c.req.param("id"));

  // Get the process
  const process = await mockEnv.DB.prepare(
    "SELECT sp.*, c.name as city_name FROM step_processes sp JOIN cities c ON sp.city_id = c.id WHERE sp.id = ? AND sp.agency_id = ?"
  ).bind(processId, user.agency_id as number).first();

  if (!process) {
    return c.json({ error: "Process not found" }, 404);
  }

  // Check access - admins can see all processes, collaborators only their own
  if (user.role !== 'administrator' && (process as any).user_id !== user.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Get selected steps with details
  const { results: selectedSteps } = await mockEnv.DB.prepare(`
    SELECT pss.*, ps.name, ps.type, p.name as professional_name, p.phone, p.email, p.address, p.observations, p.attendance_type, p.working_days, p.working_hours, c.name as city_name
    FROM process_selected_steps pss
    JOIN process_steps ps ON pss.step_id = ps.id
    LEFT JOIN professionals p ON pss.professional_id = p.id
    LEFT JOIN cities c ON p.city_id = c.id
    WHERE pss.process_id = ?
    ORDER BY ps.sort_order
  `).bind(processId).all();

  // Get manually selected fees (not linked to professionals)
  const { results: selectedFees } = await mockEnv.DB.prepare(`
    SELECT psf.*, f.name, f.linked_professional_type
    FROM process_selected_fees psf
    JOIN fees f ON psf.fee_id = f.id
    WHERE psf.process_id = ?
  `).bind(processId).all();

  // Get all fees to find linked ones
  const { results: allFees } = await mockEnv.DB.prepare(
    "SELECT * FROM fees WHERE agency_id = ? AND is_active = true"
  ).bind(user.agency_id).all();

  // Format the data for the frontend
  const steps = selectedSteps?.map((ss: any) => ({
    id: ss.step_id,
    name: ss.name,
    type: ss.type
  })) || [];

  const professionals: Record<string, any> = {};
  selectedSteps?.forEach((ss: any) => {
    if (ss.professional_id) {
      professionals[ss.step_id.toString()] = {
        id: ss.professional_id,
        name: ss.professional_name,
        phone: ss.phone,
        email: ss.email,
        address: ss.address,
        observations: ss.observations,
        attendance_type: ss.attendance_type,
        working_days: ss.working_days,
        working_hours: ss.working_hours,
        city_name: ss.city_name
      };
    }
  });

  // Start with manually selected fees
  const fees = selectedFees?.map((sf: any) => ({
    id: sf.fee_id,
    name: sf.name,
    amount: sf.amount,
    linked_professional_type: sf.linked_professional_type
  })) || [];

  // Add linked fees based on selected professionals
  const linkedFees = (allFees as any[])?.filter((fee: any) => {
    if (!fee.linked_professional_type) return false;

    // Check if there's a professional of this type selected
    const hasLinkedProfessional = selectedSteps?.some((ss: any) => {
      return ss.type === fee.linked_professional_type && ss.professional_id;
    });

    return hasLinkedProfessional;
  }) || [];

  // Add linked fees to the fees array (avoid duplicates)
  linkedFees.forEach((linkedFee: any) => {
    const alreadyExists = fees.find(f => f.id === linkedFee.id);
    if (!alreadyExists) {
      fees.push({
        id: linkedFee.id,
        name: linkedFee.name,
        amount: linkedFee.amount,
        linked_professional_type: linkedFee.linked_professional_type
      });
    }
  });

  return c.json({
    ...process,
    steps,
    professionals,
    fees,
    show_toxicologico_message: process.show_toxicologico_message || false
  });
});

// Delete all step processes (admin only)
app.delete("/api/step-processes/delete-all", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  try {
    // Get all process IDs for this agency
    const { results: processes } = await mockEnv.DB.prepare(
      "SELECT id FROM step_processes WHERE agency_id = ?"
    ).bind(user.agency_id).all();

    if (!processes || processes.length === 0) {
      return c.json({ success: true, deleted: 0 });
    }

    // Delete related data for each process
    for (const process of processes as any[]) {
      await mockEnv.DB.prepare(
        "DELETE FROM process_selected_steps WHERE process_id = ?"
      ).bind(process.id).run();

      await mockEnv.DB.prepare(
        "DELETE FROM process_selected_fees WHERE process_id = ?"
      ).bind(process.id).run();
    }

    // Delete all processes
    const result = await mockEnv.DB.prepare(
      "DELETE FROM step_processes WHERE agency_id = ?"
    ).bind(user.agency_id).run();

    return c.json({ success: true, deleted: (result as any).changes || 0 });
  } catch (error) {
    console.error('Error deleting all processes:', error);
    return c.json({ error: "Erro ao excluir processos" }, 500);
  }
});

// Send step process by email
app.post("/api/step-processes/send-email", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  try {
    const body = await c.req.json();

    if (!body.recipient_email) {
      return c.json({ error: "Email do destinatário é obrigatório" }, 400);
    }

    if (!body.process_data) {
      return c.json({ error: "Dados do processo são obrigatórios" }, 400);
    }

    const processData = body.process_data;

    // Get agency logo if exists
    let logoUrl = null;
    const agency = await mockEnv.DB.prepare(
      "SELECT logo_key FROM agencies WHERE id = ?"
    ).bind(user.agency_id as number).first();

    if (agency && (agency as any).logo_key) {
      logoUrl = `https://motixwf4k27yu.mocha.app/api/files/logo-${user.agency_id}`;
    }

    // Get agency instructions
    const instructions = await mockEnv.DB.prepare(
      "SELECT general_instructions FROM agency_instructions WHERE agency_id = ?"
    ).bind(user.agency_id as number).first();

    const generalInstructions = (instructions as any)?.general_instructions || '';

    // Generate email HTML using the same function from the frontend
    const emailHTML = generateEmailHTML(processData, logoUrl, generalInstructions);

    // Send email
    const emailResult = await sendEmailWithHTML(
      body.recipient_email,
      `Agência Regional - ${user.agency_name}`,
      emailHTML
    );

    if (emailResult.success) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "Falha ao enviar email" }, 500);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

function generateEmailHTML(processData: any, logoUrl: string | null, generalInstructions: string) {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'foto': return '📷';
      case 'taxa': return '💰';
      case 'medico': return '👨‍⚕️';
      case 'psicologo': return '🧠';
      case 'prova': return '📝';
      case 'toxicologico': return '🧪';
      default: return '📋';
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Passo a Passo - ${processData.client_name || 'Cliente'}</title>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 10px; 
            padding: 0; 
            background: white;
            color: black;
            line-height: 1.2;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid black;
        }
        .logo-section {
            display: flex;
            align-items: center;
        }
        .logo-text h1 {
            font-size: 28px;
            font-weight: bold;
            margin: 0;
        }
        .logo-text p {
            font-size: 16px;
            margin: 4px 0 0 0;
        }
        .steps-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 15px;
        }
        .step-card {
            border: 2px solid black;
            min-height: 140px;
        }
        .step-header {
            background-color: #f5f5f5;
            padding: 6px;
            border-bottom: 2px solid black;
            display: flex;
            align-items: center;
        }
        .step-icon {
            font-size: 32px;
            margin-right: 8px;
        }
        .step-number-and-title {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .step-number-text {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
            text-align: center;
        }
        .step-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin-top: 2px;
        }
        .step-content {
            padding: 6px;
        }
        .professional-name {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .professional-info {
            font-size: 10px;
            margin-bottom: 3px;
        }
        .total-amount-card {
            display: flex;
            justify-content: flex-end;
            margin: 12px 0;
        }
        .total-amount-box {
            background-color: #f5f5f5;
            border: 2px solid black;
            padding: 8px 12px;
            border-radius: 6px;
            text-align: center;
        }
        .total-amount-text {
            font-size: 14px;
            font-weight: bold;
            color: black;
            margin: 0;
        }
        .instructions {
            border-top: 2px solid black;
            padding-top: 12px;
        }
        .instructions-content {
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        .footer {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid black;
            text-align: center;
        }
        .footer p {
            font-size: 10px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo da Agência" style="max-height: 60px; max-width: 120px; margin-right: 10px;" />` : ''}
                <div class="logo-text">
                    <h1>SIGA O PASSO A PASSO</h1>
                    ${processData.client_name ? `<p>Cliente: ${processData.client_name}</p>` : ''}
                </div>
            </div>
        </div>

        <!-- Steps Grid -->
        <div class="steps-grid">
            ${(() => {
              const filteredSteps = (processData.all_steps || processData.selected_steps).filter((step: any) => step.type !== 'prova');
              let stepCounter = 0;

              return filteredSteps.map((step: any) => {
                const isSelected = processData.selected_steps.find((s: any) => s.id === step.id);
                const professional = isSelected ? processData.selected_professionals[step.id.toString()] : null;

                const hasTaxesSelected = step.type === 'taxa' && isSelected && 
                  processData.selected_fees.filter((fee: any) => !fee.linked_professional_type).length > 0;

                const hasData = professional || hasTaxesSelected;
                if (hasData) {
                  stepCounter++;
                }

                const stepNumber = stepCounter;
                const stepIcon = getStepIcon(step.type);

                return `
                  <div class="step-card">
                      <div class="step-header">
                          <div class="step-icon">${stepIcon}</div>
                          <div class="step-number-and-title">
                              ${hasData ? `<p class="step-number-text">(${stepNumber}°) PASSO</p>` : ''}
                              <div class="step-title">${step.name}</div>
                          </div>
                      </div>
                      <div class="step-content">
                          ${professional ? `
                              <div class="professional-name">${professional.name}</div>
                              ${professional.address || professional.city_name ? `<div class="professional-info">${professional.address ? `${professional.address}${professional.city_name ? ` - ${professional.city_name}` : ''}` : professional.city_name || ''}</div>` : ''}
                              ${professional.phone ? `<div class="professional-info">${professional.phone} - Somente mensagem WhatsApp</div>` : ''}
                              ${professional.email ? `<div class="professional-info"><strong>Email:</strong> ${professional.email}</div>` : ''}
                              ${step.type === 'medico' && processData.show_toxicologico_message ? `
                                <div style="margin-top: 12px; text-align: center;">
                                  <div style="font-size: 12px; font-weight: bold; color: black;">LEVAR O TOXICOLÓGICO</div>
                                </div>
                              ` : ''}
                          ` : step.type === 'taxa' && isSelected ? `
                              <div>
                                  <h4 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">TAXAS A PAGAR:</h4>
                                  ${processData.selected_fees.filter((fee: any) => !fee.linked_professional_type).map((fee: any) => `
                                      <div style="font-size: 12px; margin-bottom: 3px;">${fee.name}: R$ ${fee.amount.toFixed(2)}</div>
                                  `).join('')}
                              </div>
                          ` : `
                              <div style="display: flex; align-items: center; justify-content: center; height: 60px;">
                                  <div style="font-size: 48px; font-weight: bold; color: black; line-height: 1;">✕</div>
                              </div>
                          `}
                      </div>
                  </div>
                `;
              }).join('');
            })()}
        </div>

        <!-- Total Amount -->
        <div class="total-amount-card">
            <div class="total-amount-box">
                <div class="total-amount-text">VALOR TOTAL: R$ ${processData.total_amount.toFixed(2)}</div>
            </div>
        </div>

        <!-- Instructions -->
        ${generalInstructions ? `
        <div class="instructions">
            <div class="instructions-content">
                ${(() => {
                  // Remove HTML tags and convert to plain text for email version
                  const plainTextInstructions = generalInstructions
                    .replace(/<br\s*\/?>/gi, ' ') // Replace <br> tags with spaces first
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
                    .replace(/&amp;/g, '&')  // Replace &amp; with &
                    .replace(/&lt;/g, '<')   // Replace &lt; with <
                    .replace(/&gt;/g, '>')   // Replace &gt; with >
                    .replace(/&quot;/g, '"') // Replace &quot; with "
                    .replace(/[\r\n\t]+/g, ' ') // Replace all line breaks and tabs with single space
                    .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
                    .trim()
                    .replace(/;\s*/g, ';<br><br>'); // Add line break after semicolon, removing any trailing spaces
                  return plainTextInstructions;
                })()}
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>Documento gerado pelo PAP - Sistema - ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>`;
}

// Agency logo endpoints
app.post("/api/agencies/logo", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const formData = await c.req.formData();
  const file = formData.get('logo') as File;

  if (!file) {
    return c.json({ error: "Nenhum arquivo enviado" }, 400);
  }

  if (!file.type.startsWith('image/')) {
    return c.json({ error: "Apenas arquivos de imagem são permitidos" }, 400);
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    return c.json({ error: "Arquivo muito grande. Máximo 5MB" }, 400);
  }

  try {
    // Convert image to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Store base64 data in database
    await mockEnv.DB.prepare(
      "UPDATE agencies SET logo_key = ? WHERE id = ?"
    ).bind(dataUrl, user.agency_id).run();

    return c.json({ success: true, logo_key: `logo-${user.agency_id}` });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return c.json({ error: "Erro ao fazer upload da logo" }, 500);
  }
});

app.get("/api/agencies/logo", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const agency = await mockEnv.DB.prepare(
    "SELECT logo_key FROM agencies WHERE id = ?"
  ).bind(user.agency_id).first();

  if (!agency || !agency.logo_key) {
    return c.json({ has_logo: false });
  }

  return c.json({ has_logo: true, logo_key: `logo-${user.agency_id}` });
});

app.get("/api/files/:key", async (c) => {
  const key = c.req.param("key");

  try {
    // Extract agency ID from key (format: logo-{agency_id})
    const agencyId = key.replace('logo-', '');
    
    const agency = await mockEnv.DB.prepare(
      "SELECT logo_key FROM agencies WHERE id = ?"
    ).bind(parseInt(agencyId)).first();

    if (!agency || !agency.logo_key) {
      return c.json({ error: "File not found" }, 404);
    }

    // logo_key now contains the data URL (data:image/...;base64,...)
    const dataUrl = agency.logo_key as string;
    
    // Extract mime type and base64 data
    const matches = dataUrl.match(/data:([^;]+);base64,(.+)/);
    if (!matches) {
      return c.json({ error: "Invalid image data" }, 500);
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Convert base64 back to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return c.body(bytes.buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return c.json({ error: "Error retrieving file" }, 500);
  }
});

// Agency info endpoint
app.get("/api/agencies/info", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const agency = await mockEnv.DB.prepare(
    "SELECT * FROM agencies WHERE id = ?"
  ).bind(user.agency_id).first();

  if (!agency) {
    return c.json({ error: "Agency not found" }, 404);
  }

  return c.json(agency);
});

app.patch("/api/agencies/info", systemAuthMiddleware, async (c) => {
  const user = getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  try {
    const body = await c.req.json();

    const updateFields = [];
    const updateValues = [];

    if (body.name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(body.name);
    }
    if (body.email !== undefined) {
      updateFields.push("email = ?");
      updateValues.push(body.email);
    }
    if (body.phone !== undefined) {
      updateFields.push("phone = ?");
      updateValues.push(body.phone || null);
    }
    if (body.address !== undefined) {
      updateFields.push("address = ?");
      updateValues.push(body.address || null);
    }
    if (body.city !== undefined) {
      updateFields.push("city = ?");
      updateValues.push(body.city || null);
    }
    if (body.state !== undefined) {
      updateFields.push("state = ?");
      updateValues.push(body.state || null);
    }

    if (updateFields.length === 0) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(user.agency_id);

    const result = await mockEnv.DB.prepare(
      `UPDATE agencies SET ${updateFields.join(", ")} WHERE id = ? RETURNING *`
    ).bind(...updateValues).first();

    if (!result) {
      return c.json({ error: "Agência não encontrada" }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('Error updating agency:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Instructions endpoints
app.get("/api/instructions", systemAuthMiddleware, async (c) => {
  const user = await getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);

  const instructions = await mockEnv.DB.prepare(
    "SELECT * FROM agency_instructions WHERE agency_id = ?"
  ).bind(user.agency_id).first();

  if (!instructions) {
    return c.json({ general_instructions: '', required_documents: '' });
  }

  return c.json(instructions);
});

app.post("/api/instructions", systemAuthMiddleware, async (c) => {
  const user = await getUserWithAgency(c);
  if (!user) return c.json({ error: "User not found" }, 404);
  if (user.role !== 'administrator') return c.json({ error: "Acesso negado" }, 403);

  const body = await c.req.json();

  try {
    // Check if instructions already exist
    const existing = await mockEnv.DB.prepare(
      "SELECT id FROM agency_instructions WHERE agency_id = ?"
    ).bind(user.agency_id).first();

    if (existing) {
      // Update existing
      const result = await mockEnv.DB.prepare(
        "UPDATE agency_instructions SET general_instructions = ?, required_documents = ?, updated_at = CURRENT_TIMESTAMP WHERE agency_id = ? RETURNING *"
      ).bind(body.general_instructions || '', body.required_documents || '', user.agency_id).first();

      return c.json(result);
    } else {
      // Create new
      const result = await mockEnv.DB.prepare(
        "INSERT INTO agency_instructions (agency_id, general_instructions, required_documents) VALUES (?, ?, ?) RETURNING *"
      ).bind(user.agency_id, body.general_instructions || '', body.required_documents || '').first();

      return c.json(result);
    }
  } catch (error) {
    console.error('Error saving instructions:', error);
    return c.json({ error: "Erro ao salvar instruções" }, 500);
  }
});

// Serve static files in production (Vite build output)
// This uses a simple fallback approach: serve from dist/client/ for any non-API route
if (process.env.NODE_ENV === 'production') {
  const { serveStatic } = await import('@hono/node-server/serve-static');
  
  // Serve static assets
  app.use('/*', serveStatic({ root: './dist/client' }));
  
  // SPA fallback - serve index.html for routes that don't exist
  app.get('*', serveStatic({ path: './dist/client/index.html' }));
}

export default app;
export { app };
