import * as THREE from 'three';

/** A single animation owner: gestures yield immediately to locomotion. */
export function createMouMotion(root, clips) {
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
  let current = null, gesture = null, remaining = 0, wasGrounded = true;
  const loops = new Set(['idle', 'walk', 'run', 'fall', 'thought']);
  function play(name) {
    const next = actions.get(name) || actions.get('idle');
    if (!next || next === current) return;
    const loop = loops.has(name);
    next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.enabled = true; next.setEffectiveWeight(1); next.setEffectiveTimeScale(1); next.play();
    if (current) next.crossFadeFrom(current, .16, false);
    current = next;
  }
  return {
    get ready() { return actions.has('walk') && actions.has('run'); },
    get name() { return current?.getClip().name || 'idle'; },
    gesture(name) {
      const action = actions.get(name);
      if (!action) return;
      gesture = name; remaining = action.getClip().duration;
      if (current === action) current = null;
      play(name);
    },
    update(dt, { moving, running, grounded, verticalSpeed, flight, paused }) {
      if (paused) return;
      if (moving || !grounded || flight) { gesture = null; remaining = 0; }
      if (grounded && !wasGrounded && !moving && !flight) this.gesture('land');
      wasGrounded = grounded && !flight;
      if (remaining > 0) remaining -= dt;
      if (remaining <= 0) gesture = null;
      const name = flight ? 'thought' : !grounded ? (verticalSpeed > 0 ? 'jump' : 'fall')
        : moving ? (running ? 'run' : 'walk') : gesture || 'idle';
      play(name);
      mixer.update(dt);
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
