// Dependency-free regression checks against the actual components and output generators.
// React, browser APIs and HTTP are mocked; no credentials or database writes are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

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
    '/api/professionals': professionals, '/api/instructions': {},
    '/api/step-processes': []
  })[url];
  return { ok: true, status: 200, json: async () => data };
}
async function run() {
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
}
run().catch(error => { console.error(error); process.exitCode = 1; });