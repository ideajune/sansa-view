/**
 * @file src/ui/PrayerBeadsView.js
 * @description 108 염주(Prayer Beads) 3D 인터랙티브 수행 뷰 모듈.
 * - 절차적 2D 캔버스 나뭇결(Wood Grain) 텍스처 합성
 * - LatheGeometry 기반 염주 알 지오메트리 및 경기장형(Stadium Curve) 108알 궤적
 * - 포인터 드래그/마우스 휠/키보드 방향키 물리 관성 회전 및 108배 카운터
 * (sansatemple.com 클린 코드 재구성본)
 */

/**
 * 108 염주 수행 뷰를 생성하여 지정된 컨테이너(hostElement)에 마운트합니다.
 *
 * @param {HTMLElement} hostElement 염주 뷰가 삽입될 부모 요소
 * @param {object} callbacks
 * @param {() => void} callbacks.onStep 염주 한 알이 넘어갈 때 호출되는 콜백
 * @param {() => void} callbacks.onClose 염주 접기 버튼을 눌렀을 때 호출되는 콜백
 * @param {() => void} [callbacks.onToggleAudio] 상단 소리 켜기/끄기 토글 콜백
 * @param {(err: Error) => void} [callbacks.onError] WebGL 컨텍스트 오류 콜백
 */
export function createPrayerBeadsView(hostElement, callbacks) {
  const core = window.SANSA_CORE;
  if (!core || typeof core.PrayerBeadsView !== 'function') {
    throw new Error('SANSA_CORE.PrayerBeadsView is not available.');
  }
  return core.PrayerBeadsView(hostElement, callbacks);
}
