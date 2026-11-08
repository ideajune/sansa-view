# 산사 (Sansa View) — 개발 이력 및 인계 문서 (HANDOFF.md)

이 문서는 **Home PC**에서 진행한 `sansa-view` 프로젝트의 아키텍처, 개발·수정 이력, 그리고 **사무실 PC** 등 다른 환경에서 `git pull` 후 작업을 곧바로 이어가기 위한 컨텍스트를 정리한 문서입니다.

> **사무실 PC에서 Antigravity 에이전트에게 작업을 이어서 시킬 때:**
> 새 대화창에서 **`"HANDOFF.md 파일을 읽고 프로젝트 컨텍스트를 파악해 줘"`** 라고 입력하시면 이전 개발 맥락을 그대로 이어받아 작업할 수 있습니다.

---

## 1. 프로젝트 개요

* **프로젝트명**: 산사 (Sansa View) — 청연당(淸緣堂) 3D 온라인 사찰
* **저장소**: `https://github.com/ideajune/sansa-view` (`master` 브랜치)
* **개발 서버 실행**:
  ```bash
  npm run dev
  # http://localhost:8090 접속
  ```
* **핵심 설명**:
  `sansatemple.com`의 3D 청연당 불전, 아미타삼존불(아미타불·관세음보살·대세지보살), 곡선 한옥 기와지붕, 연등 산책길, 연꽃 연못, 동자승 2-Bone IK 캐릭터, 108 염주 3D 뷰, 목탁 16박 가속 자동재생, Liquid Glass UI, Web Audio API 절차적 사운드 합성 엔진을 클린 ES Module 구조로 분리·재구성한 웹 애플리케이션입니다.

---

## 2. 디렉터리 및 모듈 아키텍처

| 경로 | 역할 및 주요 내용 |
| :--- | :--- |
| `index.html` | 상단 HUD(공간 제목, 참배 인원 배지, 빠른 공간 이동, 시점 전환, 낮/밤 조명, 사운드 토글), 메인 3D 뷰포트(`#sansa-viewport`), 하단 수행 액션 독(합장·절하기·108염주·목탁·자리앉기), 복전함 다이얼로그(`#support-dialog`) |
| `styles.css` | Liquid Glass UI 스타일, 3D 참배객 이름표(`.visitor-label`), 향로/복전함 3D 투영 UI(`.devotional-controls`), 108 염주 뷰(`.sansa-beads-view`), 목탁 뷰(`.sansa-moktak-view`) |
| `main.js` | `SansaApp` 메인 클래스 — 월드 컨트롤러, 자율 참배객 시뮬레이터(`VisitorSimulator`), 108 염주 뷰, 목탁 뷰, 사운드 엔진 초기화 및 모든 UI 버튼 이벤트 바인딩 |
| `src/config/worldConfig.js` | 법당/연못/구름다리/일주문 경계 좌표, 100석 참배 방석 배치(`getCushionSeat`), 12초 분향 의식 키프레임, 낮/밤 조명 팔레트 |
| `src/world/Shaders.js` | Normal+Roughness 패킹, 지평선 블렌딩, 연못 수면 파동, 향로 연기 리본, Liquid Glass 굴절 GLSL 셰이더 |
| `src/world/SanctuaryBuilder.js` | 청연당 법당·삼존불·연못·소나무 숲 비동기 빌더(`buildSanctuary`), 빠른 이동 좌표(`TELEPORT_LOCATIONS`), 카메라 프리셋(`CAMERA_PRESETS`) |
| `src/world/SansaWorldController.js` | `createSansaWorldController` — 3인칭 카메라 추적, 마우스 클릭/WASD 이동, 방석 착석, 연속 배례, 분향, `teleportTo`, `setCameraPreset` |
| `src/character/Pathfinding.js` | 지형 높이 계산(`getFloorHeight`), 보행 가능 영역 판정(`isWalkable`), A* 최단 경로 탐색(`findPath`), 빈 방석 탐색(`findNearestAvailableCushion`) |
| `src/character/MonkController.js` | 동자승 3D 캐릭터 생성(`createMonk`) 및 경내 상주 스님·도반(참배객) 4인의 자율 행동 시뮬레이터(`VisitorSimulator`) |
| `src/ui/PrayerBeadsView.js` | 108 염주 3D 인터랙티브 뷰 (`createPrayerBeadsView`) — 드래그/휠/키보드 관성 회전 및 108배 카운터 |
| `src/ui/MoktakView.js` | 목탁 수동 타격 및 16박 가속 수렴형 자동재생(`createMoktakView`, `MoktakAutoPlayer`, `MoktakRhythmTimeline`) |
| `src/audio/SoundEngine.js` | 외부 오디오 에셋 없이 Web Audio API로 목탁 공명음, 범종 맥놀이(3.3Hz), 처마 풍경, 염주 클릭음, 산사 솔바람/계곡물 앰비언트를 실시간 합성 |
| `src/engine/sansa-runtime.js` | Three.js r180 + Meshopt WASM 디코더 + MeshBVH + 코어 런타임(`window.SANSA_CORE`) |
| `sansatemple 적용기술 목록.docx` | 프로젝트에 적용된 그래픽스·수학·오디오·UI 기술 상세 분석 문서 |

