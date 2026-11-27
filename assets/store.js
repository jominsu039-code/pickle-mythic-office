/* ============================================================================
   고대 신화 전략비서실 · data layer
   ----------------------------------------------------------------------------
   화면은 이 파일이 만든 "표준 모델(canonical model)"만 읽습니다.
   저장소가 바뀌어도(예: Supabase → Firebase RTDB 통합) 어댑터만 갈아 끼우면
   화면 코드는 그대로 동작합니다.

     [SupabaseAdapter]  pickle_joint_office_*   ─┐
                                                 ├─→ normalize → state → render
     [PartnerAdapter]   Firebase /jointOffice   ─┘

   · 표준 비서 id: raphael(조민수 님) · sudaeng(박준아 님)
   · 표준 방 id  : council · delphi · agora · ambrosia · lounge  (신전 5구역)
   · 표준 메시지 : board 행을 { ch, side, authorId, text, metrics, bullets } 로
   ============================================================================ */

export const CFG = {
  supabase: {
    url: "https://twoijxuzzfgaxzhuheaz.supabase.co",
    key: "sb_publishable_XFBM2DdIkGZ5ERWM7Le3xg_IOukg7AQ", // 공개용(publishable) 키
    tables: {
      agents: "pickle_joint_office_agents",
      tasks: "pickle_joint_office_tasks",
      board: "pickle_joint_office_board",
      goals: "pickle_joint_office_goals",
    },
  },
  // 박준아 님 비서실이 쓰는 실시간 DB (연동 규격 v1 · /jointOffice)
  partner: {
    rtdb: "https://pickle-joint-office-492b2-default-rtdb.asia-southeast1.firebasedatabase.app/jointOffice",
    enabled: true,
  },
};

/* ---------------------------------------------------------------- 표준 프로필
   비서의 이름·문양·색은 이 표가 기준입니다. (DB 값이 있어도 여기가 우선)
   색: plum #7C5CBF · green #2E8B57 (연동 규격 v1 의 color/material 규격과 호환) */
export const PROFILES = {
  raphael: {
    id: "raphael",
    name: "라파엘",
    glyph: "ㄹ",
    color: "green",
    hex: "#2E8B57",
    material: "기본",
    owner: "조민수",
    ownerHandle: "@chominsu37",
    role: "대현자 · 신전 서기관",
    badge: "수석 비서",
    sort: 10,
    // 이 비서의 상태·방·하는 일은 어느 저장소가 진짜인지 (연동 시 충돌 방지)
    prefer: "supabase",
  },
  sudaeng: {
    id: "sudaeng",
    name: "수댕",
    glyph: "ㅅ",
    color: "plum",
    hex: "#7C5CBF",
    material: "기본",
    owner: "박준아",
    ownerHandle: "@parkjuna2",
    role: "달빛 기록관 · 신탁의 서기",
    badge: "합동 비서",
    sort: 20,
    prefer: "partner",
  },
};

// 저장소마다 다른 id를 표준 id로 모읍니다.
export const ALIAS = {
  raphael: "raphael",
  rafael: "raphael", // 연동 규격 v1 표기
  selene: "sudaeng", // 초기 Supabase 행
  sudaeng: "sudaeng",
};

/* ---------------------------------------------------------------- 신전 5구역
   좌표는 지도 이미지(assets/temple-office.jpg) 기준 % 입니다.
   seats[] 는 그 방의 실제 의자 좌표. 비서는 seats 순서대로 앉습니다. */
