/**
 * @file src/world/Shaders.js
 * @description 산사(Sansa Temple) 커스텀 GLSL 셰이더 및 PBR 재질 파이프라인 모듈.
 * - Normal + Roughness GPU 채널 패킹 (sansaPackedSurface)
 * - 연속 산림 지평선 셰이더 (attachLandscapeHorizon)
 * - 연꽃 연못 수면 잔물결 및 연등 반영 셰이더 (enhanceWaterMaterial)
 * - Liquid Glass UI 굴절 후처리 패스 (LiquidGlassRefractionPass)
 * (sansatemple.com 클린 코드 재구성본)
 */

/**
 * 1. Normal + Roughness GPU 패킹 프래그먼트 셰이더
 * RGB 채널에는 Normal Map, Alpha 채널에는 Roughness Map을 단일 텍스처로 병합하여
 * 텍스처 샘플러 슬롯을 절약합니다.
 */
export const PACKED_SURFACE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const PACKED_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uNormalMap;
  uniform sampler2D uRoughnessMap;
  void main() {
    vec3 normalSample = texture2D(uNormalMap, vUv).rgb;
    float roughnessSample = texture2D(uRoughnessMap, vUv).r;
    gl_FragColor = vec4(normalSample, roughnessSample);
  }
`;

/**
 * 2. 원경 산림 파노라마 & 지형 연속 블렌딩 셰이더 (Landscape Horizon Shader)
 * 정원 바닥 지형(MeshStandardMaterial)이 멀어질수록 woodland.jpg 파노라마 환경맵과
 * 경계선 없이 부드럽게 이어지도록 onBeforeCompile을 통해 주입되는 GLSL 코드입니다.
 */
export const LANDSCAPE_HORIZON_SHADER_SNIPPETS = Object.freeze({
  vertexPars: /* glsl */ `
    varying vec3 vLandscapeWorldPos;
  `,
  vertexProject: /* glsl */ `
    #include <project_vertex>
    vLandscapeWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  `,
  fragmentPars: /* glsl */ `
    uniform float uHorizonNight;
    varying vec3 vLandscapeWorldPos;
  `,
  fragmentBlend: /* glsl */ `
    float horizonDist = length(vLandscapeWorldPos.xz - vec2(0.0, 12.0));
    float horizonBlend = smoothstep(52.0, 148.0, horizonDist);
    vec3 dayHorizon = vec3(0.76, 0.82, 0.75);
    vec3 nightHorizon = vec3(0.11, 0.14, 0.21);
    vec3 targetHorizon = mix(dayHorizon, nightHorizon, uHorizonNight);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, targetHorizon, horizonBlend * 0.88);
  `,
});

/**
 * 3. 연꽃 연못 수면 셰이더 (Woodland Pond Water Shader)
 * 다중 주파수 사인파 잔물결 법선 섭동(Normal Perturbation), 프레넬(Fresnel) 반사,
 * 그리고 물 위 연등(Lotus Lantern)의 따뜻한 불빛이 수면에 길게 늘어지는 반영을 계산합니다.
 */
export const WATER_RIPPLE_FRAGMENT_PARS = /* glsl */ `
  uniform float uWaterTime;
  uniform float uWaterNight;
  uniform vec4 uWaterLanterns[8];
  varying vec3 vWaterWorldPos;

  vec2 computeWaterRipple(vec2 p, float t) {
    float w1 = sin(p.x * 2.7 + p.y * 1.9 + t * 1.45);
    float w2 = cos(p.x * 3.8 - p.y * 2.6 - t * 1.15);
    float w3 = sin((p.x + p.y) * 5.2 + t * 1.85);
    return vec2(w1 + w3 * 0.45, w2 - w3 * 0.35) * 0.018;
  }
`;

/**
 * 4. 향로 연기 리본 셰이더 (Incense Rising Smoke Ribbon Shader)
 * 참배객이 올린 향 끝에서 피어오르는 연기가 위로 올라갈수록
 * 부드럽게 굽이치며 흩어지는 절차적 버텍스/프래그먼트 셰이더입니다.
 */
export const INCENSE_SMOKE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uFade;
  varying vec2 vUv;
  varying float vFade;

  void main() {
    vUv = uv;
    vFade = uFade;
    float h = clamp(uv.y, 0.0, 1.0);
    vec3 pos = position;
    float waveA = sin(h * 7.2 - uTime * 1.65 + uSeed * 6.2831);
    float waveB = cos(h * 11.5 - uTime * 2.2 + uSeed * 4.12);
    pos.x += (waveA * 0.032 + waveB * 0.014) * pow(h, 1.25);
    pos.z += (waveB * 0.026 - waveA * 0.012) * pow(h, 1.25);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const INCENSE_SMOKE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying float vFade;

  void main() {
    float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float vertical = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
    float alpha = pow(max(0.0, edge), 1.8) * vertical * 0.24 * vFade;
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(vec3(0.92, 0.90, 0.86), alpha);
  }
`;

/**
 * 5. Liquid Glass UI 굴절 후처리 셰이더 (Glass Bevel Refraction Pass)
 * `[data-liquid-glass]` 속성이 지정된 UI 버튼/배너 영역의 뒷배경 프레임버퍼를 복사한 뒤,
 * 둥근 모서리(SDF) 가장자리에서 사인 곡선(sin(pi * depth / edgeWidth)) 기반의
 * 유리 곡률 굴절 효과를 적용합니다.
 */
export const LIQUID_GLASS_VERTEX_SHADER = /* glsl */ `
  out vec2 patchUv;
  void main() {
    patchUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const LIQUID_GLASS_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  uniform sampler2D sceneTexture;
  uniform vec2 center;
  uniform vec2 size;
  uniform vec2 captureSize;
  uniform float radius;
  uniform float strength;
  uniform float edgeWidth;
  in vec2 patchUv;
  out vec4 fragmentColor;

  void main() {
    vec2 p = patchUv * captureSize - center;
    vec2 q = abs(p) - (size * 0.5 - vec2(radius));
    vec2 corner = max(q, vec2(0.0));
    float distance = length(corner) + min(max(q.x, q.y), 0.0) - radius;
    float depth = -distance;
    // 바깥 영역과 평평한 중앙 영역은 원본 프레임버퍼 픽셀 유지
    if (depth <= 0.0 || depth >= edgeWidth) discard;
    vec2 normal;
    if (dot(corner, corner) > 0.00001) {
      normal = normalize(corner) * sign(p);
    } else {
      normal = q.x > q.y ? vec2(sign(p.x), 0.0) : vec2(0.0, sign(p.y));
    }
    // 유리 모서리 베벨 굴절 변위 계산
    float bend = sin(3.14159265 * depth / edgeWidth) * strength;
    vec2 uv = patchUv - normal * bend / captureSize;
    fragmentColor = texture(sceneTexture, uv);
  }
`;

/**
 * 런타임 엔진(SANSA_CORE)과 연동되는 셰이더/재질 팩토리 래퍼
 */
export function getCoreShaderBuilders() {
  const core = window.SANSA_CORE;
  if (!core) {
    throw new Error('SANSA_CORE runtime is not loaded.');
  }
  return {
    createSurfaceManager: core.createSurfaceManager,
    attachLandscapeHorizon: core.attachLandscapeHorizon,
    enhanceWaterMaterial: core.enhanceWaterMaterial,
  };
}
