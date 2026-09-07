// Pass a local Three.js r170 ESM module as the first argument.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const threeURL = pathToFileURL(process.argv[2]).href;
const THREE = await import(threeURL);
const source = fs.readFileSync(new URL('../js/mou-motion.js', import.meta.url), 'utf8').replace("'three'", JSON.stringify(threeURL));
const { createMouMotion } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const binary = fs.readFileSync(new URL('../assets/muu/mou-actions.glb', import.meta.url));
assert.equal(binary.toString('ascii', 0, 4), 'glTF');
const gltf = JSON.parse(binary.toString('utf8', 20, 20 + binary.readUInt32LE(12)));
const names = ['idle','walk','run','jump','fall','land','wave','pickup','thought'];
assert.deepEqual(gltf.animations.map(a => a.name).sort(), [...names].sort());
assert.ok(gltf.skins.length > 0);
for (const animation of gltf.animations) assert.ok(animation.channels.length > 10);
const root = new THREE.Object3D();
const motion = createMouMotion(root, names.map(name => new THREE.AnimationClip(name, 1, [new THREE.NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])])));
const state = { moving:false, running:false, grounded:true, verticalSpeed:0, flight:false, paused:false };
const step = (expected, change = {}, dt = .1) => { Object.assign(state, change); motion.update(dt, state); assert.equal(motion.name, expected); assert.ok(Number.isFinite(root.position.x)); };
step('idle'); motion.gesture('wave'); step('wave');
step('walk', {moving:true}); step('run', {running:true});
step('jump', {grounded:false,verticalSpeed:3}); step('fall', {verticalSpeed:-1});
step('land', {grounded:true,moving:false}); step('idle', {}, 1.1);
motion.gesture('pickup'); step('pickup'); step('pickup', {paused:true}, 2);
step('idle', {paused:false}, 1.1);
step('thought', {flight:true}); step('land', {flight:false});
for (let i=0;i<100;i++) { motion.gesture('wave'); step('wave'); step('run', {moving:true}); step('idle', {moving:false}); }
motion.dispose();
console.log('Mou motion OK: 9 skinned clips, movement priority, jump/fall/landing, gestures, pause, flight landing, repeated transitions.');
