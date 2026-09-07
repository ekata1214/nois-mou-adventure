// Real Three.js geometry and scene logic; DOM/WebGL are replaced for deterministic checks.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as State from '../js/explore-state.js';
const threeURL=pathToFileURL(process.argv[2]).href,RealThree=await import(threeURL);
class El {
  constructor(){this.open=false;this.children=[];this.value='';this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.handlers={};}
  addEventListener(k,f){this.handlers[k]=f;}setAttribute(){}setPointerCapture(){}focus(){}showModal(){this.open=true;}close(){this.open=false;}replaceChildren(){this.children=[];}append(x){this.children.push(x);}
  getContext(){return {fillText(){},fillRect(){},stroke(){},beginPath(){},ellipse(){},fill(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}
}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
const document={getElementById:get,querySelectorAll(){return [];},createElement(){return new El();},addEventListener(){},hidden:false};
globalThis.document=document;
const worldSource=fs.readFileSync(new URL('../js/meadow-world.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(threeURL)).replace(/'\.\/explore-state\.js\?v=[^']+'/g,JSON.stringify(new URL('../js/explore-state.js',import.meta.url).href));
const {buildMeadow,pathDistance}=await import('data:text/javascript;base64,'+Buffer.from(worldSource).toString('base64'));
const THREE={...RealThree,WebGLRenderer:class{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}},TextureLoader:class{load(){return new RealThree.Texture();}}};
const sandbox={THREE,...State,buildMeadow,console,GLTFLoader:class{load(){}},devicePixelRatio:1,innerWidth:1200,innerHeight:800,document,window:{addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame(){},setTimeout(){},clearTimeout(){}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../js/explore.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),sandbox);
const run=s=>vm.runInContext(s,sandbox);
run("$('begin').onclick();update(.016)");assert.equal(run('lastRegion'),'ki');
assert.ok(run('meadow.colliders.length')>40);assert.equal(run('meadow.markers.length'),3);
assert.equal(pathDistance(-29,-25),0);
run("keys.add('KeyW');for(let i=0;i<90;i++)update(1/60);keys.clear()");assert.ok(run('player.position.z')<-6);
run('jump();for(let i=0;i<120;i++)update(1/60)');assert.equal(run('grounded'),true);
run('leapTarget=platforms[0];leap();for(let i=0;i<90;i++)update(1/60)');assert.equal(run('flight'),null);
for(let i=0;i<3;i++){
  run(`nearest={kind:'memory',item:meadow.markers[${i}]};interact()`);assert.equal(get('memory').open,true);
  run("$('leave-memory').onclick();interact();$('leave-memory').onclick()");
}
assert.equal(run('state.discoveries.length'),3);
assert.equal(get('trail-progress').textContent,'野原の記憶 3 / 3');
run('nearest={kind:"shard",item:shards[0]};interact();interact()');assert.equal(run('state.collected.length'),1);
run('nearest={kind:"npc",item:npcs[0]};interact()');get('npc-choices').children[0].onclick();assert.equal(run('state.friends.ki'),'follow');
run("openShell();state.collected=[0,1,2];$('craft-lamp').onclick()");assert.equal(run('state.lamp'),true);
assert.ok(run('Number.isFinite(camera.position.y)'));
run("$('return-field').onclick();const stump=meadow.stumps[0];player.position.set(stump.x,stump.y+1,stump.z);grounded=false;verticalSpeed=-1;for(let i=0;i<100;i++)update(1/60)");
assert.ok(run('Math.abs(player.position.y-meadow.stumps[0].y)<.001'));assert.equal(run('grounded'),true);
run('jump();for(let i=0;i<100;i++)update(1/60)');assert.ok(run('Math.abs(player.position.y-meadow.stumps[0].y)<.001'));
console.log('Meadow runtime OK: real geometry, movement, jump, thought leap, 3 discoveries without duplicates, collection, friendship, shell. DOM and renderer mocked.');
