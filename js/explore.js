import {createFieldPrint} from './field-print.js?v=20260908print';
import {createShellLifeView} from './shell-life-view.js?v=20260908cosmos';
import {collectFragment,makeVessel,inscribe} from './shell-life-state.js';
import {createFieldAudio} from './field-audio.js';
import {buildFieldAdventure} from './field-adventure.js?v=20260908shell';
import {CAMPS,nextAdventureGoal} from './adventure-state.js?v=20260908shell';
import {createFieldCombat} from './field-combat.js?v=20260908shell';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMouMotion } from './mou-motion.js?v=20260908shell';
import { createMouAppearance } from './mou-appearance.js?v=20260907physics';
import { advanceCharacter, canOccupy } from './field-physics.js?v=20260908shell';
import { buildMeadow } from './meadow-world.js?v=20260908print';
import { KEY, REGIONS, terrainHeight, regionAt, freshState, sanitizeState, availableShards, makeFriend, craftLamp, nearestReachable, resolveFieldPosition, cameraClearance, supportHeight, waterDepth } from './explore-state.js?v=20260908shell';

const $=id=>document.getElementById(id);
const canvas=$('world');
const audio=createFieldAudio($('sound-toggle'));
let shellMode=false,shellView=null,selectedVessel=-1;
let state=freshState(), storageOK=true;
try{state=sanitizeState(JSON.parse(localStorage.getItem(KEY)));}catch{storageOK=false;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;toast("保存できません。ページを閉じる前に端末の空き容量・保存設定を確認してください。");}updateHUD();}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
const fieldPrint=createFieldPrint(renderer);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x85838b);
scene.fog=new THREE.FogExp2(0x85838b,.006);
const camera=new THREE.PerspectiveCamera(58,1,.1,360);
scene.add(new THREE.HemisphereLight(0xd1d4df,0x49464d,2.0));
const sun=new THREE.DirectionalLight(0xe0d8c9,2.1);sun.position.set(-30,70,-40);scene.add(sun);
const meadow=buildMeadow(scene,renderer,sun);
function mesh(geo,color,x,y,z){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
const textures=new THREE.TextureLoader();
function sprite(path,height,x,y,z){const material=new THREE.SpriteMaterial({map:textures.load(path),alphaTest:.15});const obj=new THREE.Sprite(material);obj.scale.set(height,height,1);obj.position.set(x,y,z);scene.add(obj);return obj;}
function label(text,x,y,z,width=8){
  const c=document.createElement('canvas');c.width=768;c.height=160;const ctx=c.getContext('2d');
  ctx.fillStyle='#f6eedb';ctx.font='500 66px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,80);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));s.position.set(x,y,z);s.scale.set(width,width*160/768,1);scene.add(s);return s;
}
// Tall open frames give each horizon a recognizable destination, without enclosing the field.
for(const r of REGIONS){
  if(r.id==='ki')continue;
  const x=r.x*65,z=r.z*62,y=terrainHeight(x,z);
  mesh(new THREE.BoxGeometry(2,20,3),r.color,x-8,y+10,z);
  mesh(new THREE.BoxGeometry(2,20,3),r.color,x+8,y+10,z);
  mesh(new THREE.BoxGeometry(18,2,3),r.color,x,y+20,z);
  label(r.word,x,y+24,z,14);
}
const platforms=[];
for(const r of REGIONS){
  ['もしも',r.word,'その先'].forEach((word,i)=>{
    const x=r.x*(13+i*12),z=r.z*(13+i*9),y=terrainHeight(x,z)+4+i*3;
    const slab=mesh(new THREE.BoxGeometry(6,.5,4),0x8c9173,x,y-.25,z);
    slab.material=meadow.rockMaterial.clone();slab.material.vertexColors=false;
    const underside=mesh(new THREE.IcosahedronGeometry(2.2,1),0x777765,x,y-.55,z);underside.scale.set(1.25,.14,.78);underside.material=slab.material;
    slab.material.emissive=new THREE.Color(r.color);slab.material.emissiveIntensity=.14;
    label(word,x,y+1.7,z,6);platforms.push({x,y,z,word,mesh:slab});
  });
}
const portal={x:0,y:terrainHeight(0,10),z:10};
const gate=mesh(new THREE.TorusGeometry(2.8,.16,8,48),0xe50914,0,portal.y+3,10);
gate.material.emissive=new THREE.Color(0xe50914);gate.material.emissiveIntensity=.4;
label('殻へ',0,portal.y+6.7,10,5);
const shards=[];
REGIONS.forEach((r,ri)=>{
  for(let j=0;j<6;j++){
    const x=r.x*(9+j*7),z=r.z*(8+(j%3)*13),id=ri*6+j;
    const obj=mesh(new THREE.OctahedronGeometry(.65),0xf4dc9d,x,terrainHeight(x,z)+1.2,z);
    obj.material.emissive=new THREE.Color(0xd5b866);obj.material.emissiveIntensity=.55;obj.visible=!state.collected.includes(id);
    shards.push({id,x,z,y:obj.position.y,obj});
  }
});
const npcNames=['問いかけの気配','言いそびれた気配','忘れものの気配','ひと休みの気配'];
const npcLines=['知らないこと、まだ好きでいられる？','怒っているのか、寂しいのか。まだ分からない。','忘れることと、捨てることは、同じかな。','何もしていない時間も、一緒にいていい？'];
const npcs=REGIONS.map((r,i)=>{
  const x=r.x*29,z=r.z*25,y=terrainHeight(x,z);
  const obj=sprite(['assets/icons/eyeball.png','assets/icons/giger/ear.png','assets/icons/giger/clock.png','assets/icons/hylics/book.png'][i],2.8,x,y+1.7,z);
  return {id:r.id,name:npcNames[i],line:npcLines[i],x,z,obj,label:label(npcNames[i],x,y+4,z,7)};
});
const player=new THREE.Group();player.position.set(-3,terrainHeight(-3,-3),-3);player.rotation.y=Math.PI*1.25;scene.add(player);
const fallback=sprite('assets/muu/back.png',2.2,0,1.1,0);scene.remove(fallback);player.add(fallback);
let avatar=null,motion=null,appearance=null;
// One existing GLB, loaded in the background. Exploration is usable while it downloads.
const modelNote=$('loading-note');
new GLTFLoader().load('assets/muu/mou-actions.glb?v=20260907physics',gltf=>{
  const root=gltf.scene;root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)return;
  root.scale.setScalar(2.05/size.y);box.setFromObject(root);const center=box.getCenter(new THREE.Vector3());
  root.position.set(-center.x,-box.min.y,-center.z);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  player.add(root);avatar=root;fallback.visible=false;
  motion=createMouMotion(root,gltf.animations);
  appearance=createMouAppearance(root);
  $('wave').disabled=!motion.ready;
  modelNote.textContent='ムー君の動作も準備できました。';
},event=>{if(event.total)modelNote.textContent=`野原は準備できました。ムー君の3Dを読込中 ${Math.round(event.loaded/event.total*100)}%（先に遊べます）`;},()=>{modelNote.textContent='今回は元のムー君の絵で遊べます。3Dモデルは読み込めませんでした。';});