export const ZONES = [
  {
    id: "council",
    name: "올림포스 대회의실",
    greek: "ΜΕΓΑΡΟΝ",
    kind: "meeting",
    icon: "crown",
    label: { x: 5.2, y: 13.4 },
    seats: [
      { x: 14.9, y: 26.5 }, { x: 14.9, y: 32.6 }, { x: 14.9, y: 38.7 }, { x: 14.9, y: 44.8 },
      { x: 28.3, y: 27.2 }, { x: 28.3, y: 33.3 }, { x: 28.3, y: 39.4 }, { x: 28.3, y: 45.5 },
      { x: 21.6, y: 50.2 },
    ],
    reserve: [{ x: 21.6, y: 50.2, label: "회의 진행석" }],
  },
  {
    id: "delphi",
    name: "델포이 소회의실",
    greek: "ΔΕΛΦΟΙ",
    kind: "oracle",
    icon: "scroll",
    label: { x: 5.2, y: 52.4 },
    seats: [
      { x: 16.1, y: 61.8 }, { x: 9.4, y: 67.2 }, { x: 22.8, y: 66.8 },
      { x: 11.6, y: 76.4 }, { x: 21.4, y: 76.2 },
    ],
    reserve: [{ x: 16.1, y: 61.8, label: "신탁 기록석" }],
  },
  {
    id: "agora",
    name: "아고라 작업실",
    greek: "ΑΓΟΡΑ",
    kind: "work",
    icon: "quill",
    label: { x: 34.6, y: 19.2 },
    seats: [
      { x: 44.8, y: 43.5 }, { x: 53.8, y: 43.5 }, { x: 63.0, y: 43.5 },
      { x: 44.8, y: 69.5 }, { x: 53.8, y: 69.5 }, { x: 63.0, y: 69.5 },
    ],
    reserve: [
      { x: 44.8, y: 69.5, label: "수련생석 A" },
      { x: 63.0, y: 43.5, label: "수련생석 B" },
    ],
  },
  {
    id: "ambrosia",
    name: "암브로시아 다실",
    greek: "ΑΜΒΡΟΣΙΑ",
    kind: "pantry",
    icon: "cup",
    label: { x: 72.6, y: 11.6 },
    seats: [{ x: 76.0, y: 26.5 }, { x: 84.0, y: 29.5 }, { x: 88.5, y: 40.0 }],
    reserve: [{ x: 84.0, y: 29.5, label: "다실 운영석" }],
  },
  {
    id: "lounge",
    name: "신전 라운지",
    greek: "ΣΧΟΛΗ",
    kind: "lounge",
    icon: "leaf",
    label: { x: 73.6, y: 50.6 },
    seats: [{ x: 77.4, y: 66.8 }, { x: 89.6, y: 66.0 }, { x: 83.6, y: 74.5 }],
    reserve: [{ x: 83.6, y: 74.5, label: "휴식석" }],
  },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

/* 방 이름 매핑 — Supabase room / 연동 규격 v1 room 둘 다 받습니다. */
const ROOM_TO_ZONE = {
  council: "council",
  meeting: "council",
  oracle: "delphi",
  delphi: "delphi",
  workshop: "agora",
  agora: "agora",
  "work-a": "agora",
  "work-b": "agora",
  ambrosia: "ambrosia",
  pantry: "ambrosia",
  lounge: "lounge",
};

const TEXT_TO_ZONE = [
  [/암브로시아|다실|커피|차 한 잔|티타임/, "ambrosia"],
  [/라운지|휴식|소파|쉬는 중/, "lounge"],
];

export const CHANNELS = [
  { id: "grand", name: "대회의실", sub: "전체 보고" },
  { id: "command", name: "전략지휘실", sub: "결정과 지시" },
  { id: "exec", name: "임원 라운지", sub: "가벼운 대화" },
];

/* ---------------------------------------------------------------- 상태 */
export const state = {
  assistants: [],
  tasks: [],
  goals: [],
  messages: [],
  memos: [],
  channel: "grand",
  conn: { supabase: "idle", partner: "idle" },
  syncedAt: null,
  partnerMeta: null,
};

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(state);
}

/* ---------------------------------------------------------------- 유틸 */
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const KST = { timeZone: "Asia/Seoul" };
export const kstDate = (d) => new Date(d).toLocaleDateString("ko-KR", { ...KST, year: "numeric", month: "2-digit", day: "2-digit" });
export const kstTime = (d) => new Date(d).toLocaleTimeString("ko-KR", { ...KST, hour: "2-digit", minute: "2-digit", hour12: false });
export const kstLongDate = (d) =>
  new Date(d).toLocaleDateString("ko-KR", { ...KST, year: "numeric", month: "long", day: "numeric", weekday: "long" });
