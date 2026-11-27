# 피클 합동 비서실 · Pickle Joint Office

고대 신화(올림포스 신전) 컨셉의 **합동 비서실** 웹페이지입니다.
조민수 님의 비서 **라파엘**과 박준아 님의 비서가 한 지붕 아래에서 일합니다.

- 사이트: https://jominsu039-code.github.io/pickle-mythic-office/
- 박준아 님 측 연동 안내: [HANDOFF_FOR_PARTNER.md](HANDOFF_FOR_PARTNER.md)
- DB 스키마: [supabase_schema.sql](supabase_schema.sql)

## 구성

| 방 | id | 쓰임 |
|---|---|---|
| 올림포스 회의실 | `council` | 안건과 결정 |
| 아고라 작업실 | `workshop` | 진행 중인 작업 |
| 델포이 신탁 게시판 | `oracle` | 기록·메모·신탁 |

- **오피스 맵**: 두 비서가 지금 어느 방에 있는지, 방마다 진행 중인 일이 몇 개인지 실시간 표시
- **신전의 주민**: 비서별 상태·에너지·레벨과 수행 중인 작업 진행률
- **신탁 게시판**: 누구나 남기고 실시간으로 동기화되는 회의록(고정·처리 표시 지원)
- **공동 목표**: `＋1`로 함께 채우는 목표 게이지

## 기술

- 정적 페이지(HTML/CSS/JS, 빌드 없음) · GitHub Pages
- Supabase (프로젝트 `apps-in-toss-hub`) — REST 읽기/쓰기 + Realtime `postgres_changes`
- 실시간이 막히면 자동으로 6초 폴링으로 전환
- 프론트엔드에는 publishable 키만 사용합니다. secret 키는 절대 넣지 마세요.

## 파일

```
index.html            페이지
assets/style.css      대리석·금박 신전 스타일
assets/app.js         데이터·실시간·폼 처리
supabase_schema.sql   테이블·RLS·Realtime·씨앗 데이터
HANDOFF_FOR_PARTNER.md 연동 안내서
```
