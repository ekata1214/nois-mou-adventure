import assert from 'node:assert/strict';
import {shellState,collectFragment,makeVessel,inscribe,FRAGMENT_WAIT} from '../js/shell-life-state.js';
import {sanitizeState} from '../js/explore-state.js';
const s=shellState();assert.equal(makeVessel(s),false);
for(let i=0;i<3;i++){assert.equal(collectFragment(s,i,100),true);assert.equal(collectFragment(s,i,101),false);}
assert.equal(makeVessel(s),true);assert.equal(s.fragments,0);assert.equal(inscribe(s,0,'   '),false);assert.equal(s.items[0].text,'');assert.equal(inscribe(s,0,'言いそびれたこと'),true);assert.equal(inscribe(s,0,'上書き'),false);
assert.equal(collectFragment(s,0,100+FRAGMENT_WAIT),true);assert.equal(collectFragment(s,-1),false);assert.deepEqual(shellState(JSON.parse(JSON.stringify(s))),s);
assert.equal(sanitizeState({shellLife:null,memos:['前の言葉']}).memos[0],'前の言葉');assert.equal(shellState({fragments:Infinity}).fragments,0);
s.items=Array.from({length:60},()=>({text:''}));s.fragments=3;assert.equal(makeVessel(s),false);assert.equal(s.fragments,3);
console.log('shell life: collection cooldown, material transactions, empty/cancel safety, memo retention, old saves OK');
const {createFieldAudio}=await import('../js/field-audio.js');
const tracks=[];globalThis.Audio=class{constructor(path){this.path=path;this.playing=false;tracks.push(this);}play(){this.playing=true;return Promise.resolve();}pause(){this.playing=false;}};
const button={setAttribute(){}};const music=createFieldAudio(button);music.start();assert.equal(tracks.length,0);button.onclick();assert.equal(tracks[0].playing,true);music.zone('shell');assert.equal(tracks[0].playing,false);assert.ok(tracks[1].path.includes('heal'));music.pause(true);assert.equal(tracks[1].playing,false);music.pause(false);assert.equal(tracks[1].playing,true);button.onclick();assert.equal(tracks[1].playing,false);
console.log('Audio: opt-in, zone switching, background pause and mute OK');
// The authored shell architecture is part of the concept, not optional furniture.
const fs=await import('node:fs');const glb=fs.readFileSync(new URL('../assets/room/shell-lite.glb',import.meta.url));
assert.equal(glb.toString('ascii',0,4),'glTF');const model=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
for(const name of ['room.002','bed','tvs','kt'])assert.ok(model.nodes.some(n=>n.name===name),`original shell node missing: ${name}`);
assert.ok(model.images.length>0);console.log('Shell asset: original walls, furniture, pendant and textures retained.');
