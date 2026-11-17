import bcrypt from 'bcryptjs';

interface AgencyRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  logo_key: string | null;
}

interface SystemUserRow {
  id: number;
  agency_id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: number | null;
  last_login_at: string | null;
}

interface UserSessionRow {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface CityRow {
  id: number;
  agency_id: number;
  name: string;
  state: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfessionalRow {
  id: number;
  agency_id: number;
  name: string;
  type: string;
  city_id: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  observations: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  attendance_type: string;
  working_days: string | null;
  working_hours: string | null;
  hidden_until: string | null;
}

interface ProcessStepRow {
  id: number;
  agency_id: number;
  name: string;
  type: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  title: string | null;
  description: string | null;
  obs: string | null;
  created_at: string;
  updated_at: string;
}

interface FeeRow {
  id: number;
  agency_id: number;
  name: string;
  amount: string;
  linked_professional_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StepProcessRow {
  id: number;
  agency_id: number;
  user_id: number;
  city_id: number;
  client_name: string | null;
  total_amount: string;
  status: string;
  created_at: string;
  updated_at: string;
  show_toxicologico_message: boolean;
  show_toxicologico_habilitacao: boolean;
  categoria_atual: string | null;
  aviso_reinicio: boolean;
}

interface ProcessSelectedStepRow {
  id: number;
  process_id: number;
  step_id: number;
  professional_id: number | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface ProcessSelectedFeeRow {
  id: number;
  process_id: number;
  fee_id: number;
  amount: string;
  created_at: string;
  updated_at: string;
}

interface AgencyInstructionRow {
  id: number;
  agency_id: number;
  general_instructions: string;
  instructions_primeira_habilitacao: string;
  required_documents: string;
  created_at: string;
  updated_at: string;
}

interface AgencyTermTemplateRow {
  agency_id: number;
  enabled: boolean;
  object_key: string;
  filename: string;
  size: number;
  file_data: string | null;
  updated_at: string;
}

interface ScheduledChangeRow {
  id: number;
  agency_id: number;
  professional_id: number;
  scheduled_at: string;
  working_days: string | null;
  working_hours: string | null;
  observations: string | null;
  created_by_user_id: number | null;
  created_at: string;
  applied_at: string | null;
}

interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; changes?: number }>;
}

const nowIso = () => new Date().toISOString();

class MemoryStore {
  agencies: AgencyRow[] = [];
  systemUsers: SystemUserRow[] = [];
  userSessions: UserSessionRow[] = [];
  cities: CityRow[] = [];
  professionals: ProfessionalRow[] = [];
  processSteps: ProcessStepRow[] = [];
  fees: FeeRow[] = [];
  stepProcesses: StepProcessRow[] = [];
  processSelectedSteps: ProcessSelectedStepRow[] = [];
  processSelectedFees: ProcessSelectedFeeRow[] = [];
  agencyInstructions: AgencyInstructionRow[] = [];
  agencyTermTemplates: AgencyTermTemplateRow[] = [];
  scheduledChanges: ScheduledChangeRow[] = [];

  private seq: Record<string, number> = {
    agencies: 1,
    system_users: 1,
    user_sessions: 0,
    cities: 7,
    professionals: 28,
    process_steps: 9,
    fees: 8,
    step_processes: 0,
    process_selected_steps: 0,
    process_selected_fees: 0,
    agency_instructions: 0,
    scheduled_changes: 0,
  };

  nextId(table: string): number {
    this.seq[table] = (this.seq[table] || 0) + 1;
    return this.seq[table];
  }

  constructor() {
    this.seed();
  }

