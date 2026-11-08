/**
 * @file src/ui/MoktakView.js
 * @description 목탁(Moktak) 수동 타격 및 16박 가속 수렴형 자동재생(Auto-play Rhythm) 뷰 모듈.
 * - 전통 사찰 독경용 목탁의 16박 가속 시퀀스(MOKTAK_RHYTHM_PATTERN) 스케줄러
 * - 외부 이미지 에셋 의존성 없이 선명하게 렌더링되는 따뜻한 목조 목탁 SVG 일러스트 내장
 * - Web Animations API 기반 타격 탄성 피드백 애니메이션
 * (sansatemple.com 클린 코드 재구성본)
 */

const CYCLE_DURATION_SEC = 12.0;
const START_OFFSET_SEC = 0.012;
const LOOKAHEAD_WINDOW_SEC = 0.14;
const DRIFT_TOLERANCE_SEC = 0.05;

/**
 * 전통 사찰 목탁의 16박 가속 수렴 리듬 패턴 [시각(초), 타격 강도(0~1)]
 * 처음에는 1.2초 간격으로 천천히 시작하여 후반부에 잦아들며 빠르게 수렴합니다.
 */
export const MOKTAK_RHYTHM_PATTERN = Object.freeze([
  [0.0, 0.95],
  [1.2, 0.95],
  [2.4, 0.94],
  [3.6, 0.92],
  [4.7, 0.91],
  [5.65, 0.9],
  [6.45, 0.84],
  [7.1, 0.75],
  [7.62, 0.65],
  [8.02, 0.54],
  [8.32, 0.43],
  [8.54, 0.32],
  [8.7, 0.23],
  [8.82, 0.16],
  [8.92, 0.11],
  [9.01, 0.07],
]);

/**
 * 목탁 16박 리듬 타임라인 생성기 (원본 `WM` 클래스 클린 재구성)
 */
export class MoktakRhythmTimeline {
  constructor() {
    this.nextTime = 0;
    this.index = 0;
    this.running = false;
  }

  get isPlaying() {
    return this.running;
  }

  get nextEventTime() {
    return this.nextTime;
  }

  start(currentTime) {
    if (!Number.isFinite(currentTime) || currentTime < 0) return false;
    this.index = 0;
    this.nextTime = currentTime + START_OFFSET_SEC;
    this.running = true;
    return true;
  }

  pause() {
    this.running = false;
  }

  take(currentTime) {
    if (!this.running) return [];
    if (!Number.isFinite(currentTime) || currentTime < 0) {
      this.pause();
      return [];
    }
    if (this.nextTime < currentTime - DRIFT_TOLERANCE_SEC) {
      this.index = 0;
      this.nextTime = currentTime + START_OFFSET_SEC;
    }

    const events = [];
    while (this.nextTime <= currentTime + LOOKAHEAD_WINDOW_SEC && events.length < 4) {
      const [beatOffset, strength] = MOKTAK_RHYTHM_PATTERN[this.index];
      if (this.nextTime >= currentTime) {
        events.push({ time: this.nextTime, strength });
      }
      const nextIndex = (this.index + 1) % MOKTAK_RHYTHM_PATTERN.length;
      const nextOffset =
        nextIndex === 0 ? CYCLE_DURATION_SEC : MOKTAK_RHYTHM_PATTERN[nextIndex][0];
      this.nextTime += nextOffset - beatOffset;
      this.index = nextIndex;
    }
    return events;
  }
}

/**
 * 오디오 컨텍스트 시계 기반 Lookahead 스케줄러 (원본 `qM` 클래스 클린 재구성)
 */
export class MoktakAutoPlayer {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.rhythm = new MoktakRhythmTimeline();
    this.timer = undefined;
    this.pending = [];
    this.lastTime = null;
    this.destroyed = false;
  }

  get isPlaying() {
    return this.rhythm.isPlaying;
  }

  start() {
    if (this.destroyed) return false;
    if (this.isPlaying) return true;
    const now = this.callbacks.getTime();
    if (now === null || !this.rhythm.start(now)) return false;
    this.lastTime = now;
    this.callbacks.onPlayingChange?.(true);
    this.wake();
    return this.isPlaying;
  }

  pause() {
    const wasPlaying = this.isPlaying;
    this.rhythm.pause();
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.lastTime = null;
    for (const item of this.pending) {
      try {
        item.cancel();
      } catch {}
    }
    this.pending = [];
    if (wasPlaying) {
      this.callbacks.onPlayingChange?.(false);
    }
  }

  destroy() {
    this.pause();
    this.destroyed = true;
  }

  wake() {
    this.timer = undefined;
    if (this.destroyed || !this.isPlaying) return;
    const now = this.callbacks.getTime();
    if (now === null || !Number.isFinite(now) || now < 0) {
      this.unavailable();
      return;
    }
    if (this.lastTime !== null && now < this.lastTime - 0.001) {
      this.unavailable();
      return;
    }
    this.lastTime = now;
    this.pending = this.pending.filter((item) => item.time + 2 > now);

    for (const beat of this.rhythm.take(now)) {
      let cancelFn;
      try {
        cancelFn = this.callbacks.scheduleHit(beat.time, beat.strength);
      } catch {
        this.unavailable();
        return;
      }
      if (!cancelFn) {
        this.unavailable();
        return;
      }
      this.pending.push({ time: beat.time, cancel: cancelFn });
    }

    const delayMs = Math.max(
      25,
      Math.min(500, (this.rhythm.nextEventTime - now - LOOKAHEAD_WINDOW_SEC) * 1000)
    );
    this.timer = setTimeout(() => this.wake(), delayMs);
  }

  unavailable() {
    this.pause();
    this.callbacks.onUnavailable?.();
  }
}

