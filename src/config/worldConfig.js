/**
 * @file src/config/worldConfig.js
 * @description 산사(Sansa Temple) 3D 공간 좌표계, 청연당(淸緣堂) 불전 경계,
 * 연못/구름다리/산문 지형 높이 함수, 100석 참배 방석 배치, 12초 분향(Incense) 의식 궤적 설정 모듈.
 * (sansatemple.com 클린 코드 재구성본)
 */

export const SEAT_COLS = 10;
export const SEAT_ROWS = 10;
export const TOTAL_CUSHION_SEATS = SEAT_COLS * SEAT_ROWS; // 100석
export const MAX_VISITORS = 100;

export const ALTAR_SCALE = 1.5;
export const ALTAR_OFFSET_Z = -5.4965;

/**
 * 청연당(淸緣堂) 법당 건축 경계 상수 (단위: m)
 */
export const HALL_BOUNDS = Object.freeze({
  halfWidth: 18.2,
  back: -22.6,
  front: 23.1,
  wallHalfWidth: 16.2,
  columnX: 16.4,
  columnZ: Object.freeze([-20, -8, 4, 16, 23.15]),
  columnRadius: 0.96,
  stepsHalfWidth: 5.7,
  stepsEnd: 29.6,
  sideStepsX: 11.1,
  sideStepsHalfWidth: 3.2,
  facadeColumnX: Object.freeze([-5.8, 5.8]),
  facadeColumnZ: 23.15,
  facadeColumnRadius: 0.76,
  groundY: -1.14,
});

/**
 * 수미단(불단) 및 향로 탁자 충돌 경계
 */
export const ALTAR_BOUNDS = Object.freeze({
  centerZ: -19.1465,
  blockX: 12.9,
  back: -22.5965,
  front: -15.7,
});

export const INCENSE_TABLE_BOUNDS = Object.freeze({
  x: 1.14,
  back: -12.8365,
  front: -12.5565,
});

/**
 * 연꽃 연못 및 목조 다리 경계 상수
 */
export const POND_BOUNDS = Object.freeze({
  x: -28,
  z: 36,
  rx: 6.5,
  rz: 6.5,
});

export const BRIDGE_BOUNDS = Object.freeze({
  x: -21.1,
  z: 36,
  width: 2.8,
  depth: 3.2,
  top: 0.185,
});

/**
 * 일주문(산문) 및 진입 광장 좌표
 */
export const ENTRY_GATE_SPEC = Object.freeze({
  x: 0,
  z: 48,
  yaw: 0,
  gateZ: 44,
  plazaZ: 42,
  plazaRadius: 6.2,
});

/**
 * 산책로 석등(Stone Lantern) 배치 좌표
 */
export const STONE_LANTERN_COORDS = Object.freeze([
  { x: -3.2, z: 32.8 },
  { x: 3.2, z: 32.8 },
  { x: -3.4, z: 39.2 },
  { x: 3.4, z: 39.2 },
  { x: -12.6, z: 33.4 },
  { x: -18.4, z: 39.2 },
]);

/**
 * 분향(향 올리기) 의식 상세 타이밍 및 위치 명세 (12초 시퀀스)
 */
export const INCENSE_SPEC = Object.freeze({
  approach: Object.freeze({ x: 0, z: -12.125 }),
  table: Object.freeze({
    centerZ: -12.6965,
    topY: 0.58,
    width: 2.45,
    depth: 0.72,
    supportWidth: 2.14,
    supportDepth: 0.28,
  }),
  bowl: Object.freeze({
    x: 0.23,
    z: -12.49,
    bedY: 0.715,
    radius: 0.145,
  }),
  stick: Object.freeze({
    length: 0.34,
    gripFromBase: 0.09,
    embedDepth: 0.025,
    base: Object.freeze({ x: 0.3, y: 0.69, z: -12.49 }),
  }),
  timing: Object.freeze({
    initialBowStart: 0.55,
    initialBowEnd: 2.4,
    heldAt: 3.3,
    reachStart: 4.65,
    insertStart: 5.85,
    plantedAt: 6.65,
    releaseAt: 7.15,
    returnedAt: 7.95,
    retreatStart: 8.05,
    retreatEnd: 9.25,
    saluteStart: 9.4,
    saluteEnd: 11.25,
    end: 12.0,
  }),
  palmFromWrist: 0.045,
  retreatDistance: 0.6,
  scene: Object.freeze({
    altarScale: ALTAR_SCALE,
    altarOffsetZ: ALTAR_OFFSET_Z,
  }),
});

/**
 * 실내(청연당) 및 실외(마당) 낮/밤 조명 컬러 팔레트
 */
export const LIGHTING_PALETTES = Object.freeze({
  indoor: {
    day: {
      sky: 0xdce9df,
      fog: 0xc8d6c3,
      upper: 0xf3f1df,
      lower: 0x7b775b,
      ambient: 0xffeedd,
      sun: 0xffedcb,
      altar: 0xffdf91,
      fill: 0xfff2e2,
    },
    night: {
      sky: 0x091522,
      fog: 0x142338,
      upper: 0x8fa7c5,
      lower: 0x79634b,
      ambient: 0xf3c49e,
      sun: 0x9cb8df,
      altar: 0xffc160,
      fill: 0xffd5a0,
    },
  },
  outdoor: {
    day: {
      upper: '#e8f3f0',
      lower: '#a4b99b',
      ambient: '#fff1e6',
      sun: '#fff4e3',
      fog: '#dce9df',
    },
    night: {
      upper: '#adbcdb',
      lower: '#8f9b8c',
      ambient: '#efd2c4',
      sun: '#b2c0e5',
      fog: '#343a50',
    },
  },
});

