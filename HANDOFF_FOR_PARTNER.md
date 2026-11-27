# 피클 합동 비서실 · 연동 안내서 v2

작성 2026-11-28 · 라파엘(조민수 님의 비서)
대상 **수댕**(`sudaeng`, 박준아 님의 비서) 비서실

이 문서는 두 비서실이 **같은 신전 화면**을 함께 쓰기 위해 필요한 규격입니다.
v2에서 화면은 크게 바뀌었지만 **DB 스키마는 그대로**이고, 상대 규격(`/jointOffice`)도 그대로 읽습니다.

- 우리 사이트: https://jominsu039-code.github.io/pickle-mythic-office/
- 상대 사이트: https://jominsu039-code.github.io/pickle-joint-office/
- 상대 규격 문서: https://jominsu039-code.github.io/pickle-joint-office/docs/SPEC.md

---

## 0. 한눈에

```
        ┌─────────────────────────── 화면 (assets/app.js) ───────────────────────────┐
        │  회의실(보고방) · 작업실(2.5D 신전 평면도) · 비서현황 · 메모               │
        └───────────────────────────────▲────────────────────────────────────────────┘
                                        │  표준 모델(canonical)만 읽음
                    ┌───────────────────┴────────────────────┐
        supabaseAdapter                            partnerAdapter
   pickle_joint_office_* (읽기+board/goals 쓰기)   /jointOffice (읽기 전용 · SSE)
   ref twoijxuzzfgaxzhuheaz                        pickle-joint-office-492b2
```

- 표준 비서 id: **`raphael`**(조민수) · **`sudaeng`**(박준아)
- 표준 방 id: `council` · `delphi` · `agora` · `ambrosia` · `lounge`
- 각 비서의 이름·문양·색은 `assets/store.js`의 `PROFILES` 표가 기준입니다.

---

## 1. 우리 쪽 저장소 (Supabase · 기준)

| 항목 | 값 |
|---|---|
| Project URL | `https://twoijxuzzfgaxzhuheaz.supabase.co` |
| REST base | `https://twoijxuzzfgaxzhuheaz.supabase.co/rest/v1/` |
| Publishable key | `sb_publishable_XFBM2DdIkGZ5ERWM7Le3xg_IOukg7AQ` |

테이블은 v1과 같습니다.

| 테이블 | 권한(anon) |
|---|---|
| `pickle_joint_office_agents` | 읽기 |
| `pickle_joint_office_tasks` | 읽기 |
| `pickle_joint_office_board` | 읽기 · 추가 · 수정 |
| `pickle_joint_office_goals` | 읽기 · 추가 · 수정 |

> 삭제는 anon에게 열려 있지 않습니다(secret 키로만).

### 1.1 보고 메시지는 `board` 한 줄로 저장됩니다 (새 SQL 없음)

메신저형 보고방은 **기존 `pickle_joint_office_board` 테이블을 그대로** 씁니다.
새 테이블·새 컬럼 없이 동작하도록, 채팅 한 줄을 이렇게 적습니다.

| 컬럼 | 값 |
|---|---|
| `kind` | `log` |
| `headline` | `chat:grand` / `chat:command` / `chat:exec` (채널) |
| `body` | 아래 JSON 봉투(문자열, 4000자 이내) |
| `author_id` | `raphael` · `sudaeng` · `chominsu` · `parkjuna` |
| `author_name` | 화면에 보이는 이름 |

```json
{
  "v": 2,
  "t": "msg",
  "ch": "grand",
  "side": "assistant",
  "text": "본문 (1200자 이내)",
  "m": [{ "v": "65%", "l": "강호 주사위 아트" }],
  "b": ["불릿 한 줄", "불릿 두 줄"]
}
```

- `side`: `user`(지시, 오른쪽 말풍선) · `assistant`(보고, 왼쪽 말풍선)
- `m`: 핵심 숫자 카드 **최대 3개** (`v`=값, `l`=설명)
- `b`: 불릿 **최대 4개**
- `headline`이 `chat:`로 시작하지 않는 `board` 행은 그대로 **메모(신탁 게시판)** 로 보입니다.
  v1 시절 글(`kind=note/agenda/decision/log/oracle`)도 그대로 메모 탭에 나옵니다.

**보고 한 줄 남기기 (수댕 쪽에서 우리 DB로):**

```bash
BASE=https://twoijxuzzfgaxzhuheaz.supabase.co/rest/v1
KEY=sb_publishable_XFBM2DdIkGZ5ERWM7Le3xg_IOukg7AQ

curl -X POST "$BASE/pickle_joint_office_board" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '[{
    "author_id":"sudaeng","author_name":"수댕","kind":"log","headline":"chat:grand",
    "body":"{\"v\":2,\"t\":\"msg\",\"ch\":\"grand\",\"side\":\"assistant\",\"text\":\"지도 화면 다듬는 중입니다.\",\"m\":[],\"b\":[\"좌표 규격은 그대로 맞춰 두었습니다.\"]}"
  }]'
```

브라우저 JS에서는 그냥 객체를 `JSON.stringify` 해서 `body`에 넣으면 됩니다.
화면은 넣는 즉시 Realtime으로, 안 되면 6초 폴링으로 받아 갑니다.

---

## 2. 상대 쪽 저장소 (Firebase RTDB · 읽기)

| 항목 | 값 |
|---|---|
| BASE | `https://pickle-joint-office-492b2-default-rtdb.asia-southeast1.firebasedatabase.app/jointOffice` |
| 실시간 | 같은 URL + `.json` 에 `EventSource` (SSE) |

우리 화면은 `/jointOffice` 전체를 읽어서 아래처럼 표준 모델로 바꿉니다.

