/**
 * @file src/character/Pathfinding.js
 * @description 산사(Sansa Temple) 지형 높이(floorHeight), 보행 가능 판정(isWalkable),
 * 그리고 법당 기둥/불단/연못/점유된 방석을 우회하는 A* 최단 경로 탐색(findPath) 모듈.
 * (sansatemple.com 클린 코드 재구성본)
 */

import { getCushionSeat, TOTAL_CUSHION_SEATS } from '../config/worldConfig.js';

/**
 * 주어진 (x, z) 월드 좌표에서의 바닥/지형 높이를 반환합니다.
 * - 청연당 법당 내부 마루: y = 0
 * - 정면/측면 계단 경사면: 0 -> -1.14 보간
 * - 연못 목조 구름다리 아치: 아치 곡선 높이
 * - 마당 및 연등 산책길: 완만한 산사 지형 기복 함수
 */
export function getFloorHeight(x, z) {
  const core = window.SANSA_CORE;
  if (core && typeof core.floorHeight === 'function') {
    return core.floorHeight(x, z);
  }
  return 0;
}

/**
 * 주어진 (x, z) 좌표가 캐릭터가 걸어갈 수 있는 영역인지 판별합니다.
 * - 수미단(불단), 향로 탁자, 법당 기둥, 벽체, 연못 물속(다리 제외), 소나무/석등 충돌체를 검사합니다.
 */
export function isWalkable(x, z, fromPosition) {
  const core = window.SANSA_CORE;
  if (core && typeof core.isWalkable === 'function') {
    return core.isWalkable(x, z, fromPosition);
  }
  return true;
}

/**
 * 시작점(start: {x, z})에서 목표점(goal: {x, z})까지 장애물(obstacles)을 회피하는
 * A* 보행 경로 웨이포인트 배열을 계산합니다.
 *
 * @param {{x: number, z: number}} start 출발 좌표
 * @param {{x: number, z: number}} goal 도착 좌표
 * @param {Array<{x: number, z: number}>} obstacles 점유된 방석 및 다른 참배객 좌표 목록
 * @returns {Array<{x: number, z: number}> | null} 경로 웨이포인트 배열 (이동 불가 시 null)
 */
export function findPath(start, goal, obstacles = []) {
  const core = window.SANSA_CORE;
  if (core && typeof core.findPath === 'function') {
    return core.findPath(start, goal, obstacles);
  }
  return [goal];
}

/**
 * 현재 캐릭터 위치에서 가장 가깝고 비어 있는 참배 방석 번호(0~15 우선, 전체 0~99)를 찾습니다.
 * @param {{x: number, z: number}} currentPos 현재 위치
 * @param {Set<number>} occupiedIndices 이미 다른 참배객이 앉아 있는 방석 인덱스 집합
 * @returns {number | null} 추천 방석 번호
 */
export function findNearestAvailableCushion(currentPos, occupiedIndices = new Set()) {
  // 청연당 법당 내 실제 시각적 방석 16석(0~15)을 우선 탐색
  const preferredSeats = Array.from({ length: 16 }, (_, i) => i);
  let bestSeat = null;
  let bestDist = Infinity;

  for (const idx of preferredSeats) {
    if (occupiedIndices.has(idx)) continue;
    const seatPos = getCushionSeat(idx);
    const dist = Math.hypot(seatPos.x - currentPos.x, seatPos.z - currentPos.z);
    if (dist < bestDist) {
      bestDist = dist;
      bestSeat = idx;
    }
  }

  if (bestSeat !== null) return bestSeat;

  // 16석이 모두 찼을 경우 전체 100석 중 탐색
  for (let idx = 16; idx < TOTAL_CUSHION_SEATS; idx++) {
    if (occupiedIndices.has(idx)) continue;
    const seatPos = getCushionSeat(idx);
    const dist = Math.hypot(seatPos.x - currentPos.x, seatPos.z - currentPos.z);
    if (dist < bestDist) {
      bestDist = dist;
      bestSeat = idx;
    }
  }

  return bestSeat;
}