const iconSvg = (pathMarkup) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathMarkup}</svg>`;

const PLAY_ICON = iconSvg('<path d="m8 5 11 7-11 7Z"/>');
const PAUSE_ICON = iconSvg('<path d="M8 5v14M16 5v14"/>');
const CLOSE_ICON = iconSvg('<path d="m7 7 10 10M17 7 7 17"/>');

/**
 * 정교한 전통 목탁(木鐸) 고해상도 벡터 일러스트 Data URI 생성
 */
function createMoktakArtworkDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 320" fill="none">
    <defs>
      <radialGradient id="mokBody" cx="38%" cy="32%" r="68%">
        <stop offset="0%" stop-color="#e7b980"/>
        <stop offset="42%" stop-color="#c4884b"/>
        <stop offset="78%" stop-color="#945b27"/>
        <stop offset="100%" stop-color="#613713"/>
      </radialGradient>
      <linearGradient id="mokHandle" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#cfa068"/>
        <stop offset="55%" stop-color="#9e6632"/>
        <stop offset="100%" stop-color="#693d16"/>
      </linearGradient>
      <radialGradient id="mokHollow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#1d0d04"/>
        <stop offset="75%" stop-color="#351908"/>
        <stop offset="100%" stop-color="#532a10"/>
      </radialGradient>
      <filter id="mokShadow" x="-15%" y="-15%" width="130%" height="135%">
        <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#0b0805" flood-opacity="0.48"/>
      </filter>
    </defs>
    <g filter="url(#mokShadow)">
      <!-- 목탁 손잡이 -->
      <path d="M235 162 C275 160, 312 176, 322 198 C330 215, 312 232, 286 226 C262 220, 244 202, 224 196 Z" fill="url(#mokHandle)"/>
      <!-- 목탁 몸체 (둥근 울림통) -->
      <path d="M56 158 C52 88, 114 44, 184 50 C244 55, 278 98, 274 156 C270 218, 222 258, 156 256 C94 254, 59 214, 56 158 Z" fill="url(#mokBody)"/>
      <!-- 나뭇결 하이라이트 곡선 -->
      <path d="M84 114 C118 76, 186 70, 232 98" stroke="#f7dbb0" stroke-width="3" stroke-linecap="round" opacity="0.32"/>
      <path d="M76 140 C118 102, 194 96, 246 128" stroke="#592e0d" stroke-width="2" stroke-linecap="round" opacity="0.22"/>
      <!-- 목탁 공명 구멍(물고기 입과 눈 문양) -->
      <path d="M57 166 C94 158, 142 162, 178 176 C192 181, 194 196, 178 201 C140 212, 92 206, 61 190 Z" fill="url(#mokHollow)"/>
      <circle cx="182" cy="186" r="19" fill="url(#mokHollow)"/>
      <circle cx="182" cy="186" r="19" stroke="#7c461b" stroke-width="2.5" opacity="0.7"/>
      <!-- 은은한 상단 광택 -->
      <ellipse cx="148" cy="88" rx="52" ry="18" transform="rotate(-10 148 88)" fill="#fff2d6" opacity="0.18"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * 목탁 인터랙티브 뷰를 생성하여 지정된 컨테이너에 마운트합니다. (원본 `XM` 함수 클린 재구성)
 */
export function createMoktakView(hostElement, options) {
  const abort = new AbortController();
  const section = document.createElement('section');
  section.className = 'sansa-moktak-view';
  section.hidden = true;
  section.setAttribute('aria-hidden', 'true');
  section.setAttribute('aria-label', '목탁');

  const artworkSrc = createMoktakArtworkDataUri();

  section.innerHTML = `
    <button type="button" class="moktak-instrument" aria-label="목탁 두드리기 (클릭 또는 스페이스바)">
      <img src="${artworkSrc}" alt="전통 목탁" draggable="false">
      <span class="moktak-ripple" aria-hidden="true"></span>
    </button>
    <div class="moktak-controls" aria-label="목탁 조작">
      <button type="button" class="moktak-play" data-liquid-glass aria-pressed="false">
        ${PLAY_ICON}<span>자동재생</span>
      </button>
      <button type="button" class="moktak-close" data-liquid-glass aria-label="목탁 닫기">
        ${CLOSE_ICON}
      </button>
    </div>
    <span class="moktak-status" role="status" aria-live="polite">목탁을 가볍게 눌러 소리를 내어 보세요</span>
  `;

  hostElement.append(section);

  const instrumentBtn = section.querySelector('.moktak-instrument');
  const playBtn = section.querySelector('.moktak-play');
  const closeBtn = section.querySelector('.moktak-close');
  const statusEl = section.querySelector('.moktak-status');

  let visible = false;
  let destroyed = false;
  let audioAnimation;
  let hitCount = 0;
  const scheduledVisualTimers = new Set();

  function updatePlayButtonState(playing) {
    playBtn.innerHTML = `${playing ? PAUSE_ICON : PLAY_ICON}<span>${playing ? '일시정지' : '자동재생'}</span>`;
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? '목탁 자동재생 일시정지' : '목탁 자동재생');
    statusEl.textContent = playing
      ? '목탁 16박 자동재생 중입니다 · 마음을 호흡에 맞춰 보세요'
      : '목탁 자동재생을 멈췄습니다';
  }

  function animateStrike() {
    if (destroyed || !visible || document.hidden) return;
    audioAnimation?.cancel();
    audioAnimation = instrumentBtn.animate?.(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(0.95) rotate(-1.6deg)', offset: 0.24 },
        { transform: 'scale(1.01) rotate(0.4deg)', offset: 0.65 },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 145, easing: ' ease-out' }
    );
  }

  function scheduleBeatWithVisual(targetTime, strength) {
    if (destroyed || !visible) return null;
    const cancelAudio = options.audio.scheduleHit(targetTime, strength);
    if (!cancelAudio) return null;
    const now = options.audio.getTime();
    if (now === null) {
      cancelAudio();
      return null;
    }
    const delayMs = Math.max(0, (targetTime - now) * 1000);
    const timerId = setTimeout(() => {
      scheduledVisualTimers.delete(timerId);
      animateStrike();
      hitCount++;
      options.onHit?.(strength, hitCount);
    }, delayMs);
    scheduledVisualTimers.add(timerId);

    return () => {
      clearTimeout(timerId);
      scheduledVisualTimers.delete(timerId);
      cancelAudio();
    };
  }

  const autoPlayer = new MoktakAutoPlayer({
    getTime: () => (!destroyed && visible ? options.audio.getTime() : null),
    scheduleHit: scheduleBeatWithVisual,
    onPlayingChange: updatePlayButtonState,
  });

  function stopAll() {
    autoPlayer.pause();
    for (const timerId of scheduledVisualTimers) {
      clearTimeout(timerId);
    }
    scheduledVisualTimers.clear();
    audioAnimation?.cancel();
  }

  async function strikeOnce() {
    if (destroyed || !visible) return;
    stopAll();
    animateStrike();
    await options.audio.prepare();
    const now = options.audio.getTime();
    if (now !== null) {
      options.audio.scheduleHit(now, 0.95);
      hitCount++;
      statusEl.textContent = `목탁 ${hitCount}타 · 맑은 울림이 법당에 번집니다`;
      options.onHit?.(0.95, hitCount);
    }
  }

  async function toggleAutoPlay() {
    if (destroyed || !visible) return;
    if (autoPlayer.isPlaying) {
      stopAll();
      return;
    }
    await options.audio.prepare();
    autoPlayer.start();
  }

  function hide() {
    if (destroyed || !visible) return;
    visible = false;
    stopAll();
    section.classList.remove('is-visible');
    section.hidden = true;
    section.setAttribute('aria-hidden', 'true');
  }

  function closeWithCallback() {
    hide();
    options.onClose?.();
  }

  instrumentBtn.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button === 0) {
        e.preventDefault();
        strikeOnce();
      }
    },
    { signal: abort.signal }
  );

  playBtn.addEventListener('click', toggleAutoPlay, { signal: abort.signal });
  closeBtn.addEventListener('click', closeWithCallback, { signal: abort.signal });

  section.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWithCallback();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement === instrumentBtn) {
          e.preventDefault();
          strikeOnce();
        }
      }
    },
    { signal: abort.signal }
  );

  return {
    show() {
      if (destroyed || visible) return;
      visible = true;
      section.hidden = false;
      section.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => section.classList.add('is-visible'));
      instrumentBtn.focus({ preventScroll: true });
    },
    hide,
    get isVisible() {
      return visible;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopAll();
      autoPlayer.destroy();
      abort.abort();
      section.remove();
    },
  };
}