  private seed() {
    const ts = '2025-10-12T17:38:43.000Z';
    this.agencies.push({
      id: 1,
      name: 'Balneário Camboriú',
      email: 'contato@bcamboriu.com',
      phone: null,
      address: null,
      city: 'Balneário Camboriú',
      state: 'SC',
      is_active: true,
      created_at: ts,
      updated_at: ts,
      logo_key: null,
    });

    // Default admin user: admin@bcamboriu.com / admin123
    this.systemUsers.push({
      id: 1,
      agency_id: 1,
      email: 'admin@bcamboriu.com',
      password_hash: bcrypt.hashSync('admin123', 10),
      name: 'Administrador',
      role: 'administrator',
      is_active: true,
      created_at: ts,
      updated_at: ts,
      created_by_user_id: null,
      last_login_at: null,
    });

    const cityNames = [
      'BALNEÁRIO CAMBORIÚ',
      'BOMBINHAS',
      'CAMBORIÚ',
      'CANELINHA',
      'PORTO BELO',
      'ITAPEMA',
      'TIJUCAS',
    ];
    cityNames.forEach((name, idx) => {
      this.cities.push({
        id: idx + 1,
        agency_id: 1,
        name,
        state: 'SC',
        is_active: true,
        created_at: ts,
        updated_at: ts,
      });
    });

    const defaultSteps = [
      { name: 'Foto', type: 'foto', sort_order: 1 },
      { name: 'Taxa', type: 'taxa', sort_order: 2 },
      { name: 'Exame Psicológico', type: 'psicologo', sort_order: 3 },
      { name: 'Exame Médico', type: 'medico', sort_order: 4 },
      { name: 'Prova PCD', type: 'prova', sort_order: 5 },
      { name: 'Curso Teórico', type: 'curso_teorico', sort_order: 6 },
      { name: 'Prova Teórica', type: 'prova_teorica', sort_order: 7 },
      { name: 'Curso Prático', type: 'curso_pratico', sort_order: 8 },
      { name: 'Prova Prática', type: 'prova_pratica', sort_order: 9 },
    ];
    defaultSteps.forEach((step, idx) => {
      this.processSteps.push({
        id: idx + 1,
        agency_id: 1,
        name: step.name,
        type: step.type,
        is_required: false,
        is_active: true,
        sort_order: step.sort_order,
        title: null,
        description: null,
        obs: null,
        created_at: ts,
        updated_at: ts,
      });
    });

    const defaultFees = [
      { name: 'Emissão da CNH', amount: '106.26', linked_professional_type: null },
      { name: 'Transferência', amount: '55.87', linked_professional_type: null },
      { name: 'Psicólogo', amount: '93.53', linked_professional_type: 'psicologo' },
      { name: 'Médico', amount: '86.03', linked_professional_type: 'medico' },
      { name: 'Prova PCD', amount: '72.24', linked_professional_type: null },
      { name: 'Exame Legislação de Trânsito', amount: '72.24', linked_professional_type: 'prova_teorica' },
      { name: 'LADV', amount: '72.24', linked_professional_type: null },
      { name: 'Exame de Direção Veicular', amount: '72.24', linked_professional_type: 'prova_pratica' },
    ];
    defaultFees.forEach((fee, idx) => {
      this.fees.push({
        id: idx + 1,
        agency_id: 1,
        name: fee.name,
        amount: fee.amount,
        linked_professional_type: fee.linked_professional_type,
        is_active: true,
        created_at: ts,
        updated_at: ts,
      });
    });

    const seedProfessionals: Array<[number, string, string, number]> = [
      [1, '29º DELEGACIA POLÍCIA CIVIL', 'foto', 1],
      [2, 'CAC BC', 'psicologo', 1],
      [3, 'CENTRO DE AV. DE CONDUTORES TIAGO FERRO', 'medico', 1],
      [4, 'CENTRO DE AVALIACAO DE CONDUTORES PIONEIROS', 'medico', 1],
      [5, 'CLINICA AVANTE', 'medico', 1],
      [6, 'CLINICA DE PSICOLOGIA DIRECAO', 'psicologo', 1],
      [7, 'FERREIRA AVALIACOES PSICOLOGICAS - FAP', 'psicologo', 1],
      [8, 'MEDITRAF-CLINICA DE MEDICINA DO TRAFEGO', 'medico', 1],
      [9, 'PROVA DE ATUALIZAÇÃO', 'prova', 1],
      [10, 'PROVA DE DIREÇÃO', 'prova', 1],
      [11, 'PSICO CLIN', 'psicologo', 1],
      [12, 'CAC BOMBINHAS', 'psicologo', 2],
      [13, 'CBM SEGURANCA E MEDICINA DO TRABALHO LTDA', 'medico', 2],
      [14, 'CAC AREIAS LTDA', 'medico', 3],
      [15, 'CAC CAMBORIU LTDA', 'medico', 3],
      [16, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', 3],
      [17, 'CLINICA DE PSICOLOGIA EM CAMBORIU', 'psicologo', 3],
      [18, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', 4],
      [19, 'TRA MED CAC LTDA', 'medico', 6],
      [20, 'CLINICA DE PSICOLOGIA EM ITAPEMA', 'psicologo', 6],
      [21, 'INSTITUTO DE MEDICINA DO TRAFEGO E OCUPACIONAL', 'medico', 6],
      [22, 'TRA MED CAC LTDA', 'medico', 5],
      [23, 'CAC MED PORTO BELO LTDA', 'medico', 5],
      [24, 'CAC PSICO PORTO BELO', 'psicologo', 5],
      [25, 'CAC TIJUCAS', 'psicologo', 7],
      [26, 'CAROLINA V. A. DE ASSIS LTDA', 'psicologo', 7],
      [27, 'CLINICA NK MEDICINA DE TRAFEGO', 'medico', 7],
      [28, 'TRANMED', 'medico', 7],
    ];
    seedProfessionals.forEach(([id, name, type, cityId]) => {
      this.professionals.push({
        id,
        agency_id: 1,
        name,
        type,
        city_id: cityId,
        phone: null,
        email: null,
        address: null,
        observations: null,
        is_active: true,
        created_at: ts,
        updated_at: ts,
        attendance_type: 'AGENDAMENTO',
        working_days: null,
        working_hours: null,
        hidden_until: null,
      });
    });
  }
}

const store = new MemoryStore();

class InMemoryD1PreparedStatement implements D1PreparedStatement {
  private sql: string;
  private params: unknown[] = [];

  constructor(sql: string) {
    this.sql = sql.replace(/\s+/g, ' ').trim();
  }

  bind(...params: unknown[]): D1PreparedStatement {
    this.params = params;
    return this;
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const { rows } = this.execute();
    return (rows[0] as T) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const { rows } = this.execute();
    return { results: rows as T[] };
  }

  async run(): Promise<{ success: boolean; changes?: number }> {
    const { changes } = this.execute();
    return { success: true, changes };
  }

  private num(v: unknown): number {
    return typeof v === 'number' ? v : parseInt(String(v), 10);
  }

  private execute(): { rows: unknown[]; changes: number } {
    const s = this.sql;
    const p = this.params;

    // 1. Session validation (systemAuthMiddleware)
    if (s.startsWith('SELECT s.*, u.*, a.name as agency_name FROM user_sessions s')) {
      const token = String(p[0]);
      const now = new Date();
      const session = store.userSessions.find(
        (ses) => ses.session_token === token && new Date(ses.expires_at) > now
      );
      if (!session) return { rows: [], changes: 0 };
      const user = store.systemUsers.find((u) => u.id === session.user_id && u.is_active);
      if (!user) return { rows: [], changes: 0 };
      const agency = store.agencies.find((a) => a.id === user.agency_id);
      if (!agency) return { rows: [], changes: 0 };
      return {
        rows: [{ ...session, ...user, agency_name: agency.name }],
        changes: 0,
      };
    }

    // 2. Public agencies
    if (s === 'SELECT id, name FROM agencies WHERE is_active = true ORDER BY name') {
      const rows = store.agencies
        .filter((a) => a.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ id: a.id, name: a.name }));
      return { rows, changes: 0 };
    }

    // 3. Agencies queries
    if (s === 'SELECT id FROM agencies WHERE email = ?') {
      const email = String(p[0]);
      const found = store.agencies.find((a) => a.email === email);
      return { rows: found ? [{ id: found.id }] : [], changes: 0 };
    }

    if (s.startsWith('INSERT INTO agencies (name, email, phone, address, city, state)')) {
      const ts = nowIso();
      const row: AgencyRow = {
        id: store.nextId('agencies'),
        name: String(p[0]),
        email: String(p[1]),
        phone: (p[2] as string | null) ?? null,
        address: (p[3] as string | null) ?? null,
        city: (p[4] as string | null) ?? null,
        state: (p[5] as string | null) ?? 'SC',
        is_active: true,
        created_at: ts,
        updated_at: ts,
        logo_key: null,
      };
      store.agencies.push(row);
      return { rows: [{ id: row.id }], changes: 1 };
    }

    if (s === 'UPDATE agencies SET logo_key = ? WHERE id = ?') {
      const agency = store.agencies.find((a) => a.id === this.num(p[1]));
      if (agency) {
        agency.logo_key = (p[0] as string | null) ?? null;
        agency.updated_at = nowIso();
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }

    if (s === 'SELECT logo_key FROM agencies WHERE id = ?') {
      const agency = store.agencies.find((a) => a.id === this.num(p[0]));
      return { rows: agency ? [{ logo_key: agency.logo_key }] : [], changes: 0 };
    }

    if (s === 'SELECT * FROM agencies WHERE id = ?') {
      const agency = store.agencies.find((a) => a.id === this.num(p[0]));
      return { rows: agency ? [{ ...agency }] : [], changes: 0 };
    }

    if (s.startsWith('UPDATE agencies SET ') && s.endsWith(' WHERE id = ? RETURNING *')) {
      const setPart = s.slice('UPDATE agencies SET '.length, s.indexOf(' WHERE id = ?'));
      const assignments = setPart.split(',').map((part) => part.trim());
      const agencyId = this.num(p[p.length - 1]);
      const agency = store.agencies.find((a) => a.id === agencyId);
      if (!agency) return { rows: [], changes: 0 };
      let paramIdx = 0;
      for (const assign of assignments) {
        if (assign === 'updated_at = CURRENT_TIMESTAMP') {
          agency.updated_at = nowIso();
        } else {
          const col = assign.split('=')[0].trim();
          (agency as unknown as Record<string, unknown>)[col] = p[paramIdx++];
        }
      }
      return { rows: [{ ...agency }], changes: 1 };
    }

    // 4. system_users queries
    if (s === 'SELECT id FROM system_users WHERE email = ?') {
      const email = String(p[0]);
      const found = store.systemUsers.find((u) => u.email === email);
      return { rows: found ? [{ id: found.id }] : [], changes: 0 };
    }

    if (s.startsWith('SELECT u.*, a.name as agency_name FROM system_users u JOIN agencies a')) {
      const email = String(p[0]);
      const user = store.systemUsers.find((u) => u.email === email && u.is_active);
      if (!user) return { rows: [], changes: 0 };
      const agency = store.agencies.find((a) => a.id === user.agency_id);
      if (!agency) return { rows: [], changes: 0 };
      return { rows: [{ ...user, agency_name: agency.name }], changes: 0 };
    }

    if (s.startsWith('INSERT INTO system_users (')) {
      const ts = nowIso();
      const hasCreator = s.includes('created_by_user_id');
      const row: SystemUserRow = {
        id: store.nextId('system_users'),
        agency_id: this.num(p[0]),
        email: String(p[1]),
        password_hash: String(p[2]),
        name: String(p[3]),
        role: String(p[4]),
        is_active: true,
        created_at: ts,
        updated_at: ts,
        created_by_user_id: hasCreator ? this.num(p[5]) : null,
        last_login_at: null,
      };
      store.systemUsers.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s === 'UPDATE system_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?') {
      const user = store.systemUsers.find((u) => u.id === this.num(p[0]));
      if (user) {
        user.last_login_at = nowIso();
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }

    if (s.startsWith('SELECT id, name, email, role, is_active, last_login_at, created_at FROM system_users WHERE agency_id = ?')) {
      const agencyId = this.num(p[0]);
      const rows = store.systemUsers
        .filter((u) => u.agency_id === agencyId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, name, email, role, is_active, last_login_at, created_at }) => ({
          id,
          name,
          email,
          role,
          is_active,
          last_login_at,
          created_at,
        }));
      return { rows, changes: 0 };
    }

    if (s.startsWith('UPDATE system_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ?')) {
      const user = store.systemUsers.find((u) => u.id === this.num(p[1]) && u.agency_id === this.num(p[2]));
      if (!user) return { rows: [], changes: 0 };
      user.password_hash = String(p[0]);
      user.updated_at = nowIso();
      return { rows: [{ id: user.id }], changes: 1 };
    }

    if (s.startsWith('UPDATE system_users SET ') && s.endsWith(' WHERE id = ? AND agency_id = ? RETURNING *')) {
      const setPart = s.slice('UPDATE system_users SET '.length, s.indexOf(' WHERE id = ?'));
      const assignments = setPart.split(',').map((part) => part.trim());
      const userId = this.num(p[p.length - 2]);
      const agencyId = this.num(p[p.length - 1]);
      const user = store.systemUsers.find((u) => u.id === userId && u.agency_id === agencyId);
      if (!user) return { rows: [], changes: 0 };
      let paramIdx = 0;
      for (const assign of assignments) {
        if (assign === 'updated_at = CURRENT_TIMESTAMP') {
          user.updated_at = nowIso();
        } else {
          const col = assign.split('=')[0].trim();
          (user as unknown as Record<string, unknown>)[col] = p[paramIdx++];
        }
      }
      return { rows: [{ ...user }], changes: 1 };
    }

    if (s === 'DELETE FROM system_users WHERE id = ? AND agency_id = ?') {
      const userId = this.num(p[0]);
      const agencyId = this.num(p[1]);
      const before = store.systemUsers.length;
      store.systemUsers = store.systemUsers.filter((u) => !(u.id === userId && u.agency_id === agencyId));
      return { rows: [], changes: before - store.systemUsers.length };
    }

    // 5. user_sessions queries
    if (s === 'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)') {
      const ts = nowIso();
      store.userSessions.push({
        id: store.nextId('user_sessions'),
        user_id: this.num(p[0]),
        session_token: String(p[1]),
        expires_at: String(p[2]),
        created_at: ts,
        updated_at: ts,
      });
      return { rows: [], changes: 1 };
    }

    if (s === 'DELETE FROM user_sessions WHERE session_token = ?') {
      const token = String(p[0]);
      const before = store.userSessions.length;
      store.userSessions = store.userSessions.filter((ses) => ses.session_token !== token);
      return { rows: [], changes: before - store.userSessions.length };
    }

    if (s === 'DELETE FROM user_sessions WHERE user_id = ?') {
      const userId = this.num(p[0]);
      const before = store.userSessions.length;
      store.userSessions = store.userSessions.filter((ses) => ses.user_id !== userId);
      return { rows: [], changes: before - store.userSessions.length };
    }

    // 6. cities queries
    if (s === 'SELECT * FROM cities WHERE agency_id = ? AND is_active = true ORDER BY name') {
      const agencyId = this.num(p[0]);
      const rows = store.cities
        .filter((c) => c.agency_id === agencyId && c.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ ...c }));
      return { rows, changes: 0 };
    }

