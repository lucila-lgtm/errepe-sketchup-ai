import { createHash } from 'node:crypto';

const fail = (code) => { throw new Error(code); };
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const iso = (n) => new Date(n).toISOString();
function text(value, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f]/.test(value)) fail('INVALID_TEXT');
  if (/(?:github_pat_|gh[pousr]_|Bearer\s|service_role|-----BEGIN|eyJ[A-Za-z0-9_-]{20})/i.test(value)) fail('POSSIBLE_SECRET');
  return value;
}
function id(value) { text(value, 100); if (!/^[a-zA-Z0-9_.-]+$/.test(value)) fail('INVALID_ID'); return value; }
export function scope(value) {
  text(value, 300);
  const parts = value.toLowerCase().split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || !/^[a-z0-9_.@():-]+$/.test(p))) fail('INVALID_SCOPE');
  return parts.join('/');
}
export const overlaps = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
export function emptyState() { return { schema: 1, revision: 0, sessions: [], operations: [] }; }
export function validateState(state) {
  if (state?.schema !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.sessions) || !Array.isArray(state.operations)) fail('INVALID_STATE');
  if (new Set(state.sessions.map(s => s.id)).size !== state.sessions.length) fail('INVALID_STATE');
  if (state.operations.length !== state.revision || new Set(state.operations.map(o => o.id)).size !== state.operations.length) fail('INVALID_STATE');
  for (const [i, o] of state.operations.entries()) {
    id(o.id); id(o.sessionId); text(o.actor);
    if (o.revision !== i + 1 || !/^[a-f0-9]{64}$/.test(o.hash) || !Number.isSafeInteger(o.generation) || o.generation < 1 || o.generation > o.revision || !Number.isFinite(Date.parse(o.at))) fail('INVALID_STATE');
  }
  for (const s of state.sessions) {
    id(s.id); text(s.actor); text(s.thread); text(s.project); text(s.repo); text(s.branch); text(s.task);
    if (!['active', 'released'].includes(s.status) || !Number.isSafeInteger(s.generation) || s.generation < 1 || s.generation > state.revision || !Number.isFinite(Date.parse(s.expiresAt)) || !Array.isArray(s.scopes) || !s.scopes.length) fail('INVALID_STATE');
    s.scopes.forEach(scope);
  }
  return state;
}
export function applyOperation(input, command, actor, now) {
  validateState(input); text(actor, 100);
  if (!Number.isFinite(now)) fail('SERVER_TIME_REQUIRED');
  const op = structuredClone(command);
  const allowed = ['operationId','action','sessionId','thread','project','repo','branch','task','scopes','ttlSeconds','generation','evidence','reason','checkpoint','pr'];
  if (Object.keys(op).some(k => !allowed.includes(k))) fail('UNKNOWN_FIELD');
  id(op.operationId); id(op.sessionId);
  if (!['acquire','renew','release','reclaim','checkpoint'].includes(op.action)) fail('INVALID_ACTION');
  const hash = digest({ actor, command: op });
  const prior = input.operations.find(x => x.id === op.operationId);
  if (prior) {
    if (prior.hash !== hash) fail('IDEMPOTENCY_MISMATCH');
    return { state: input, receipt: prior, replay: true };
  }
  const state = structuredClone(input);
  let s = state.sessions.find(x => x.id === op.sessionId);
  const ttl = op.ttlSeconds ?? 1800;
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 7200) fail('INVALID_TTL');
  if (op.action === 'acquire') {
    if (s) fail('SESSION_EXISTS');
    text(op.thread); text(op.project); text(op.task, 120);
    if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(op.repo || '')) fail('INVALID_REPO');
    text(op.branch);
    if (/^(main|master|production|coordination\/|checkpoint\/)/i.test(op.branch) || !/^[a-zA-Z0-9_./-]+$/.test(op.branch) || op.branch.includes('..')) fail('UNSAFE_BRANCH');
    if (!Array.isArray(op.scopes) || !op.scopes.length || op.scopes.length > 50) fail('INVALID_SCOPES');
    const scopes = [...new Set(op.scopes.map(scope))].sort();
    const repo = op.repo.toLowerCase();
    const conflict = state.sessions.find(x => x.status === 'active' && (
      (x.repo === repo && (x.branch === op.branch || x.task === op.task)) || x.scopes.some(a => scopes.some(b => overlaps(a,b)))
    ));
    // Expired reservations continue blocking until a deliberate, audited recovery.
    if (conflict) fail('CONFLICT:' + conflict.id);
    s = { id: op.sessionId, actor, thread: op.thread, project: op.project, repo, branch: op.branch, task: op.task, scopes,
      status: 'active', generation: state.revision + 1, acquiredAt: iso(now), expiresAt: iso(now + ttl * 1000), checkpoint: null, pr: null };
    state.sessions.push(s);
  } else {
    if (!s || s.status !== 'active') fail('SESSION_NOT_ACTIVE');
    if (s.generation !== op.generation) fail('STALE_GENERATION');
    if (op.action === 'reclaim') {
      if (Date.parse(s.expiresAt) > now) fail('LEASE_NOT_EXPIRED');
      text(op.reason, 500); text(op.evidence, 500);
      s.status = 'released'; s.recovery = { actor, reason: op.reason, evidence: op.evidence, at: iso(now) };
    } else {
      if (s.actor !== actor) fail('NOT_OWNER');
      if (op.action !== 'release' && Date.parse(s.expiresAt) <= now) fail('LEASE_EXPIRED');
      if (op.action === 'release') { text(op.evidence, 500); s.status = 'released'; s.handoff = op.evidence; }
      if (op.action === 'renew') s.expiresAt = iso(now + ttl * 1000);
      if (op.action === 'checkpoint') {
        text(op.checkpoint, 200); if (!/^[a-f0-9]{40}$/.test(op.checkpoint)) fail('INVALID_CHECKPOINT');
        if (op.pr !== undefined && !/^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/pull\/\d+$/i.test(op.pr)) fail('INVALID_PR');
        s.checkpoint = op.checkpoint; s.pr = op.pr ?? s.pr;
      }
    }
    s.updatedAt = iso(now);
  }
  state.revision++;
  const receipt = { id: op.operationId, hash, actor, action: op.action, sessionId: s.id, generation: s.generation, revision: state.revision, at: iso(now) };
  state.operations.push(receipt);
  if (Buffer.byteLength(JSON.stringify(state)) > 750000) fail('REGISTRY_CAPACITY_REVIEW_REQUIRED');
  return { state, receipt, replay: false };
}

// A store must implement read() -> {state, version, actor, now} and
// compareAndSwap(version, state) -> boolean. No local fallback is allowed.
export async function transact(store, command, maxAttempts = 4) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const snapshot = await store.read();
    const result = applyOperation(snapshot.state, command, snapshot.actor, snapshot.now);
    if (result.replay) return result.receipt;
    if (await store.compareAndSwap(snapshot.version, result.state)) return result.receipt;
  }
  fail('CONTENTION_RETRY_SAME_OPERATION_ID');
}

export function assertLease(state, sessionId, actor, generation, now) {
  validateState(state);
  const s = state.sessions.find(x => x.id === sessionId);
  if (!s || s.actor !== actor || s.generation !== generation || s.status !== 'active' || Date.parse(s.expiresAt) <= now) fail('NO_VALID_LEASE');
  return s;
}
