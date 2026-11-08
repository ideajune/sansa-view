/**
 * @file src/character/MonkController.js
 * @description 동자승 캐릭터 생성(`createMonk`) 및 산사 경내에서 함께 참배하고 산책하는
 * 상주 스님(Resident Monk)과 자율 참배객(Autonomous Visitors) 시뮬레이터 모듈.
 * (sansatemple.com 클린 코드 재구성본)
 */

import { getCushionSeat } from '../config/worldConfig.js';
import { getFloorHeight, findNearestAvailableCushion } from './Pathfinding.js';

/**
 * 동자승 3D 캐릭터(`monk.glb` / `monk-remote-lod.glb`) 인스턴스를 생성합니다.
 * - 2-Bone Analytical Arm IK (합장, 절하기, 향 올리기 손목/팔꿈치 역운동학)
 * - 4종 의복 형태 변형 Morph Target (`restingFold`, `prayerCloth`, `bowCloth`, `kneelingCover`)
 * - 보행(walk), 좌선/무릎꿇기(kneel), 염주(beads), 춤(dance) 모드 지원
 *
 * @param {{ detail?: 'full' | 'reduced', remote?: boolean, resident?: boolean }} options
 */
export function createMonk(options = {}) {
  const core = window.SANSA_CORE;
  if (!core || typeof core.createMonk !== 'function') {
    throw new Error('SANSA_CORE.createMonk is not available.');
  }
  return core.createMonk(options);
}

/**
 * 산사 경내의 고즈넉한 분위기를 살려주는 자율 참배객 & 상주 스님 시뮬레이터
 * 서버 연결 없이도 로컬에서 다른 수행자들이 방석에서 절을 올리거나 마당을 거닐고,
 * 향로에 피어오르는 향을 공유하도록 상태를 관리합니다.
 */
export class VisitorSimulator {
  constructor(worldController) {
    this.world = worldController;
    this.selfId = 'visitor:self';
    this.selfName = '나 (수행자)';
    this.selfState = {
      id: this.selfId,
      name: this.selfName,
      seat: 0,
      cushion: null,
      pose: 'walk',
      position: { x: 0, z: 36.5, yaw: 0 },
      bowAt: 0,
    };

    // 경내 상주 스님 및 함께 수행하는 도반(참배객) 초기 배치
    this.npcs = [
      {
        id: 'resident:cheongyeon',
        name: '청연당 지킴이 스님',
        seat: 1,
        cushion: 2,
        pose: 'kneel',
        position: { ...getCushionSeat(2), yaw: 0 },
        bowAt: 0,
        role: 'resident',
      },
      {
        id: 'visitor:doban-1',
        name: '고요한 솔바람',
        seat: 2,
        cushion: 3,
        pose: 'kneel',
        position: { ...getCushionSeat(3), yaw: 0 },
        bowAt: Date.now() - 2000,
        role: 'bowing',
        nextActionAt: performance.now() + 9000,
      },
      {
        id: 'visitor:doban-2',
        name: '맑은 연꽃',
        seat: 3,
        cushion: 6,
        pose: 'kneel',
        position: { ...getCushionSeat(6), yaw: 0 },
        bowAt: 0,
        role: 'meditating',
        nextActionAt: performance.now() + 14000,
      },
      {
        id: 'visitor:doban-3',
        name: '새벽 산책자',
        seat: 4,
        cushion: null,
        pose: 'walk',
        position: { x: -14.5, z: 34.5, yaw: -0.6 },
        waypoints: [
          { x: -14.5, z: 34.5 },
          { x: -20.5, z: 36.0 },
          { x: -12.0, z: 38.5 },
          { x: -4.2, z: 33.0 },
          { x: 0.0, z: 26.0 },
          { x: 4.5, z: 34.0 },
        ],
        wpIndex: 1,
        role: 'walker',
      },
    ];

    // 향로에 피어오르고 있는 기본 향 (최대 5분간 연기가 피어오름)
    const now = Date.now();
    this.incenseOfferings = [
      {
        id: 'incense:initial-1',
        visitorId: 'visitor:doban-1',
        at: now - 45000,
        expiresAt: now + 255000,
      },
    ];

    this.incenseQueue = {
      revision: 1,
      members: [],
      activeId: null,
      expiresAt: 0,
    };

    this.timer = null;
  }