    if (s === 'INSERT INTO cities (agency_id, name, state) VALUES (?, ?, ?) RETURNING *') {
      const ts = nowIso();
      const row: CityRow = {
        id: store.nextId('cities'),
        agency_id: this.num(p[0]),
        name: String(p[1]),
        state: String(p[2] || 'SC'),
        is_active: true,
        created_at: ts,
        updated_at: ts,
      };
      store.cities.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s === 'UPDATE cities SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ? RETURNING *') {
      const city = store.cities.find((c) => c.id === this.num(p[1]) && c.agency_id === this.num(p[2]));
      if (!city) return { rows: [], changes: 0 };
      city.name = String(p[0]);
      city.updated_at = nowIso();
      return { rows: [{ ...city }], changes: 1 };
    }

    if (s === 'UPDATE cities SET is_active = false WHERE id = ? AND agency_id = ?') {
      const city = store.cities.find((c) => c.id === this.num(p[0]) && c.agency_id === this.num(p[1]));
      if (city) {
        city.is_active = false;
        city.updated_at = nowIso();
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }

    // 7. professional_scheduled_changes queries
    if (s === 'SELECT * FROM professional_scheduled_changes WHERE agency_id = ? AND applied_at IS NULL') {
      const agencyId = this.num(p[0]);
      return {
        rows: store.scheduledChanges.filter((sc) => sc.agency_id === agencyId && sc.applied_at === null).map((sc) => ({ ...sc })),
        changes: 0,
      };
    }

    if (s === 'SELECT * FROM professional_scheduled_changes WHERE professional_id = ? AND agency_id = ? ORDER BY scheduled_at ASC') {
      const profId = this.num(p[0]);
      const agencyId = this.num(p[1]);
      const rows = store.scheduledChanges
        .filter((sc) => sc.professional_id === profId && sc.agency_id === agencyId)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        .map((sc) => ({ ...sc }));
      return { rows, changes: 0 };
    }

    if (s.startsWith('INSERT INTO professional_scheduled_changes')) {
      const ts = nowIso();
      const row: ScheduledChangeRow = {
        id: store.nextId('scheduled_changes'),
        agency_id: this.num(p[0]),
        professional_id: this.num(p[1]),
        scheduled_at: String(p[2]),
        working_days: (p[3] as string | null) ?? null,
        working_hours: (p[4] as string | null) ?? null,
        observations: (p[5] as string | null) ?? null,
        created_by_user_id: p[6] != null ? this.num(p[6]) : null,
        created_at: ts,
        applied_at: null,
      };
      store.scheduledChanges.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s === 'UPDATE professional_scheduled_changes SET applied_at = CURRENT_TIMESTAMP WHERE id = ?') {
      const sc = store.scheduledChanges.find((item) => item.id === this.num(p[0]));
      if (sc) {
        sc.applied_at = nowIso();
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }

    if (s === 'DELETE FROM professional_scheduled_changes WHERE id = ? AND agency_id = ? AND applied_at IS NULL') {
      const id = this.num(p[0]);
      const agencyId = this.num(p[1]);
      const before = store.scheduledChanges.length;
      store.scheduledChanges = store.scheduledChanges.filter(
        (sc) => !(sc.id === id && sc.agency_id === agencyId && sc.applied_at === null)
      );
      return { rows: [], changes: before - store.scheduledChanges.length };
    }

    // 8. professionals queries
    if (s.startsWith('SELECT p.*, c.name as city_name FROM professionals p JOIN cities c')) {
      const agencyId = this.num(p[0]);
      const rows = store.professionals
        .filter((pr) => pr.agency_id === agencyId && pr.is_active)
        .map((pr) => {
          const city = store.cities.find((c) => c.id === pr.city_id);
          return city ? { ...pr, city_name: city.name } : null;
        })
        .filter((x): x is ProfessionalRow & { city_name: string } => x !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { rows, changes: 0 };
    }

    if (s === 'SELECT id FROM professionals WHERE id = ? AND agency_id = ? AND is_active = true') {
      const found = store.professionals.find(
        (pr) => pr.id === this.num(p[0]) && pr.agency_id === this.num(p[1]) && pr.is_active
      );
      return { rows: found ? [{ id: found.id }] : [], changes: 0 };
    }

    if (s.startsWith('INSERT INTO professionals (')) {
      const ts = nowIso();
      const row: ProfessionalRow = {
        id: store.nextId('professionals'),
        agency_id: this.num(p[0]),
        name: String(p[1]),
        type: String(p[2]),
        city_id: this.num(p[3]),
        phone: (p[4] as string | null) ?? null,
        email: (p[5] as string | null) ?? null,
        address: (p[6] as string | null) ?? null,
        observations: (p[7] as string | null) ?? null,
        attendance_type: String(p[8] || 'AGENDAMENTO'),
        working_days: (p[9] as string | null) ?? null,
        working_hours: (p[10] as string | null) ?? null,
        hidden_until: null,
        is_active: true,
        created_at: ts,
        updated_at: ts,
      };
      store.professionals.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s.startsWith('ALTER TABLE professionals ADD COLUMN')) {
      return { rows: [], changes: 0 };
    }

    if (s === 'UPDATE professionals SET hidden_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE agency_id = ? AND hidden_until IS NOT NULL AND hidden_until <= ?') {
      const agencyId = this.num(p[0]);
      const cutoff = new Date(String(p[1])).getTime();
      let changes = 0;
      for (const prof of store.professionals) {
        if (prof.agency_id === agencyId && prof.hidden_until && new Date(prof.hidden_until).getTime() <= cutoff) {
          prof.hidden_until = null;
          prof.updated_at = nowIso();
          changes++;
        }
      }
      return { rows: [], changes };
    }

    if (s === 'UPDATE professionals SET hidden_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ? RETURNING *') {
      const prof = store.professionals.find(
        (pr) => pr.id === this.num(p[0]) && pr.agency_id === this.num(p[1])
      );
      if (!prof) return { rows: [], changes: 0 };
      prof.hidden_until = null;
      prof.updated_at = nowIso();
      return { rows: [{ ...prof }], changes: 1 };
    }

    if (s === 'UPDATE professionals SET hidden_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND agency_id = ? RETURNING *') {
      const prof = store.professionals.find(
        (pr) => pr.id === this.num(p[1]) && pr.agency_id === this.num(p[2])
      );
      if (!prof) return { rows: [], changes: 0 };
      prof.hidden_until = (p[0] as string | null) ?? null;
      prof.updated_at = nowIso();
      return { rows: [{ ...prof }], changes: 1 };
    }

    if (s.startsWith('UPDATE professionals SET name = ?, type = ?, city_id = ?')) {
      const prof = store.professionals.find(
        (pr) => pr.id === this.num(p[10]) && pr.agency_id === this.num(p[11])
      );
      if (!prof) return { rows: [], changes: 0 };
      prof.name = String(p[0]);
      prof.type = String(p[1]);
      prof.city_id = this.num(p[2]);
      prof.phone = (p[3] as string | null) ?? null;
      prof.email = (p[4] as string | null) ?? null;
      prof.address = (p[5] as string | null) ?? null;
      prof.observations = (p[6] as string | null) ?? null;
      prof.attendance_type = String(p[7] || 'AGENDAMENTO');
      prof.working_days = (p[8] as string | null) ?? null;
      prof.working_hours = (p[9] as string | null) ?? null;
      prof.updated_at = nowIso();
      return { rows: [{ ...prof }], changes: 1 };
    }

    if (s.startsWith('UPDATE professionals SET ') && s.endsWith(' WHERE id = ? AND agency_id = ?')) {
      const setPart = s.slice('UPDATE professionals SET '.length, s.indexOf(' WHERE id = ?'));
      const assignments = setPart.split(',').map((part) => part.trim());
      const profId = this.num(p[p.length - 2]);
      const agencyId = this.num(p[p.length - 1]);
      const prof = store.professionals.find((pr) => pr.id === profId && pr.agency_id === agencyId);
      if (!prof) return { rows: [], changes: 0 };
      let paramIdx = 0;
      for (const assign of assignments) {
        if (assign === 'updated_at = CURRENT_TIMESTAMP') {
          prof.updated_at = nowIso();
        } else if (assign === 'is_active = false') {
          prof.is_active = false;
        } else {
          const col = assign.split('=')[0].trim();
          (prof as unknown as Record<string, unknown>)[col] = p[paramIdx++];
        }
      }
      return { rows: [], changes: 1 };
    }

    // 9. process_steps queries
    if (s === 'SELECT * FROM process_steps WHERE agency_id = ? AND is_active = true ORDER BY sort_order') {
      const agencyId = this.num(p[0]);
      const rows = store.processSteps
        .filter((st) => st.agency_id === agencyId && st.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((st) => ({ ...st }));
      return { rows, changes: 0 };
    }

    if (s === 'SELECT * FROM process_steps WHERE agency_id = ? ORDER BY sort_order') {
      const agencyId = this.num(p[0]);
      const rows = store.processSteps
        .filter((st) => st.agency_id === agencyId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((st) => ({ ...st }));
      return { rows, changes: 0 };
    }

    if (s === 'SELECT * FROM process_steps WHERE agency_id = ?') {
      const agencyId = this.num(p[0]);
      return {
        rows: store.processSteps.filter((st) => st.agency_id === agencyId).map((st) => ({ ...st })),
        changes: 0,
      };
    }

    if (s === 'SELECT * FROM process_steps WHERE id = ? AND agency_id = ?') {
      const step = store.processSteps.find(
        (st) => st.id === this.num(p[0]) && st.agency_id === this.num(p[1])
      );
      return { rows: step ? [{ ...step }] : [], changes: 0 };
    }

    if (s.startsWith('INSERT INTO process_steps (agency_id, name, type, sort_order, is_active)')) {
      const ts = nowIso();
      const row: ProcessStepRow = {
        id: store.nextId('process_steps'),
        agency_id: this.num(p[0]),
        name: String(p[1]),
        type: String(p[2]),
        sort_order: this.num(p[3]),
        is_active: Boolean(p[4]),
        is_required: false,
        title: null,
        description: null,
        obs: null,
        created_at: ts,
        updated_at: ts,
      };
      store.processSteps.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s === 'UPDATE process_steps SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?') {
      const step = store.processSteps.find((st) => st.id === this.num(p[1]));
      if (step) {
        step.sort_order = this.num(p[0]);
        step.updated_at = nowIso();
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }

    if (s.startsWith('UPDATE process_steps SET ') && s.endsWith(' WHERE id = ? AND agency_id = ?')) {
      const setPart = s.slice('UPDATE process_steps SET '.length, s.indexOf(' WHERE id = ?'));
      const assignments = setPart.split(',').map((part) => part.trim());
      const stepId = this.num(p[p.length - 2]);
      const agencyId = this.num(p[p.length - 1]);
      const step = store.processSteps.find((st) => st.id === stepId && st.agency_id === agencyId);
      if (!step) return { rows: [], changes: 0 };
      let paramIdx = 0;
      for (const assign of assignments) {
        if (assign === 'updated_at = CURRENT_TIMESTAMP') {
          step.updated_at = nowIso();
        } else {
          const col = assign.split('=')[0].trim();
          (step as unknown as Record<string, unknown>)[col] = p[paramIdx++];
        }
      }
      return { rows: [], changes: 1 };
    }

    // 10. fees queries
    if (s === 'SELECT * FROM fees WHERE agency_id = ? ORDER BY id') {
      const agencyId = this.num(p[0]);
      const rows = store.fees
        .filter((f) => f.agency_id === agencyId)
        .sort((a, b) => a.id - b.id)
        .map((f) => ({ ...f }));
      return { rows, changes: 0 };
    }

    if (s === 'SELECT * FROM fees WHERE agency_id = ? AND is_active = true AND linked_professional_type IS NOT NULL') {
      const agencyId = this.num(p[0]);
      const rows = store.fees
        .filter((f) => f.agency_id === agencyId && f.is_active && f.linked_professional_type !== null)
        .map((f) => ({ ...f }));
      return { rows, changes: 0 };
    }

    if (s === 'SELECT * FROM fees WHERE agency_id = ? AND is_active = true') {
      const agencyId = this.num(p[0]);
      const rows = store.fees
        .filter((f) => f.agency_id === agencyId && f.is_active)
        .map((f) => ({ ...f }));
      return { rows, changes: 0 };
    }

    if (s.startsWith('SELECT SUM(amount) as total FROM fees WHERE id IN (')) {
      const agencyId = this.num(p[p.length - 1]);
      const feeIds = p.slice(0, p.length - 1).map((v) => this.num(v));
      const total = store.fees
        .filter((f) => f.agency_id === agencyId && feeIds.includes(f.id))
        .reduce((sum, f) => sum + parseFloat(f.amount), 0);
      return { rows: [{ total }], changes: 0 };
    }

    if (s === 'SELECT amount FROM fees WHERE id = ? AND agency_id = ?') {
      const fee = store.fees.find((f) => f.id === this.num(p[0]) && f.agency_id === this.num(p[1]));
      return { rows: fee ? [{ amount: fee.amount }] : [], changes: 0 };
    }

    if (s === 'SELECT id FROM fees WHERE id = ? AND agency_id = ?') {
      const fee = store.fees.find((f) => f.id === this.num(p[0]) && f.agency_id === this.num(p[1]));
      return { rows: fee ? [{ id: fee.id }] : [], changes: 0 };
    }

    if (s.startsWith('INSERT INTO fees (')) {
      const ts = nowIso();
      const hasActive = s.includes('is_active');
      const row: FeeRow = {
        id: store.nextId('fees'),
        agency_id: this.num(p[0]),
        name: String(p[1]),
        amount: Number(p[2]).toFixed(2),
        linked_professional_type: (p[3] as string | null) ?? null,
        is_active: hasActive ? Boolean(p[4]) : true,
        created_at: ts,
        updated_at: ts,
      };
      store.fees.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s.startsWith('UPDATE fees SET name = COALESCE(?, name), amount = COALESCE(?, amount)')) {
      const fee = store.fees.find((f) => f.id === this.num(p[2]) && f.agency_id === this.num(p[3]));
      if (!fee) return { rows: [], changes: 0 };
      if (p[0] != null) fee.name = String(p[0]);
      if (p[1] != null) fee.amount = Number(p[1]).toFixed(2);
      fee.updated_at = nowIso();
      return { rows: [{ ...fee }], changes: 1 };
    }

    // 11. step_processes queries
    if (s === 'SELECT COUNT(*) as count FROM step_processes WHERE user_id = ? AND agency_id = ?') {
      const userId = this.num(p[0]);
      const agencyId = this.num(p[1]);
      const count = store.stepProcesses.filter(
        (sp) => sp.user_id === userId && sp.agency_id === agencyId
      ).length;
      return { rows: [{ count }], changes: 0 };
    }

    if (s.startsWith('SELECT sp.*, c.name AS city_name')) {
      const agencyId = this.num(p[1]);
      const userFilterId = p.length >= 3 ? this.num(p[2]) : null;
      const includeUserName = s.includes('u.name AS user_name');
      const rows = store.stepProcesses
        .filter((sp) => sp.agency_id === agencyId && (userFilterId === null || sp.user_id === userFilterId))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((sp) => {
          const city = store.cities.find((c) => c.id === sp.city_id);
          const owner = store.systemUsers.find((u) => u.id === sp.user_id);
          const chosenSteps = store.processSelectedSteps.filter((pss) => pss.process_id === sp.id);
          let psicologoName: string | null = null;
          let medicoName: string | null = null;
          for (const pss of chosenSteps) {
            if (!pss.professional_id) continue;
            const step = store.processSteps.find((st) => st.id === pss.step_id);
            const prof = store.professionals.find(
              (pr) => pr.id === pss.professional_id && pr.agency_id === agencyId
            );
            if (step && prof) {
              if (step.type === 'psicologo') psicologoName = prof.name;
              if (step.type === 'medico') medicoName = prof.name;
            }
          }
          return {
            ...sp,
            city_name: city?.name ?? '',
            ...(includeUserName ? { user_name: owner?.name ?? '' } : {}),
            psicologo_name: psicologoName,
            medico_name: medicoName,
          };
        });
      return { rows, changes: 0 };
    }

    if (s.startsWith('SELECT column_name, data_type FROM information_schema.columns')) {
      return { rows: [], changes: 0 };
    }

    if (s.startsWith('ALTER TABLE step_processes ADD COLUMN')) {
      return { rows: [], changes: 0 };
    }

    if (s.startsWith('INSERT INTO step_processes (')) {
      const ts = nowIso();
      const row: StepProcessRow = {
        id: store.nextId('step_processes'),
        agency_id: this.num(p[0]),
        user_id: this.num(p[1]),
        city_id: this.num(p[2]),
        client_name: (p[3] as string | null) ?? null,
        total_amount: Number(p[4] || 0).toFixed(2),
        show_toxicologico_message: Boolean(p[5]),
        show_toxicologico_habilitacao: Boolean(p[6]),
        categoria_atual: (p[7] as string | null) ?? null,
        aviso_reinicio: Boolean(p[8]),
        status: String(p[9] || 'completed'),
        created_at: ts,
        updated_at: ts,
      };
      store.stepProcesses.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s === 'UPDATE step_processes SET total_amount = ? WHERE id = ?') {
      const sp = store.stepProcesses.find((item) => item.id === this.num(p[1]));
      if (sp) {
        sp.total_amount = Number(p[0]).toFixed(2);
        sp.updated_at = nowIso();
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }

    if (s === 'SELECT sp.*, c.name as city_name FROM step_processes sp JOIN cities c ON sp.city_id = c.id WHERE sp.id = ? AND sp.agency_id = ?') {
      const sp = store.stepProcesses.find(
        (item) => item.id === this.num(p[0]) && item.agency_id === this.num(p[1])
      );
      if (!sp) return { rows: [], changes: 0 };
      const city = store.cities.find((c) => c.id === sp.city_id);
      return { rows: [{ ...sp, city_name: city?.name ?? '' }], changes: 0 };
    }

    if (s === 'DELETE FROM step_processes WHERE agency_id = ?') {
      const agencyId = this.num(p[0]);
      const removedIds = new Set(
        store.stepProcesses.filter((sp) => sp.agency_id === agencyId).map((sp) => sp.id)
      );
      store.stepProcesses = store.stepProcesses.filter((sp) => sp.agency_id !== agencyId);
      store.processSelectedSteps = store.processSelectedSteps.filter((pss) => !removedIds.has(pss.process_id));
      store.processSelectedFees = store.processSelectedFees.filter((psf) => !removedIds.has(psf.process_id));
      return { rows: [], changes: removedIds.size };
    }

    // 12. process_selected_steps & process_selected_fees
    if (s === 'INSERT INTO process_selected_steps (process_id, step_id, professional_id) VALUES (?, ?, ?)') {
      const ts = nowIso();
      store.processSelectedSteps.push({
        id: store.nextId('process_selected_steps'),
        process_id: this.num(p[0]),
        step_id: this.num(p[1]),
        professional_id: p[2] != null ? this.num(p[2]) : null,
        is_completed: false,
        created_at: ts,
        updated_at: ts,
      });
      return { rows: [], changes: 1 };
    }

    if (s === 'INSERT INTO process_selected_fees (process_id, fee_id, amount) VALUES (?, ?, ?)') {
      const ts = nowIso();
      store.processSelectedFees.push({
        id: store.nextId('process_selected_fees'),
        process_id: this.num(p[0]),
        fee_id: this.num(p[1]),
        amount: Number(p[2]).toFixed(2),
        created_at: ts,
        updated_at: ts,
      });
      return { rows: [], changes: 1 };
    }

    if (s.startsWith('SELECT pss.*, ps.name, ps.type, p.name as professional_name')) {
      const processId = this.num(p[0]);
      const rows = store.processSelectedSteps
        .filter((pss) => pss.process_id === processId)
        .map((pss) => {
          const step = store.processSteps.find((st) => st.id === pss.step_id);
          const prof = pss.professional_id
            ? store.professionals.find((pr) => pr.id === pss.professional_id)
            : null;
          const city = prof ? store.cities.find((c) => c.id === prof.city_id) : null;
          return {
            ...pss,
            name: step?.name ?? '',
            type: step?.type ?? '',
            sort_order: step?.sort_order ?? 0,
            professional_name: prof?.name ?? null,
            phone: prof?.phone ?? null,
            email: prof?.email ?? null,
            address: prof?.address ?? null,
            observations: prof?.observations ?? null,
            attendance_type: prof?.attendance_type ?? null,
            working_days: prof?.working_days ?? null,
            working_hours: prof?.working_hours ?? null,
            city_name: city?.name ?? null,
          };
        })
        .sort((a, b) => a.sort_order - b.sort_order);
      return { rows, changes: 0 };
    }

    if (s.startsWith('SELECT psf.*, f.name, f.linked_professional_type FROM process_selected_fees')) {
      const processId = this.num(p[0]);
      const rows = store.processSelectedFees
        .filter((psf) => psf.process_id === processId)
        .map((psf) => {
          const fee = store.fees.find((f) => f.id === psf.fee_id);
          return {
            ...psf,
            name: fee?.name ?? '',
            linked_professional_type: fee?.linked_professional_type ?? null,
          };
        });
      return { rows, changes: 0 };
    }

    // 13. agency_instructions queries
    if (s === 'SELECT general_instructions, instructions_primeira_habilitacao FROM agency_instructions WHERE agency_id = ?') {
      const row = store.agencyInstructions.find((ai) => ai.agency_id === this.num(p[0]));
      return {
        rows: row
          ? [{
              general_instructions: row.general_instructions,
              instructions_primeira_habilitacao: row.instructions_primeira_habilitacao,
            }]
          : [],
        changes: 0,
      };
    }

    if (s === 'SELECT * FROM agency_instructions WHERE agency_id = ?') {
      const row = store.agencyInstructions.find((ai) => ai.agency_id === this.num(p[0]));
      return { rows: row ? [{ ...row }] : [], changes: 0 };
    }

    if (s === 'SELECT id FROM agency_instructions WHERE agency_id = ?') {
      const row = store.agencyInstructions.find((ai) => ai.agency_id === this.num(p[0]));
      return { rows: row ? [{ id: row.id }] : [], changes: 0 };
    }

    if (s.startsWith('UPDATE agency_instructions SET general_instructions = ?')) {
      const row = store.agencyInstructions.find((ai) => ai.agency_id === this.num(p[3]));
      if (!row) return { rows: [], changes: 0 };
      row.general_instructions = String(p[0] || '');
      row.instructions_primeira_habilitacao = String(p[1] || '');
      row.required_documents = String(p[2] || '');
      row.updated_at = nowIso();
      return { rows: [{ ...row }], changes: 1 };
    }

    if (s.startsWith('INSERT INTO agency_instructions (')) {
      const ts = nowIso();
      const row: AgencyInstructionRow = {
        id: store.nextId('agency_instructions'),
        agency_id: this.num(p[0]),
        general_instructions: String(p[1] || ''),
        instructions_primeira_habilitacao: String(p[2] || ''),
        required_documents: String(p[3] || ''),
        created_at: ts,
        updated_at: ts,
      };
      store.agencyInstructions.push(row);
      return { rows: [{ ...row }], changes: 1 };
    }

    // 14. agency_term_templates queries
    if (s.startsWith('CREATE TABLE IF NOT EXISTS agency_term_templates') || s.startsWith('ALTER TABLE agency_term_templates')) {
      return { rows: [], changes: 0 };
    }

    if (s === 'SELECT * FROM agency_term_templates WHERE agency_id = ?') {
      const row = store.agencyTermTemplates.find((t) => t.agency_id === this.num(p[0]));
      return { rows: row ? [{ ...row }] : [], changes: 0 };
    }

    if (s.startsWith('INSERT INTO agency_term_templates (')) {
      const agencyId = this.num(p[0]);
      const enabled = Boolean(p[1]);
      const objectKey = String(p[2]);
      const filename = String(p[3]);
      const size = this.num(p[4]);
      const fileData = p.length >= 6 ? ((p[5] as string | null) ?? null) : null;
      const ts = nowIso();
      const existing = store.agencyTermTemplates.find((t) => t.agency_id === agencyId);
      if (existing) {
        existing.object_key = objectKey;
        existing.filename = filename;
        existing.size = size;
        existing.file_data = fileData;
        existing.updated_at = ts;
      } else {
        store.agencyTermTemplates.push({
          agency_id: agencyId,
          enabled,
          object_key: objectKey,
          filename,
          size,
          file_data: fileData,
          updated_at: ts,
        });
      }
      return { rows: [], changes: 1 };
    }

    if (s.startsWith('UPDATE agency_term_templates SET enabled = ?')) {
      const enabled = Boolean(p[0]);
      const agencyId = this.num(p[1]);
      const objectKey = String(p[2]);
      const existing = store.agencyTermTemplates.find(
        (t) => t.agency_id === agencyId && t.object_key === objectKey
      );
      if (!existing) return { rows: [], changes: 0 };
      existing.enabled = enabled;
      existing.updated_at = nowIso();
      return { rows: [{ ...existing }], changes: 1 };
    }

    console.warn('[AI Studio InMemoryDB] Unhandled SQL:', s);
    return { rows: [], changes: 0 };
  }
}

export class InMemoryD1Database {
  prepare(sql: string): D1PreparedStatement {
    return new InMemoryD1PreparedStatement(sql);
  }
}

export const inMemoryD1Adapter = new InMemoryD1Database();
