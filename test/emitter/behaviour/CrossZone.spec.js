/*global describe, it */

import * as Proton from '../../../src';

import { TIME } from '../../constants';
import chai from 'chai';
import sinon from 'sinon';

const { spy } = sinon;
const { assert } = chai;

describe('behaviour -> CrossZone', () => {
  const zone = new Proton.BoxZone(0, 0, 0, 1, 1, 1);
  const behaviour = new Proton.CrossZone(zone, 'dead');

  it('should instantiate with the correct properties', done => {
    const { life, easing, age, energy, dead, zone } = behaviour;

    assert.strictEqual(life, Infinity);
    assert.isFunction(easing);
    assert.strictEqual(age, 0);
    assert.strictEqual(energy, 1);
    assert.isFalse(dead);
    assert.instanceOf(zone, Proton.BoxZone);
    assert.strictEqual(zone.crossType, 'dead');

    done();
  });

  it('should call the zone.crossing method when applying the behaviour', done => {
    const particle = new Proton.Particle();

    spy(behaviour.zone, 'crossing');
    behaviour.applyBehaviour(particle, TIME);
    assert(behaviour.zone.crossing.calledOnce);
    behaviour.zone.crossing.restore();

    done();
  });

  it('should construct the behaviour from a JSON object', done => {
    const instance = Proton.CrossZone.fromJSON({
      colorA: '#FF0000',
      colorB: '#000000',
      life: 3,
      easing: 'easeInOutExpo'
    });

    assert.instanceOf(instance, Proton.Color);
    assert.instanceOf(instance.colorA, Proton.ArraySpan);
    assert.instanceOf(instance.colorB, Proton.ArraySpan);
    assert.equal(instance.life, 3);
    assert.deepEqual(instance.easing, getEasingByName('easeInOutExpo'));

    done();
  });
});