/**
 * 5차 다항식 스무스스텝 (Quintic smoothstep: 6t^5 - 15t^4 + 10t^3)
 */
export function quinticSmoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

function lerpScalar(a, b, t) {
  return a + (b - a) * t;
}

function lerpVec3(a, b, t) {
  return {
    x: lerpScalar(a.x, b.x, t),
    y: lerpScalar(a.y, b.y, t),
    z: lerpScalar(a.z, b.z, t),
  };
}

function phaseProgress(time, start, end) {
  return quinticSmoothstep((time - start) / (end - start));
}

/**
 * 분향(Incense Offering) 12초 시퀀스의 손 위치, 상체 기울기, 합장 가중치를 계산합니다.
 * @param {number} elapsedSec 분향 시작 후 경과 시간(초)
 */
export function sampleIncenseRitualPose(elapsedSec) {
  const t = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const timing = INCENSE_SPEC.timing;
  const stick = INCENSE_SPEC.stick;
  const approach = INCENSE_SPEC.approach;

  const rightStart = { x: 0.05, y: 0.84, z: -0.3 };
  const leftStart = { x: -0.05, y: 0.84, z: -0.3 };
  const plantGrip = {
    x: stick.base.x - approach.x,
    y: stick.base.y + stick.gripFromBase,
    z: stick.base.z - approach.z,
  };
  const reachGrip = { ...plantGrip, y: plantGrip.y + 0.075 };
  const leftSupport = { x: -0.1, y: 0.775, z: -0.14 };
  const rightPrayer = { x: 0.028, y: 0.92, z: -0.18 };
  const leftPrayer = { x: -0.028, y: 0.92, z: -0.18 };

  const reachT = phaseProgress(t, timing.reachStart, timing.insertStart);
  const insertT = phaseProgress(t, timing.insertStart, timing.plantedAt);
  const returnT = phaseProgress(t, timing.releaseAt, timing.returnedAt);

  const rightReach = lerpVec3(lerpVec3(rightStart, reachGrip, reachT), plantGrip, insertT);
  const leftReach = lerpVec3(leftStart, leftSupport, reachT);
  const rightGrip = lerpVec3(rightReach, rightPrayer, returnT);
  const leftGrip = lerpVec3(leftReach, leftPrayer, returnT);

  const lean = ((30 * Math.PI) / 180) * reachT * (1 - returnT);
  const pulse = (start, end) =>
    phaseProgress(t, start, start + 0.65) * (1 - phaseProgress(t, end - 0.65, end));

  const salute =
    pulse(timing.initialBowStart, timing.initialBowEnd) +
    pulse(timing.saluteStart, timing.saluteEnd);
  const prayer = Math.max(1 - phaseProgress(t, timing.initialBowEnd + 0.2, timing.heldAt), returnT);
  const retreatProgress = phaseProgress(t, timing.retreatStart, timing.retreatEnd);

  let phase = 'complete';
  if (t < timing.heldAt) phase = 'initial-bow';
  else if (t < timing.reachStart) phase = 'raise';
  else if (t < timing.insertStart) phase = 'reach';
  else if (t < timing.plantedAt) phase = 'insert';
  else if (t < timing.releaseAt) phase = 'planted';
  else if (t < timing.returnedAt) phase = 'withdraw';
  else if (t < timing.retreatEnd) phase = 'retreat';
  else if (t < timing.end) phase = 'salute';

  return {
    rightGrip,
    leftGrip,
    handDirection: { x: 0, y: 1, z: 0 },
    weight: phaseProgress(t, 0, 0.65) * (1 - phaseProgress(t, timing.end - 0.7, timing.end)),
    lean,
    salute,
    prayer,
    retreatProgress,
    rootOffsetZ: INCENSE_SPEC.retreatDistance * retreatProgress,
    insertProgress: insertT,
    held: t >= timing.heldAt && t < timing.releaseAt,
    planted: t >= timing.plantedAt,
    released: t >= timing.releaseAt,
    phase,
  };
}

/**
 * 0~99번 참배 방석(Cushion)의 월드 좌표를 반환합니다.
 * @param {number} seatIndex 0 ~ 99
 */
export function getCushionSeat(seatIndex) {
  if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= TOTAL_CUSHION_SEATS) {
    throw new RangeError(`Seat index must be between 0 and ${TOTAL_CUSHION_SEATS - 1}`);
  }
  const col = seatIndex % SEAT_COLS;
  const row = Math.floor(seatIndex / SEAT_COLS);
  return {
    x: col < 5 ? (col - 5) * 2.4 : (col - 4) * 2.4,
    z: -8.4 + row * 2.8,
    yaw: 0,
  };
}

/**
 * 캐릭터의 현재 좌표가 청연당 법당 내부('hall')인지 산책 정원('garden')인지 판별합니다.
 */
export function detectSpace(x, z) {
  return Math.abs(x) <= HALL_BOUNDS.halfWidth &&
    z >= HALL_BOUNDS.back &&
    z <= HALL_BOUNDS.front + 0.4
    ? 'hall'
    : 'garden';
}
