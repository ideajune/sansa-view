/**
 * @file main.js
 * @description 산사 (Sansa View) — 청연당(淸緣堂) 3D 온라인 사찰 클린 모듈러 애플리케이션 엔트리포인트.
 *
 * 모듈 구조:
 * - src/config/worldConfig.js       : 법당/정원/방석/분향 의식 좌표 및 조명 팔레트 설정
 * - src/world/Shaders.js            : PBR 텍스처 패킹, 지평선, 연못 수면, 연기 리본, Liquid Glass 셰이더
 * - src/world/SanctuaryBuilder.js   : 청연당 불전, 삼존불, 곡선 기와지붕, 연못, 소나무 숲 빌더
 * - src/world/SansaWorldController.js: 3인칭 카메라, 보행, 착석, 배례, 분향, 군중 배칭 월드 컨트롤러
 * - src/character/Pathfinding.js    : 지형 높이, 보행 가능 영역, A* 최단 경로 탐색
 * - src/character/MonkController.js : 동자승 2-Bone IK 캐릭터 및 자율 참배객 시뮬레이터
 * - src/ui/PrayerBeadsView.js       : 108 염주 3D 인터랙티브 뷰
 * - src/ui/MoktakView.js            : 목탁 수동 타격 및 16박 가속 자동재생 뷰
 * - src/audio/SoundEngine.js        : Web Audio API 절차적 사운드 합성 엔진
 */

import { createSansaWorldController } from './src/world/SansaWorldController.js';
import { TELEPORT_LOCATIONS } from './src/world/SanctuaryBuilder.js';
import { VisitorSimulator } from './src/character/MonkController.js';
import { createPrayerBeadsView } from './src/ui/PrayerBeadsView.js';
import { createMoktakView } from './src/ui/MoktakView.js';
import { SoundEngine } from './src/audio/SoundEngine.js';

class SansaApp {
  constructor() {
    this.hostEl = document.getElementById('sansa-viewport');
    this.loadingEl = document.getElementById('sansa-loading');
    this.loadingStatusEl = document.getElementById('sansa-loading-status');
    this.spaceTitleEl = document.getElementById('hud-space-title');
    this.spaceSubEl = document.getElementById('hud-space-sub');
    this.visitorCountEl = document.getElementById('hud-visitor-count');
    this.toastEl = document.getElementById('sansa-toast');

    // 하단 수행 버튼
    this.btnGreet = document.getElementById('btn-greet');
    this.btnBow = document.getElementById('btn-bow');
    this.btnBeads = document.getElementById('btn-beads');
    this.btnMoktak = document.getElementById('btn-moktak');
    this.btnSeat = document.getElementById('btn-seat');

    // 상단 환경/시점 제어 버튼
    this.btnLight = document.getElementById('btn-light');
    this.btnAudio = document.getElementById('btn-audio');
    this.btnTriadView = document.getElementById('btn-triad-view');
    this.selectLocation = document.getElementById('select-location');
    this.supportDialog = document.getElementById('support-dialog');
    this.btnCloseSupport = document.getElementById('btn-close-support');

    this.sound = new SoundEngine();
    this.world = null;
    this.simulator = null;
    this.beadsView = null;
    this.moktakView = null;
    this.toastTimer = null;
    this.currentMode = 'walk';
    this.isSeating = false;
    this.isBowRepeating = false;
  }

