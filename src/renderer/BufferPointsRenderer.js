import * as THREE from 'three';
import BaseRenderer from './BaseRenderer';
import {RENDERER_TYPE_BUFFER_POINTS as type} from './types';
import Utils from '../../../../utils/utils';

export default class BufferPointsRenderer extends BaseRenderer {

  /**
    * Takes value from 0 to 1.
    */
  setDrawRange(value) {
      this.drawRange = value;
      // console.log('Draw range is value ' + value);
      this.geometry.setDrawRange(0, this.aliveCount * this.drawRange);
      // console.log('Set draw range ' + (this.aliveCount * this.drawRange) );
  }

  addRotationAttribute(geom, fill) {
      const pos = geom.attributes.position;
      let rotationArray = new Float32Array(pos.count);
      if (fill) {
          fill(rotationArray);
      }
      let rotation = new THREE.Float32BufferAttribute(rotationArray, 1);
      geom.setAttribute('aRotation', rotation);
  }

  setupGeometry(geom) {
    const pos = geom.attributes.position;
    const colors = [];
    //const color = new THREE.Color("white");

    //for (let i = 0, il = pos.count; i < il; i++) {
       //colors.push(color.r, color.g, color.b);
    //}
     //geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    //const opacity = new THREE.Float32BufferAttribute(new Float32Array(pos.count).fill(1.0), 1);
    //geom.setAttribute('aOpacity', opacity);

    const scale = new THREE.Float32BufferAttribute(new Float32Array(pos.count).fill(1.0), 1);
    geom.setAttribute('aScale', scale);

    const spritesArray = new Uint8Array(pos.count);
    Utils.fillRandomInt(spritesArray, 0, 3);
    const sprites = new THREE.Uint8BufferAttribute(spritesArray, 1);
    geom.setAttribute('aSpriteIdx', sprites);
    // sprites.setUsage(THREE.DynamicDrawUsage);

    this.addRotationAttribute(geom, (array) => {
        Utils.fillRandomFloat(array, 0, Math.PI * 2.0);
    });

    geom.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geom.attributes.aRotation.setUsage(THREE.DynamicDrawUsage);
    // geom.attributes.color.setUsage(THREE.DynamicDrawUsage);
  }

  constructor(points) {
    super(type);
    this.points = points;
    this.deadCount = 0;
    this.aliveCount = 0;
    this.lastParticle = undefined;
    this.geometry = points.geometry;
    this.geometry.setIndex(null);
    this.setupGeometry(this.geometry);
    this.drawRange = 1.0; // Factor from 0 to 1

    this.point = new THREE.Vector3();

    this.geometry.attributes.position.needsUpdate = true;
    // this.inverseWorld = new THREE.Matrix4();
  }

  onSystemUpdate() {
    this.points.geometry.computeBoundingSphere();
    this.points.geometry.computeBoundingBox();
    // this.points.matrixWorldNeedsUpdate = true;
    // this.inverseWorld.getInverse(this.points.matrixWorld);
  }

  onParticleCreated(particle) {
    if (particle.bufferIdx === undefined) {
      particle.bufferIdx = this.aliveCount;
      this.emit(1);
      this.integrate(particle);
      this.lastParticle = particle;
    }
  }

  onParticleUpdate(particle) {
    // this.point.copy(particle.position);
    // this.point.applyMatrix4(this.inverseWorld);
    this.integrate(particle);
  }

  onParticleDead(particle) {
    this.killParticle(particle);
  }

  emit(count) {
    const needMore = count - this.deadCount;

    if (needMore > 0) {
      if ((this.particlesAmount + needMore) > this.particlesAvailable) {
        this.expand(needMore);
      }

      this.deadCount += needMore;
    }

    for (let i = 0; i < count; i++) {
      // this.integrate(part);
      this.aliveCount++;
      this.deadCount--;
    }

    this.geometry.setDrawRange(0, this.aliveCount * this.drawRange);
  }

  integrate(part) {
    this.geometry.attributes.position.setXYZ(part.bufferIdx, part.position.x, part.position.y, part.position.z);
    this.geometry.attributes.aRotation.setX(part.bufferIdx, part.rotation.z);
    this.geometry.attributes.aScale.setX(part.bufferIdx, part.radius);

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aRotation.needsUpdate = true;
    this.geometry.attributes.aScale.needsUpdate = true;
  }

  expand(amountToAdd) {
    const pos = this.geometry.attributes.position;
    let newCount = Math.floor(pos.count * 1.5);

    if (newCount - this.aliveCount < amountToAdd) {
      newCount = this.aliveCount + amountToAdd * 1.5;
    }

    for (const i in this.geometry.attributes) {
      if (this.geometry.attributes[i]) {
        const attr = this.geometry.attributes[i];

        const array = new Float32Array(newCount * attr.itemSize);
        array.set(attr.array, 0);
        this.geometry.setAttribute(i, new THREE.BufferAttribute(array, attr.itemSize, attr.normalized));
        this.geometry.attributes[i].needsUpdate = true;
      }
    }
  }

  get particlesAmount() {
    return this.aliveCount + this.deadCount;
  }

  get particlesAvailable() {
    return this.geometry.attributes.position.count;
  }

  killParticle(killPart) {
    if (this.aliveCount > 0) {
      this.aliveCount--;
      this.deadCount++;
      this.geometry.setDrawRange(0, this.aliveCount * this.drawRange);
      // if (this.aliveCount == 0) {
      //     return;
      // }

      if (this.lastParticle.bufferIdx !== killPart.bufferIdx) {
        this.lastParticle.bufferIdx = killPart.bufferIdx;
        this.integrate(this.lastParticle);
      } else {
        // console.log('Trying to kill the last particle');
      }

      killPart.bufferIdx = undefined;
    }
    else {
      console.error('alive particles count is 0 but tries to kill particle.');
    }
  }

}
