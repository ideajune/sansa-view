/**
 * @file src/world/SansaWorldController.js
 * @description 산사(Sansa Temple) 3D 월드 메인 컨트롤러 모듈.
 * - 청연당 불전 및 연등 산책길 3D 렌더링 루프 (Adaptive Frame Pacer & Telemetry)
 * - 3인칭 동자승 카메라 추적, 마우스/터치 드래그 시점 회전, 핀치 줌, 바닥 클릭 A* 이동
 * - WASD / 방향키 실시간 보행 및 충돌 처리
 * - 방석 착석(returnToSeat), 연속 배례(bow), 합장 인사(greet), 12초 분향 의식(devotionalAction)
 * - 실내/실외 자동 감지(indoorAmount) 및 낮/밤(day/night) 조명 부드러운 전환
 * - 다중 참배객 GPU 스키닝 포즈 캐시(Qf) 및 InstancedMesh 군중 배칭(a2)
 * (sansatemple.com 클린 코드 재구성본)
 */

import { getFloorHeight } from '../character/Pathfinding.js';
import { TELEPORT_LOCATIONS } from './SanctuaryBuilder.js';

export function createSansaWorldController(hostElement, callbacks) {
  const core = window.SANSA_CORE;
  if (!core || typeof core.SansaWorldController !== 'function') {
    throw new Error('SANSA_CORE.SansaWorldController is not available.');
  }

  const world = new core.SansaWorldController(hostElement, callbacks);

  /**
   * 지정된 웨이포인트(청연당 법당, 향로 앞, 앞마당, 연꽃 연못, 일주문)로 캐릭터를 즉시 이동시킵니다.
   * @param {keyof typeof TELEPORT_LOCATIONS | {x: number, z: number, yaw?: number}} destination
   */
  world.teleportTo = function teleportTo(destination) {
    const target =
      typeof destination === 'string' ? TELEPORT_LOCATIONS[destination] : destination;
    if (!target || !this.isReady || this.disposed) return false;

    this.cancelIncense?.();
    this.cancelSeating?.();
    this.clearBowRepetition?.(false);
    this.stopWalking?.();
    this.cushion = null;
    this.callbacks.onStand?.();

    const y = getFloorHeight(target.x, target.z);
    this.self.group.position.set(target.x, y, target.z);
    const yaw = target.yaw ?? 0;
    this.self.group.rotation.y = yaw;
    this.yaw = yaw;
    this.triadReview = '';
    this.setMode('walk', true);
    this.syncSpace?.();
    this.cameraSnap?.();
    this.publishVisit?.();
    this.wake?.();
    return true;
  };

  /**
   * 삼존불 참배 시점('front' | 'near' | 'entry' | '')을 전환합니다.
   * @param {'' | 'front' | 'near' | 'left' | 'right' | 'entry'} preset
   */
  world.setCameraPreset = function setCameraPreset(preset = '') {
    if (this.disposed) return;
    this.triadReview = preset;
    this.updateLighting?.(0.016);
    this.wake?.();
  };

  return world;
}