  async init() {
    this.setLoadingStatus('청연당(淸緣堂)과 아미타삼존불을 모시는 중...');

    // 1. 3D 산사 월드 컨트롤러 생성
    this.world = createSansaWorldController(this.hostEl, {
      onSpace: (space) => this.handleSpaceChange(space),
      onMode: (mode) => this.handleModeChange(mode),
      onMove: (x, z, yaw, mode) => {
        this.simulator?.updateSelfPosition(x, z, yaw, mode);
      },
      onAction: (action) => this.handleCharacterAction(action),
      onTravel: () => {},
      onWalkFailure: () => {
        this.showToast('그곳으로는 걸어갈 수 없습니다.');
      },
      onSeating: (seating) => {
        this.isSeating = seating;
        this.updateActionButtons();
      },
      onSeatRequest: async () => {
        const seat = await this.simulator.requestSeatForSelf();
        return seat;
      },
      onSeatFailure: () => {
        this.showToast('방석으로 이동하지 못했습니다. 조금 더 가까이 다가가 보세요.');
      },
      onStand: () => {
        this.simulator?.releaseSelfSeat();
        this.updateActionButtons();
      },
      onBowState: (repeating, finishing) => {
        this.isBowRepeating = repeating;
        this.updateActionButtons(finishing);
      },
      onGreetingState: (active) => {
        this.btnGreet?.classList.toggle('is-active', active);
      },
      onIncenseJoin: () => this.simulator.joinIncenseQueue(),
      onIncenseLeave: () => this.simulator.leaveIncenseQueue(),
      onIncenseStart: () => {
        this.sound.playTempleBell(0.75);
      },
      onIncenseOffer: () => this.simulator.offerIncenseFromSelf(),
      onSupport: () => this.openSupportDialog(),
      incenseNow: () => Date.now(),
    });

    // 2. 상주 스님 및 도반(참배객) 시뮬레이터 시작
    this.simulator = new VisitorSimulator(this.world);
    this.simulator.start();
    this.updateVisitorBadge();

    // 3. 108 염주 3D 인터랙티브 뷰 초기화
    this.beadsView = createPrayerBeadsView(document.body, {
      onStep: (stepIndex, total) => {
        this.world.beadStep();
        this.sound.playBeadClick();
        if (total > 0 && total % 108 === 0) {
          this.sound.playTempleBell(0.85);
          this.showToast(`108배 염주 한 바퀴(${total}알)를 원만히 회향하였습니다.`);
        }
      },
      onClose: () => {
        this.world.setPaused(false);
        if (this.world.mode === 'beads') {
          this.world.setMode(this.world.cushion !== null ? 'kneel' : 'walk');
        }
        this.updateActionButtons();
      },
      onToggleAudio: async () => {
        const enabled = await this.sound.toggle();
        this.syncAudioUI(enabled);
      },
    });

    // 4. 목탁 수동/16박 자동재생 뷰 초기화
    this.moktakView = createMoktakView(document.body, {
      audio: this.sound,
      onHit: () => {},
      onClose: () => {
        this.btnMoktak?.classList.remove('is-active');
      },
    });

    this.bindUIEvents();

    // 5. 씬 준비 완료 대기
    try {
      await this.world.ready;
      this.setLoadingStatus('연등 산책길과 소나무 숲을 단장하는 중...');
      this.hideLoadingOverlay();
    } catch (err) {
      console.error('산사 월드 초기화 오류:', err);
      this.setLoadingStatus('장면을 불러오는 중 오류가 발생했습니다. 새로고침 해주세요.');
    }
  }

  bindUIEvents() {
    // 합장 인사
    this.btnGreet?.addEventListener('click', () => {
      this.world.greet();
      this.sound.playWindChime();
    });

    // 절하기 (배례)
    this.btnBow?.addEventListener('click', () => {
      if (this.world.space !== 'hall') {
        this.showToast('청연당 법당 안으로 들어가거나 [청연당 법당]으로 이동해 절을 올려보세요.');
        this.world.teleportTo('hallCenter');
        this.selectLocation.value = 'hallCenter';
        setTimeout(() => this.world.bow(), 350);
        return;
      }
      this.world.bow();
    });

    // 108 염주 돌리기
    this.btnBeads?.addEventListener('click', () => {
      if (this.moktakView?.isVisible) {
        this.moktakView.hide();
        this.btnMoktak?.classList.remove('is-active');
      }
      this.world.setMode('beads');
      this.world.setPaused(true);
      this.beadsView.setAudioState(this.sound.enabled);
      this.beadsView.show(this.btnBeads);
      this.updateActionButtons();
    });

    // 목탁 두드리기 / 자동재생
    this.btnMoktak?.addEventListener('click', async () => {
      if (this.moktakView.isVisible) {
        this.moktakView.hide();
        this.btnMoktak.classList.remove('is-active');
      } else {
        if (!this.sound.enabled) {
          const enabled = await this.sound.setEnabled(true);
          this.syncAudioUI(enabled);
        }
        this.moktakView.show();
        this.btnMoktak.classList.add('is-active');
      }
    });

    // 방석 자리 앉기 / 일어서기
    this.btnSeat?.addEventListener('click', () => {
      if (this.world.mode === 'kneel' || this.world.isSeating) {
        this.world.stopBow(true);
        this.world.setMode('walk');
        this.showToast('자리에서 일어났습니다. 바닥을 클릭하거나 방향키로 산책해 보세요.');
      } else {
        if (this.world.space !== 'hall') {
          this.world.teleportTo('hallCenter');
          this.selectLocation.value = 'hallCenter';
        }
        this.world.returnToSeat(false);
        this.showToast('빈 참배 방석으로 걸어가 앉습니다.');
      }
    });

    // 낮 / 밤 조명 전환
    this.btnLight?.addEventListener('click', () => {
      const nextLight = this.world.lightMode === 'day' ? 'night' : 'day';
      this.world.setLight(nextLight);
      const labelEl = this.btnLight.querySelector('.hud-btn-label');
      if (labelEl) {
        labelEl.textContent = nextLight === 'day' ? '낮 (주간)' : '밤 (야간 연등)';
      }
      this.btnLight.setAttribute('aria-pressed', String(nextLight === 'night'));
      this.showToast(
        nextLight === 'night'
          ? '산사에 밤이 찾아와 연등과 석등에 불이 켜집니다.'
          : '산사에 고요한 아침 햇살이 비춥니다.'
      );
    });

    // 소리 켜기 / 끄기
    this.btnAudio?.addEventListener('click', async () => {
      const enabled = await this.sound.toggle();
      this.syncAudioUI(enabled);
      if (enabled) {
        this.sound.playTempleBell(0.5);
        this.showToast('산사 자연의 소리와 효과음을 켰습니다.');
      } else {
        this.showToast('소리를 껐습니다.');
      }
    });

    // 삼존불 참배 시점 토글
    this.btnTriadView?.addEventListener('click', () => {
      const current = this.world.triadReview;
      const next = current === '' ? 'front' : current === 'front' ? 'near' : '';
      this.world.setCameraPreset(next);
      const labelEl = this.btnTriadView.querySelector('.hud-btn-label');
      if (labelEl) {
        labelEl.textContent =
          next === 'front' ? '삼존불 전경' : next === 'near' ? '삼존불 근접' : '3인칭 시점';
      }
      this.btnTriadView.classList.toggle('is-active', next !== '');
    });

    // 빠른 공간 이동 셀렉트
    this.selectLocation?.addEventListener('change', (e) => {
      const key = e.target.value;
      if (TELEPORT_LOCATIONS[key]) {
        this.world.teleportTo(key);
        this.showToast(`${TELEPORT_LOCATIONS[key].label}(으)로 이동했습니다.`);
      }
    });

    // 복전함 모달 닫기
    this.btnCloseSupport?.addEventListener('click', () => {
      this.supportDialog?.close();
    });
    this.supportDialog?.addEventListener('click', (e) => {
      if (e.target === this.supportDialog) {
        this.supportDialog.close();
      }
    });
  }

