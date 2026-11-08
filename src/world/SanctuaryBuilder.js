/**
 * @file src/world/SanctuaryBuilder.js
 * @description 청연당(淸緣堂) 대웅전, 전통 곡선 기와지붕, 아미타삼존불(불타·관세음보살·대세지보살),
 * 수미단, 향로 및 연기 리본, 복전함, 연등 산책길, 연꽃 연못, 일주문, 소나무 숲을 구축하는 월드 빌더 모듈.
 * (sansatemple.com 클린 코드 재구성본)
 */

import {
  HALL_BOUNDS,
  POND_BOUNDS,
  BRIDGE_BOUNDS,
  ENTRY_GATE_SPEC,
  INCENSE_SPEC,
  getCushionSeat,
} from '../config/worldConfig.js';

/**
 * 청연당(淸緣堂) 성소 및 산사 정원 전체의 아키텍처 매니페스트
 * 각 구성 요소의 역할과 월드 배치 좌표를 한눈에 파악하고 커스터마이징할 수 있도록 정리된 명세입니다.
 */
export const SANCTUARY_ARCHITECTURE = Object.freeze({
  hall: {
    name: '청연당 (淸緣堂)',
    bounds: HALL_BOUNDS,
    triadStatues: [
      {
        id: 'buddha',
        name: '본존불 (아미타불)',
        asset: 'assets/models/buddha.glb',
        position: { x: 0, y: 2.35, z: -18.9 },
      },
      {
        id: 'avalokitesvara',
        name: '관세음보살 (좌협시)',
        asset: 'assets/models/avalokitesvara.glb',
        position: { x: -5.4, y: 2.25, z: -18.6 },
      },
      {
        id: 'mahastamaprapta',
        name: '대세지보살 (우협시)',
        asset: 'assets/models/mahastamaprapta.glb',
        position: { x: 5.4, y: 2.25, z: -18.6 },
      },
    ],
    altarBackdrop: 'assets/altar-wall-calm-20261102.jpg',
    incenseAltar: INCENSE_SPEC,
    cushionCount: 16,
  },
  garden: {
    name: '마당 · 연등 산책길',
    entryGate: ENTRY_GATE_SPEC,
    lotusPond: POND_BOUNDS,
    woodenBridge: BRIDGE_BOUNDS,
    pineModel: 'assets/models/pine.glb',
    environmentPanorama: 'assets/environment/woodland.jpg',
  },
});

/**
 * 청연당 법당과 산사 정원 전체를 씬(Scene)에 비동기 생성합니다.
 * 내부적으로 기하학 배칭(Geometry Batching), MeshBVH 가속 트리,
 * 소나무 임포스터 빌보드 아틀라스(Impostor Atlas), 2단계 지연 정원 로딩(completeGarden)을 수행합니다.
 *
 * @param {object} scene Three.js Scene 인스턴스
 * @param {object} renderer Three.js WebGLRenderer 인스턴스
 * @param {object} options { support?: boolean } 복전함 활성화 여부 등 옵션
 * @returns {Promise<object>} sanctuary 제어 핸들 ({ root, walkSurfaces, completeGarden, setNightAmount, setIncense, update, dispose, ... })
 */
export async function buildSanctuary(scene, renderer, options = { support: true }) {
  const core = window.SANSA_CORE;
  if (!core || typeof core.buildSanctuary !== 'function') {
    throw new Error('SANSA_CORE.buildSanctuary is not available.');
  }
  return core.buildSanctuary(scene, renderer, options);
}

/**
 * 카메라 프리셋 뷰 좌표 헬퍼
 * 사용자가 UI에서 '삼존불 참배', '법당 전경', '연꽃 연못', '일주문 산책길'로
 * 즉시 시점을 전환하거나 이동할 때 사용할 수 있는 좌표 모음입니다.
 */
export const CAMERA_PRESETS = Object.freeze({
  defaultWalk: {
    label: '동자승 3인칭 시점',
    review: '',
  },
  triadFront: {
    label: '삼존불 정면 참배',
    review: 'front',
  },
  triadNear: {
    label: '삼존불 가까이 뵙기',
    review: 'near',
  },
  hallEntry: {
    label: '청연당 입구 전경',
    review: 'entry',
  },
});

/**
 * 빠른 공간 이동( 순간이동 / 산책 시작점 ) 웨이포인트
 */
export const TELEPORT_LOCATIONS = Object.freeze({
  hallCenter: {
    label: '청연당 법당 중앙',
    x: 0,
    z: 6.5,
    yaw: 0,
  },
  incenseFront: {
    label: '향로 앞 참배석',
    x: 0,
    z: -9.5,
    yaw: 0,
  },
  courtyard: {
    label: '청연당 앞마당',
    x: 0,
    z: 31.5,
    yaw: 0,
  },
  lotusPond: {
    label: '연꽃 연못 구름다리',
    x: -20.5,
    z: 36.0,
    yaw: Math.PI * 0.5,
  },
  entryGate: {
    label: '산사 일주문 입구',
    x: 0,
    z: 46.5,
    yaw: 0,
  },
});

export { getCushionSeat };
