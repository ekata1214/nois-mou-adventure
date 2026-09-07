// Real Three.js geometry and scene logic; DOM/WebGL are replaced for deterministic checks.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as State from '../js/explore-state.js';
import {advanceCharacter,canOccupy} from '../js/field-physics.js';
const threeURL=pathToFileURL(process.argv[2]).href,RealThree=await import(threeURL);
class El {
  constructor(){this.open=false;this.children=[];this.value='';this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.handlers={};}
  addEventListener(k,f){this.handlers[k]=f;}style={setProperty(){}};setAttribute(){}setPointerCapture(){}focus(){}showModal(){this.open=true;}close(){this.open=false;}replaceChildren(){this.children=[];}append(x){this.children.push(x);}
  getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillText(){},fillRect(){},stroke(){},beginPath(){},ellipse(){},fill(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}
}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
const document={body:new El(),getElementById:get,querySelectorAll(){return [];},createElement(){return new El();},addEventListener(){},hidden:false};
globalThis.document=document;
const pondSource=fs.readFileSync(new URL('../js/pond-water.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(threeURL)).replace(/'\.\/explore-state\.js\?v=[^']+'/g,JSON.stringify(new URL('../js/explore-state.js',import.meta.url).href));
const pondURL='data:text/javascript;base64,'+Buffer.from(pondSource).toString('base64');
const skySource=fs.readFileSync(new URL('../js/field-sky.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(threeURL));
const skyURL='data:text/javascript;base64,'+Buffer.from(skySource).toString('base64');
const worldSource=fs.readFileSync(new URL('../js/meadow-world.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(threeURL)).replace(/'\.\/explore-state\.js\?v=[^']+'/g,JSON.stringify(new URL('../js/explore-state.js',import.meta.url).href)).replace(/'\.\/pond-water\.js\?v=[^']+'/g,JSON.stringify(pondURL)).replace(/'\.\/field-sky\.js\?v=[^']+'/g,JSON.stringify(skyURL)).replace(/'\.\/adventure-state\.js\?v=[^']+'/g,JSON.stringify(new URL('../js/adventure-state.js',import.meta.url).href));
const {buildMeadow,pathDistance}=await import('data:text/javascript;base64,'+Buffer.from(worldSource).toString('base64'));
const THREE={...RealThree,WebGLRenderer:class{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}},TextureLoader:class{load(){return new RealThree.Texture();}}};
const sandbox={matchMedia(){return {matches:false};},THREE,...State,...(await import('../js/shell-life-state.js')),...(await import('../js/adventure-state.js')),buildMeadow,advanceCharacter,canOccupy,console,GLTFLoader:class{load(){}},devicePixelRatio:1,innerWidth:1200,innerHeight:800,document,window:{addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame(){},setTimeout(){},clearTimeout(){}};
vm.createContext(sandbox);
for(const file of ['field-print','shell-starfield','shell-life-view','field-audio','field-encounters','encounter-views','field-combat','field-adventure']){let source=fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');if(file==='field-encounters'){sandbox.ENTITY_DEFS=(await import('../js/entities.js')).ENTITY_DEFS;sandbox.PATTERNS=(await import('../js/enemy-patterns.js')).PATTERNS;}vm.runInContext(source,sandbox);}
vm.runInContext(fs.readFileSync(new URL('../js/explore.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),sandbox);
const run=s=>vm.runInContext(s,sandbox);
run("$('begin').onclick();update(.016)");assert.equal(run('lastRegion'),'ki');
assert.ok(run('meadow.colliders.length')>40);assert.equal(run('meadow.markers.length'),3);
assert.equal(pathDistance(-29,-25),0);
run("keys.add('KeyW');for(let i=0;i<90;i++)update(1/60);keys.clear()");assert.ok(run('player.position.z')<-6);
run('jump();for(let i=0;i<120;i++)update(1/60)');assert.equal(run('grounded'),true);
run('leapTarget=platforms[0];leap();for(let i=0;i<90;i++)update(1/60)');assert.equal(run('flight'),null);
for(let i=0;i<3;i++){
  run(`combat.fighter.action=null;player.position.set(meadow.markers[${i}].x,meadow.markers[${i}].y,meadow.markers[${i}].z+2);nearest={kind:'memory',item:meadow.markers[${i}]};interact()`);assert.equal(get('memory').open,true);
  run("$('leave-memory').onclick();interact();$('leave-memory').onclick()");
}
assert.equal(run('state.discoveries.length'),3);
assert.equal(get('trail-progress').textContent,'野原の記憶 3 / 3');
run('combat.fighter.action=null;player.position.set(shards[0].x,terrainHeight(shards[0].x,shards[0].z),shards[0].z);nearest={kind:"shard",item:shards[0]};interact();interact()');assert.equal(run('state.collected.length'),1);
run('combat.fighter.action=null;player.position.set(npcs[0].x,terrainHeight(npcs[0].x,npcs[0].z),npcs[0].z);nearest={kind:"npc",item:npcs[0]};interact()');get('npc-choices').children[0].onclick();assert.equal(run('state.friends.ki'),'follow');
run("openShell();state.collected=[0,1,2];$('craft-lamp').onclick()");assert.equal(run('state.lamp'),true);
assert.ok(run('Number.isFinite(camera.position.y)'));
run("$('return-field').onclick();$('room-leave').onclick();const stump=meadow.stumps[0];player.position.set(stump.x,stump.y+1,stump.z);grounded=false;verticalSpeed=-1;for(let i=0;i<100;i++)update(1/60)");
assert.ok(run('Math.abs(player.position.y-meadow.stumps[0].y)<.001'));assert.equal(run('grounded'),true);
run('jump();for(let i=0;i<100;i++)update(1/60)');assert.ok(run('Math.abs(player.position.y-meadow.stumps[0].y)<.001'));
const {buildPond}=await import(pondURL);const pond=buildPond(new RealThree.Scene());
pond.update(0,{x:0,y:2,z:0});pond.update(1,{x:State.POND.x,y:State.POND.level-.3,z:State.POND.z});
assert.equal(pond.emitted,1);pond.update(1.1,{x:State.POND.x,y:State.POND.level-.3,z:State.POND.z});assert.equal(pond.emitted,1);
pond.update(1.5,{x:State.POND.x+.5,y:State.POND.level-.3,z:State.POND.z});assert.equal(pond.emitted,2);
pond.update(2,{x:0,y:2,z:0});assert.equal(pond.emitted,3);
console.log('Meadow runtime OK: real geometry, movement, jump, thought leap, 3 discoveries without duplicates, collection, friendship, shell. DOM and renderer mocked.');

run("$('welcome').close();$('memory').close();$('conversation').close();$('shell').close();active=true;flight=null;const enemy=combat.enemies[0];player.position.set(enemy.x,enemy.y,enemy.z+2);player.rotation.y=Math.PI;combat.lock();");
assert.equal(run('combat.target().id'),'ember');
run('combat.strike();combat.update(.18,elapsed,camera,true)');
assert(run('combat.enemies[0].hp')<42);
const pausedHp=run('combat.enemies[0].hp');run('combat.update(1,elapsed,camera,false)');assert.equal(run('combat.enemies[0].hp'),pausedHp);
run("for(let i=0;i<5;i++){combat.update(.6,elapsed,camera,false);combat.fighter.action=null;combat.fighter.stamina=100;combat.strike();combat.update(.18,elapsed,camera,true);}");
assert.equal(run('state.encounters.ember'),'calmed');
run("combat.fighter.action=null;nearest={kind:'calmed',item:combat.enemies[0]};interact();");assert.equal(run('state.encounters.ember'),'friend');
run("$('defeat').showModal();$('retry').onclick();");assert.equal(run('combat.fighter.hp'),5);assert.equal(run('state.encounters.ember'),'friend');
console.log('Combat runtime OK: lock, damage, pause, calm, friend, safe retry.');

run("$('touch-pad').getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});const press={pointerId:77,clientX:90,clientY:10,preventDefault(){}};$('touch-pad').handlers.pointerdown(press);");
assert.equal(run("held.get(77).join(',')"),'forward,right');
run("$('touch-pad').handlers.pointermove({pointerId:77,clientX:50,clientY:50});");assert.equal(run('held.get(77).length'),0);
run("$('touch-pad').handlers.pointercancel({pointerId:77});");assert.equal(run('held.size'),0);
console.log('Mobile pad OK: diagonal drag, center dead zone, cancellation releases movement.');

run("combat.fighter.action=null;flight=null;grounded=true;state.adventure.peaceful=true;const wind=adventure.items.find(i=>i.id==='wind');player.position.set(wind.x,wind.y,wind.z+2);updateNearby();interact();");
assert.equal(run("state.adventure.chests.includes('wind')"),true);
run("combat.fighter.action=null;nearest={kind:'adventure',item:adventure.items.find(i=>i.id==='leaf')};player.position.set(0,terrainHeight(0,0),0);interact();");assert.equal(run('state.adventure.runes.length'),0);
run("adventure.interact(adventure.items.find(i=>i.kind==='rune'&&i.id==='sun'));");assert.equal(run('state.adventure.runes.length'),0);
for(const id of ['leaf','water','sun']){run(`const p${id}=adventure.items.find(i=>i.kind==='rune'&&i.id==='${id}');player.position.set(p${id}.x,p${id}.y,p${id}.z+2);updateNearby();interact();`);}
assert.equal(run('state.adventure.runes.length'),3);
run("const reward=adventure.items.find(i=>i.id==='shrine');player.position.set(reward.x,reward.y,reward.z+2);updateNearby();interact();");assert.equal(run('combat.fighter.maxHp'),6);
run("const restPlace=adventure.items.find(i=>i.id==='grove');player.position.set(restPlace.x,restPlace.y,restPlace.z+2);updateNearby();interact();");assert.equal(run('state.adventure.checkpoint'),'grove');assert.equal(get('journey').open,true);
run("state.adventure.fruit=2;$('cook-meal').onclick();");assert.equal(run('state.adventure.fruit'),0);
run("$('close-journey').onclick();$('defeat').showModal();$('retry').onclick();");assert.equal(run('combat.fighter.hp'),6);assert.equal(run('player.position.x'),-39);
run("grounded=false;player.position.y+=12;verticalSpeed=-2;combat.fighter.action=null;combat.fighter.stamina=100;jump();update(.1);");assert.equal(run('gliding'),true);assert(run('verticalSpeed')>=-2.21);
const frozenY=run('player.position.y');run('suspended=true;update(.1)');assert.equal(run('player.position.y'),frozenY);
run("$('resume-play').onclick();");assert.equal(run('suspended'),false);
run("gliding=false;grounded=true;combat.fighter.action=null;const friend=combat.enemies[0];player.position.set(friend.x,friend.y,friend.z+2);nearest={kind:'calmed',item:friend};interact();");assert.equal(run('state.encounters.ember'),'friend-stay');assert.equal(run("Object.values(state.encounters).filter(v=>v==='friend'||v==='friend-stay').length"),1);
console.log('Adventure runtime OK: actual nearby actions, remote interaction blocked, ordered lights, shrine blessing, cooking, checkpoint retry, glide, suspension, waiting friendship.');
run(`$('journey').close();$('defeat').close();active=true;suspended=false;combat.fighter.action=null;const fieldPose=player.position.clone();const fieldHeading=player.rotation.y;openShell();const enemyBefore=combat.enemies[0].x;keys.add('KeyW');for(let i=0;i<60;i++)update(1/60);`);
assert.equal(run('shellMode'),true);assert.equal(run('combat.enemies[0].x===enemyBefore'),true);
run("state.shellLife.spots.fill(0);shellView.collect(0);for(let i=0;i<600;i++)update(1/60)");assert.ok(run('state.shellLife.fragments>=1'));
run("state.shellLife.fragments=3;$('room-make').onclick();const vesselIndex=state.shellLife.items.length-1;$('room-items').children[vesselIndex].onclick();$('memo').value='';$('save-memo').onclick()");assert.equal(run('state.shellLife.items[vesselIndex].text'),'');assert.equal(get('shell').open,true);
run("$('memo').value='この部屋で考えたこと';$('save-memo').onclick()");assert.equal(run('state.shellLife.items[vesselIndex].text'),'この部屋で考えたこと');
run("$('room-leave').onclick()");assert.equal(run('player.position.equals(fieldPose)'),true);assert.equal(run('player.rotation.y===fieldHeading'),true);assert.equal(run('player.parent===scene'),true);assert.equal(run('keys.size'),0);
run("const rpgEnemy=combat.enemies.find(e=>e.mode==='rpg');rpgEnemy.hp=rpgEnemy.maxHp;openRpg(rpgEnemy);for(let i=0;i<3;i++)$('npc-choices').children[1].onclick()");assert.equal(run('rpgEnemy.phase'),'calmed');assert.equal(get('conversation').open,false);
console.log('Shell runtime: no field combat, walking collection, empty note safety, vessel conversion, exact return pose. RPG listening resolves without timed input.');
