const { CustomRenderer, Pool } = window.Nebula;

const RENDERER_TYPE_POINTS_RENDERER = 'PointsRenderer';

const vertexShader = () => {
  const SIZE_ATTENUATION_FACTOR = '300.0';

  return `
    attribute float size;
    attribute vec3 color;
    attribute float alpha;

    varying vec3 currentColor;
    varying float currentAlpha;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      currentColor = color;
      currentAlpha = alpha;

      gl_PointSize = size * (${SIZE_ATTENUATION_FACTOR} / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
`;
};

const fragmentShader = () => {
  return `
    uniform vec3 initialColor;

    varying vec3 currentColor;
    varying float currentAlpha;

    void main() {
      gl_FragColor = vec4(initialColor * currentColor, currentAlpha);
    }
`;
};

/**
 * Simple class that stores the particle's "target" or "next" state.
 */
class Target {
  constructor() {
    this.position = new THREE.Vector3();
    this.size = 1;
    this.color = new THREE.Color();
    this.alpha = 1;
  }
}

/**
 * Performant particle renderer that uses THREE.Points to propagate particle (postiion, rgba etc.,) properties to
 * vertices in a ParticleBufferGeometry.
 *
 * @author thrax <manthrax@gmail.com>
 * @author rohan-deshpande <rohan@creativelifeform.com>
 */
window.PointsRenderer = class extends CustomRenderer {
  constructor(
    container,
    {
      size,
      blending = 'AdditiveBlending',
      depthTest = false,
      transparent = true,
      maxParticles = undefined,
    }
  ) {
    super(RENDERER_TYPE_POINTS_RENDERER);

    const geometry = new window.ParticleBufferGeometry({ maxParticles });
    const material = new THREE.ShaderMaterial({
      uniforms: {
        initialColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: vertexShader(),
      fragmentShader: fragmentShader(),
      blending: THREE[blending],
      depthTest,
      transparent,
    });

    this.geometry = geometry;
    this.targetPool = new Pool();
    this.texturePool = new Pool();
    this.points = new THREE.Points(geometry, material);

    container.add(this.points);
  }

  /**
   * Pools the particle target if it does not exist.
   * Updates the target and maps particle properties to the point.
   *
   * @param {Particle}
   */
  onParticleCreated(particle) {
    if (!particle.target) {
      particle.target = this.targetPool.get(Target);
    }

    this.updateTarget(particle).mapParticleTargetPropsToPoint(particle);
  }

  /**
   * Maps particle properties to the point if the particle has a target.
   *
   * @param {Particle}
   */
  onParticleUpdate(particle) {
    if (!particle.target) {
      return;
    }

    this.updateTarget(particle).mapParticleTargetPropsToPoint(particle);
  }

  /**
   * Clears the particle target.
   *
   * @param {Particle}
   */
  onParticleDead(particle) {
    if (!particle.target) {
      return;
    }

    this.mapParticleTargetPropsToPoint(particle);

    particle.target = null;
  }

  /**
   * Maps all mutable properties from the particle to the target.
   *
   * @param {Particle}
   * @return {PointsRenderer}
   */
  updateTarget(particle) {
    const { position, scale, radius, color, alpha } = particle;
    const { r, g, b } = color;

    particle.target.position.copy(position);
    particle.target.size = scale * radius;
    particle.target.color.setRGB(r, g, b);
    particle.target.alpha = alpha;

    return this;
  }

  /**
   * Entry point for mapping particle properties to buffer geometry points.
   *
   * @param {Particle} particle - The particle containing the properties to map
   * @return {PointsRenderer}
   */
  mapParticleTargetPropsToPoint(particle) {
    this.updatePointPosition(particle)
      .updatePointSize(particle)
      .updatePointColor(particle)
      .updatePointAlpha(particle);

    return this;
  }

  /**
   * Updates the particle buffer geometry point's position relative to the particle.
   *
   * @param {Particle} particle - The particle containing the target position.
   * @return {PointsRenderer}
   */
  updatePointPosition(particle) {
    const attribute = 'position';
    const { geometry } = this;
    const { stride, buffer } = geometry;
    const { target, index } = particle;
    const { offset } = geometry.attributes[attribute];

    buffer.array[index * stride + offset + 0] = target.position.x;
    buffer.array[index * stride + offset + 1] = target.position.y;
    buffer.array[index * stride + offset + 2] = target.position.z;

    this.ensureAttributeChangeIsRendered(attribute);

    return this;
  }

  /**
   * Updates the particle buffer geometry point's size relative to the particle scale.
   *
   * @param {Particle} particle - The particle containing the target scale.
   * @return {PointsRenderer}
   */
  updatePointSize(particle) {
    const attribute = 'size';
    const { geometry } = this;
    const { stride, buffer } = geometry;
    const { target, index } = particle;
    const { offset } = geometry.attributes[attribute];

    buffer.array[index * stride + offset + 0] = target.size;

    this.ensureAttributeChangeIsRendered(attribute);

    return this;
  }

  /**
   * Updates the particle buffer geometry rgba values relative to the particle color properties.
   *
   * @param {Particle} particle - The particle containing the target color and alpha.
   * @return {PointsRenderer}
   */
  updatePointColor(particle) {
    const attribute = 'color';
    const { geometry } = this;
    const { stride, buffer } = geometry;
    const { target, index } = particle;
    const { offset } = geometry.attributes[attribute];

    buffer.array[index * stride + offset + 0] = target.color.r;
    buffer.array[index * stride + offset + 1] = target.color.g;
    buffer.array[index * stride + offset + 2] = target.color.b;

    this.ensureAttributeChangeIsRendered(attribute);

    return this;
  }

  updatePointAlpha(particle) {
    const attribute = 'alpha';
    const { geometry } = this;
    const { stride, buffer } = geometry;
    const { target, index } = particle;
    const { offset } = geometry.attributes[attribute];

    buffer.array[index * stride + offset + 0] = target.alpha;

    this.ensureAttributeChangeIsRendered(attribute);

    return this;
  }

  ensureAttributeChangeIsRendered(attribute) {
    this.geometry.attributes[attribute].data.needsUpdate = true;
  }
};
