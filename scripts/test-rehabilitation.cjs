// Dependency-free regression checks against the actual components and output generators.
// React, browser APIs and HTTP are mocked; no credentials or database writes are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const notice = 'Atenção! Veículos para a prova prática devem atender a Portaria Normativa Detran nº 12/2026, Art. 22: máximo 8 anos (motos), 12 anos (carros), 20 anos (ônibus/caminhões). Requisito: sem débitos em aberto.';

const required = ['foto', 'taxa', 'psicologo', 'medico', 'prova_pratica'];
const types = [...required, 'curso_teorico', 'prova_teorica', 'curso_pratico', 'prova'];
const steps = types.map((type, i) => ({ id: i + 1, type, name: `ETAPA_${type}`, sort_order: i }));
const fees = [
  { id: 1, name: 'Emissão da CNH', amount: '100' },
  { id: 2, name: 'Transferência', amount: '50' },
  ...['medico', 'psicologo', 'prova_pratica', 'prova_teorica', 'curso_pratico', 'prova'].map((type, i) => ({
    id: i + 3, name: type, amount: '10', linked_professional_type: type
  })),
  { id: 9, name: 'LADV', amount: '20' }
];
const professionals = ['foto', 'medico', 'psicologo'].map((type, i) => ({
  id: i + 1, type, name: `Profissional ${type}`, city_id: 1, address: 'Endereço de teste'
}));
const cities = [{ id: 1, name: 'Cidade de teste' }];
const jsx = (type, props) => ({ type, props: props || {} });
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree && typeof tree === 'object') return text(tree.props?.children);
  return tree == null || typeof tree === 'boolean' ? '' : String(tree);
}
function load(source, mocks, globals = {}) {
  const exports = {};
  const context = vm.createContext({
    exports, console: { log() {}, error() {} }, setTimeout() {},
    document: { body: {} }, ...globals,
    require: name => {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
      return mocks[name];
    }
  });
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }
  }).outputText, context);
  return { exports, context };
}
const shared = load(fs.readFileSync('src/shared/rehabilitation.ts', 'utf8'), {}).exports;
const printInstructions = load(fs.readFileSync('src/shared/print-instructions.ts', 'utf8'), {}).exports;
const instructionTemplates = {
  general_instructions: '<p>INSTRUCAO_GERAL_TESTE</p>',
  instructions_primeira_habilitacao: '<p>INSTRUCAO_HABILITACAO_TESTE</p>'
};
let listedProcesses = [];
function renderer(source, extraMocks = {}, globals = {}) {
  const state = [], dependencies = [], refs = [];
  let cursor, refCursor, effectCursor, dirty = false, pending = [], tree;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => {
        const next = typeof value === 'function' ? value(state[index]) : value;
        if (!Object.is(next, state[index])) { state[index] = next; dirty = true; }
      }];
    },
    useEffect(effect, deps) {
      const index = effectCursor++;
      const previous = dependencies[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) {
        dependencies[index] = deps;
        pending.push(effect);
      }
    },
    useRef(initial) { const index = refCursor++; return refs[index] ||= { current: initial }; },
    lazy() { return 'lazy-icon'; }
  };
  const module = load(source, {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-dom': { createPortal: element => element },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
    '@/shared/rehabilitation': shared,
    '@/shared/print-instructions': printInstructions,
    '@/react-app/components/Layout': { default: 'Layout' },
    '@/react-app/components/PrintableStepProcess': { default: 'PrintableStepProcess' },
    '@/react-app/components/Dialog': { useDialog: () => ({ showAlert: async () => {}, DialogComponent: null }) },
    ...extraMocks
  }, globals);
  return {
    context: module.context,
    render(props) {
      for (let attempts = 0; attempts < 30; attempts++) {
        cursor = refCursor = effectCursor = 0; dirty = false; pending = [];
        tree = module.exports.default(props);
        pending.forEach(effect => effect());
        if (!dirty) return tree;
      }
      throw new Error('Render did not settle');
    }
  };
}
function button(tree, label) {
  const found = nodes(tree).find(node => node.type === 'button' && text(node).trim() === label);
  assert.ok(found, `Missing button: ${label}`);
  return found;
}
const requests = [];
let saved;
async function fetchMock(url, options = {}) {
  requests.push({ url, options });
  let data;
  if (url === '/api/step-processes' && options.method === 'POST') {
    saved = JSON.parse(options.body);
    data = { id: 42 };
  } else if (url === '/api/step-processes/42') {
    data = { ...saved, steps: steps.filter(s => saved.selected_steps.includes(s.id)), fees, professionals: {} };
  } else if (url.startsWith('/api/fees')) data = fees;
  else data = ({
    '/api/cities': cities, '/api/process-steps?active_only=true': steps,
    '/api/professionals': professionals, '/api/instructions': instructionTemplates,
    '/api/step-processes': listedProcesses
  })[url];
  return { ok: true, status: 200, json: async () => data };
}
async function run() {
  const serverSource = fs.readFileSync('src/server/app.ts', 'utf8');
  const routeStart = serverSource.indexOf('app.get("/api/step-processes",');
  const routeEnd = serverSource.indexOf('app.post("/api/step-processes",', routeStart);
  let listHandler;
  load(serverSource.slice(routeStart, routeEnd), {}, {
    app: { get(_path, _auth, handler) { listHandler = handler; } },
    systemAuthMiddleware() {},
    getUserWithAgency: c => c.user
  });
  for (const role of ['administrator', 'supervisor', 'attendant']) {
    const calls = [];
    const rows = [
      { id: 11, client_name: 'LISTA_AMBOS', city_id: 1, city_name: 'Cidade de teste', total_amount: '100', created_at: '2026-01-01' },
      { id: '12', client_name: 'LISTA_MEDICO', city_id: 1, city_name: 'Cidade de teste', total_amount: '100', created_at: '2026-01-01' },
      { id: 13, client_name: 'LISTA_PSICOLOGO', city_id: 1, city_name: 'Cidade de teste', total_amount: '100', created_at: '2026-01-01' },
      { id: 14, client_name: 'LISTA_SEM_CREDENCIADO', city_id: 1, city_name: 'Cidade de teste', total_amount: '100', created_at: '2026-01-01' }
    ];
    const result = await listHandler({
      user: { id: 5, agency_id: 2, role },
      env: { DB: { prepare(sql) {
        return { bind(...params) {
          calls.push({ sql, params });
          return { async all() { return { results: sql.includes('FROM process_selected_steps') ? [
            { process_id: '11', step_type: 'psicologo', professional_name: 'Psicóloga escolhida' },
            { process_id: 11, step_type: 'medico', professional_name: 'Médico escolhido' },
            { process_id: 12, step_type: 'medico', professional_name: 'Médico individual' },
            { process_id: '13', step_type: 'psicologo', professional_name: 'Psicóloga individual' }
          ] : rows }; } };
        } };
      } } },
      json: data => data
    });
    assert.deepEqual(calls[0].params, role === 'attendant' ? [2, 5] : [2]);
    assert.match(calls[0].sql, /sp.agency_id = \?/);
    if (role === 'attendant') assert.match(calls[0].sql, /sp.user_id = \?/);
    assert.match(calls[1].sql, /p.agency_id = \?/);
    assert.equal(calls[1].params.at(-1), 2);
    assert.equal(result[0].psicologo_name, 'Psicóloga escolhida');
    assert.equal(result[0].medico_name, 'Médico escolhido');
    assert.equal(result[1].medico_name, 'Médico individual');
    assert.equal(result[1].psicologo_name, null);
    assert.equal(result[2].psicologo_name, 'Psicóloga individual');
    assert.equal(result[2].medico_name, null);
    assert.equal(result[3].psicologo_name, null);
    assert.equal(result[3].medico_name, null);
    listedProcesses = result;
  }
  let source = fs.readFileSync('src/react-app/pages/StepProcess.tsx', 'utf8');
  source = source.replace('  if (showForm) {', `  globalThis.test = {
    formData, rehabilitationCategoryAnswer, showRehabilitationModal, currentPrintData,
    setFormData, setShowForm, setCurrentStep, handleStepToggle, handleCancel,
    handleSubmit, handleShowPrint, handleProfessionalSelectChange, confirmProfessionalSelection
  };
  if (showForm) {`);
  const app = renderer(source, {}, { fetch: fetchMock });
  let tree = app.render();
  await new Promise(resolve => setImmediate(resolve));
  tree = app.render();
  for (const process of listedProcesses) {
    const card = nodes(tree).find(node => node.type === 'div' &&
      node.props.className === 'px-6 py-4' &&
      text(node).includes(process.client_name));
    assert.ok(card, `Missing listed process: ${process.client_name}`);
    assert.equal(text(card).includes('Psicólogo:'), Boolean(process.psicologo_name));
    assert.equal(text(card).includes('Médico:'), Boolean(process.medico_name));
    if (process.psicologo_name) assert.ok(text(card).includes(process.psicologo_name));
    if (process.medico_name) assert.ok(text(card).includes(process.medico_name));
  }
  console.log('PASS: chosen psychologist/doctor loaded and listed for all roles, both/individual/absent, mixed ID types and tenant filtering');
  app.context.test.setShowForm(true);
  app.context.test.setFormData(prev => ({ ...prev, city_id: '1' }));
  tree = app.render();
  function select(service) {
    const select = nodes(tree).find(node => node.type === 'select' &&
      nodes(node.props.children).some(child => child.type === 'option' && child.props.value === 'Reabilitação'));
    assert.ok(select);
    select.props.onChange({ target: { value: service } });
    tree = app.render();
  }
  function selectedTypes() {
    return steps.filter(step => app.context.test.formData.selected_steps.includes(step.id)).map(step => step.type);
  }
  select('Reabilitação');
  assert.equal(app.context.test.showRehabilitationModal, true);
  assert.ok(text(tree).includes('O condutor possui categoria C, D ou E?'));
  assert.deepEqual(selectedTypes(), required);
  app.context.test.setCurrentStep(2); tree = app.render();
  const checkboxes = nodes(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked);
  assert.equal(checkboxes.length, 5);
  assert.ok(checkboxes.every(node => !node.props.disabled));
  app.context.test.setCurrentStep(1); tree = app.render();
  button(tree, 'Sim').props.onClick(); tree = app.render();
  assert.equal(app.context.test.formData.show_toxicologico_message, true);
  assert.equal(app.context.test.formData.show_toxicologico_habilitacao, false);
  for (const step of steps.filter(s => required.includes(s.type))) {
    app.context.test.handleStepToggle(step.id); tree = app.render();
    assert.deepEqual(selectedTypes(), required.filter(type => type !== step.type));
    app.context.test.handleStepToggle(step.id); tree = app.render();
    assert.deepEqual(selectedTypes(), required, 'Toggling must not add grouped courses/exams');
  }
  tree = app.render();
  assert.deepEqual(selectedTypes(), required);
  assert.ok(!app.context.test.formData.selected_fees.includes(9), 'LADV must not be auto-added');
  for (const excluded of ['prova_teorica', 'curso_pratico', 'prova']) {
    assert.ok(!app.context.test.formData.selected_fees.includes(fees.find(f => f.linked_professional_type === excluded).id));
  }
  const medicalStep = steps.find(s => s.type === 'medico');
  app.context.test.handleProfessionalSelectChange(medicalStep.id, '2'); tree = app.render();
  app.context.test.confirmProfessionalSelection(); tree = app.render();
  assert.equal(app.context.test.formData.show_toxicologico_message, true);
  button(tree, 'Próximo').props.onClick(); tree = app.render();
  assert.equal(app.context.test.formData.show_toxicologico_message, true);
  const practicalStep = steps.find(s => s.type === 'prova_pratica');
  app.context.test.handleStepToggle(practicalStep.id); tree = app.render();
  const customizedTypes = required.filter(type => type !== 'prova_pratica');
  await app.context.test.handleSubmit(); tree = app.render();
  assert.equal(saved.show_toxicologico_message, true);
  assert.deepEqual(saved.selected_steps, steps.filter(s => customizedTypes.includes(s.type)).map(s => s.id));
  assert.equal(app.context.test.currentPrintData.show_toxicologico_message, true);
  assert.deepEqual(app.context.test.currentPrintData.selected_steps.map(s => s.type), customizedTypes);
  assert.equal(app.context.test.rehabilitationCategoryAnswer, null);
  app.context.test.handleShowPrint({ id: 42, city_id: 1, client_name: 'Reabilitação', total_amount: '110' });
  await new Promise(resolve => setImmediate(resolve)); tree = app.render();
  assert.equal(app.context.test.currentPrintData.show_toxicologico_message, true);
  assert.deepEqual(app.context.test.currentPrintData.selected_steps.map(s => s.type), customizedTypes);
  app.context.test.setShowForm(true); app.context.test.setCurrentStep(1); tree = app.render();
  select('Reabilitação'); button(tree, 'Sim').props.onClick(); tree = app.render();
  select('Renovação');
  assert.equal(app.context.test.formData.show_toxicologico_message, false);
  assert.deepEqual(selectedTypes(), ['foto', 'taxa', 'medico']);
  select('Reabilitação'); button(tree, 'Não').props.onClick(); tree = app.render();
  assert.equal(app.context.test.formData.show_toxicologico_message, false);
  assert.deepEqual(selectedTypes(), required);
  app.context.test.setFormData(prev => ({ ...prev, city_id: '1' })); tree = app.render();
  await app.context.test.handleSubmit(); tree = app.render();
  assert.equal(saved.show_toxicologico_message, false);
  app.context.test.handleShowPrint({ id: 42, city_id: 1, client_name: 'Reabilitação' });
  await new Promise(resolve => setImmediate(resolve)); tree = app.render();
  assert.equal(app.context.test.currentPrintData.show_toxicologico_message, false);
  app.context.test.setShowForm(true); tree = app.render();
  select('Reabilitação');
  const postCount = requests.filter(r => r.options.method === 'POST').length;
  await app.context.test.handleSubmit();
  assert.equal(requests.filter(r => r.options.method === 'POST').length, postCount, 'Unanswered modal blocks saving');
  button(nodes(tree).find(node => node.props.role === 'dialog'), 'Cancelar').props.onClick(); tree = app.render();
  assert.equal(app.context.test.formData.client_name, '');
  select('Reabilitação'); button(tree, 'Sim').props.onClick(); tree = app.render();
  app.context.test.handleCancel(); tree = app.render();
  assert.equal(app.context.test.formData.show_toxicologico_message, false);
  assert.equal(app.context.test.rehabilitationCategoryAnswer, null);
  app.context.test.setShowForm(true); tree = app.render();
  for (const service of ['1º Habilitação', 'Reinicio (1º Habilitação)']) {
    select(service);
    assert.deepEqual(selectedTypes(), ['foto', 'taxa', 'psicologo', 'medico', 'prova_pratica', 'prova_teorica', 'curso_pratico']);
    assert.ok(app.context.test.formData.selected_fees.includes(9));
  }
  select('Adição de Categoria B');
  assert.deepEqual(selectedTypes(), ['foto', 'taxa', 'medico', 'prova_pratica', 'curso_pratico']);
  console.log('PASS: automatic selection, editable stages without grouping, Sim/Não, professional selection, reset, customized save/reprint mapping and other services');

  source = fs.readFileSync('src/react-app/components/PrintableStepProcess.tsx', 'utf8')
    .replace('  // Quando autoPrint está ativo', '  globalThis.output = { generatePrintHTML, generateEmailContent };\n  // Quando autoPrint está ativo');
  const print = renderer(source, {}, { fetch: async () => ({ json: async () => ({}) }) });
  const server = fs.readFileSync('src/server/app.ts', 'utf8');
  const start = server.indexOf('function generateEmailHTML(');
  const end = server.indexOf('\napp.post(', start);
  const email = load(server.slice(start, end) + '\nexports.generateEmailHTML = generateEmailHTML;', {}, {
    isServiceStepAllowed: shared.isServiceStepAllowed
  }).exports;
  for (const yes of [true, false]) {
    const data = {
      client_name: 'Reabilitação', city: cities[0], all_steps: steps,
      selected_steps: steps.filter(s => required.includes(s.type)),
      selected_professionals: Object.fromEntries(professionals.map(p => [steps.find(s => s.type === p.type).id, p])),
      selected_fees: [fees[0]], total_amount: '100', show_toxicologico_message: yes
    };
    const preview = print.render({ isOpen: true, onClose() {}, processData: data });
    const outputs = {
      html: print.context.output.generatePrintHTML(),
      text: print.context.output.generateEmailContent(),
      preview: text(preview),
      serverEmail: email.generateEmailHTML(data, null, '')
    };
    for (const [format, output] of Object.entries(outputs)) {
      for (const type of required) assert.ok(output.toLowerCase().includes(`etapa_${type}`), `${format}: missing ${type}`);
      for (const type of types.filter(t => !required.includes(t))) {
        assert.ok(!new RegExp(`ETAPA_${type}(?![a-z_])`, 'i').test(output), `${format}: unwanted ${type}`);
      }
      assert.equal(output.includes('LEVAR O TOXICOLÓGICO'), yes, `${format}: toxicology flag`);
    }
  }
  assert.equal(shared.isServiceStepAllowed('1º Habilitação', 'curso_teorico'), true);
  assert.equal(shared.isServiceStepAllowed('Reabilitação', 'curso_teorico'), false);
  console.log('PASS: print HTML, email text, preview and server email preserve five stages and toxicology answer');
  assert.equal(shared.REHABILITATION_VEHICLE_NOTICE, notice);
  const printData = {
    client_name: 'Reabilitação', city: cities[0], all_steps: steps,
    selected_steps: steps.filter(s => required.includes(s.type)),
    selected_professionals: Object.fromEntries(professionals.map(p => [steps.find(s => s.type === p.type).id, p])),
    selected_fees: [fees[0], fees.find(f => f.linked_professional_type === 'prova_pratica')],
    total_amount: '110', show_toxicologico_message: true
  };
  const fixtures = [
    { name: 'immediate print', data: printData, expected: true },
    { name: 'saved process reprint', data: JSON.parse(JSON.stringify(printData)), expected: true },
    { name: 'without all_steps', data: { ...printData, all_steps: undefined }, expected: true },
    { name: 'different step order', data: { ...printData, all_steps: [...steps].reverse() }, expected: true },
    { name: 'practical exam deselected', data: {
      ...printData, selected_steps: printData.selected_steps.filter(s => s.type !== 'prova_pratica')
    }, expected: false },
    { name: 'practical block absent', data: {
      ...printData, all_steps: steps.filter(s => s.type !== 'prova_pratica')
    }, expected: false },
    { name: 'reinicio hides practical block', data: { ...printData, aviso_reinicio: true }, expected: false },
    ...['1º Habilitação', 'Reinicio (1º Habilitação)', 'Adição de Categoria A', 'Adição de Categoria B', 'Renovação', ''].map(service => ({
      name: `other service: ${service}`, data: { ...printData, client_name: service }, expected: false
    }))
  ];
  for (const { name, data, expected } of fixtures) {
    const preview = print.render({ isOpen: true, onClose() {}, processData: data });
    const html = print.context.output.generatePrintHTML();
    const row = nodes(preview).find(node => node.props['data-rehabilitation-exam-row']);
    assert.equal(Boolean(row), expected, `${name}: preview pair`);
    assert.equal(text(preview).includes(notice), expected, `${name}: preview notice`);
    assert.equal(html.includes(notice), expected, `${name}: print notice`);
    assert.equal((html.match(/<aside class="rehabilitation-vehicle-notice">/g) || []).length,
      expected ? 1 : 0, `${name}: print notice exactly once`);
    if (expected) {
      const children = row.props.children;
      assert.equal(children.length, 2);
      assert.ok(text(children[0]).includes('ETAPA_prova_pratica'));
      assert.equal(children[1].type, 'aside');
      assert.equal(text(children[1]), notice);
      assert.equal(row.props.style.breakInside, 'avoid');
      assert.match(html, /<div class="rehabilitation-exam-row">[\s\S]*?ETAPA_prova_pratica[\s\S]*?<aside class="rehabilitation-vehicle-notice">/);
      assert.match(html, /\.rehabilitation-exam-row\s*\{[^}]*grid-column: 1 \/ -1;[^}]*break-inside: avoid;/);
    }
    assert.equal(print.context.output.generateEmailContent().includes(notice), false, `${name}: email unchanged`);
    assert.equal(email.generateEmailHTML(data, null, '').includes(notice), false, `${name}: server email unchanged`);
  }
  if (process.argv.includes('--write-print-fixture')) {
    // Generated test document only; never expose a fixture route or bypass auth in the application.
    const data = {
      ...printData,
      all_steps: steps.map(s => ({ ...s, name: ({
        foto: 'Foto', taxa: 'Taxa', psicologo: 'Exame Psicológico',
        medico: 'Exame Médico', prova_pratica: 'Prova Prática'
      })[s.type] || s.name })),
      general_instructions: 'Apresente documento de identificação e siga as orientações da agência.'
    };
    print.render({ isOpen: true, onClose() {}, processData: data });
    const html = print.context.output.generatePrintHTML();
    fs.mkdirSync('/tmp/rehabilitation-print-check', { recursive: true });
    fs.writeFileSync('/tmp/rehabilitation-print-check/index.html', html.replace('@media print {', '@media all {'));
    fs.writeFileSync('/tmp/rehabilitation-print-check/screen.html', html);
  }
  console.log('PASS: exact vehicle notice adjacent to practical exam, immediate/reprint, deselected/absent exam, other services and unchanged emails');
  const eligibleServices = ['1º Habilitação', 'Reinicio (1º Habilitação)', 'Reabilitação', 'Adição de Categoria A', 'Adição de Categoria B'];
  for (const service of [...eligibleServices, 'Renovação', 'Transferência', 'Curso Teórico', '', undefined]) {
    const eligible = eligibleServices.includes(service);
    const expected = eligible ? instructionTemplates.instructions_primeira_habilitacao : instructionTemplates.general_instructions;
    assert.equal(printInstructions.resolvePrintInstructions(service, instructionTemplates), expected);
    assert.equal(printInstructions.resolvePrintInstructions(service, {}), '');
    for (const practical of [true, false]) {
      const data = { ...printData, client_name: service,
        selected_steps: practical ? printData.selected_steps : printData.selected_steps.filter(s => s.type !== 'prova_pratica') };
      const instance = renderer(source, {}, { fetch: async url => ({
        json: async () => url === '/api/instructions' ? instructionTemplates : {}
      }) });
      instance.render({ isOpen: true, onClose() {}, processData: data });
      await new Promise(resolve => setImmediate(resolve));
      const preview = instance.render({ isOpen: true, onClose() {}, processData: data });
      const html = instance.context.output.generatePrintHTML();
      const previewInstructions = nodes(preview)
        .map(node => node.props.dangerouslySetInnerHTML?.__html || '').join('');
      for (const output of [previewInstructions, html]) {
        assert.equal(output.includes('INSTRUCAO_HABILITACAO_TESTE'), eligible, `${service}, practical=${practical}`);
        assert.equal(output.includes('INSTRUCAO_GERAL_TESTE'), !eligible, `${service}, practical=${practical}`);
      }
    }
    if (service !== undefined) {
      app.context.test.setFormData(prev => ({ ...prev, city_id: '1', client_name: service }));
      tree = app.render();
      await app.context.test.handleSubmit(); tree = app.render();
      assert.equal(app.context.test.currentPrintData.general_instructions, expected, `${service}: immediate mapping`);
      app.context.test.handleShowPrint({ id: 42, city_id: 1, client_name: service });
      await new Promise(resolve => setImmediate(resolve)); tree = app.render();
      assert.equal(app.context.test.currentPrintData.general_instructions, expected, `${service}: reprint mapping`);
    }
  }
  console.log('PASS: special instructions exclusively for five services, with/without practical exam, preview, print, immediate/reprint mappings and empty settings');
}
run().catch(error => { console.error(error); process.exitCode = 1; });