export const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", KST);
export const todayKST = () => dayKey(Date.now());

/* ---------------------------------------------------------------- HTTP */
async function sb(path, { method = "GET", body, prefer = "return=representation" } = {}) {
  const { url, key } = CFG.supabase;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || j.hint || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ============================================================================
   어댑터 1 · Supabase (기준 저장소)
   ============================================================================ */
const supabaseAdapter = {
  id: "supabase",
  label: "신전 기록고",

  async read() {
    const { tables: T } = CFG.supabase;
    const [agents, tasks, board, goals] = await Promise.all([
      sb(`${T.agents}?select=*&order=sort.asc`),
      sb(`${T.tasks}?select=*&order=sort.asc`),
      sb(`${T.board}?select=*&order=created_at.desc&limit=200`),
      sb(`${T.goals}?select=*&order=sort.asc`),
    ]);
    return {
      agents: agents || [],
      tasks: tasks || [],
      board: (board || []).slice().reverse(),
      goals: goals || [],
    };
  },

  /* 메신저형 보고 — kind='log' + headline='chat:<채널>' + body=JSON 봉투
     (새 SQL 없이 기존 board 테이블 안에서 그대로 동작합니다) */
  async sendMessage(msg) {
    const T = CFG.supabase.tables.board;
    const envelope = {
      v: 2,
      t: "msg",
      ch: msg.ch,
      side: msg.side,
      text: msg.text.slice(0, 1200),
      m: (msg.metrics || []).slice(0, 3),
      b: (msg.bullets || []).slice(0, 4),
    };
    return sb(T, {
      method: "POST",
      body: [{
        author_id: msg.authorId,
        author_name: msg.authorName,
        kind: "log",
        headline: `chat:${msg.ch}`,
        body: JSON.stringify(envelope),
        pinned: false,
        done: false,
      }],
    });
  },

  async addMemo({ headline, body, kind, pinned, authorId, authorName }) {
    const T = CFG.supabase.tables.board;
    return sb(T, {
      method: "POST",
      body: [{ author_id: authorId, author_name: authorName, kind, headline, body, pinned: !!pinned }],
    });
  },

  async setMemo(id, patch) {
    const T = CFG.supabase.tables.board;
    return sb(`${T}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
  },
};

/* ============================================================================
   어댑터 2 · Firebase RTDB (박준아 님 비서실 · 연동 규격 v1)
   읽기 전용. /jointOffice 전체를 받아 표준 모델로 바꿉니다.
   ============================================================================ */
const partnerAdapter = {
  id: "partner",
  label: "수댕 비서실",

  async read() {
    if (!CFG.partner.enabled) return null;
    const res = await fetch(`${CFG.partner.rtdb}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`partner ${res.status}`);
    return (await res.json()) || {};
  },

  /* SSE — 같은 엔드포인트에 EventSource 로 붙으면 바뀔 때마다 밀려옵니다. */
  watch(onChange) {
    if (!CFG.partner.enabled || typeof EventSource === "undefined") return null;
    try {
      const es = new EventSource(`${CFG.partner.rtdb}.json`);
      let timer = null;
      const ping = () => {
        clearTimeout(timer);
        timer = setTimeout(onChange, 600);
      };
      es.addEventListener("put", ping);
      es.addEventListener("patch", ping);
      es.onerror = () => { /* 폴링이 대신 받습니다 */ };
      return es;
    } catch {
      return null;
    }
  },
};

/* ============================================================================
   정규화 — 저장소별 모양을 표준 모델로
   ============================================================================ */
function normStatusFromText(text) {
  const s = String(text || "");
  if (/회의/.test(s)) return "meeting";
  if (/휴식|커피|쉬는|라운지/.test(s)) return "idle";
  return "working";
}

function pickZone(a) {
  if (a.status === "meeting") return "council";
  // 다실·라운지로 움직였다는 말이 있으면 방보다 그쪽을 먼저 (실제로 자리를 옮긴 것)
  const text = a.task || "";
  for (const [re, zone] of TEXT_TO_ZONE) if (re.test(text)) return zone;
  return ROOM_TO_ZONE[a.roomRaw] || "agora";
}

function buildAssistants({ agents = [], partner = {} }) {
  const map = new Map();
  for (const p of Object.values(PROFILES)) {
    map.set(p.id, {
      ...p,
      task: "",
      focus: "",
      status: "idle",
      roomRaw: "agora",
      energy: 80,
      level: 1,
      linked: false,
      sources: [],
    });
  }

  for (const row of agents) {
    const id = ALIAS[row.id] || row.id;
    const a = map.get(id);
    if (!a) continue;
    a.roomRaw = row.room || a.roomRaw;
    a.task = row.status || a.task;
    a.focus = row.focus || a.focus;
    a.status = normStatusFromText(row.status);
    a.energy = Number.isFinite(row.energy) ? row.energy : a.energy;
    a.level = Number.isFinite(row.level) ? row.level : a.level;
    a.sbId = row.id;
    a.sbUpdatedAt = row.updated_at ? Date.parse(row.updated_at) : 0;
    a.sources.push("supabase");
  }

  for (const [pid, row] of Object.entries(partner.assistants || {})) {
    const id = ALIAS[pid] || ALIAS[row.id] || null;
    if (!id) continue;
    const a = map.get(id);
    if (!a) continue;
    const at = Number(row.updatedAt) || 0;
    a.partnerId = pid;
    a.partnerUpdatedAt = at;
    a.linked = true;
    a.sources.push("partner");
    // 이 비서의 주인이 상대쪽이면 상대 DB가 진실. 우리 쪽 비서면 우리 DB가 진실.
    if (a.prefer === "partner") {
      if (row.room) a.roomRaw = row.room;
      if (["working", "meeting", "idle", "offline"].includes(row.status)) a.status = row.status;
      if (row.task) a.task = row.task;
    }
    if (!a.energy) a.energy = 80;
  }

  const out = [...map.values()].sort((x, y) => (x.sort ?? 99) - (y.sort ?? 99));
  // 방 배정 + 좌석 배정
  const used = {};
  for (const a of out) {
    a.zone = pickZone(a);
    const z = ZONE_BY_ID[a.zone] || ZONE_BY_ID.agora;
    used[a.zone] = used[a.zone] || 0;
    const seat = z.seats[Math.min(used[a.zone], z.seats.length - 1)];
    used[a.zone] += 1;
    a.seat = seat;
  }
  return out;
}

function buildTasks({ tasks = [], partner = {} }) {
  const out = [];
  for (const t of tasks) {
    out.push({
      id: `sb-${t.id}`,
      owner: ALIAS[t.agent_id] || t.agent_id,
      title: t.title,
      detail: t.detail || "",
      progress: Number.isFinite(t.progress) ? t.progress : null,
      status: t.status || "active",
      zone: ROOM_TO_ZONE[t.room] || "agora",
      sort: t.sort ?? 100,
      source: "supabase",
      at: t.updated_at ? Date.parse(t.updated_at) : 0,
    });
  }
  for (const t of Object.values(partner.tasks || {})) {
    out.push({
      id: `fb-${t.id}`,
      owner: ALIAS[t.owner] || t.owner,
      title: t.title,
      detail: "",
      progress: null,
      status: t.status === "done" ? "done" : t.status === "doing" ? "active" : "waiting",
      zone: "agora",
      sort: 200,
      source: "partner",
      at: Number(t.updatedAt) || 0,
    });
  }
  return out.sort((a, b) => (a.status === "done") - (b.status === "done") || (a.sort ?? 999) - (b.sort ?? 999));
}

/* board 한 줄 → 메시지 또는 메모 */
function parseBoardRow(r) {
  const body = String(r.body || "");
  if (r.kind === "log" && /^chat:/.test(r.headline || "")) {
    try {
      const o = JSON.parse(body);
      if (o && o.t === "msg") {
        return {
          type: "msg",
          id: r.id,
          ch: o.ch || "grand",
          side: o.side === "user" ? "user" : "assistant",
          authorId: ALIAS[r.author_id] || r.author_id,
          authorName: r.author_name || "",
          text: o.text || "",
          metrics: Array.isArray(o.m) ? o.m.slice(0, 3) : [],
          bullets: Array.isArray(o.b) ? o.b.slice(0, 4) : [],
          at: r.created_at,
          source: "supabase",
        };
      }
    } catch { /* 메모로 취급 */ }
  }
  return {
    type: "memo",
    id: r.id,
    kind: r.kind || "note",
    headline: r.headline || "",
    body,
    pinned: !!r.pinned,
    done: !!r.done,
    authorId: ALIAS[r.author_id] || r.author_id,
    authorName: r.author_name || "",
    at: r.created_at,
    source: "supabase",
  };
}

function partnerMessages(partner) {
  const out = [];
  for (const l of Object.values(partner.log || {})) {
    out.push({
      type: "msg",
      id: `fb-${l.id}`,
      ch: "grand",
      side: "system",
      authorId: ALIAS[l.actor] || l.actor,
      authorName: PROFILES[ALIAS[l.actor]]?.name || l.actor,
      text: l.text || "",
      metrics: [],
      bullets: [],
      at: new Date(Number(l.at) || Date.now()).toISOString(),
      source: "partner",
      tag: "수댕 측 기록",
    });
  }
  return out;
}

/* ============================================================================
   공개 API
   ============================================================================ */
let lastPartner = {};

export async function loadAll({ quiet = false } = {}) {
  const jobs = [
    supabaseAdapter.read().then(
      (d) => ({ ok: true, d }),
      (e) => ({ ok: false, e })
    ),
    partnerAdapter.read().then(
      (d) => ({ ok: true, d }),
      (e) => ({ ok: false, e })
    ),
  ];
  const [sbRes, ptRes] = await Promise.all(jobs);

  if (sbRes.ok) {
    const { agents, tasks, board, goals } = sbRes.d;
    const parsed = board.map(parseBoardRow);
    state.messages = parsed.filter((x) => x.type === "msg");
    state.memos = parsed.filter((x) => x.type === "memo").sort((a, b) => (b.pinned - a.pinned) || (Date.parse(b.at) - Date.parse(a.at)));
    state.goals = goals;
    state.rawTasks = tasks;
    state.rawAgents = agents;
    state.conn.supabase = "live";
    state.syncedAt = new Date();
  } else {
    state.conn.supabase = state.conn.supabase === "live" ? "stale" : "down";
  }

  if (ptRes.ok) {
    lastPartner = ptRes.d || {};
    state.conn.partner = "live";
  } else {
    state.conn.partner = state.conn.partner === "live" ? "stale" : "down";
  }

  const partner = lastPartner || {};
  state.partnerMeta = partner.meta || null;
  state.assistants = buildAssistants({ agents: state.rawAgents || [], partner });
  state.tasks = buildTasks({ tasks: state.rawTasks || [], partner });

  const merged = [...state.messages, ...partnerMessages(partner)].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at)
  );
  state.allMessages = merged;

  if (!quiet || !state.ready) {
    state.ready = true;
  }
  emit();
  return { ok: sbRes.ok, partner: ptRes.ok };
}

