/* ============================================================================
   고대 신화 전략비서실 · view layer
   store.js 가 만든 표준 모델만 읽어서 그립니다.
   ============================================================================ */

import {
  CFG, PROFILES, ZONES, ZONE_BY_ID, CHANNELS, state, subscribe,
  loadAll, connectRealtime, sendMessage, addMemo, setMemo,
  goalStep, goalToggle, addGoal, stats,
  esc, kstTime, dayKey, kstLongDate,
} from "./store.js?v=2.0.3";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let activeTab = "chat";
let activeChannel = "grand";
let senderAs = "chominsu";
let critterSeq = 0;

const STATE_META = {
  meeting: { icon: "crown", label: "회의 중" },
  working: { icon: "quill", label: "업무 중" },
  idle: { icon: "coffee", label: "휴식" },
  offline: { icon: "moon", label: "자리 비움" },
};
const MEMO_KIND = { note: "메모", agenda: "안건", decision: "결정", log: "기록", oracle: "신탁" };
const CH_NAME = Object.fromEntries(CHANNELS.map((c) => [c.id, c.name]));

/* ---------------------------------------------------------------- 조각들 */
function critter(a, extra = "") {
  const id = ++critterSeq;
  return `<svg class="critter ${extra}" viewBox="0 0 64 68" style="--tone:${esc(a.hex)}" data-c="${id}" aria-hidden="true">
    <ellipse cx="32" cy="63.5" rx="16" ry="3.2" fill="rgba(28,18,6,.22)"/>
    <path class="body" d="M32 3.5c15.2 0 24.5 10.4 24.5 27.2C56.5 49 47 60.9 32 60.9S7.5 49 7.5 30.7C7.5 13.9 16.8 3.5 32 3.5Z"/>
    <ellipse class="gloss" cx="23" cy="14.5" rx="8.6" ry="6" transform="rotate(-20 23 14.5)"/>
    <circle class="eye" cx="24.6" cy="25.6" r="2.8"/>
    <circle class="eye" cx="39.4" cy="25.6" r="2.8"/>
    <circle class="shine" cx="25.7" cy="24.4" r=".9"/>
    <circle class="shine" cx="40.5" cy="24.4" r=".9"/>
    <text class="glyph" x="32" y="44.5" text-anchor="middle" font-size="14">${esc(a.glyph || "·")}</text>
    <path d="M52.5 12.5l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z" fill="rgba(255,255,255,.55)"/>
  </svg>`;
}

function stateIcon(a) {
  const m = STATE_META[a.status] || STATE_META.idle;
  return `<span class="state" title="${m.label}"><svg class="ic" viewBox="0 0 24 24"><use href="#i-${m.icon}"/></svg></span>`;
}

