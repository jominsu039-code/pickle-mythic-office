/* ============================================================================
   고대 신화 전략비서실 · view layer
   store.js 가 만든 표준 모델만 읽어서 그립니다.
   ============================================================================ */

import {
  CFG, PROFILES, ZONES, ZONE_BY_ID, CHANNELS, state, subscribe,
  loadAll, connectRealtime, sendMessage, addMemo, setMemo,
  goalStep, goalToggle, addGoal, stats,
  esc, kstTime, dayKey, kstLongDate,
} from "./store.js?v=3.0.1";

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

/* ---------------------------------------------------------------- 조각들
   비서를 고대 신화의 신(神)으로 그립니다.
   라파엘 = 에메랄드 로브 · 금빛 월계관 · 지혜의 광륜
   수댕   = 보랏빛 별빛 로브 · 초승달 관
   상태(회의/업무/휴식/자리비움)에 따라 숨쉬기 · 둥실뜨기 · 눈깜빡임 ·
   광륜 회전 · 깃펜 끄적임 · 빛 입자가 CSS 로 움직입니다. */
const GOD_LOOK = {
  raphael: {
    robe: ["#4FB88A", "#1E7C57", "#0E4631"],
    deep: "#0B3626",
    skin: "#F7E3C5",
    hair: "#123A2B",
    trim: "#EED296",
    halo: "#9FE7C4",
    gem: "#7CE3B4",
    crown: "laurel",
    long: false,
  },
  sudaeng: {
    robe: ["#AB8DE8", "#6B4BB6", "#33235F"],
    deep: "#221641",
    skin: "#F8E5CC",
    hair: "#2A1F4C",
    trim: "#EADDFF",
    halo: "#CDBBFF",
    gem: "#DCC9FF",
    crown: "moon",
  },
};