/* ---- 쓰기 ---- */
export async function sendMessage({ text, ch, as }) {
  const who = as === "juna"
    ? { authorId: "parkjuna", authorName: "박준아" }
    : { authorId: "chominsu", authorName: "조민수" };
  const msg = {
    ch,
    side: "user",
    text,
    metrics: [],
    bullets: [],
    ...who,
  };
  const optimistic = {
    type: "msg",
    id: `local-${Date.now()}`,
    ch,
    side: "user",
    authorId: who.authorId,
    authorName: who.authorName,
    text,
    metrics: [],
    bullets: [],
    at: new Date().toISOString(),
    source: "local",
    pending: true,
  };
  state.allMessages = [...(state.allMessages || []), optimistic];
  emit();

  try {
    await supabaseAdapter.sendMessage(msg);
    await loadAll({ quiet: true });
    return { ok: true };
  } catch (err) {
    const m = (state.allMessages || []).find((x) => x.id === optimistic.id);
    if (m) m.failed = true;
    emit();
    return { ok: false, error: err.message };
  }
}

export async function addMemo(payload) {
  await supabaseAdapter.addMemo(payload);
  await loadAll({ quiet: true });
}

export async function setMemo(id, patch) {
  await supabaseAdapter.setMemo(id, patch);
  await loadAll({ quiet: true });
}