---

## 3. 대화 및 작업 이력 요약 (Home PC)

### 3.1. 클린 모듈러 아키텍처 구축
* 단일 번들 형태의 코드를 역할별 ES Module(`config`, `world`, `character`, `ui`, `audio`, `engine`)로 분리하고, 한국어 JSDoc 주석과 직관적인 UI 컨트롤(빠른 위치 이동 `<select>`, 삼존불 시점 전환, 낮/밤 전환 등)을 구성했습니다.
* 서버 연결 없이도 도량이 살아 숨 쉬도록 상주 스님 및 도반 NPC 시뮬레이터(`VisitorSimulator`)와 절차적 사운드 합성 엔진(`SoundEngine`)을 연동했습니다.

### 3.2. 마우스 클릭 불가 이슈 수정 (`2026-11-08`)
* **증상**: 개발 서버(`npm run dev`, 포트 `8090`) 실행 후 화면 내 버튼 및 3D 바닥 마우스 클릭이 동작하지 않던 현상.
* **원인**:
  * 초기화 시 생성되는 전체 화면 오버레이 `.sansa-beads-view`(`z-index: 80`, `position: fixed; inset: 0`)와 `.sansa-moktak-view`(`z-index: 55`)가 HTML `hidden` 속성을 가지고 있었으나, `styles.css`의 `display: flex` 선언이 브라우저 기본 `[hidden] { display: none }` 스타일을 덮어쓰고 있었음.
  * 그 결과 투명한(`opacity: 0`) `.sansa-beads-view`가 화면 전체를 덮어 모든 마우스 포인터 이벤트를 가로채고 있었음.
* **해결 (`styles.css`)**:
  1. 전역 `[hidden] { display: none !important; }` 규칙을 추가하여 `hidden` 속성이 켜진 모든 오버레이 및 3D 투영 UI가 즉시 렌더링 및 클릭 판정에서 제외되도록 수정.
  2. `.sansa-beads-view` 및 `.sansa-moktak-view`의 기본 상태를 `pointer-events: none`으로 설정하고 `.is-visible` 클래스가 붙었을 때만 `pointer-events: auto`가 활성화되도록 보강.

### 3.3. Git 초기화 및 GitHub 원격 저장소 Push (`2026-11-09`)
* `.gitignore` 생성 (`node_modules/`, `.DS_Store`, `Thumbs.db`, `*.log`)
* Git 저장소 초기화 및 전체 에셋/소스코드 커밋
* GitHub 원격 저장소(`https://github.com/ideajune/sansa-view`) 생성 및 `master` 브랜치 push 완료

---

## 4. 사무실 PC에서 작업 시작하기

1. **저장소 클론 (최초 1회)** 또는 **최신 코드 받기**:
   ```bash
   # 최초 클론 시
   git clone https://github.com/ideajune/sansa-view.git
   cd sansa-view

   # 이미 클론된 폴더가 있을 경우
   git pull origin master
   ```
2. **개발 서버 실행**:
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:8090` 접속
3. **작업 후 변경사항 반영**:
   ```bash
   git add .
   git commit -m "작업 내용 요약"
   git push origin master
   ```