function ago(iso) {
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function dateLabel(iso) {
  const key = dayKey(iso);
  const [y, m, d] = key.split("-");
  const wd = new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", weekday: "long" });
  return `${y}.${m}.${d} ${wd}`;
}

/* ---------------------------------------------------------------- 지도 */
function renderMap(host) {
  if (!host) return;
  const zonesHtml = ZONES.map(
    (z) => `<span class="zone-label" style="--x:${z.label.x};--y:${z.label.y}">
      <svg class="ic" viewBox="0 0 24 24"><use href="#i-${z.icon}"/></svg>${esc(z.name)}
    </span>`
  ).join("");

  const byZone = {};
  for (const a of state.assistants) (byZone[a.zone] = byZone[a.zone] || []).push(a);

  const seatsHtml = state.assistants
    .map(
      (a) => `<button type="button" class="seat" style="--x:${a.seat.x};--y:${a.seat.y}" data-agent="${esc(a.id)}" aria-label="${esc(a.name)} · ${esc(STATE_META[a.status]?.label || "")}">
        <span class="critter-wrap">
          <span class="bob">${critter(a)}</span>
          ${stateIcon(a)}
        </span>
        <span class="nameplate">${esc(a.name)}</span>
      </button>`
    )
    .join("");

  const taken = new Set(state.assistants.map((a) => `${a.seat.x},${a.seat.y}`));
  const reserveHtml = ZONES.flatMap((z) =>
    (z.reserve || []).map((s) =>
      taken.has(`${s.x},${s.y}`)
        ? ""
        : `<span class="reserve" style="--x:${s.x};--y:${s.y}" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24"><use href="#i-plus"/></svg></span>`
    )
  ).join("");

  host.innerHTML = `
    <picture>
      <source srcset="assets/temple-office.webp" type="image/webp" />
      <img src="assets/temple-office.jpg" alt="고대 신화 신전 평면도 오피스 — 올림포스 대회의실, 델포이 소회의실, 아고라 작업실, 암브로시아 다실, 신전 라운지" />
    </picture>
    <div class="map-layer">${zonesHtml}${reserveHtml}${seatsHtml}</div>`;
}

/* ---------------------------------------------------------------- 회의실 */
function renderChannels() {
  const host = $("#chanbar");
  if (!host) return;
  host.innerHTML = CHANNELS.map(
    (c) => `<button type="button" class="chan ${c.id === activeChannel ? "is-on" : ""}" role="tab" aria-selected="${c.id === activeChannel}" data-chan="${c.id}">
      <svg class="ic" viewBox="0 0 24 24"><use href="#i-${c.id === "exec" ? "leaf" : c.id === "command" ? "bolt" : "chat"}"/></svg>${c.name}
    </button>`
  ).join("");
}

function renderChatHead() {
  const host = $("#chathead");
  if (!host) return;
  const s = stats();
  const chName = CH_NAME[activeChannel];
  const avatars = state.assistants
    .map(
      (a) => `<span class="mini-ava" style="background:${esc(a.hex)}22;color:${esc(a.hex)}" title="${esc(a.name)} · ${esc(STATE_META[a.status]?.label || "")}">
        <span>${esc(a.glyph)}</span></span>`
    )
    .join("");
  host.innerHTML = `
    <p class="on-line">${esc(chName)} · ON ${s.present}명</p>
    <div class="roster">
      <span class="avastack">${avatars}</span>
      <span class="roster-txt">가동 <b>${s.working + s.meeting}</b> · 연동 대기 <b>${s.unlinked}</b> · 오늘 보고 <b>${s.reportsToday}건</b></span>
    </div>`;
}

function bubbleInner(m) {
  const parts = [];
  if (m.text) parts.push(`<p class="lead">${esc(m.text)}</p>`);
  if (m.metrics?.length) {
    parts.push(
      `<div class="metrics">${m.metrics
        .map((x) => `<div class="metric"><b>${esc(x.v ?? x.value ?? "")}</b><span>${esc(x.l ?? x.label ?? "")}</span></div>`)
        .join("")}</div>`
    );
  }
  if (m.bullets?.length) {
    parts.push(`<ul class="bullets">${m.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`);
  }
  return parts.join("");
}

function renderTimeline() {
  const host = $("#timeline");
  if (!host) return;
  const list = (state.allMessages || []).filter((m) => (m.ch || "grand") === activeChannel);
  const chName = CH_NAME[activeChannel];

  let html = "";
  let lastDay = "";
  for (const m of list) {
    const day = dayKey(m.at);
    if (day !== lastDay) {
      html += `<div class="datechip">${dateLabel(m.at)}</div>`;
      if (lastDay === "") {
        html += `<div class="syschip">${esc(chName)} · 실시간 보고 채널 · ${kstTime(Date.now())} 기준</div>`;
      }
      lastDay = day;
    }
    if (m.side === "system") {
      html += `<div class="msg msg--sys"><div class="msg-col" style="max-width:94%">
        <div class="syschip tag">${esc(m.tag || "연동 기록")} · ${kstTime(m.at)} · ${esc(m.text)}</div>
      </div></div>`;
      continue;
    }
    if (m.side === "user") {
      html += `<article class="msg msg--me ${m.pending ? "pending" : ""} ${m.failed ? "failed" : ""}">
        <div class="msg-col">
          <div class="msg-meta"><b>${esc(m.authorName)}</b><time>${kstTime(m.at)}</time></div>
          <div class="bubble">${bubbleInner(m)}</div>
        </div>
      </article>`;
      continue;
    }
    const a = state.assistants.find((x) => x.id === m.authorId) || { hex: "#8C6A3D", glyph: "·", badge: "비서" };
    html += `<article class="msg msg--bot ${m.pending ? "pending" : ""}">
      <span class="msg-ava">${critter(a)}</span>
      <div class="msg-col">
        <div class="msg-meta"><b>${esc(a.name || m.authorName)}</b><span class="msg-role">${esc(a.badge || "비서")}</span><time>${kstTime(m.at)}</time></div>
        <div class="bubble">${bubbleInner(m)}</div>
      </div>
    </article>`;
  }

  if (!list.length) {
    html = `<div class="datechip">${dateLabel(new Date().toISOString())}</div>
      <div class="syschip">${esc(chName)} · 아직 남긴 보고가 없습니다</div>
      <div class="msg msg--sys"><div class="msg-col"><div class="syschip">아래 입력창에 지시를 남기면 이 방에 그대로 기록됩니다.</div></div></div>`;
  }
  host.innerHTML = html;

  const hint = $("#composerHint");
  if (hint) hint.textContent = `${chName} · Enter 전송 / Shift+Enter 줄바꿈`;
}

/* ---------------------------------------------------------------- 작업실 */
function renderStatusbar() {
  const host = $("#statusbar");
  if (!host) return;
  const s = stats();
  const now = new Date();
  host.innerHTML = `
    <span class="sb-item"><svg class="ic" viewBox="0 0 24 24"><use href="#i-crown"/></svg>회의 중 <b>${s.meeting}</b></span>
    <span class="sb-sep"></span>
    <span class="sb-item"><svg class="ic" viewBox="0 0 24 24"><use href="#i-quill"/></svg>업무 중 <b>${s.working}</b></span>
    <span class="sb-sep"></span>
    <span class="sb-item"><svg class="ic" viewBox="0 0 24 24"><use href="#i-coffee"/></svg>휴식 <b>${s.resting}</b></span>
    <span class="sb-sep"></span>
    <span class="sb-item">출근 <b>${s.present}</b>명</span>
    <span class="sb-time">${now.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })}</span>`;
}

function renderLegend() {
  const host = $("#zoneLegend");
  if (!host) return;
  host.innerHTML = ZONES.map((z) => {
    const people = state.assistants.filter((a) => a.zone === z.id);
    const who = people.length
      ? people.map((a) => `<span class="who"><i class="zdot" style="background:${esc(a.hex)}"></i>${esc(a.name)}</span>`).join("")
      : `<span class="who">자리 비어 있음</span>`;
    return `<div class="zrow"><svg class="ic" viewBox="0 0 24 24"><use href="#i-${z.icon}"/></svg><b>${esc(z.name)}</b>${who}</div>`;
  }).join("");
}

function renderTasks() {
  const host = $("#taskGrid");
  const count = $("#taskCount");
  if (!host) return;
  const open = state.tasks.filter((t) => t.status !== "done");
  if (count) count.textContent = `진행 ${open.length}건 · 완료 ${state.tasks.length - open.length}건`;
  if (!state.tasks.length) {
    host.innerHTML = `<p class="syschip">아직 올라온 작업이 없습니다.</p>`;
    return;
  }
  host.innerHTML = state.tasks
    .map((t) => {
      const owner = state.assistants.find((a) => a.id === t.owner);
      const tone = owner?.hex || "#C59B4A";
      const label = { active: "진행", waiting: "대기", paused: "보류", done: "완료" }[t.status] || t.status;
      return `<article class="task" style="--tone:${esc(tone)}">
        <div class="task-top">
          <span class="task-title">${esc(t.title)}</span>
          ${t.progress != null ? `<span class="task-pct">${t.progress}%</span>` : ""}
        </div>
        ${t.detail ? `<p class="task-detail">${esc(t.detail)}</p>` : ""}
        <div class="task-foot">
          <span class="pill ${t.status === "done" ? "done" : ""}">${label}</span>
          ${owner ? `<span class="pill" style="color:${esc(tone)};border-color:${esc(tone)}44">${esc(owner.glyph)} ${esc(owner.name)}</span>` : ""}
          ${t.source === "partner" ? `<span class="pill partner">수댕 측</span>` : ""}
          <span class="bar"><i style="width:${t.progress ?? (t.status === "done" ? 100 : 15)}%"></i></span>
        </div>
      </article>`;
    })
    .join("");
}

/* ---------------------------------------------------------------- 비서현황 */
function renderTeam() {
  const host = $("#teamGrid");
  if (!host) return;
  const s = stats();
  host.innerHTML = state.assistants
    .map((a) => {
      const tasks = state.tasks.filter((t) => t.owner === a.id && t.status !== "done").slice(0, 3);
      const reports = (state.allMessages || []).filter((m) => m.authorId === a.id && m.side === "assistant").length;
      const linked = a.linked ? `<span class="pill partner">수댕 비서실 연동</span>` : `<span class="pill">연동 대기</span>`;
      return `<article class="agentcard" style="--tone:${esc(a.hex)}">
        <div class="agent-top">
          <div class="medallion" style="--energy:${Math.max(0, Math.min(100, Number(a.energy) || 80))};--tone:${esc(a.hex)}">
            <span class="ring" aria-hidden="true"></span>
            ${critter(a)}
          </div>
          <div style="min-width:0">
            <h3 class="agent-name">${esc(a.name)}<span class="lvl">LV.${Number(a.level) || 1}</span></h3>
            <p class="agent-role">${esc(a.role)}${a.owner ? ` · ${esc(a.owner)} 님` : ""}</p>
          </div>
        </div>
        <p class="agent-status"><svg class="ic" viewBox="0 0 24 24"><use href="#i-${STATE_META[a.status]?.icon || "quill"}"/></svg><span>${esc(a.task || a.focus || "자리를 지키는 중")}</span></p>
        ${a.focus ? `<p class="agent-focus">${esc(a.focus)}</p>` : ""}
        <div class="agent-meta">
          <span class="pill">${esc(a.ownerHandle || "")}</span>
          <span class="pill">${esc(a.owner)} 님 소속</span>
          ${linked}
          <span class="pill">보고 ${reports}건</span>
          <span class="pill">오늘 ${s.reportsToday}건 중</span>
        </div>
        ${tasks.length
          ? `<ul class="agent-tasks">${tasks
              .map(
                (t) => `<li><span class="bar"><i style="width:${t.progress ?? 30}%;background:${esc(a.hex)}"></i></span><span style="flex:1">${esc(t.title)}</span><b style="font-size:10px;color:#94805F">${t.progress != null ? t.progress + "%" : ""}</b></li>`
              )
              .join("")}</ul>`
          : `<p class="agent-focus">배정된 작업이 없습니다.</p>`}
      </article>`;
    })
    .join("");
}

function renderGoals() {
  const host = $("#goalList");
  if (!host) return;
  if (!state.goals.length) {
    host.innerHTML = `<p class="syschip">아직 목표가 없습니다. 아래에서 첫 목표를 세워 보세요.</p>`;
    return;
  }
  host.innerHTML = state.goals
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
          <button type="button" class="btn" data-goal-step="${esc(g.id)}" ${pct >= 100 ? "disabled" : ""}><svg class="ic" viewBox="0 0 24 24"><use href="#i-plus"/></svg>1</button>
          <button type="button" class="btn ${g.done ? "gold" : ""}" data-goal-toggle="${esc(g.id)}">${g.done ? "달성 취소" : "달성"}</button>
        </div>
        <p class="goal-owner" style="margin:8px 0 0;font-size:10px;color:#94805F">${esc(g.owner || "함께")} · ${pct}%</p>
      </article>`;
    })
    .join("");
}

/* ---------------------------------------------------------------- 메모 */
function renderMemos() {
  const host = $("#memoList");
  if (!host) return;
  if (!state.memos.length) {
    host.innerHTML = `<p class="syschip">아직 기록이 없습니다. 첫 문장을 남겨 보세요.</p>`;
    return;
  }
  host.innerHTML = state.memos
    .map(
      (p) => `<article class="memo ${p.pinned ? "is-pinned" : ""} ${p.done ? "is-done" : ""}">
        <div class="memo-head">
          <span class="memo-kind ${esc(p.kind)}">${esc(MEMO_KIND[p.kind] || p.kind)}</span>
          ${p.pinned ? `<span class="pinmark"><svg class="ic" viewBox="0 0 24 24" style="width:11px;height:11px"><use href="#i-pin"/></svg></span>` : ""}
          <span class="memo-who">${esc(p.authorName)} · ${ago(p.at)}</span>
        </div>
        ${p.headline ? `<h3>${esc(p.headline)}</h3>` : ""}
        <p>${esc(p.body)}</p>
        <div class="memo-foot">
          <label><input type="checkbox" data-memo-done="${esc(p.id)}" ${p.done ? "checked" : ""} /> 처리됨</label>
          <span>${kstTime(p.at)}</span>
        </div>
      </article>`
    )
    .join("");
}

function renderSide() {
  const s = stats();
  const st = $("#sideStats");
  if (st) {
    st.innerHTML = `
      <li><span>업무 중</span><b>${s.working}</b></li>
      <li><span>회의 중</span><b>${s.meeting}</b></li>
      <li><span>휴식</span><b>${s.resting}</b></li>
      <li><span>오늘 보고</span><b>${s.reportsToday}건</b></li>`;
  }
  const sk = $("#sideTasks");
  if (sk) {
    const rows = state.tasks.filter((t) => t.status !== "done").slice(0, 5);
    sk.innerHTML = rows.length
      ? rows
          .map((t) => {
            const owner = state.assistants.find((a) => a.id === t.owner);
            return `<li><i class="zdot" style="background:${esc(owner?.hex || "#C59B4A")}"></i>
              <span class="t">${esc(t.title)}</span>
              <b>${t.progress != null ? t.progress + "%" : ""}</b></li>`;
          })
          .join("")
      : `<li><span class="t">진행 중인 작업이 없습니다</span></li>`;
  }
}

/* ---------------------------------------------------------------- 전체 */
function renderLivePill() {
  const pill = $("#livePill");
  const txt = $("#liveText");
  if (!pill || !txt) return;
  const sb = state.conn.supabase;
  const pt = state.conn.partner;
  if (sb === "live" && pt === "live") {
    pill.dataset.state = "live";
    txt.textContent = "실시간 보고망 가동";
  } else if (sb === "live") {
    pill.dataset.state = "polling";
    txt.textContent = "보고망 가동 · 수댕 연동 확인 중";
  } else if (sb === "stale" || sb === "down") {
    pill.dataset.state = "down";
    txt.textContent = "동기화 재시도 중";
  } else {
    pill.dataset.state = "polling";
    txt.textContent = "실시간 보고망 연결 중";
  }
  const sync = $("#lastSync");
  if (sync && state.syncedAt) sync.textContent = `마지막 동기화 ${kstTime(state.syncedAt)}`;
}

function renderAll() {
  renderLivePill();
  renderChannels();
  renderChatHead();
  renderTimeline();
  renderMap($("#mapStage"));
  renderMap($("#miniStage"));
  renderStatusbar();
  renderLegend();
  renderTasks();
  renderTeam();
  renderGoals();
  renderMemos();
  renderSide();
}

/* ---------------------------------------------------------------- 상세 시트 */
function openSheet(id) {
  const a = state.assistants.find((x) => x.id === id);
  if (!a) return;
  const zone = ZONE_BY_ID[a.zone];
  const tasks = state.tasks.filter((t) => t.owner === a.id);
  const reports = (state.allMessages || []).filter((m) => m.authorId === a.id);
  $("#sheetCard").innerHTML = `
    <div class="sheet-grab"></div>
    <div class="sheet-top">
      ${critter(a)}
      <div>
        <h3 class="sheet-name">${esc(a.name)} <span style="font-size:12px;color:#94805F">${esc(a.glyph)}</span></h3>
        <p class="sheet-role">${esc(a.role)} · ${esc(a.ownerHandle || "")}</p>
      </div>
      <button type="button" class="sheet-close" data-close-sheet aria-label="닫기"><svg class="ic" viewBox="0 0 24 24"><use href="#i-close"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="sheet-row"><span class="k">지금</span><span>${esc(a.task || "—")}</span></div>
      <div class="sheet-row"><span class="k">자리</span><span>${esc(zone?.name || "")} · ${esc(STATE_META[a.status]?.label || "")}</span></div>
      <div class="sheet-row"><span class="k">오늘의 초점</span><span>${esc(a.focus || "—")}</span></div>
      <div class="sheet-row"><span class="k">연동</span><span>${a.linked ? "수댕 비서실 실시간 연동 중" : "아직 상대 비서실과 연결되지 않았습니다"}</span></div>
      <div class="sheet-row"><span class="k">보고</span><span>${reports.length}건 · 마지막 ${reports.length ? ago(reports[reports.length - 1].at) : "—"}</span></div>
      <ul class="sheet-tasklist">
        ${tasks.length
          ? tasks
              .map(
                (t) => `<li><div class="t"><span>${esc(t.title)}</span><b>${t.progress != null ? t.progress + "%" : ""}</b></div>
                ${t.detail ? `<div style="font-size:10.5px;color:#8C7B62;margin-top:3px">${esc(t.detail)}</div>` : ""}</li>`
              )
              .join("")
          : `<li style="color:#8C7B62">배정된 작업이 없습니다.</li>`}
      </ul>
    </div>`;
  $("#sheet").hidden = false;
}
function closeSheet() {
  $("#sheet").hidden = true;
}

/* ---------------------------------------------------------------- 탭/이벤트 */
function switchTab(tab) {
  activeTab = tab;
  $$(".tab").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-selected", String(on));
  });
  $$("[data-panel]").forEach((p) => {
    const on = p.dataset.panel === tab;
    p.classList.toggle("is-on", on);
    p.hidden = !on;
  });
  window.scrollTo(0, 0);
  if (tab === "chat") scrollTimeline();
}

function scrollTimeline() {
  const tl = $("#timeline");
  if (!tl) return;
  const y = tl.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
  if (y > window.scrollY) window.scrollTo({ top: y + 12, behavior: "smooth" });
}

function bind() {
  $$(".tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) switchTab(go.dataset.goto);
  });

  $("#chanbar")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-chan]");
    if (!b) return;
    activeChannel = b.dataset.chan;
    renderChannels();
    renderChatHead();
    renderTimeline();
  });

  $("#mapStage")?.addEventListener("click", (e) => {
    const s = e.target.closest(".seat");
    if (s) openSheet(s.dataset.agent);
  });
  $("#miniStage")?.addEventListener("click", (e) => {
    const s = e.target.closest(".seat");
    if (s) openSheet(s.dataset.agent);
  });
  $("#sheet")?.addEventListener("click", (e) => {
    if (e.target.id === "sheet" || e.target.closest("[data-close-sheet]")) closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });

  $("#zoomBtn")?.addEventListener("click", (e) => {
    const card = $(".mapcard");
    const on = !card.classList.contains("zoomed");
    card.classList.toggle("zoomed", on);
    e.currentTarget.setAttribute("aria-pressed", String(on));
    e.currentTarget.querySelector("span").textContent = on ? "축소" : "확대";
  });

  /* 입력창 */
  const input = $("#msgInput");
  const composer = $("#composer");
  input?.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(110, input.scrollHeight)}px`;
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      composer.requestSubmit();
    }
  });
  composer?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const btn = composer.querySelector(".send");
    btn.disabled = true;
    const res = await sendMessage({ text, ch: activeChannel, as: senderAs === "parkjuna" ? "juna" : "minsu" });
    input.value = "";
    input.style.height = "auto";
    btn.disabled = false;
    if (!res.ok) {
      const hint = $("#composerHint");
      if (hint) hint.textContent = `보내지 못했습니다: ${res.error}`;
    }
    renderTimeline();
    scrollTimeline();
  });
  $("#whoBtn")?.addEventListener("click", (e) => {
    senderAs = senderAs === "chominsu" ? "parkjuna" : "chominsu";
    e.currentTarget.textContent = senderAs === "chominsu" ? "조민수" : "박준아";
  });

  /* 목표 */
  $("#goalForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#goalTitle").value.trim();
    if (!title) return;
    const target = Math.max(1, Number($("#goalTarget").value) || 1);
    const unit = $("#goalUnit").value.trim() || "개";
    $("#goalTitle").value = "";
    await addGoal({ title, target, unit });
  });
  $("#goalList")?.addEventListener("click", async (e) => {
    const step = e.target.closest("[data-goal-step]");
    const toggle = e.target.closest("[data-goal-toggle]");
    const goal = state.goals.find((g) => g.id === (step?.dataset.goalStep || toggle?.dataset.goalToggle));
    if (!goal) return;
    if (step) await goalStep(goal);
    else await goalToggle(goal);
  });

  /* 메모 */
  $("#memoForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = $("#memoBody").value.trim();
    const msg = $("#memoMsg");
    if (!body) return;
    const btn = $("#memoSend");
    btn.disabled = true;
    msg.className = "formmsg";
    msg.textContent = "기록하는 중…";
    try {
      await addMemo({
        headline: $("#memoHeadline").value.trim(),
        body,
        kind: $("#memoKind").value,
        pinned: $("#memoPin").checked,
        authorId: "chominsu",
        authorName: "조민수",
      });
      $("#memoHeadline").value = "";
      $("#memoBody").value = "";
      $("#memoPin").checked = false;
      msg.textContent = "신탁 게시판에 새겼습니다.";
      setTimeout(() => { if (msg.textContent === "신탁 게시판에 새겼습니다.") msg.textContent = ""; }, 4000);
    } catch (err) {
      msg.className = "formmsg err";
      msg.textContent = `올리지 못했습니다: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  });
  $("#memoList")?.addEventListener("change", async (e) => {
    const box = e.target.closest("[data-memo-done]");
    if (!box) return;
    try {
      await setMemo(box.dataset.memoDone, { done: box.checked });
    } catch {
      box.checked = !box.checked;
    }
  });
}

/* ---------------------------------------------------------------- 시작 */
function bootPreview() {
  const pv = new URLSearchParams(location.search).get("pv");
  if (pv === "mobile") document.documentElement.classList.add("pv-mobile");
}

bootPreview();
bind();
renderChannels();
renderTimeline();
subscribe(renderAll);
loadAll().then(() => {
  renderAll();
});
connectRealtime();
setInterval(() => {
  renderLivePill();
  renderStatusbar();
  if (activeTab === "chat") renderChatHead();
}, 30000);

/* 지도 메모 문구 */
const note = $("#mapNote");
if (note) note.textContent = "아바타는 실제 DB 상태를 6초마다 다시 읽습니다. 점선 원은 아직 비어 있는 예비 자리입니다. 캐릭터를 누르면 지금 하는 일을 볼 수 있습니다.";