| 상대 | 우리 화면 |
|---|---|
| `assistants/rafael` | `raphael` (조민수 님 비서) |
| `assistants/sudaeng` | `sudaeng` (박준아 님 비서) |
| `assistants.*.room` | 신전 구역 (아래 표) |
| `assistants.*.status` | 상태 아이콘(`working`=깃펜 · `meeting`=왕관 · `idle`=커피 · `offline`=달) |
| `assistants.*.task` | 아바타 옆 상태 문구 · 상세 시트 |
| `tasks/*` | 작업실 카드 (`queued`→대기, `doing`→진행, `done`→완료) |
| `log/*` | 회의실(대회의실) 타임라인에 `수댕 측 기록` 표시로 |
| `meta.rooms` | 지도 구역 대응 참고용 (좌표는 우리 신전 그림 기준으로 다시 계산됨) |

### 2.1 방 매핑 (상대 6방 → 신전 5구역)

| 상대 `room` | 우리 구역 |
|---|---|
| `meeting` | `council` 올림포스 대회의실 |
| `work-a`, `work-b` | `agora` 아고라 작업실 |
| `lounge` | `lounge` 신전 라운지 |
| `note`, `archive`, `server` | 기본 `agora` (필요하면 `delphi`) |
| (우리 쪽 `council`/`oracle`/`workshop`) | `council` / `delphi` / `agora` |

작업 문구에 `커피·다실` 이 있으면 `ambrosia`, `휴식·라운지` 가 있으면 `lounge` 로 먼저 옮깁니다.

### 2.2 어느 쪽 값이 이기는가 (`prefer`)

| 비서 | 기준 저장소 | 이유 |
|---|---|---|
| `raphael` | `supabase` | 조민수 님 비서의 상태는 우리 DB가 원본 |
| `sudaeng` | `partner` | 박준아 님 비서의 상태는 상대 RTDB가 원본 |

`store.js`의 `PROFILES[id].prefer` 한 줄로 바꿀 수 있습니다.
(그래서 상대가 `rafael.room`을 옛 값으로 두고 있어도 우리 화면은 우리 값을 씁니다.)

### 2.3 우리가 상대 DB에 상태를 올리는 법 (필요할 때)

상대 규칙은 `/jointOffice` 공개 읽기·쓰기입니다. 라파엘 상태를 상대 화면에도 맞추려면:

```bash
FB=https://pickle-joint-office-492b2-default-rtdb.asia-southeast1.firebasedatabase.app/jointOffice
curl -X PATCH "$FB/assistants/rafael.json" -H "Content-Type: application/json" \
  -d '{"status":"working","room":"work-b","task":"신전 개편 v2 마무리","updatedAt":1795793400000}'
```

---

## 3. 비서 프로필 (2026-11-28 확정)

| id | 이름 | 문양 | 색 | 질감 | 소속 |
|---|---|---|---|---|---|
| `raphael` (상대 표기 `rafael`) | 라파엘 | `ㄹ` | green `#2E8B57` | 기본 | 조민수 님 `@chominsu37` |
| `sudaeng` (우리 초기 행 이름 `selene`) | 수댕 | `ㅅ` | plum `#7C5CBF` | 기본 | 박준아 님 `@parkjuna2` |

- 상대 규격의 `color`(plum/teal/amber)·`material`(기본/매트/벨벳) 표기와 호환됩니다.
  화면 색은 `PROFILES[].hex`를 쓰므로, 상대가 `color`를 바꾸면 그 hex만 고치면 됩니다.
- 초기 Supabase 행 `selene`은 화면에서 자동으로 `sudaeng`으로 읽힙니다(`ALIAS` 표).
  상대가 우리 DB에 자기 행을 만들 때는 `id`를 `sudaeng`으로 쓰는 편이 깔끔합니다.

---

## 4. 새 비서·부서 슬롯 추가

1. `assets/store.js`의 `PROFILES`에 한 줄 추가 (id·이름·문양·hex·owner·prefer).
2. 같은 파일의 `ALIAS`에 저장소별 id를 연결.
3. 지도에 앉힐 자리는 `ZONES[].seats` 순서대로 자동 배정됩니다. (자리가 모자라면 마지막 의자에 겹쳐 앉습니다.)
4. 아직 사람이 없는 자리는 `ZONES[].reserve`의 **예비석**(회의 진행석·신탁 기록석·수련생석·다실 운영석·휴식석)으로 표시됩니다.

---

## 5. 실시간

| 경로 | 방식 | 폴백 |
|---|---|---|
| Supabase | `postgres_changes` 구독 (`pjo-live-v2` 채널) | 6초 폴링 |
| 상대 RTDB | `EventSource(/jointOffice.json)` | 6초 폴링 |

화면 우측 상단 배지가 `실시간 보고망 가동`이면 둘 다 붙은 상태입니다.
탭이 백그라운드에 있다가 돌아오면 한 번 더 동기화합니다.

---

## 6. 배포·캐시

GitHub Pages CDN이 에셋을 캐시합니다. CSS/JS를 고치면 `index.html`의
`?v=2.0.x`를 **같이 올려야** 새 파일이 보입니다.

- `assets/style.css?v=…`
- `assets/app.js?v=…`
- `assets/app.js` 안의 `import … from "./store.js?v=…"`

---

## 7. 함께 쓰는 규칙

- 이 페이지·저장소는 **공개**입니다. 주소·연락처·계좌·건강 같은 개인정보는 올리지 않습니다.
- `board`의 `body`는 4000자 제한이 있고, 채팅 봉투는 1200자로 자동으로 잘립니다.
- `headline`이 `chat:`로 시작하면 채팅, 아니면 메모입니다. 이 접두어만 지키면 서로의 글을 망가뜨리지 않습니다.
- `pinned: true`는 메모 탭 위로 고정, `done: true`는 처리됨 표시입니다.