  syncAudioUI(enabled) {
    this.btnAudio?.setAttribute('aria-pressed', String(enabled));
    this.btnAudio?.classList.toggle('is-active', enabled);
    const labelEl = this.btnAudio?.querySelector('.hud-btn-label');
    if (labelEl) {
      labelEl.textContent = enabled ? '소리 켜짐' : '소리 켜기';
    }
    this.beadsView?.setAudioState(enabled);
  }

  handleSpaceChange(space) {
    if (space === 'hall') {
      this.spaceTitleEl.textContent = '청연당 · 淸緣堂';
      this.spaceSubEl.textContent = '아미타삼존불을 모신 산사 법당';
    } else {
      this.spaceTitleEl.textContent = '마당 · 연등 산책길';
      this.spaceSubEl.textContent = '연꽃 연못과 소나무 숲이 이어지는 도량';
    }
    this.updateActionButtons();
  }

  handleModeChange(mode) {
    this.currentMode = mode;
    this.updateActionButtons();
  }

  handleCharacterAction(action) {
    if (action === 'bow') {
      this.sound.playTempleBell(0.45);
    } else if (action === 'hello') {
      this.sound.playWindChime();
    }
  }

  updateActionButtons(bowFinishing = false) {
    const isKneeling = this.currentMode === 'kneel';
    if (this.btnSeat) {
      const label = this.btnSeat.querySelector('span');
      if (label) {
        label.textContent = isKneeling || this.isSeating ? '일어서기' : '자리 앉기';
      }
      this.btnSeat.classList.toggle('is-active', isKneeling || this.isSeating);
    }

    if (this.btnBow) {
      const label = this.btnBow.querySelector('span');
      if (label) {
        label.textContent = this.isBowRepeating
          ? '절 멈추기'
          : bowFinishing
            ? '절 마무리 중'
            : '절하기 (배례)';
      }
      this.btnBow.classList.toggle('is-active', this.isBowRepeating);
    }
  }

  updateVisitorBadge() {
    if (this.visitorCountEl && this.simulator) {
      this.visitorCountEl.textContent = `${this.simulator.getVisitorCount()}명 참배 중`;
    }
  }

  openSupportDialog() {
    if (this.supportDialog && !this.supportDialog.open) {
      this.supportDialog.showModal();
      this.sound.playTempleBell(0.6);
    }
  }

  setLoadingStatus(message) {
    if (this.loadingStatusEl) {
      this.loadingStatusEl.textContent = message;
    }
  }

  hideLoadingOverlay() {
    if (!this.loadingEl) return;
    this.loadingEl.classList.add('is-hidden');
    setTimeout(() => {
      this.loadingEl.hidden = true;
    }, 650);
  }

  showToast(message, durationMs = 3200) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.hidden = false;
    this.toastEl.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, durationMs);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new SansaApp();
  app.init();
  window.SANSA_APP = app;
});
