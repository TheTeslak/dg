export const positionShader = `
  uniform float uDelta;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(uPosition, uv).xyz;
    vec3 velocity = texture2D(uVelocity, uv).xyz;

    float stepScale = clamp(uDelta * 60.0, 0.0, 2.0);
    position += velocity * stepScale;

    gl_FragColor = vec4(position, 1.0);
  }
`

export const velocityShader = `
  uniform sampler2D uOriginalPosition;
  uniform float uTime;
  uniform float uDelta;
  uniform float uMouseActive;
  uniform float uMouseForce;
  uniform float uMouseRadius;
  uniform vec3 uMouse;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture2D(uPosition, uv).xyz;
    vec3 velocity = texture2D(uVelocity, uv).xyz;
    vec3 original = texture2D(uOriginalPosition, uv).xyz;

    float frame = clamp(uDelta * 60.0, 0.0, 2.0);

    float id = uv.x * 91.7 + uv.y * 173.3;
    vec3 breathe = vec3(
      0.030 * sin(uTime * 0.70 + original.y * 1.15 + id * 0.05),
      0.030 * cos(uTime * 0.62 + original.x * 1.08 - id * 0.04),
      0.026 * sin(uTime * 0.53 + original.x * 0.85 + original.y * 0.95)
    );

    vec3 target = original + breathe;

    velocity += (target - position) * 0.016 * frame;

    vec3 flow = vec3(
      sin(position.y * 1.3 + uTime * 0.48),
      cos(position.x * 1.0 - uTime * 0.44),
      sin((position.x + position.y) * 0.85 + uTime * 0.38)
    );
    velocity += flow * 0.00085 * frame;

    vec3 toParticle = position - uMouse;
    float dist = length(toParticle);
    float influence = smoothstep(uMouseRadius, 0.0, dist) * uMouseActive;

    if (influence > 0.0) {
      vec3 dir = normalize(toParticle + vec3(0.0001));
      vec3 tangent = normalize(vec3(-dir.y, dir.x, 0.2));
      velocity += dir * influence * uMouseForce * frame;
      velocity += tangent * influence * uMouseForce * 0.18 * frame;
    }

    velocity *= pow(0.93, frame);

    gl_FragColor = vec4(velocity, 1.0);
  }
`

export const particleVertexShader = `
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform vec2 uBoundsMin;
  uniform vec2 uBoundsMax;

  attribute vec2 aReference;
  attribute float aRandom;

  varying float vRandom;
  varying float vSpeed;
  varying float vPulse;
  varying vec2 vShapeUV;

  void main() {
    vec3 p = texture2D(uPositionTexture, aReference).xyz;
    vec3 v = texture2D(uVelocityTexture, aReference).xyz;

    vRandom = aRandom;
    vSpeed = length(v);

    float pulse = 0.90 + 0.10 * sin(
      uTime * (0.72 + aRandom * 0.65) +
      aRandom * 31.4159
    );
    vPulse = pulse;

    vShapeUV = (p.xy - uBoundsMin) / max(uBoundsMax - uBoundsMin, vec2(0.0001));

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

    float size = mix(1.6, 4.4, pow(aRandom, 5.0));
    size *= pulse;
    size *= uPixelRatio;
    size *= 7.0 / max(1.0, -mvPosition.z);

    gl_PointSize = clamp(size, 1.0, 9.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const particleFragmentShader = `
  varying float vRandom;
  varying float vSpeed;
  varying float vPulse;
  varying vec2 vShapeUV;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;

    float halo = smoothstep(0.50, 0.04, d);
    float core = smoothstep(0.14, 0.00, d);

    float sparkle = mix(0.40, 1.0, pow(vRandom, 4.0));
    float speedGlow = clamp(vSpeed * 12.0, 0.0, 0.75);

    vec2 gradA = vec2(17.4127 / 460.0, 1.0 - 450.863 / 700.0);
    vec2 gradB = vec2(470.995 / 460.0, 1.0 - 231.688 / 700.0);
    vec2 gradDir = gradB - gradA;
    float gradLen2 = max(dot(gradDir, gradDir), 0.0001);
    float t = clamp(dot(vShapeUV - gradA, gradDir) / gradLen2, 0.0, 1.0);

    vec3 blueA = vec3(0.12, 0.35, 1.0);
    vec3 blueB = vec3(0.0, 0.78, 1.0);
    vec3 baseColor = mix(blueA, blueB, t);
    vec3 hotColor = mix(baseColor, vec3(0.9, 0.98, 1.0), 0.55);

    vec3 color = mix(baseColor, hotColor, core + speedGlow * 0.4);

    float alpha = halo * (0.35 + sparkle * 0.65 + speedGlow * 0.8) * vPulse;

    gl_FragColor = vec4(color, alpha);
  }
`