function crownMark(look, id) {
  if (look.crown === "moon") {
    return `<g class="crown crown--moon">
      <path d="M39.8 8.4a9.4 9.4 0 1 0 0 17.6 10.9 10.9 0 0 1 0-17.6Z" fill="url(#g${id})" stroke="#8A6526" stroke-width=".3"/>
      <path d="M40.2 11.6a6.6 6.6 0 1 0 0 11.2" fill="none" stroke="#FFF4D6" stroke-width=".7" opacity=".55"/>
      <path class="crown-star" d="M26.6 11.6l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z" fill="${look.trim}"/>
      <path class="crown-star" d="M47.4 20.6l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7z" fill="${look.trim}"/>
      <path class="crown-star" d="M25.2 21.4l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z" fill="${look.trim}"/>
    </g>`;
  }
  // 월계관: 머리 위로 두 줄의 금빛 잎
  const leaves = [
    [25.4, 22.2, -34], [27.9, 19.6, -42], [30.8, 17.9, -54], [33.9, 17.1, -68],
    [46.6, 22.2, 34], [44.1, 19.6, 42], [41.2, 17.9, 54], [38.1, 17.1, 68],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="1.55" ry="2.9" transform="rotate(${r} ${x} ${y})"/>`)
    .join("");
  return `<g class="crown crown--laurel" fill="url(#g${id})" stroke="#8A6526" stroke-width=".28">
    <path d="M24.6 24.4C26.6 19.4 31 16.6 36 16.6s9.4 2.8 11.4 7.8" fill="none" stroke="url(#g${id})" stroke-width="1.5" stroke-linecap="round"/>
    ${leaves}
    <circle class="crown-glow" cx="36" cy="19.4" r="2.4" fill="${look.gem}" stroke="#FFF6DC" stroke-width=".5"/>
  </g>`;
}

function critter(a, extra = "") {
  const id = ++critterSeq;
  const look = GOD_LOOK[a.id] || GOD_LOOK.raphael;
  const st = a.status || "idle";
  const delay = `${-((id % 6) * 0.43).toFixed(2)}s`;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const t = (i * 30 * Math.PI) / 180;
    const p = (r) => [36 + Math.cos(t) * r, 27.6 + Math.sin(t) * r];
    const [x1, y1] = p(19.9);
    const [x2, y2] = p(i % 2 ? 22.4 : 24.2);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join("");
  const spark = (x, y, s, k) =>
    `<path class="spark spark--${k}" d="M${x} ${y - s}l${s * 0.34} ${s * 0.66} ${s * 0.66} ${s * 0.34}-${s * 0.66} ${s * 0.34}-${s * 0.34} ${s * 0.66}-${s * 0.34}-${s * 0.66}-${s * 0.66}-${s * 0.34} ${s * 0.66}-${s * 0.34}z" fill="${look.trim}"/>`;

  // 금빛 월계관: 뾰족한 잎을 호를 따라 배치
  const leaf = "M0 1.9C1.15 0.4 1.15-1.9 0-3.4-1.15-1.9-1.15.4 0 1.9Z";
  const leaves = [
    [25.2, 24.2, -26], [26.9, 21.6, -34], [29.2, 19.4, -46], [32.0, 17.9, -60], [34.9, 17.1, -74],
    [46.8, 24.2, 26], [45.1, 21.6, 34], [42.8, 19.4, 46], [40.0, 17.9, 60], [37.1, 17.1, 74],
  ]
    .map(([x, y, r]) => `<path d="${leaf}" transform="translate(${x} ${y}) rotate(${r})"/>`)
    .join("");

  const crown =
    look.crown === "moon"
      ? `<g class="crown crown--moon">
      <mask id="mm${id}"><rect x="0" y="0" width="72" height="84" fill="#fff"/>
        <circle cx="39.4" cy="12.4" r="5.1" fill="#000"/></mask>
      <circle cx="35.8" cy="12.4" r="5.5" fill="url(#g${id})" stroke="#8A6526" stroke-width=".35" mask="url(#mm${id})"/>
      <circle class="crown-glow" cx="36.8" cy="10.2" r="1.3" fill="${look.gem}" stroke="#FFF6DC" stroke-width=".4"/>
      <path class="crown-star" d="M26.4 11.8l.85 1.8 1.8.85-1.8.85-.85 1.8-.85-1.8-1.8-.85 1.8-.85z" fill="${look.trim}"/>
      <path class="crown-star" d="M47.6 18.4l.62 1.32 1.32.62-1.32.62-.62 1.32-.62-1.32-1.32-.62 1.32-.62z" fill="${look.trim}"/>
      <path class="crown-star" d="M25.4 19.6l.46 1 .98.46-.98.46-.46.98-.46-.98-.98-.46.98-.46z" fill="${look.trim}"/>
    </g>`
      : `<g class="crown crown--laurel" fill="url(#g${id})" stroke="#8A6526" stroke-width=".26">
      <path d="M24.8 25.2C26.4 20 30.7 17.1 36 17.1s9.6 2.9 11.2 8.1" fill="none" stroke="url(#g${id})" stroke-width="1.25" stroke-linecap="round"/>
      ${leaves}
      <circle class="crown-glow" cx="36" cy="18.9" r="2.3" fill="${look.gem}" stroke="#FFF6DC" stroke-width=".5"/>
    </g>`;

  return `<svg class="critter god ${extra}" viewBox="0 0 72 84" data-status="${st}" style="--tone:${esc(a.hex)};--delay:${delay};--bd:${delay}" data-c="${id}" aria-hidden="true">
    <defs>
      <radialGradient id="h${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${look.halo}" stop-opacity=".55"/>
        <stop offset="55%" stop-color="${look.halo}" stop-opacity=".18"/>
        <stop offset="100%" stop-color="${look.halo}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FBEBC0"/>
        <stop offset="42%" stop-color="#DFB970"/>
        <stop offset="100%" stop-color="#A97C3B"/>
      </linearGradient>
      <linearGradient id="r${id}" x1=".1" y1="0" x2=".9" y2="1">
        <stop offset="0%" stop-color="${look.robe[0]}"/>
        <stop offset="48%" stop-color="${look.robe[1]}"/>
        <stop offset="100%" stop-color="${look.robe[2]}"/>
      </linearGradient>
    </defs>
    <ellipse class="god-shadow" cx="36" cy="79.6" rx="13.4" ry="2.6" fill="rgba(28,18,6,.24)"/>
    <g class="god-float">
      <g class="halo-rays" stroke="${look.halo}" stroke-width="1" stroke-linecap="round" opacity=".55">${rays}</g>
      <circle class="halo-core" cx="36" cy="27.6" r="25" fill="url(#h${id})"/>
      <circle class="halo-ring" cx="36" cy="27.6" r="18.8" fill="none" stroke="${look.trim}" stroke-width=".9" opacity=".6"/>
      <circle class="halo-ring2" cx="36" cy="27.6" r="17.1" fill="none" stroke="${look.trim}" stroke-width=".45" opacity=".35"/>
      ${look.long === false ? "" : `<path class="hair-back" d="M23.6 27c0-7.4 5.5-12.4 12.4-12.4S48.4 19.6 48.4 27v18.6c0 2.2-2.2 3.4-4 2.3l-1.5-.9V31.4h-13v15.6l-1.5.9c-1.8 1.1-4-.1-4-2.3z" fill="${look.hair}"/>`}
      <rect x="33.4" y="39.4" width="5.2" height="6.4" rx="2.6" fill="${look.skin}"/>
      <g class="god-body">
        <path d="M36 43.2c-3.4 0-6.4 1-8.8 3.1-2.1 1.8-3.4 4.4-4 7.7L20 72.2c-.2 1.5.9 2.8 2.4 2.8h27.2c1.5 0 2.6-1.3 2.4-2.8l-3.2-18.2c-.6-3.3-1.9-5.9-4-7.7-2.4-2.1-5.4-3.1-8.8-3.1z" fill="url(#r${id})"/>
        <path d="M36 43.2c-3.4 0-6.4 1-8.8 3.1l2.6 2.2c1.9-1.3 3.9-2 6.2-2s4.3.7 6.2 2l2.6-2.2c-2.4-2.1-5.4-3.1-8.8-3.1z" fill="#FFFFFF" opacity=".16"/>
        <path d="M24.7 50.9c2.2-4.4 6.4-6.3 11.3-6.3s9.1 1.9 11.3 6.3" fill="none" stroke="${look.trim}" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>
        <path d="M31.6 43.9 36 48.7l4.4-4.8" fill="none" stroke="${look.trim}" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>
        <path d="M33.9 47.2h4.2l-1 26.6h-2.2z" fill="url(#g${id})" opacity=".95"/>
        <circle cx="36" cy="57.8" r="6.5" fill="url(#g${id})" stroke="#8A6526" stroke-width=".45"/>
        <circle cx="36" cy="57.8" r="4.9" fill="none" stroke="#FFF6DC" stroke-width=".45" opacity=".75"/>
        <text class="glyph" x="36" y="60.7" text-anchor="middle" font-size="7.2" font-family="var(--serif)" font-weight="700" fill="#4A3413">${esc(a.glyph || "·")}</text>
        <path d="M21.4 70.9c4.5 1.9 9.3 2.9 14.6 2.9s10.1-1 14.6-2.9" fill="none" stroke="${look.trim}" stroke-width="1.2" opacity=".8"/>
        <path d="M20.6 72.6c4.8 2.1 10 3.2 15.4 3.2s10.6-1.1 15.4-3.2" fill="none" stroke="${look.deep}" stroke-width="1" opacity=".35"/>
      </g>
      <rect x="17.2" y="53.4" width="6.4" height="14.6" rx="3.2" fill="url(#r${id})" transform="rotate(13 20.4 60.7)"/>
      <rect x="48.4" y="53.4" width="6.4" height="14.6" rx="3.2" fill="url(#r${id})" transform="rotate(-13 51.6 60.7)"/>
      <circle cx="18.4" cy="69.6" r="2.7" fill="${look.skin}"/>
      <circle cx="53.6" cy="69.6" r="2.7" fill="${look.skin}"/>
      <circle cx="36" cy="28.8" r="12.9" fill="${look.skin}"/>
      <path class="hair-front" d="M22.9 28.4a13.1 13.1 0 0 1 26.2 0c-2.7-4.3-7.3-6.4-13.1-6.4s-10.4 2.1-13.1 6.4z" fill="${look.hair}"/>
      <ellipse cx="22.9" cy="30.4" rx="1.8" ry="2.3" fill="${look.skin}"/>
      <ellipse cx="49.1" cy="30.4" rx="1.8" ry="2.3" fill="${look.skin}"/>
      <g class="god-face">
        <ellipse class="eye" cx="31.2" cy="29.6" rx="1.7" ry="2.1" fill="#2A2218"/>
        <ellipse class="eye" cx="40.8" cy="29.6" rx="1.7" ry="2.1" fill="#2A2218"/>
        <circle class="shine" cx="31.8" cy="28.8" r=".58" fill="#fff"/>
        <circle class="shine" cx="41.4" cy="28.8" r=".58" fill="#fff"/>
        <ellipse cx="27" cy="33.2" rx="2.1" ry="1.15" fill="#E79C9C" opacity=".42"/>
        <ellipse cx="45" cy="33.2" rx="2.1" ry="1.15" fill="#E79C9C" opacity=".42"/>
        <path d="M34 34.6c1.25 1.15 2.75 1.15 4 0" fill="none" stroke="#96664C" stroke-width=".9" stroke-linecap="round"/>
      </g>
      ${crown}
      <g class="quill">
        <path d="M54.2 63.8c1.6 2 3.4 3 5.4 3.2-1.4-1.9-2.2-3.9-2.6-6-1.2.6-2.1 1.6-2.8 2.8z" fill="${look.trim}" stroke="#8A6526" stroke-width=".3"/>
        <path d="M53.6 68.6 58.9 63" stroke="#8A5A44" stroke-width=".9" stroke-linecap="round"/>
        <path d="M56.2 65.9l2.2-.5M57.3 64.7l2.2-.4" stroke="#FFF6DC" stroke-width=".4" opacity=".8"/>
      </g>
      <g class="god-zzz" fill="${look.trim}" font-family="var(--serif)" font-weight="700">
        <text x="50" y="18" font-size="5">z</text>
        <text x="53" y="13" font-size="6">z</text>
      </g>
      ${spark(54, 30, 2.6, "a")}${spark(18, 36, 2.1, "b")}${spark(48, 46, 1.8, "c")}
    </g>
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

/* ---------------------------------------------------------------- 지도
   매 6초 백업 동기화마다 innerHTML 을 통째로 갈아치우면 캐릭터 애니메이션이
   끊기므로, 구성원·좌석이 그대로면 상태만 갱신해 살아 움직임을 이어 간다. */
function mapSignature() {
  return state.assistants
    .map((a) => [a.id, a.name, a.glyph, a.zone, a.seat.x, a.seat.y].join(","))
    .join("|");
}

function patchSeats(host) {
  for (const a of state.assistants) {
    const seat = host.querySelector(`.seat[data-agent="${CSS.escape(a.id)}"]`);
    if (!seat) continue;
    const label = `${a.name} · ${STATE_META[a.status]?.label || ""}`;
    if (seat.dataset.status !== a.status) {
      seat.dataset.status = a.status;
      seat.setAttribute("aria-label", label);
      const god = seat.querySelector(".god");
      if (god) god.dataset.status = a.status;
      const st = seat.querySelector(".state");
      const m = STATE_META[a.status] || STATE_META.idle;
      if (st) {
        st.title = m.label;
        st.innerHTML = `<svg class="ic" viewBox="0 0 24 24"><use href="#i-${m.icon}"/></svg>`;
      }
    }
  }
}

function renderMap(host) {
  if (!host) return;
  const sig = host.id + "|" + mapSignature();
  if (host.dataset.sig === sig && host.querySelector(".seat")) {
    patchSeats(host);
    return;
  }
  host.dataset.sig = sig;
  const zonesHtml = ZONES.map(
    (z) => `<span class="zone-label" style="--x:${z.label.x};--y:${z.label.y}">
      <svg class="ic" viewBox="0 0 24 24"><use href="#i-${z.icon}"/></svg><span class="full">${esc(z.name)}</span><span class="short">${esc(z.short || z.name)}</span>
    </span>`
  ).join("");

  const byZone = {};
  for (const a of state.assistants) (byZone[a.zone] = byZone[a.zone] || []).push(a);

  const seatsHtml = state.assistants
    .map(
      (a) => `<button type="button" class="seat" style="--x:${a.seat.x};--y:${a.seat.y}" data-agent="${esc(a.id)}" data-status="${esc(a.status)}" aria-label="${esc(a.name)} · ${esc(STATE_META[a.status]?.label || "")}">
        <span class="critter-wrap">
          ${critter(a)}
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
        : `<span class="reserve" style="--x:${s.x};--y:${s.y}" title="${esc(s.label || "예비 자리")}" aria-hidden="true">
             <svg class="ic" viewBox="0 0 24 24"><use href="#i-plus"/></svg>
             <i class="rlabel">${esc(s.label || "예비 자리")}</i>
           </span>`
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
      (a) => `<span class="mini-ava" title="${esc(a.name)} · ${esc(STATE_META[a.status]?.label || "")}">${critter(a)}</span>`
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
    <span class="sb-item">출근 <b>${s.present}명</b></span>
    <span class="sb-time">${now.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })}</span>`;
}

function renderLegend() {
  const host = $("#zoneLegend");
  if (!host) return;
  host.innerHTML = ZONES.map((z) => {
    const people = state.assistants.filter((a) => a.zone === z.id);
    const free = (z.reserve || []).filter((s) => !people.some((p) => p.seat.x === s.x && p.seat.y === s.y)).length;
    const who = people.length
      ? people.map((a) => `<span class="who"><i class="zdot" style="background:${esc(a.hex)}"></i>${esc(a.name)}</span>`).join("")
      : `<span class="who">자리 비어 있음</span>`;
    return `<div class="zrow"><svg class="ic" viewBox="0 0 24 24"><use href="#i-${z.icon}"/></svg><b>${esc(z.name)}</b>${who}${free ? `<span class="who"><i class="zdot" style="background:#D8C7A4"></i>예비석 ${free}</span>` : ""}</div>`;
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
  const sm = $("#sideMemos");
  if (sm) {
    const memos = state.memos.slice(0, 2);
    sm.innerHTML = memos.length
      ? memos
          .map(
            (m) => `<li><span class="k">${esc(MEMO_KIND[m.kind] || m.kind)}${m.pinned ? " · 고정" : ""}</span><span class="t">${esc(m.headline || m.body).slice(0, 46)}</span></li>`
          )
          .join("")
      : `<li><span class="t">아직 기록이 없습니다</span></li>`;
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

let renderSig = "";
function stateSignature() {
  const list = state.allMessages || [];
  return [
    state.assistants.map((a) => [a.id, a.status, a.task, a.focus].join(",")).join("|"),
    state.tasks.map((t) => [t.id, t.status, t.progress].join(",")).join("|"),
    state.goals.map((g) => [g.id, g.current, g.done].join(",")).join("|"),
    state.memos.map((m) => [m.id, m.done, m.pinned].join(",")).join("|"),
    list.length,
    list.length ? list[list.length - 1].at : "",
  ].join("#");
}

function renderAll(force = false) {
  renderLivePill();
  const sig = stateSignature();
  // subscribe() 는 fn(state) 로 부르므로 인자를 그대로 믿지 않는다.
  const forced = force === true;
  if (!forced && sig === renderSig) {
    // 새 데이터가 없는 백업 동기화: 캐릭터 애니메이션을 끊지 않도록 그대로 둔다.
    renderStatusbar();
    renderChatHead();
    return;
  }
  renderSig = sig;
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
  if (tl.scrollHeight > tl.clientHeight + 4) {
    tl.scrollTo({ top: tl.scrollHeight, behavior: "smooth" });
    return;
  }
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
/* 스플래시: 첫 데이터가 도착하면 신전의 문을 연다 */
function closeSplash() {
  const s = document.getElementById("splash");
  if (!s || s.classList.contains("is-done")) return;
  s.classList.add("is-done");
  setTimeout(() => s.remove(), 800);
}

subscribe(renderAll);
loadAll()
  .then(() => {
    renderAll(true);
  })
  .catch(() => {})
  .finally(() => setTimeout(closeSplash, 240));
setTimeout(closeSplash, 5200);
connectRealtime();
setInterval(() => {
  renderLivePill();
  renderStatusbar();
  if (activeTab === "chat") renderChatHead();
}, 30000);

/* 지도 메모 문구 */
const note = $("#mapNote");
if (note) note.textContent = "아바타는 실제 DB 상태를 실시간으로 다시 읽습니다(6초 백업 동기화). 점선 원은 아직 비어 있는 예비 자리입니다. 캐릭터를 누르면 지금 하는 일을 볼 수 있습니다.";
