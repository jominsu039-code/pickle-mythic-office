/* ============================================================
   피클 합동 비서실 · Pickle Joint Office
   실시간 Supabase(Realtime + REST 폴백) 연동
   ============================================================ */

const SB_URL = "https://twoijxuzzfgaxzhuheaz.supabase.co";
const SB_KEY = "sb_publishable_XFBM2DdIkGZ5ERWM7Le3xg_IOukg7AQ"; // 공개용(publishable) 키
const T = {
  agents: "pickle_joint_office_agents",
  tasks: "pickle_joint_office_tasks",
  board: "pickle_joint_office_board",
  goals: "pickle_joint_office_goals",
};
const ROOM_NAME = { council: "올림포스 회의실", workshop: "아고라 작업실", oracle: "델포이 신탁 게시판" };
const KIND_NAME = { agenda: "안건", note: "메모", decision: "결정", log: "기록", oracle: "신탁" };
const STATUS_NAME = { active: "진행", waiting: "대기", paused: "보류", done: "완료" };

const state = { agents: [], tasks: [], board: [], goals: [], mode: "connecting", syncedAt: null };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------- 통신 ---------------- */

async function api(path, { method = "GET", body, prefer = "return=representation" } = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const j = await res.json(); msg = j.message || j.hint || msg; } catch { /* 무시 */ }
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadAll({ quiet = false } = {}) {
  if (!quiet) setLoadingHints();
  try {
    const [agents, tasks, board, goals] = await Promise.all([
      api(`${T.agents}?select=*&order=sort.asc`),
      api(`${T.tasks}?select=*&order=sort.asc`),
      api(`${T.board}?select=*&order=pinned.desc,created_at.desc&limit=80`),
      api(`${T.goals}?select=*&order=sort.asc`),
    ]);
    state.agents = agents || [];
    state.tasks = tasks || [];
    state.board = board || [];
    state.goals = goals || [];
    state.syncedAt = new Date();
    renderAll();
  } catch (err) {
    showError(err);
  }
}

function setLoadingHints() {
  const feed = $("#feed");
  if (feed && !feed.dataset.ready) feed.innerHTML = `<p class="skeleton">게시판을 불러오는 중…</p>`;
}

function showError(err) {
  const feed = $("#feed");
  if (feed) feed.innerHTML = `<p class="skeleton">기록을 불러오지 못했습니다. ${esc(err.message)}<br>잠시 뒤 다시 시도합니다.</p>`;
  setLive("off");
}

/* ---------------- 그리기 ---------------- */

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function rel(iso) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "방금";
  if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  if (d < 604800) return `${Math.floor(d / 86400)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function renderAll() {
  renderMap();
  renderAgents();
  renderBoard();
  renderGoals();
  const sync = $("#last-sync");
  if (sync && state.syncedAt) {
    sync.textContent = `마지막 동기화 ${state.syncedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  $$(".feed, #agent-cards, #goal-list").forEach((el) => (el.dataset.ready = "1"));
}

function renderMap() {
  ["council", "workshop", "oracle"].forEach((room) => {
    const box = $(`[data-room-people="${room}"]`);
    const count = $(`[data-room-count="${room}"]`);
    if (!box) return;
    const people = state.agents.filter((a) => a.room === room).sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
    const roomTasks = state.tasks.filter((t) => t.room === room && t.status !== "done").sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
    if (count) count.textContent = String(roomTasks.length);

    const chips = people
      .map(
        (a) => `<div class="resident" style="--accent:${esc(a.accent || "#8a6a26")}">
          <div class="mini">${esc(a.glyph || "·")}</div>
          <div>
            <div class="who">${esc(a.display_name)}</div>
            <div class="what">${esc(a.status || "자리를 지키는 중")}</div>
          </div>
        </div>`
      )
      .join("");

    const rest = roomTasks.slice(0, people.length ? 2 : 3).map(
      (t) => `<div class="room-task" style="--accent:${esc((state.agents.find((a) => a.id === t.agent_id) || {}).accent || "#b08d3f")}">
        <i aria-hidden="true"></i><span>${esc(t.title)}</span>
      </div>`
    ).join("");

    box.innerHTML = (chips || "") + (rest || "") ||
      `<p class="empty-note">아직 이 방에 올려 둔 일이 없습니다.</p>`;
  });
}

