/**
 * @file src/audio/SoundEngine.js
 * @description 산사(Sansa Temple) Web Audio API 절차적 사운드 합성 엔진.
 * 외부 MP3/WAV 파일 없이 실시간 물리 모델링/배음 합성으로 다음 소리를 생성합니다:
 * 1. 목탁(Moktak) 속 빈 참나무 공명음 (665Hz 기본음 + 피치 드롭 어택 + 목질 노이즈)
 * 2. 108 염주(Prayer Beads) 알 부딪히는 건조한 나무 클릭음
 * 3. 산사 범종(Temple Bell) 맥놀이(Beating 3.3Hz) 및 청동 배음 울림
 * 4. 처마 끝 풍경(Wind Chime) 맑은 금속성 여운
 * 5. 산사 계곡 바람과 물소리 앰비언트 (Pink/Brown Filtered Noise)
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.ambientGain = null;
    this.ambientNodes = [];
    this.chimeTimer = null;
  }

  async prepare() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx.state === 'running';
  }

  getTime() {
    if (!this.ctx) return null;
    return this.ctx.currentTime;
  }

  async setEnabled(enable) {
    this.enabled = Boolean(enable);
    if (this.enabled) {
      await this.prepare();
      this.startAmbient();
    } else {
      this.stopAmbient();
    }
    return this.enabled;
  }

  async toggle() {
    return this.setEnabled(!this.enabled);
  }

  /**
   * 산사 솔바람 및 먼 계곡 물소리 배경음 시작
   */
  startAmbient() {
    if (!this.ctx || this.ambientNodes.length > 0) return;

    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.03;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 0.85;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 1.8);

    source.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);
    source.start();

    this.ambientGain = master;
    this.ambientNodes = [source, filter, master];

    // 간헐적 처마 풍경 소리
    this.chimeTimer = setInterval(() => {
      if (this.enabled && !document.hidden && Math.random() < 0.42) {
        this.playWindChime();
      }
    }, 9500);
  }

  stopAmbient() {
    if (this.chimeTimer) {
      clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }
    for (const node of this.ambientNodes) {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch {}
    }
    this.ambientNodes = [];
    this.ambientGain = null;
  }

  /**
   * 목탁(Moktak) 타격음 예약 스케줄링 (수동 타격 및 16박 자동재생 공용)
   * @param {number} targetTime AudioContext 기준 목표 시각(초)
   * @param {number} strength 타격 강도 (0.05 ~ 1.0)
   * @returns {(() => void) | null} 예약 취소 함수
   */
  scheduleHit(targetTime, strength = 0.9) {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const t0 = Math.max(ctx.currentTime, targetTime);
    const amp = Math.max(0.05, Math.min(1, strength)) * 0.46;

    // 1. 주 공명통 (Hollow wooden cavity fundamental ~665Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(735, t0);
    osc1.frequency.exponentialRampToValueAtTime(662, t0 + 0.022);
    osc1.frequency.exponentialRampToValueAtTime(648, t0 + 0.24);

    gain1.gain.setValueAtTime(0.0001, t0);
    gain1.gain.linearRampToValueAtTime(amp, t0 + 0.003);
    gain1.gain.exponentialRampToValueAtTime(amp * 0.22, t0 + 0.065);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);

    // 2. 제2 배음 (Wood body overtone ~1380Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1440, t0);
    osc2.frequency.exponentialRampToValueAtTime(1345, t0 + 0.03);

    gain2.gain.setValueAtTime(0.0001, t0);
    gain2.gain.linearRampToValueAtTime(amp * 0.36, t0 + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 0.28);
    osc2.stop(t0 + 0.09);

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        gain1.disconnect();
        gain2.disconnect();
      } catch {}
    };
  }

  /**
   * 108 염주 알 넘기는 짧은 나무 마찰 클릭음
   */
  playBeadClick() {
    if (!this.enabled && !this.ctx) return;
    this.prepare().then((ok) => {
      if (!ok || !this.ctx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520 + Math.random() * 45, t0);
      osc.frequency.exponentialRampToValueAtTime(290, t0 + 0.045);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.06);
    });
  }

  /**
   * 합장 인사 / 배례 / 분향 시 은은한 사찰 범종(풍경) 울림
   */
  playTempleBell(intensity = 0.65) {
    if (!this.enabled) return;
    this.prepare().then((ok) => {
      if (!ok || !this.ctx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      // 한국 전통 범종의 맥놀이(Beating) 주파수 쌍과 배음
      const partials = [
        { freq: 164.0, amp: 0.22, decay: 4.2 },
        { freq: 167.3, amp: 0.19, decay: 4.0 }, // 3.3Hz 맥놀이
        { freq: 438.0, amp: 0.12, decay: 2.8 },
        { freq: 786.0, amp: 0.06, decay: 1.7 },
      ];

      for (const p of partials) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, t0);
        const peak = p.amp * intensity;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(peak, t0 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + p.decay + 0.05);
      }
    });
  }

  /**
   * 처마 끝 풍경(Wind Chime) 소리
   */
  playWindChime() {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const baseFreq = [1180, 1320, 1568, 1760][Math.floor(Math.random() * 4)];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.045, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 2.0);
  }
}
