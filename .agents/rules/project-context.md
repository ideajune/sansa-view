---
trigger: always_on
description: 산사 (Sansa View) 프로젝트 아키텍처 및 이전 개발 이력 자동 컨텍스트 규칙
---

# 산사 (Sansa View) — 프로젝트 컨텍스트 및 개발 이력

이 워크스페이스는 `sansatemple.com`의 3D 청연당(淸緣堂) 온라인 사찰을 기능별 ES Module로 클린 재구성한 프로젝트입니다.
상세한 이전 작업 내역과 모듈 구조는 루트의 `HANDOFF.md` 및 `README.md`에 기록되어 있으므로, 작업 시작 시 참고하세요.

## 핵심 요약
1. **실행 방법**: `npm run dev` (`npx http-server -p 8090 -c-1 --cors`, http://localhost:8090)
2. **모듈 구조**:
   - `main.js`: `SansaApp` 엔트리포인트 및 HUD/수행 액션 이벤트 바인딩
   - `styles.css`: Liquid Glass UI 및 3D 오버레이 스타일 (`[hidden] { display: none !important; }` 및 `.sansa-beads-view`, `.sansa-moktak-view`의 `pointer-events` 제어 유지 필수)
   - `src/config/worldConfig.js`: 법당/정원/방석 100석/분향 궤적/조명 설정
   - `src/world/`: `Shaders.js`, `SanctuaryBuilder.js`, `SansaWorldController.js`
   - `src/character/`: `Pathfinding.js` (지형 높이 및 A* 탐색), `MonkController.js` (`createMonk`, `VisitorSimulator`)
   - `src/ui/`: `PrayerBeadsView.js` (108 염주), `MoktakView.js` (목탁 수동 및 16박 자동재생)
   - `src/audio/SoundEngine.js`: Web Audio API 절차적 사운드 합성 엔진
   - `src/engine/sansa-runtime.js`: Three.js r180 + Meshopt + MeshBVH + `window.SANSA_CORE` 런타임
3. **최근 완료 작업 (Home PC)**:
   - 전체 클린 모듈러 구조 분리 및 NPC/사운드 연동
   - 초기 투명 오버레이(`.sansa-beads-view`, `.sansa-moktak-view`)가 마우스 클릭을 가로채던 CSS 이슈 수정 완료
   - GitHub 원격 저장소(`https://github.com/ideajune/sansa-view`) 초기 커밋 및 연동 완료