export async function goalStep(goal) {
  const cur = Number(goal.current) || 0;
  const target = Math.max(1, Number(goal.target) || 1);
  const next = Math.min(target, cur + 1);
  await sb(`${CFG.supabase.tables.goals}?id=eq.${encodeURIComponent(goal.id)}`, {
    method: "PATCH",
    body: { current: next, done: next >= target ? true : goal.done, updated_at: new Date().toISOString() },
  });
  await loadAll({ quiet: true });
}

export async function goalToggle(goal) {
  await sb(`${CFG.supabase.tables.goals}?id=eq.${encodeURIComponent(goal.id)}`, {
    method: "PATCH",
    body: { done: !goal.done, updated_at: new Date().toISOString() },
  });
  await loadAll({ quiet: true });
}

export async function addGoal({ title, target, unit }) {
  await sb(CFG.supabase.tables.goals, {
    method: "POST",
    body: [{ title, metric: "", current: 0, target: Math.max(1, target || 1), unit: unit || "개", owner: "함께", done: false, sort: 900 }],
  });
  await loadAll({ quiet: true });
}

/* ---- 집계 ---- */
export function stats() {
  const list = state.assistants || [];
  const now = Date.now();
  const today = todayKST();
  const count = (fn) => list.filter(fn).length;
  const msgs = state.allMessages || [];
  return {
    meeting: count((a) => a.status === "meeting"),
    working: count((a) => a.status === "working"),
    resting: count((a) => a.status === "idle"),
    present: count((a) => a.status !== "offline"),
    total: list.length,
    linked: count((a) => a.linked),
    unlinked: count((a) => !a.linked),
    reportsToday: msgs.filter((m) => m.side === "assistant" && dayKey(m.at) === today).length,
    tasksActive: (state.tasks || []).filter((t) => t.status !== "done").length,
    reportsRecent: msgs.filter((m) => m.side === "assistant" && now - Date.parse(m.at) < 86400000).length,
  };
}

