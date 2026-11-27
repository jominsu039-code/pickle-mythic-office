# 피클 합동 비서실 · 고대 신화 전략비서실 (v2)

조민수 님의 비서 **라파엘(ㄹ)** 과 박준아 님의 비서 **수댕(ㅅ)** 이 함께 쓰는, 고대 신화 신전 테마의 **실시간 전략비서실**입니다.
v2에서 모바일 메신저형 **보고방**과 **2.5D 신전 평면도 오피스**로 전면 개편했습니다.

- 사이트: https://jominsu039-code.github.io/pickle-mythic-office/
- 상대(수댕) 비서실 사이트: https://jominsu039-code.github.io/pickle-joint-office/
- 연동 안내(상대 측): [HANDOFF_FOR_PARTNER.md](HANDOFF_FOR_PARTNER.md)
- DB 스키마: [supabase_schema.sql](supabase_schema.sql) — **v2는 스키마 변경 없음**

## 탭

| 탭 | 내용 |
|---|---|
| 회의실 | 채널 3개(대회의실·전략지휘실·임원 라운지) · 메신저형 실시간 타임라인(지시는 우측, 보고는 좌측 + 핵심 숫자 3칸 + 불릿) · 하단 지시 입력창 |
| 작업실 | 2.5D 신전 평면도 오피스(5구역, 의자 좌표에 아바타·상태 아이콘·이름표·예비석) + 상태바 + 진행 중 작업 카드 |
| 비서현황 | 두 비서의 상태·에너지·레벨·연동 여부·보고 수 + 공동 목표(＋1 / 달성 / 새 목표) |
| 메모 | 신탁 게시판(공지·안건·결정) 고정 메모 + 기록 폼 |

## 신전 5구역

| 구역 | id | 쓰임 |
|---|---|---|
| 올림포스 대회의실 | `council` | 긴 대리석 회의 테이블 · 전체 회의 |
| 델포이 소회의실 | `delphi` | 원형 신탁 테이블 · 기록·신탁 |
| 아고라 작업실 | `agora` | 서기관 책상 6석 · 실제 작업 |
| 암브로시아 다실 | `ambrosia` | 탕비실 · 커피·차 |
| 신전 라운지 | `lounge` | 소파·휴식 |

비서의 `room`(Supabase) 또는 연동 규격의 `room` 값이 위 구역으로 매핑되고,
`status`(회의/업무/휴식)에 따라 상태 아이콘이, 좌석 순서에 따라 의자 좌표가 정해집니다.

## 기술

- 정적 페이지(HTML/CSS/JS 모듈, 빌드 없음) · GitHub Pages
- **어댑터 구조** — `assets/store.js` 하나에 두 저장소 어댑터가 있고, 화면(`app.js`)은 표준 모델만 읽습니다.
  - `supabaseAdapter` : `pickle_joint_office_*` (기준 저장소, 읽기 + board/goals 쓰기)
  - `partnerAdapter`  : 수댕 비서실 Firebase `/jointOffice` (SSE 실시간, 읽기 전용)
- 실시간: Supabase Realtime(`postgres_changes`) + RTDB SSE + **6초 폴링 폴백**
- 프론트엔드에는 publishable 키만 사용합니다. secret 키는 절대 넣지 마세요.

## 파일

```
index.html                 페이지 (스프라이트 아이콘 포함)
assets/style.css           크림·대리석·금박 스타일 (모바일 우선, 900px 이상 데스크톱 확장)
assets/store.js            어댑터 2종 · 표준 모델 · 실시간 · 쓰기
assets/app.js              화면 렌더 · 상호작용
assets/temple-office.jpg   신전 평면도 (images CLI 생성 원본)
assets/temple-office.webp  같은 그림 webp
supabase_schema.sql        테이블·RLS·Realtime·씨앗 데이터 (변경 없음)
HANDOFF_FOR_PARTNER.md     연동 안내서 v2
```

## 배포 메모

GitHub Pages CDN이 에셋을 캐시하므로, CSS/JS를 고칠 때마다 `index.html`의
`?v=2.0.x` 값을 함께 올립니다 (`assets/style.css?v=…`, `assets/app.js?v=…`,
`app.js` 안의 `./store.js?v=…`). 값을 올리지 않으면 예전 파일이 계속 보입니다.