let yaw=Math.PI*1.25,pitch=.08,verticalSpeed=0,grounded=true,flight=null,active=false,runToggle=false,gliding=false,suspended=false;
const body={x:0,y:0,z:0,vx:0,vy:0,vz:0,grounded:true};
let nearest=null,leapTarget=null,lastRegion=null,elapsed=0,lastTime=0,toastTimer;
const keys=new Set(),held=new Map();let drag=null;
const dialogs=[$('welcome'),$('conversation'),$('shell'),$('memory'),$('defeat'),$('journey')];
const modalOpen=()=>dialogs.some(d=>d.open);
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function updateHUD(){
  $('inventory').textContent=`記憶のかけら ${availableShards(state)}`;
  $('friend-count').textContent=`友達 ${Object.keys(state.friends).length+Object.values(state.encounters).filter(v=>v==='friend'||v==='friend-stay').length}`;
  $('trail-progress').textContent=`野原の記憶 ${state.discoveries.length} / 3`;
  $('trail-hint').textContent=state.discoveries.length===3?'道の先まで来た。気配に会って、殻に持ち帰ろう。':'土の道をたどって、光る石碑を探そう。';
}
function clearInput(){padPointer=null;pad.style.setProperty('--stick-x','0px');pad.style.setProperty('--stick-y','0px');keys.clear();held.clear();drag=null;runToggle=false;body.vx=body.vz=0;$('run').setAttribute('aria-pressed','false');}
window.addEventListener('blur',()=>{suspended=true;clearInput();});
window.addEventListener('focus',()=>{suspended=false;});
$('resume-play').onclick=()=>{suspended=false;canvas.focus();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();audio.pause(true);}});
window.addEventListener('keydown',e=>{
  if(modalOpen()||!active||suspended||shellMode)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(e.code==='KeyM')$('journey-open').onclick();if(e.code==='Escape'){suspended=true;clearInput();}
  if(e.code==='KeyF')strike();if(e.code==='KeyC')dodge();if(e.code==='KeyT')combat.lock();
  if(e.code==='Space')jump();if(e.code==='KeyQ')leap();if(e.code==='KeyE')interact();if(e.code==='KeyR')wave();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('pointerdown',e=>{if(shellMode){shellView.touch(e,canvas);return;}if(modalOpen()||drag)return;suspended=false;canvas.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.004,-.65,.95);drag.x=e.clientX;drag.y=e.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)drag=null;});