  start() {
    this.syncVisitors();
    this.syncIncense();
    this.timer = setInterval(() => this.tick(), 1200);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getOccupiedCushionSet(excludeSelf = true) {
    const set = new Set();
    if (!excludeSelf && this.selfState.cushion !== null) {
      set.add(this.selfState.cushion);
    }
    for (const npc of this.npcs) {
      if (npc.cushion !== null) set.add(npc.cushion);
    }
    return set;
  }

  /**
   * 플레이어 캐릭터의 이동/자세 변경을 반영합니다.
   */
  updateSelfPosition(x, z, yaw, mode) {
    this.selfState.position = { x, z, yaw };
    this.selfState.pose = mode;
  }

  /**
   * 플레이어가 '자리 앉기' 또는 '배례'를 요청했을 때 빈 방석을 배정합니다.
   */
  async requestSeatForSelf() {
    if (this.selfState.cushion !== null) {
      return this.selfState.cushion;
    }
    const occupied = this.getOccupiedCushionSet(true);
    const pos = this.world?.self?.group?.position ?? this.selfState.position;
    const seatIndex = findNearestAvailableCushion(pos, occupied);
    if (seatIndex !== null) {
      this.selfState.cushion = seatIndex;
    }
    return seatIndex;
  }

  releaseSelfSeat() {
    this.selfState.cushion = null;
  }

  /**
   * 플레이어가 향 올리기(분향) 대기열에 참여할 때 즉시 차례를 부여합니다.
   */
  async joinIncenseQueue() {
    if (!this.incenseQueue.members.includes(this.selfId)) {
      this.incenseQueue.members.push(this.selfId);
    }
    this.incenseQueue.activeId = this.selfId;
    this.incenseQueue.revision++;
    this.incenseQueue.expiresAt = Date.now() + 60000;
    this.world.setIncenseQueue({ ...this.incenseQueue });
    return true;
  }

  leaveIncenseQueue() {
    this.incenseQueue.members = this.incenseQueue.members.filter((id) => id !== this.selfId);
    if (this.incenseQueue.activeId === this.selfId) {
      this.incenseQueue.activeId = this.incenseQueue.members[0] ?? null;
    }
    this.incenseQueue.revision++;
    this.world.setIncenseQueue({ ...this.incenseQueue });
  }

  /**
   * 플레이어가 향로에 향을 꽂았을 때 새로운 향 오브젝트와 연기 리본을 등록합니다.
   */
  async offerIncenseFromSelf() {
    const now = Date.now();
    // 기존 본인 향이 있으면 갱신
    this.incenseOfferings = this.incenseOfferings.filter(
      (item) => item.visitorId !== this.selfId && item.expiresAt > now
    );
    const newOffering = {
      id: `incense:${this.selfId}:${now}`,
      visitorId: this.selfId,
      at: now,
      expiresAt: now + 300000, // 5분간 연기가 피어오름
    };
    this.incenseOfferings.push(newOffering);
    this.syncIncense();
    return true;
  }

  syncIncense() {
    const now = Date.now();
    this.incenseOfferings = this.incenseOfferings.filter((item) => item.expiresAt > now);
    this.world.setIncense([...this.incenseOfferings]);
    this.world.setIncenseQueue({ ...this.incenseQueue });
  }

  syncVisitors() {
    const roster = [this.selfState, ...this.npcs];
    this.world.setVisitors(roster, this.selfId);
  }

  /**
   * 주기적으로 도반(NPC)들의 절하기 및 산책 동선을 업데이트합니다.
   */
  tick() {
    if (!this.world || this.world.disposed || this.world.paused) return;
    const nowPerf = performance.now();
    const nowEpoch = Date.now();
    let rosterChanged = false;

    for (const npc of this.npcs) {
      if (npc.role === 'bowing' && nowPerf >= npc.nextActionAt) {
        npc.bowAt = nowEpoch;
        npc.nextActionAt = nowPerf + 10500 + Math.random() * 4000;
        this.world.visitorEvent(npc.id, 'bow');
      } else if (npc.role === 'meditating' && nowPerf >= npc.nextActionAt) {
        npc.nextActionAt = nowPerf + 16000 + Math.random() * 6000;
        this.world.visitorEvent(npc.id, Math.random() < 0.7 ? 'bow' : 'hello');
      } else if (npc.role === 'walker' && npc.waypoints) {
        const target = npc.waypoints[npc.wpIndex];
        const dx = target.x - npc.position.x;
        const dz = target.z - npc.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.2) {
          npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
        } else {
          const step = Math.min(dist, 1.85);
          npc.position.x += (dx / dist) * step;
          npc.position.z += (dz / dist) * step;
          npc.position.yaw = Math.atan2(-dx, -dz);
          rosterChanged = true;
        }
      }
    }

    if (rosterChanged) {
      this.syncVisitors();
    }
  }

  getVisitorCount() {
    return 1 + this.npcs.length;
  }
}
