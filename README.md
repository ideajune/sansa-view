# 산사 (Sansa View) — 청연당(淸緣堂) 3D 온라인 사찰 (클린 코드 재구성본)

`sansatemple.com`의 3D 청연당 법당, 아미타삼존불, 곡선 한옥 기와지붕, 연등 산책길, 연꽃 연못, 동자승 2-Bone IK 캐릭터, 108 염주, 목탁 16박 자동재생, Liquid Glass UI, Web Audio 절차적 사운드 합성 기술을 기능별 ES Module로 깔끔하게 분리·재구성한 프로젝트입니다.

## 폴더 및 모듈 구조

```text
sansa-view/
├── index.html                        # 메인 HTML (Liquid Glass HUD, 수행 독, 복전함 모달)
├── styles.css                        # 전체 UI, 3D 이름표, 분향 배너, 염주/목탁 뷰 스타일
├── main.js                           # 애플리케이션 부트스트랩 및 UI/오디오/월드 이벤트 통합
├── package.json                      # 로컬 개발 서버 실행 스크립트 (port 8090)
├── assets/                           # 3D GLB 모델(삼존불, 동자승, 소나무) 및 PBR 재질 텍스처
└── src/
    ├── config/
    │   └── worldConfig.js            # 청연당 경계, 100석 방석 좌표, 12초 분향 궤적, 조명 팔레트
    ├── world/
    │   ├── Shaders.js                # Normal+Roughness 패킹, 지평선, 연못 물결, 연기 리본, Liquid Glass GLSL
    │   ├── SanctuaryBuilder.js       # 청연당 법당, 삼존불, 기와지붕, 연못, 일주문 아키텍처 및 웨이포인트
    │   └── SansaWorldController.js   # 3인칭 카메라, 보행, 방석 착석, 배례, 분향, 군중 배칭 컨트롤러
    ├── character/
    │   ├── Pathfinding.js            # 지형 높이(floorHeight), 보행 가능 판정, A* 경로 탐색(findPath)
    │   └── MonkController.js         # 동자승 생성(createMonk) 및 상주 스님·자율 참배객 시뮬레이터
    ├── ui/
    │   ├── PrayerBeadsView.js        # 108 염주 3D 인터랙티브 수행 뷰 (절차적 나뭇결 & 관성 회전)
    │   └── MoktakView.js             # 목탁 수동 타격 및 16박 가속 수렴형 자동재생 뷰
    ├── audio/
    │   └── SoundEngine.js            # Web Audio API 실시간 합성 (목탁, 범종 맥놀이, 풍경, 염주, 계곡 바람)
    └── engine/
        └── sansa-runtime.js          # Three.js r180 + Meshopt WASM + MeshBVH + 코어 지오메트리 엔진
```

## 실행 방법

```bash
npm run dev
```

브라우저에서 `http://localhost:8090` (또는 `view-mung` 서버를 통한 `/sansa-view/`)으로 접속하면 즉시 체험할 수 있습니다.