const pad=$('touch-pad');let padPointer=null;
function movePad(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);held.set(e.pointerId,[...(y<-.22?['forward']:y>.22?['back']:[]),...(x<-.22?['left']:x>.22?['right']:[])]);pad.style.setProperty('--stick-x',`${Math.max(-1,Math.min(1,x))*30}px`);pad.style.setProperty('--stick-y',`${Math.max(-1,Math.min(1,y))*30}px`);}
pad.addEventListener('pointerdown',e=>{if(modalOpen()||padPointer!==null)return;e.preventDefault();padPointer=e.pointerId;pad.setPointerCapture(e.pointerId);movePad(e);});
pad.addEventListener('pointermove',e=>{if(e.pointerId===padPointer)movePad(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,e=>{if(e.pointerId!==padPointer)return;held.delete(e.pointerId);padPointer=null;pad.style.setProperty('--stick-x','0px');pad.style.setProperty('--stick-y','0px');});
$('run').onclick=()=>{runToggle=!runToggle;$('run').setAttribute('aria-pressed',String(runToggle));};
$('jump').onclick=jump;$('leap').onclick=leap;$('interact').onclick=interact;
$('wave').onclick=wave;
function wave(){if(!active||!grounded||flight||combat.fighter.action)return;$('journey').close();motion?.gesture('wave');}
function jump(){if(!active||modalOpen()||flight||combat.fighter.action)return;if(!grounded){if(state.adventure.chests.includes('wind')&&combat.fighter.stamina>5){gliding=!gliding;}return;}verticalSpeed=waterDepth(player.position.x,player.position.z,player.position.y)>.3?6.5:9;grounded=false;}
function leap(){
  if(!active||modalOpen()||!leapTarget||flight||combat.fighter.action)return;
  gliding=false;flight={from:player.position.clone(),to:new THREE.Vector3(leapTarget.x,leapTarget.y,leapTarget.z),t:0};verticalSpeed=0;
  toast(`「${leapTarget.word}」へ、思考をつなぐ。`);
}
const supportSurfaces=[...platforms,...meadow.stumps];
const physicsColliders=[...meadow.colliders,...platforms.map(p=>({x:p.x,z:p.z,halfX:3,halfZ:2,bottom:p.y-.9,top:p.y,walkable:true}))];
const combat=createFieldCombat(scene,player,physicsColliders,supportSurfaces,state.encounters,e=>{state.encounters[e.id]='calmed';save();toast(`${e.name}が静かになった。近づいて、Eで友達になれる。`);},()=>{flight=null;gliding=false;clearInput();openDialog($('defeat'));});
if(state.adventure.chests.includes('shrine'))combat.fighter.hp=combat.fighter.maxHp=6;
const adventure=buildFieldAdventure(scene,player,state,combat,physicsColliders,save,toast,openDialog,travelTo);
function travelTo(c){clearInput();flight=null;gliding=false;combat.unlock();combat.fighter.action=null;combat.fighter.actionTime=0;player.position.set(c.x,terrainHeight(c.x,c.z+2),c.z+2);verticalSpeed=0;grounded=true;combat.fighter.invincible=3;}
const checkpoint=CAMPS.find(c=>c.id===state.adventure.checkpoint);if(checkpoint?.id!=='entry')travelTo(checkpoint);
$('strike').onclick=strike;$('dodge').onclick=dodge;$('lock-on').onclick=()=>combat.lock();
function strike(){if(active&&!modalOpen()&&grounded&&!flight){if(nearest?.kind==='rpg'){interact();return;}combat.strike();}}
function dodge(){if(!active||modalOpen()||!grounded||flight)return;const dirs=[...held.values()].flat(),f=(keys.has('KeyW')||keys.has('ArrowUp')||dirs.includes('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||dirs.includes('back')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')||dirs.includes('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||dirs.includes('left')?1:0);combat.dodge(f||s?f*Math.sin(yaw)-s*Math.cos(yaw):-Math.sin(player.rotation.y),f||s?f*Math.cos(yaw)+s*Math.sin(yaw):-Math.cos(player.rotation.y));}
$('retry').onclick=()=>{travelTo(CAMPS.find(c=>c.id===state.adventure.checkpoint)||CAMPS[0]);combat.reset();$('defeat').close();canvas.focus();};
$('defeat').addEventListener('cancel',e=>e.preventDefault());
function standingHeight(x,z,previousY){return supportHeight(x,z,previousY,supportSurfaces);}
function openDialog(d){clearInput();d.showModal();}
$('welcome').addEventListener('cancel',e=>{if(!active)e.preventDefault();});
$('help-open').onclick=()=>openDialog($('welcome'));
$('begin').onclick=()=>{audio.start();$('welcome').close();active=true;suspended=false;lastRegion=null;canvas.focus();};
$('leave-npc').onclick=()=>$('conversation').close();
$('shell-button').onclick=openShell;$('shell-quick').onclick=openShell;
$('return-field').onclick=()=>$('shell').close();
$('leave-memory').onclick=()=>$('memory').close();
function interact(){
  if(!active||modalOpen()||!nearest||flight||combat.fighter.action||suspended)return;
  const at=nearest.kind==='adventure'?new THREE.Vector3(nearest.item.x,nearest.item.y+(nearest.item.kind==='rune'?1.2:0),nearest.item.z):['calmed','rpg'].includes(nearest.kind)?new THREE.Vector3(nearest.item.x,nearest.item.y,nearest.item.z):nearest.kind==='portal'?new THREE.Vector3(portal.x,portal.y,portal.z):nearest.item.obj?.position||nearest.item.mesh?.position;
  if(!at||player.position.distanceTo(at)>4.3||!combat.visible(player.position,at)){nearest=null;return;}
  if(nearest.kind==='adventure'){adventure.interact(nearest.item);return;}
  if(nearest.kind==='rpg'){openRpg(nearest.item);return;}
  if(nearest.kind==='calmed'){const e=nearest.item;e.friendly=!e.friendly;state.encounters[e.id]=e.friendly?'friend':'friend-stay';save();toast(e.friendly?`${e.name}と友達になった。一緒に歩こう。`:'ここで待っているね。');return;}
  if(nearest.kind==='portal'){openShell();return;}
  if(nearest.kind==='memory'){
    const place=nearest.item;
    if(!state.discoveries.includes(place.id)){state.discoveries.push(place.id);save();}
    $('memory-name').textContent=place.name;$('memory-text').textContent=place.text;
    $('memory-progress').textContent=`野原に残る記憶 ${state.discoveries.length} / 3`;
    openDialog($('memory'));return;
  }
  if(nearest.kind==='shard'){
    const shard=nearest.item;if(state.collected.includes(shard.id))return;
    state.collected.push(shard.id);shard.obj.visible=false;motion?.gesture('pickup');save();toast('記憶のかけらを、ひとつ預かった。');return;
  }
  const npc=nearest.item;$('npc-name').textContent=npc.name;
  $('npc-line').textContent=state.friends[npc.id]?'……覚えてるよ。今日は、どう過ごそうか。':npc.line;
  $('npc-choices').replaceChildren();
  for(const [text,relation] of [['友達になる · 一緒に歩こう','follow'],['友達になる · 殻へおいで','home'],['友達になる · また会いに来る','stay']]){
    const b=document.createElement('button');b.textContent=text;b.onclick=()=>{makeFriend(state,npc.id,relation);save();$('conversation').close();toast(relation==='home'?'殻で待ってる。':relation==='follow'?'行こう。行き先は、まだ知らなくていい。':'また、ここで。');};$('npc-choices').append(b);
  }
  openDialog($('conversation'));
}
function openRpg(enemy){
 combat.fighter.action=null;let listened=0;
 function render(){
  $('npc-name').textContent=enemy.name+' / 向き合う';$('npc-line').textContent=`相手の緊張 ${enemy.hp} / ${enemy.maxHp} · 耳をすました回数 ${listened} / 3。選ぶまで時間は進みません。`;
  $('npc-choices').replaceChildren();
  for(const [label,kind] of [['思考をぶつける','strike'],['耳をすます','listen']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{
    if(kind==='listen')listened++;else enemy.hp=Math.max(0,enemy.hp-16);
    if(enemy.hp===0||listened===3){enemy.hp=0;enemy.phase='calmed';state.encounters[enemy.id]='calmed';save();$('conversation').close();toast('緊張がほどけた。もう一度近づいて、友達になれる。');return;}
    if(kind==='strike'){combat.fighter.hp=Math.max(0,combat.fighter.hp-1);if(!combat.fighter.hp){$('conversation').close();openDialog($('defeat'));return;}}
    render();
  };$('npc-choices').append(b);}
 }
 render();openDialog($('conversation'));
}
function renderShell(){
  $('shell-shelf').textContent=state.shellLife.items[selectedVessel]?.text?'あなたが残した言葉。':'この器に、今の言葉を入れる。空欄で閉じても器は残ります。';
  $('shell-shelf').classList.toggle('lit',state.lamp);
  const home=npcs.filter(n=>state.friends[n.id]==='home').map(n=>n.name);
  $('shell-friends').textContent=home.length?`殻で待っている：${home.join('、')}`:'今は、ムー君だけの静かな殻。';
  $('craft-lamp').disabled=state.lamp||availableShards(state)<3;
  $('craft-lamp').textContent=state.lamp?'灯りを作った':'かけら3つで灯りを作る';
  $('memo-wall').replaceChildren();for(const memo of [...state.memos].reverse()){const li=document.createElement('li');li.textContent=memo;$('memo-wall').append(li);}
  $('save-notice').textContent=storageOK?'この端末に保存します。器とメモは合計60個まで。以前のメモも下に残ります。':'端末に保存できません。このページを閉じると今回の進行が失われます。';
}
function refreshRoom(items=true){
 const life=state.shellLife;
 $('room-count').textContent=`かけら ${life.fragments} · 器 ${life.items.filter(i=>!i.text).length} · メモ ${life.items.filter(i=>i.text).length}`;
 $('room-make').disabled=life.fragments<3||life.items.length>=60;
 $('room-make').textContent=life.items.length>=60?'器の棚がいっぱい':'3つで器を作る';
 $('room-pick').disabled=!life.spots.some(t=>t<=Date.now());
 $('room-status').textContent=Date.now()-life.care<120000?'ムー君は、少し落ち着いている。':'ムー君は、部屋をゆっくり歩いている。';
 if(!items)return;
 $('room-items').replaceChildren();life.items.forEach((item,i)=>{const button=document.createElement('button');button.textContent=item.text?`メモ ${i+1}：${item.text.slice(0,16)}`:`器 ${i+1} · 言葉を入れる`;button.onclick=()=>{selectedVessel=i;renderShell();$('memo').value=item.text;$('memo').readOnly=!!item.text;$('save-memo').disabled=!!item.text;$('shell-title').textContent=item.text?'部屋に残った言葉':'器に、言葉を入れる';openDialog($('shell'));};$('room-items').append(button);});
}
function openShell(){
 if(!active||shellMode)return;$('journey').close();if(modalOpen())return;
 clearInput();flight=null;gliding=false;combat.unlock();combat.fighter.action=null;if(avatar){avatar.rotation.y=0;avatar.rotation.z=0;}
 shellView??=createShellLifeView(player,i=>{if(collectFragment(state.shellLife,i)){motion?.gesture('pickup');save();refreshRoom();toast('殻のかけらを拾った。3つで、言葉の器になる。');}},npcs);
 shellView.enter();shellView.resize(innerWidth,innerHeight);shellMode=true;document.body.classList.add('in-shell');$('room-panel').hidden=false;audio.zone('shell');refreshRoom();
}
$('room-leave').onclick=()=>{shellView.leave();shellMode=false;clearInput();document.body.classList.remove('in-shell');$('room-panel').hidden=true;audio.zone('field');canvas.focus();};
$('room-pick').onclick=()=>{const i=state.shellLife.spots.findIndex(t=>t<=Date.now());if(i>=0)shellView.collect(i);};
$('room-make').onclick=()=>{if(makeVessel(state.shellLife)){save();refreshRoom();toast('言葉の器ができた。器を押すと、自分の言葉を残せる。');}};
$('room-care').onclick=()=>{state.shellLife.care=Date.now();motion?.gesture('wave');save();refreshRoom();toast('少しのあいだ、一緒にいる。');};
$('room-notes').onclick=()=>{$('room-items').hidden=!$('room-items').hidden;};
$('craft-lamp').onclick=()=>{if(craftLamp(state)){save();renderShell();}};
$('save-memo').onclick=()=>{if(inscribe(state.shellLife,selectedVessel,$('memo').value)){save();$('shell').close();refreshRoom();toast(storageOK?'器がメモになった。部屋に、言葉が残る。':'端末に保存できません。閉じる前に言葉を控えてください。');}};
function updateNearby(){
  nearest=null;let best=4.3;
  function consider(kind,item,pos){const d=player.position.distanceTo(pos);if(d<best&&combat.visible(player.position,pos)){best=d;nearest={kind,item};}}
  consider('portal',portal,new THREE.Vector3(portal.x,portal.y,portal.z));
  for(const s of shards)if(s.obj.visible)consider('shard',s,s.obj.position);
  for(const n of npcs)if(n.obj.visible)consider('npc',n,n.obj.position);
  for(const p of meadow.markers)consider('memory',p,p.mesh.position);
  for(const e of combat.enemies)if(e.mode==='rpg'&&e.hp>0)consider('rpg',e,new THREE.Vector3(e.x,e.y,e.z));
  for(const e of combat.enemies)if(e.phase==='calmed')consider('calmed',e,new THREE.Vector3(e.x,e.y,e.z));
  for(const i of adventure.candidates())consider('adventure',i,new THREE.Vector3(i.x,i.y+(i.kind==='rune'?1.2:0),i.z));
  $('interact').hidden=!nearest;
  $('nearby-label').textContent=nearest?(nearest.kind==='adventure'||nearest.kind==='rpg'||nearest.kind==='calmed'||nearest.kind==='npc'||nearest.kind==='memory'?nearest.item.name:nearest.kind==='portal'?'内省と生活の場所':'記憶のかけら'):'';
  $('interact').textContent=nearest?.kind==='rpg'?'向き合う · E':nearest?.kind==='adventure'?({camp:'休憩・料理',chest:'宝箱を開く',rune:'灯りに触れる',berry:'木の実を拾う'}[nearest.item.kind]):nearest?.kind==='calmed'?(nearest.item.friendly?'ここで待ってて · E':'友達になる · E'):nearest?.kind==='memory'?'耳をすます · E':nearest?.kind==='npc'?'話しかける · E':nearest?.kind==='portal'?'殻へ帰る · E':'拾う · E';
  leapTarget=nearestReachable(player.position,platforms.filter(p=>{
    const dx=p.x-player.position.x,dz=p.z-player.position.z;return dx*Math.sin(yaw)+dz*Math.cos(yaw)>0;
  }));
  $('leap').disabled=!leapTarget||!!flight;$('leap').textContent=leapTarget?`「${leapTarget.word}」へ`:'思考へ';
}
const desiredCam=new THREE.Vector3(),lookAt=new THREE.Vector3();let hudTick=0;
function update(dt){
  audio.pause(suspended||document.hidden||!active);
  if(shellMode){hudTick+=dt;if(hudTick>1){hudTick=0;refreshRoom(false);}const moving=shellView.update(dt,state.shellLife,modalOpen()||suspended,state.friends,state.lamp);motion?.update(dt,{moving,grounded:true,paused:modalOpen()||suspended});if(!suspended&&!modalOpen())elapsed+=dt;appearance?.update(elapsed);$('resume-play').hidden=!suspended||modalOpen();return;}
  const movingAllowed=active&&!modalOpen()&&!suspended;
  if(movingAllowed)elapsed+=dt;
  $('resume-play').hidden=!suspended||modalOpen()||!active;
  let moveX=0,moveZ=0;
  if(movingAllowed&&!flight){
    const beforeX=player.position.x,beforeZ=player.position.z;
    const dirs=[...held.values()].flat();
    const forward=(keys.has('KeyW')||keys.has('ArrowUp')||dirs.includes('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||dirs.includes('back')?1:0);
    const side=(keys.has('KeyD')||keys.has('ArrowRight')||dirs.includes('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||dirs.includes('left')?1:0);
    const length=Math.hypot(side,forward)||1,speed=runToggle||keys.has('ShiftLeft')||keys.has('ShiftRight')?8:4;
    const direction={x:(forward*Math.sin(yaw)-side*Math.cos(yaw))/length,z:(forward*Math.cos(yaw)+side*Math.sin(yaw))/length,speed};
    const f=combat.fighter;if(f.action==='dodge'){direction.x=f.dodgeX;direction.z=f.dodgeZ;direction.speed=f.actionTime<.32?10:2;}else if(f.action)direction.speed*=.25;
    if(grounded||f.stamina<=0||waterDepth(player.position.x,player.position.z,player.position.y)>.1)gliding=false;
    if(gliding){direction.gliding=true;direction.speed=5;f.stamina=Math.max(0,f.stamina-dt*9);f.regenWait=.5;}
    Object.assign(body,{x:player.position.x,y:player.position.y,z:player.position.z,vy:verticalSpeed,grounded});
    advanceCharacter(body,direction,dt,physicsColliders,supportSurfaces);
    player.position.set(body.x,body.y,body.z);verticalSpeed=body.vy;grounded=body.grounded;
    moveX=player.position.x-beforeX;moveZ=player.position.z-beforeZ;
  }
  if(flight&&movingAllowed){
    const previous=player.position.clone();
    flight.t=Math.min(1,flight.t+dt/1.05);const t=flight.t,s=t*t*(3-2*t);
    player.position.lerpVectors(flight.from,flight.to,s);player.position.y+=Math.sin(Math.PI*t)*5;
    const distance=previous.distanceTo(player.position),steps=Math.max(1,Math.ceil(distance/.1));let blocked=false;
    for(let i=1;i<=steps;i++)if(!canOccupy(previous.clone().lerp(player.position,i/steps),physicsColliders)){blocked=true;break;}
    if(blocked){player.position.copy(previous);flight=null;grounded=false;verticalSpeed=0;body.vx=body.vz=0;toast('行く手がふさがっている。別の場所から、思考をつなごう。');}
    else if(t===1){flight=null;grounded=true;body.vx=body.vz=0;}
  }
  if(combat.fighter.action?.startsWith('strike'))player.rotation.y=combat.fighter.heading;
  else if(moveX||moveZ){
    const target=Math.atan2(moveX,moveZ);
    const delta=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y));
    player.rotation.y+=delta*(1-Math.exp(-dt*12));
  }
  motion?.update(dt,{moving:Math.hypot(moveX,moveZ)>.0001,running:runToggle||keys.has('ShiftLeft')||keys.has('ShiftRight'),grounded,verticalSpeed,flight:!!flight||gliding,paused:!movingAllowed,action:combat.fighter.action,actionTime:combat.fighter.actionTime});
  combat.update(dt,elapsed,camera,movingAllowed,state.adventure);
  const destination=adventure.update(elapsed,gliding);$('objective-arrow').style.transform=`rotate(${-(Math.atan2(destination.x-player.position.x,destination.z-player.position.z)-yaw)}rad)`;
  $('jump').textContent=gliding?'布をたたむ':!grounded&&state.adventure.chests.includes('wind')?'滑空する':'跳ぶ';
  const f=combat.fighter;$('strike').disabled=!grounded||!!f.action||f.stamina<14;$('dodge').disabled=!grounded||!!f.action||f.stamina<26;$('vitality').setAttribute('aria-label',`体力 ${f.hp} / ${f.maxHp}`);$('vitality').textContent='♥'.repeat(f.hp)+'♡'.repeat(f.maxHp-f.hp);$('stamina').value=f.stamina;
  $('strike').textContent=nearest?.kind==='rpg'?'向き合う':'思考を振る';
  $('combat-status').textContent=nearest?.kind==='rpg'?'選ぶまで時間は進みません':combat.target()?.name||(innerWidth<=650||matchMedia('(pointer:coarse)').matches?'左で移動 · 画面をなぞって見回す':'F 思考を振る · C 回避 · T 注目');
  $('lock-on').setAttribute('aria-pressed',String(!!combat.target()));
  document.body.classList.toggle('damaged',f.action==='hurt');
  if(avatar){avatar.rotation.z=f.action==='dodge'?Math.sin(f.actionTime/.48*Math.PI)*.25:f.action==='hurt'?.12:0;avatar.rotation.y=f.action?.startsWith('strike')?Math.sin(f.actionTime/.55*Math.PI)*.65*(f.action==='strike'?1:-1):0;}
  appearance?.update(elapsed);
  for(const shard of shards)if(shard.obj.visible){shard.obj.rotation.y+=movingAllowed?dt:0;shard.obj.position.y=shard.y+Math.sin(elapsed*1.8+shard.id)*.16;}
  npcs.forEach((n,i)=>{
    const relation=state.friends[n.id];n.obj.visible=relation!=='home';n.label.visible=n.obj.visible;
    if(relation==='follow'&&movingAllowed){
      const target=player.position.clone().add(new THREE.Vector3(Math.sin(yaw+2+i)*3,0,Math.cos(yaw+2+i)*3));
      n.obj.position.x=THREE.MathUtils.damp(n.obj.position.x,target.x,2,dt);n.obj.position.z=THREE.MathUtils.damp(n.obj.position.z,target.z,2,dt);
      const contact=resolveFieldPosition(n.obj.position.x,n.obj.position.z,terrainHeight(n.obj.position.x,n.obj.position.z),meadow.colliders);n.obj.position.x=contact.x;n.obj.position.z=contact.z;
    }
    n.obj.position.y=terrainHeight(n.obj.position.x,n.obj.position.z)+1.7+Math.sin(elapsed+i)*.12;
    n.label.position.copy(n.obj.position).add(new THREE.Vector3(0,2.5,0));
  });
  const r=regionAt(player.position.x,player.position.z);
  meadow.update(elapsed,player.position);
  if(lastRegion!==r.id){
    lastRegion=r.id;$('region-label').textContent='NOU / 思考の野原';$('region-name').textContent=r.name;$('region-desc').textContent=r.note;
    if(active&&!state.visited.includes(r.id)){state.visited.push(r.id);save();toast(`${r.name} に足を踏み入れた。`);}
  }
  const focus=combat.target();if(focus&&movingAllowed){const angle=Math.atan2(focus.x-player.position.x,focus.z-player.position.z);yaw+=Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw))*(1-Math.exp(-dt*4));}
  lookAt.copy(player.position).add(new THREE.Vector3(0,1.7+Math.max(0,-pitch-.1)*5,0));
  desiredCam.set(player.position.x-Math.sin(yaw)*9,player.position.y+3+pitch*8,player.position.z-Math.cos(yaw)*9);
  desiredCam.y=Math.max(desiredCam.y,terrainHeight(desiredCam.x,desiredCam.z)+.8);
  // Shorten the camera arm before terrain or a solid landscape object hides Mou.
  desiredCam.lerpVectors(lookAt,desiredCam,cameraClearance(lookAt,desiredCam,physicsColliders));
  camera.position.lerp(desiredCam,1-Math.exp(-dt*8));
  camera.position.lerpVectors(lookAt,camera.position,cameraClearance(lookAt,camera.position,physicsColliders));camera.lookAt(lookAt);
  hudTick+=dt;if(hudTick>.15){hudTick=0;updateNearby();const deg=((yaw*180/Math.PI)%360+360)%360;$('compass').textContent=['S','E','N','W'][Math.round(deg/90)%4];}
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);fieldPrint.resize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();shellView?.resize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);resize();camera.position.set(0,7,10);
$('compass').onclick=()=>{yaw=player.rotation.y;pitch=.08;combat.unlock();};
$('objective-button').onclick=()=>$('journey-open').onclick();
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;$('fatal').hidden=false;});
function frame(ms){requestAnimationFrame(frame);const dt=Math.min((ms-lastTime)/1000,.1);lastTime=ms;if(document.hidden)return;update(dt);if(shellMode)renderer.render(shellView.scene,shellView.camera);else fieldPrint.render(scene,camera);}
updateHUD();modelNote.textContent='野原は準備できました。ムー君の3Dは後から読み込まれます。';$('begin').disabled=false;openDialog($('welcome'));requestAnimationFrame(frame);
