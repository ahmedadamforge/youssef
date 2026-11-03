import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const XLSX = require('xlsx')
await mkdir('.work', { recursive: true })
const root = await mkdtemp(path.resolve('.work/inventory-test-'))
const compiled = path.join(root, 'compiled')
await mkdir(compiled)
process.env.DATABASE_URL = ''
process.env.INVENTORY_DATA_DIR = path.join(root, 'data')
const sources = {
  db: 'lib/db.ts', 'inventory-store': 'lib/inventory-store.ts',
  'inventory-service': 'lib/inventory-service.ts', 'excel-sync': 'lib/excel-sync.ts',
  inventory: 'app/api/inventory/route.ts', stock: 'app/api/inventory/[id]/route.ts',
  loans: 'app/api/inventory/loans/route.ts', returns: 'app/api/inventory/loans/[id]/route.ts',
  maintenance: 'app/api/maintenance/route.ts', export: 'app/api/inventory/export/route.ts',
  snapshot: 'app/api/inventory/snapshot/route.ts', 'catalog-model': 'lib/inventory-catalog-model.ts',
  auth: 'lib/auth.ts', 'auth-store': 'lib/auth-store.ts', 'auth-types': 'lib/auth-types.ts',
  'auth-setup': 'app/api/auth/setup/route.ts', 'auth-register': 'app/api/auth/register/route.ts',
  'auth-login': 'app/api/auth/login/route.ts', 'auth-logout': 'app/api/auth/logout/route.ts',
  'auth-me': 'app/api/auth/me/route.ts', users: 'app/api/admin/users/route.ts',
  'user-update': 'app/api/admin/users/[id]/route.ts',
}
for (const [name, source] of Object.entries(sources)) {
  const code = (await readFile(source, 'utf8')).replaceAll('@/lib/', './')
  const result = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } })
  await writeFile(path.join(compiled, name + '.js'), result.outputText)
}
const routes = Object.fromEntries(Object.keys(sources).map(name => [name, require(path.join(compiled, name + '.js'))]))
let adminCookie = ''
function requestFor(method = 'GET', body, cookie = adminCookie, origin = 'http://localhost') {
  return new Request('http://localhost/api/test', { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
}
async function raw(route, method = 'GET', body, expected = 200, id = '', cookie = adminCookie, origin = 'http://localhost') {
  const response = await routes[route][method](requestFor(method, body, cookie, origin), { params: { id } })
  assert.equal(response.status, expected, `${route}: ${response.status} instead of ${expected}`)
  return response
}
async function api(route, method = 'GET', body, expected = 200, id = '', cookie = adminCookie) {
  return (await raw(route, method, body, expected, id, cookie)).json()
}
const testPassword = 'Local-Test-Password-123!'
await api('inventory', 'GET', undefined, 401, '', '')
await api('snapshot', 'GET', undefined, 401, '', '')
const setup = await raw('auth-setup', 'POST', { name: 'Test Admin', email: 'admin@example.test', password: testPassword }, 201, '', '')
adminCookie = setup.headers.get('set-cookie').split(';')[0]
assert.match(setup.headers.get('set-cookie'), /HttpOnly/i)
assert.match(setup.headers.get('set-cookie'), /SameSite=lax/i)
const adminUser = (await setup.json()).user
assert.equal(adminUser.role, 'admin')
assert.equal('passwordHash' in adminUser, false)
await api('auth-setup', 'POST', { name: 'Another Admin', email: 'other@example.test', password: testPassword }, 409)
await raw('auth-register', 'POST', { name: 'Bad role', email: 'bad@example.test', password: testPassword, role: 'admin' }, 403, '', '')
await raw('auth-login', 'POST', { email: 'admin@example.test', password: testPassword }, 403, '', '', 'http://other.example')
await raw('auth-login', 'POST', { email: 'admin@example.test', password: testPassword }, 403, '', '', '')
// Next.js can expose a canonical localhost URL while the actual Host/Origin use 127.0.0.1.
const canonicalRequest = new Request('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' }, body: JSON.stringify({ email: 'admin@example.test', password: testPassword }) })
assert.equal((await routes['auth-login'].POST(canonicalRequest)).status, 200)
const storedAuth = await routes['auth-store'].withAuthState(state => state)
assert.equal(storedAuth.users[0].passwordHash.includes(testPassword), false)
assert.notEqual(storedAuth.sessions[0].tokenHash, adminCookie.split('=')[1])
assert.deepEqual((await api('inventory')).items, [])
assert.deepEqual((await api('loans')).loans, [])
assert.deepEqual((await api('maintenance')).logs, [])
const emptySnapshot = await routes.snapshot.GET(requestFor())
assert.equal(emptySnapshot.headers.get('cache-control'), 'no-store')
assert.deepEqual(await emptySnapshot.json(), { items: [], loans: [], source: 'local' })
const item = { id: 'test-sensor', name: 'Test sensor', category: 'Sensors', stock: 3, specs: [] }
await api('inventory', 'POST', { ...item, stock: -1 }, 400)
await api('inventory', 'POST', { ...item, stock: 1.5 }, 400)
await api('inventory', 'POST', item, 201)
await api('inventory', 'POST', item, 409)
const loan = { itemId: item.id, memberName: 'Test member', projectName: 'Test project', quantity: 2, initialState: 'Non testé' }
await api('loans', 'POST', { ...loan, quantity: -2 }, 400)
await api('loans', 'POST', { ...loan, memberName: ' ' }, 400)
const responses = await Promise.all([1,2].map(() => routes.loans.POST(requestFor('POST', loan))))
assert.deepEqual(responses.map(r => r.status).sort(), [201,409])
const savedLoan = (await api('loans')).loans[0]
const borrowedSnapshot = await api('snapshot')
assert.equal(borrowedSnapshot.items[0].available, 1)
assert.equal(borrowedSnapshot.loans.filter(loan => loan.status === 'active').reduce((sum, loan) => sum + loan.quantity, 0), 2)
assert.equal(borrowedSnapshot.items[0].available + borrowedSnapshot.loans[0].quantity, borrowedSnapshot.items[0].stock)
assert.equal('logs' in borrowedSnapshot, false, 'The catalog endpoint must not send maintenance logs')
await api('stock', 'PATCH', { action: 'adjust-stock', delta: -2 }, 409, item.id)
await api('maintenance', 'POST', { itemId: 'unknown', errorDetail: 'Failed' }, 404)
await api('maintenance', 'POST', { itemId: item.id, errorDetail: 'Echo timeout' }, 201)
assert.equal((await api('inventory')).items[0].available, 0)
// A fresh Node process must read the committed records, with no globals or module cache.
const child = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(compiled, 'inventory-store.js'))}).withInventory(s=>s).then(s=>console.log(JSON.stringify(s)))`], { env: process.env, windowsHide: true, encoding: 'utf8' })
assert.equal(child.status, 0, child.stderr)
const persisted = JSON.parse(child.stdout)
assert.equal(persisted.items[0].available, 0)
assert.equal(persisted.loans.length, 1)
assert.equal(persisted.logs.length, 1)
await Promise.all([1,2].map(() => api('returns', 'PATCH', { action: 'return' }, 200, savedLoan.id)))
assert.equal((await api('inventory')).items[0].available, 2)
const returnedSnapshot = await api('snapshot')
assert.equal(returnedSnapshot.items[0].available, 2)
assert.equal(returnedSnapshot.loans[0].status, 'returned')
const exported = await routes.export.GET(requestFor())
assert.equal(exported.status, 200)
const workbook = XLSX.read(Buffer.from(await exported.arrayBuffer()), { type: 'buffer' })
assert.equal(workbook.SheetNames.length, 3)
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })
assert.equal(rows[5][3], 3)
assert.equal(rows[5][4], 2)
assert.equal(rows[5][5], 0, 'Quarantined units must not be counted as loans')
// An unavailable configured database must fail, not expose the local records.
process.env.DATABASE_URL = 'mysql://invalid:invalid@127.0.0.1:1/missing'
const oldError = console.error
console.error = () => {}
try { await api('inventory', 'GET', undefined, 503); await api('snapshot', 'GET', undefined, 503) } finally { console.error = oldError; await routes.db.getDbPool()?.end() }
console.log('PASS: empty startup, validation, concurrent borrowing, stock protection, maintenance, fresh-process persistence, duplicate returns, Excel, database failure without fallback.')

// Search normalization and filter edge cases: accents, French labels, custom categories, zero stock.
const model = routes['catalog-model']
const makeItem = (id, name, category, stock, available, specs = []) => ({ id, name, category, stock, available, specs, description: '', image: '', unit: 'pièces', accent: 'cyan' })
const searchItems = [
  makeItem('mcu', 'Carte électrique', 'Microcontrollers', 10, 8, ['Wi-Fi']),
  makeItem('sensor', 'Capteur', 'Sensors', 10, 2),
  makeItem('empty', 'Épuisé', '__proto__', 0, 0),
]
const index = model.buildCatalogIndex(searchItems)
assert.deepEqual(model.filterCatalog(index, 'All', 'all', '  ELECTRIQUE  ').map(item => item.id), ['mcu'])
assert.deepEqual(model.filterCatalog(index, 'All', 'all', 'microcontroleurs').map(item => item.id), ['mcu'])
assert.deepEqual(model.filterCatalog(index, 'All', 'all', 'wi-fi').map(item => item.id), ['mcu'])
assert.deepEqual(model.filterCatalog(index, 'Sensors', 'available', '').map(item => item.id), ['sensor'])
assert.deepEqual(model.filterCatalog(index, 'All', 'low', '').map(item => item.id), ['sensor', 'empty'])
assert.deepEqual(model.filterCatalog(index, 'All', 'available', '').map(item => item.id), ['mcu', 'sensor'])
assert.equal(index.categoryCounts['__proto__'], 1)
assert.equal(index.totalAvailable, 10)
assert.equal(searchItems[0].name, 'Carte électrique', 'Indexing must not mutate inventory records')
console.log('PASS: coherent no-store snapshot, returned-loan snapshot, accented search, category labels, availability and zero-stock filtering.')

// Account and ownership boundaries are tested against the actual route handlers.
process.env.DATABASE_URL = ''
await api('user-update', 'PATCH', { role: 'user' }, 409, adminUser.id)
await api('user-update', 'PATCH', { active: false }, 409, adminUser.id)
async function signup(name, email) {
  const response = await raw('auth-register', 'POST', { name, email, password: testPassword }, 201, '', '')
  return { user: (await response.json()).user, cookie: response.headers.get('set-cookie').split(';')[0] }
}
const alice = await signup('Alice Test', 'alice@example.test')
const bob = await signup('Bob Test', 'bob@example.test')
assert.equal(alice.user.role, 'user')
assert.equal((await api('auth-me', 'GET', undefined, 200, '', alice.cookie)).user.id, alice.user.id)
await api('inventory', 'POST', { ...item, id: 'forbidden' }, 403, '', alice.cookie)
await api('stock', 'PATCH', { action: 'adjust-stock', delta: 1 }, 403, item.id, alice.cookie)
await api('maintenance', 'GET', undefined, 403, '', alice.cookie)
await api('maintenance', 'POST', { itemId: item.id, errorDetail: 'forbidden' }, 403, '', alice.cookie)
await raw('export', 'GET', undefined, 403, '', alice.cookie)
await api('users', 'GET', undefined, 403, '', alice.cookie)
await api('user-update', 'PATCH', { role: 'admin' }, 403, bob.user.id, alice.cookie)
await api('auth-me', 'GET', undefined, 401, '', 'cmc_session=' + 'a'.repeat(64))
const ownLoan = await api('loans', 'POST', { itemId: item.id, quantity: 1, projectName: 'My test project', memberName: 'Forged name', memberUserId: bob.user.id, initialState: 'Testé OK' }, 201, '', alice.cookie)
assert.equal(ownLoan.loan.memberUserId, alice.user.id)
assert.equal(ownLoan.loan.memberName, alice.user.name)
assert.equal(ownLoan.loan.initialState, 'Non testé')
assert.deepEqual((await api('loans', 'GET', undefined, 200, '', alice.cookie)).loans.map(loan => loan.id), [ownLoan.loan.id])
assert.deepEqual((await api('snapshot', 'GET', undefined, 200, '', bob.cookie)).loans, [])
await api('returns', 'PATCH', { action: 'return' }, 403, ownLoan.loan.id, bob.cookie)
await api('returns', 'PATCH', { action: 'return' }, 200, ownLoan.loan.id, alice.cookie)
assert.equal((await api('inventory')).items[0].available, 2)
await api('user-update', 'PATCH', { active: false }, 200, alice.user.id)
await api('auth-me', 'GET', undefined, 401, '', alice.cookie)
await api('auth-login', 'POST', { email: alice.user.email, password: testPassword }, 401, '', '')
await api('user-update', 'PATCH', { active: true, role: 'admin' }, 200, alice.user.id)
const aliceLogin = await raw('auth-login', 'POST', { email: alice.user.email, password: testPassword }, 200, '', '')
const elevatedCookie = aliceLogin.headers.get('set-cookie').split(';')[0]
assert.equal((await aliceLogin.json()).user.role, 'admin')
await api('users', 'GET', undefined, 200, '', elevatedCookie)
await api('user-update', 'PATCH', { role: 'user' }, 200, alice.user.id)
await api('auth-me', 'GET', undefined, 401, '', elevatedCookie)
await raw('auth-logout', 'POST', undefined, 200, '', bob.cookie)
await api('auth-me', 'GET', undefined, 401, '', bob.cookie)
for (let attempt = 0; attempt < 5; attempt++) await api('auth-login', 'POST', { email: bob.user.email, password: 'incorrect' }, 401, '', '')
await api('auth-login', 'POST', { email: bob.user.email, password: testPassword }, 429, '', '')
const newAliceLogin = await raw('auth-login', 'POST', { email: alice.user.email, password: testPassword }, 200, '', '')
const expiringCookie = newAliceLogin.headers.get('set-cookie').split(';')[0]
await routes['auth-store'].withAuthState(state => { for (const session of state.sessions) if (session.userId === alice.user.id) session.expiresAt = Date.now() - 1 }, true)
await api('auth-me', 'GET', undefined, 401, '', expiringCookie)
await writeFile(path.resolve('.work/latest-auth-test-directory.txt'), path.join(root, 'data'))
console.log('PASS: admin bootstrap, HttpOnly sessions, CSRF, signup roles, API authorization, loan ownership, identity binding, account revocation, last-admin protection, logout, lockout, and expiry.')