function renderAgents() {
  const wrap = $("#agent-cards");
  if (!wrap) return;
  if (!state.agents.length) {
    wrap.innerHTML = `<p class="skeleton">아직 신전에 등록된 비서가 없습니다.</p>`;
    return;
  }
  wrap.innerHTML = state.agents
    .slice()
    .sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99))
    .map((a) => {
      const mine = state.tasks.filter((t) => t.agent_id === a.id).sort((x, y) => (x.sort ?? 99) - (y.sort ?? 99));
      const rows = mine.length
        ? `<ul class="tasks">${mine
            .map(
              (t) => `<li>
                <div class="task-top">
                  <span class="task-title">${esc(t.title)}${
                    t.status !== "active" ? `<span class="task-state ${esc(t.status)}">${STATUS_NAME[t.status] || esc(t.status)}</span>` : ""
                  }</span>
                  <span class="task-pct">${Number(t.progress) || 0}%</span>
                </div>
                ${t.detail ? `<div class="what" style="font-size:.74rem;color:var(--ink-mute);margin-top:4px;line-height:1.6">${esc(t.detail)}</div>` : ""}
                <div class="bar"><i style="width:${Math.max(0, Math.min(100, Number(t.progress) || 0))}%"></i></div>
              </li>`
            )
            .join("")}</ul>`
        : `<p class="agent-focus">아직 이 자리에 올려 둔 일이 없습니다.</p>`;

      return `<article class="agent" style="--accent:${esc(a.accent || "#8a6a26")}">
        <div class="medallion" style="--energy:${Math.max(0, Math.min(100, Number(a.energy) || 80))}">
          <span class="ring" aria-hidden="true"></span>
          <span class="glyph">${esc(a.glyph || "·")}</span>
        </div>
        <div class="agent-body">
          <h3 class="agent-name">${esc(a.display_name)}<span class="lvl">LV.${Number(a.level) || 1}</span></h3>
          <p class="agent-role">${esc(a.role || "")}${a.owner_name ? ` · ${esc(a.owner_name)} 님` : ""}</p>
          <p class="agent-status">${esc(a.status || "—")}</p>
          ${a.focus ? `<p class="agent-focus">${esc(a.focus)}</p>` : ""}
          ${rows}
        </div>
      </article>`;
    })
    .join("");
}

function renderBoard() {
  const feed = $("#feed");
  if (!feed) return;
  if (!state.board.length) {
    feed.innerHTML = `<p class="skeleton">아직 기록이 없습니다. 첫 문장을 남겨 보세요.</p>`;
    return;
  }
  feed.innerHTML = state.board
    .map(
      (p) => `<article class="post ${p.pinned ? "is-pinned" : ""} ${p.done ? "is-done" : ""}" data-id="${esc(p.id)}">
        <div class="post-head">
          <span class="post-kind">${esc(KIND_NAME[p.kind] || p.kind)}</span>
          <span class="post-author">${esc(p.author_name || "이름 없음")}</span>
          ${p.pinned ? `<span class="post-pin" title="위로 고정">❖</span>` : ""}
          <span class="post-time" title="${esc(new Date(p.created_at).toLocaleString("ko-KR"))}">${rel(p.created_at)}</span>
        </div>
        ${p.headline ? `<h3 class="post-title">${esc(p.headline)}</h3>` : ""}
        <p class="post-body">${esc(p.body)}</p>
        <div class="post-foot">
          <label class="post-done"><input type="checkbox" data-done="${esc(p.id)}" ${p.done ? "checked" : ""}> <span>처리됨</span></label>
        </div>
      </article>`
    )
    .join("");
}

function renderGoals() {
  const wrap = $("#goal-list");
  if (!wrap) return;
  if (!state.goals.length) {
    wrap.innerHTML = `<p class="skeleton">아직 목표가 없습니다. 아래에서 첫 목표를 세겨 보세요.</p>`;
    return;
  }
  wrap.innerHTML = state.goals
    .map((g) => {
      const cur = Number(g.current) || 0;
      const target = Math.max(1, Number(g.target) || 1);
      const pct = Math.max(0, Math.min(100, Math.round((cur / target) * 100)));
      return `<article class="goal ${g.done ? "is-done" : ""}" data-goal="${esc(g.id)}">
        <p class="goal-metric">${esc(g.metric || "SKOPOS")}</p>
        <h3 class="goal-title">${esc(g.title)}</h3>
        <div class="goal-num"><span class="cur">${cur.toLocaleString("ko-KR")}</span><span class="of">/ ${target.toLocaleString("ko-KR")} ${esc(g.unit || "")}</span></div>
        <div class="goal-bar"><i style="width:${pct}%"></i></div>
        <div class="goal-actions">
          <button class="btn" data-goal-step="${esc(g.id)}" ${pct >= 100 ? "disabled" : ""}>＋1</button>
          <button class="btn ${g.done ? "gold" : ""}" data-goal-toggle="${esc(g.id)}">${g.done ? "달성 취소" : "달성"}</button>
        </div>
        <p class="goal-owner">${esc(g.owner || "함께")} · ${pct}%</p>
      </article>`;
    })
    .join("");
}

/* ---------------- 상호작용 ---------------- */

function msg(text, kind = "") {
  const el = $("#form-msg");
  if (!el) return;
  el.textContent = text;
  el.className = `form-msg ${kind}`;
  if (text) setTimeout(() => { if (el.textContent === text) { el.textContent = ""; el.className = "form-msg"; } }, 4200);
}