/* ============================================================================
   실시간 — Supabase Realtime + 상대 RTDB SSE + 6초 폴링 폴백
   ============================================================================ */
let sbClient = null;
let pollTimer = null;
let partnerStream = null;

export async function connectRealtime() {
  let realtimeOk = false;
  // 1) Supabase
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sbClient = createClient(CFG.supabase.url, CFG.supabase.key, { auth: { persistSession: false } });
    const ch = sbClient.channel("pjo-live-v2");
    for (const table of Object.values(CFG.supabase.tables)) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => loadAll({ quiet: true }));
    }
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        realtimeOk = true;
        state.conn.supabase = "live";
        startPolling(45000);
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        state.conn.supabase = state.conn.supabase === "live" ? "stale" : "down";
        startPolling(6000);
      }
      emit();
    });
  } catch {
    state.conn.supabase = "down";
    emit();
  }

  // 2) 상대 비서실 RTDB (SSE, 안 되면 폴링이 받습니다)
  partnerStream = partnerAdapter.watch(() => loadAll({ quiet: true }));

  // 3) 폴백 폴링 — 실시간이 붙지 않았으면 6초
  if (!realtimeOk) startPolling(6000);
  if (!partnerStream) startPolling(6000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadAll({ quiet: true });
  });
  window.addEventListener("online", () => loadAll({ quiet: true }));
}

function startPolling(ms) {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => loadAll({ quiet: true }), ms);
}