$("#composer")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#send");
  const body = $("#f-body").value.trim();
  if (!body) { msg("내용을 적어 주세요.", "err"); return; }
  const author = $("#f-author").value;
  btn.disabled = true;
  msg("기록을 올리는 중…");
  try {
    await api(T.board, {
      method: "POST",
      body: [{
        author_id: author === "라파엘" ? "raphael" : author === "달빛 신관 셀레네" ? "selene" : "human",
        author_name: author,
        kind: $("#f-kind").value,
        headline: $("#f-headline").value.trim(),
        body,
        pinned: $("#f-pin").checked,
      }],
    });
    $("#f-body").value = "";
    $("#f-headline").value = "";
    $("#f-pin").checked = false;
    msg("신탁 게시판에 새겼습니다.", "ok");
    await loadAll({ quiet: true });
  } catch (err) {
    msg(`올리지 못했습니다: ${err.message}`, "err");
  } finally {
    btn.disabled = false;
  }
});

$("#feed")?.addEventListener("change", async (e) => {
  const box = e.target.closest("[data-done]");
  if (!box) return;
  const id = box.dataset.done;
  try {
    await api(`${T.board}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { done: box.checked } });
    const item = state.board.find((p) => p.id === id);
    if (item) item.done = box.checked;
    renderBoard();
  } catch (err) {
    box.checked = !box.checked;
    msg(`바꾸지 못했습니다: ${err.message}`, "err");
  }
});

$("#goal-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#g-title").value.trim();
  if (!title) return;
  const target = Math.max(1, Number($("#g-target").value) || 1);
  const unit = $("#g-unit").value.trim() || "개";
  try {
    await api(T.goals, {
      method: "POST",
      body: [{ title, metric: "", current: 0, target, unit, owner: "함께", done: false, sort: 900 }],
    });
    $("#g-title").value = "";
    await loadAll({ quiet: true });
  } catch (err) {
    alert(`목표를 세기지 못했습니다: ${err.message}`);
  }
});

$("#goal-list")?.addEventListener("click", async (e) => {
  const step = e.target.closest("[data-goal-step]");
  const toggle = e.target.closest("[data-goal-toggle]");
  try {
    if (step) {
      const g = state.goals.find((x) => x.id === step.dataset.goalStep);
      if (!g) return;
      const next = Math.min(Number(g.target) || 1, (Number(g.current) || 0) + 1);
      step.disabled = true;
      await api(`${T.goals}?id=eq.${encodeURIComponent(g.id)}`, { method: "PATCH", body: { current: next, done: next >= (Number(g.target) || 1) ? true : g.done } });
      await loadAll({ quiet: true });
    } else if (toggle) {
      const g = state.goals.find((x) => x.id === toggle.dataset.goalToggle);
      if (!g) return;
      await api(`${T.goals}?id=eq.${encodeURIComponent(g.id)}`, { method: "PATCH", body: { done: !g.done } });
      await loadAll({ quiet: true });
    }
  } catch (err) {
    msg(`목표를 바꾸지 못했습니다: ${err.message}`, "err");
  }
});

/* ---------------- 실시간 ---------------- */

let supa = null;
let channel = null;
let pollTimer = null;
let pollMs = 6000;

function setLive(mode, extra = "") {
  state.mode = mode;
  const wrap = $("#live");
  const text = $("#live-text");
  if (!wrap || !text) return;
  wrap.classList.toggle("is-polling", mode === "polling");
  wrap.classList.toggle("is-off", mode === "off");
  text.textContent =
    mode === "realtime" ? "실시간 연결됨" :
    mode === "polling" ? `주기 동기화 · ${Math.round(pollMs / 1000)}초` :
    mode === "off" ? "연결이 끊겼습니다" : "신전에 연결하는 중…";
  if (extra) text.textContent += ` ${extra}`;
}

function startPolling(ms) {
  pollMs = ms;
  clearInterval(pollTimer);
  pollTimer = setInterval(() => loadAll({ quiet: true }), ms);
}

async function initRealtime() {
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supa = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    channel = supa.channel("pjo-live", { config: { presence: { key: crypto.randomUUID?.() || String(Math.random()) } } });

    Object.values(T).forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => loadAll({ quiet: true }));
    });
    channel.on("presence", { event: "sync" }, () => paintPresence());
    channel.on("presence", { event: "join" }, () => paintPresence());
    channel.on("presence", { event: "leave" }, () => paintPresence());

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setLive("realtime");
        channel.track({ at: Date.now() });
        startPolling(45000); // 안전망
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        setLive("polling");
        startPolling(6000);
      }
    });
  } catch (err) {
    setLive("polling");
    startPolling(6000);
  }
}

function paintPresence() {
  if (!channel) return;
  const people = Object.values(channel.presenceState() || {}).flat().length;
  const el = $("#visitors");
  if (el) el.textContent = `지금 이 신전에 ${people || 1}명`;
}

window.addEventListener("offline", () => setLive("off"));
window.addEventListener("online", () => { setLive("polling"); loadAll({ quiet: true }); initRealtime(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && (!state.syncedAt || Date.now() - state.syncedAt.getTime() > 20000)) loadAll({ quiet: true });
});

function tickClock() {
  const el = $("#clock");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }) + " · " +
    now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/* ---------------- 시작 ---------------- */

tickClock();
setInterval(tickClock, 30000);
setInterval(() => { if (state.board.length) renderBoard(); }, 60000); // 상대 시간 갱신
loadAll();
initRealtime();
