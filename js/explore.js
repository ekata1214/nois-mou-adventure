import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMouMotion } from './mou-motion.js?v=20260907motion';
import { buildMeadow } from './meadow-world.js?v=20260907meadow';
import { KEY, REGIONS, terrainHeight, regionAt, freshState, sanitizeState, availableShards, makeFriend, craftLamp, nearestReachable, resolveFieldPosition, cameraClearance } from './explore-state.js?v=20260907meadow';

const $=id=>document.getElementById(id);
const canvas=$('world');
let state=freshState(), storageOK=true;
try{state=sanitizeState(JSON.parse(localStorage.getItem(KEY)));}catch{storageOK=false;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}updateHUD();}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb9c2ab);
scene.fog=new THREE.FogExp2(0xb9c2ab,.007);
const camera=new THREE.PerspectiveCamera(58,1,.1,360);
scene.add(new THREE.HemisphereLight(0xd4e4ed,0x535132,2.1));
const sun=new THREE.DirectionalLight(0xffedd1,3);sun.position.set(-30,70,-40);scene.add(sun);
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
    const underside=mesh(new THREE.ConeGeometry(3,2.5,7),0x777765,x,y-1.7,z);underside.rotation.z=Math.PI;underside.scale.z=.67;
    slab.material.emissive=new THREE.Color(r.color);slab.material.emissiveIntensity=.14;
    label(word,x,y+1.7,z,6);platforms.push({x,y,z,word,mesh:slab});
  });
}
const portal={x:0,y:terrainHeight(0,10),z:10};
const gate=mesh(new THREE.TorusGeometry(2.8,.16,8,48),0xe5d8b1,0,portal.y+3,10);
gate.material.emissive=new THREE.Color(0xd9b76d);gate.material.emissiveIntensity=.4;
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
let avatar=null,motion=null;
// One existing GLB, loaded in the background. Exploration is usable while it downloads.
const modelNote=$('loading-note');
new GLTFLoader().load('assets/muu/mou-actions.glb?v=20260907motion',gltf=>{
  const root=gltf.scene;root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)return;
  root.scale.setScalar(2.05/size.y);box.setFromObject(root);const center=box.getCenter(new THREE.Vector3());
  root.position.set(-center.x,-box.min.y,-center.z);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  player.add(root);avatar=root;fallback.visible=false;
  motion=createMouMotion(root,gltf.animations);
  $('wave').disabled=!motion.ready;
  modelNote.textContent='ムー君の動作も準備できました。';
},event=>{if(event.total)modelNote.textContent=`野原は準備できました。ムー君の3Dを読込中 ${Math.round(event.loaded/event.total*100)}%（先に遊べます）`;},()=>{modelNote.textContent='今回は元のムー君の絵で遊べます。3Dモデルは読み込めませんでした。';});

let yaw=Math.PI*1.25,pitch=.22,verticalSpeed=0,grounded=true,flight=null,active=false,runToggle=false;
let nearest=null,leapTarget=null,lastRegion=null,elapsed=0,lastTime=0,toastTimer;
const keys=new Set(),held=new Map();let drag=null;
const dialogs=[$('welcome'),$('conversation'),$('shell'),$('memory')];
const modalOpen=()=>dialogs.some(d=>d.open);
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function updateHUD(){
  $('inventory').textContent=`記憶のかけら ${availableShards(state)}`;
  $('friend-count').textContent=`友達 ${Object.keys(state.friends).length}`;
  $('trail-progress').textContent=`野原の記憶 ${state.discoveries.length} / 3`;
  $('trail-hint').textContent=state.discoveries.length===3?'道の先まで来た。気配に会って、殻に持ち帰ろう。':'土の道をたどって、光る石碑を探そう。';
}
function clearInput(){keys.clear();held.clear();drag=null;runToggle=false;$('run').setAttribute('aria-pressed','false');}
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
window.addEventListener('keydown',e=>{
  if(modalOpen()||!active)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(e.code==='Space')jump();if(e.code==='KeyQ')leap();if(e.code==='KeyE')interact();if(e.code==='KeyR')wave();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('pointerdown',e=>{if(modalOpen())return;canvas.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.004,-.1,.95);drag.x=e.clientX;drag.y=e.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)drag=null;});
document.querySelectorAll('[data-dir]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(modalOpen())return;held.set(e.pointerId,button.dataset.dir);button.setPointerCapture(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>held.delete(e.pointerId));
});
$('run').onclick=()=>{runToggle=!runToggle;$('run').setAttribute('aria-pressed',String(runToggle));};
$('jump').onclick=jump;$('leap').onclick=leap;$('interact').onclick=interact;
$('wave').onclick=wave;
function wave(){if(!active||modalOpen()||!grounded||flight)return;motion?.gesture('wave');}
function jump(){if(!active||modalOpen()||flight||!grounded)return;verticalSpeed=9;grounded=false;}
function leap(){
  if(!active||modalOpen()||!leapTarget||flight)return;
  flight={from:player.position.clone(),to:new THREE.Vector3(leapTarget.x,leapTarget.y,leapTarget.z),t:0};verticalSpeed=0;
  toast(`「${leapTarget.word}」へ、思考をつなぐ。`);
}
function standingHeight(x,z,previousY){let floor=terrainHeight(x,z);for(const p of platforms)if(Math.abs(x-p.x)<3&&Math.abs(z-p.z)<2&&previousY>=p.y-.12)floor=Math.max(floor,p.y);return floor;}
function openDialog(d){clearInput();d.showModal();}
$('welcome').addEventListener('cancel',e=>{if(!active)e.preventDefault();});
$('help-open').onclick=()=>openDialog($('welcome'));
$('begin').onclick=()=>{$('welcome').close();active=true;lastRegion=null;canvas.focus();};
$('leave-npc').onclick=()=>$('conversation').close();
$('shell-button').onclick=openShell;
$('return-field').onclick=()=>$('shell').close();
$('leave-memory').onclick=()=>$('memory').close();
function interact(){
  if(!active||modalOpen()||!nearest)return;
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
function renderShell(){
  $('shell-shelf').textContent=`記憶のかけら ${availableShards(state)}　 /　訪れた感情 ${state.visited.length} / 4　 /　${state.lamp?'小さな灯りがともっている。':'まだ、灯りのない棚。'}`;
  $('shell-shelf').classList.toggle('lit',state.lamp);
  const home=npcs.filter(n=>state.friends[n.id]==='home').map(n=>n.name);
  $('shell-friends').textContent=home.length?`殻で待っている：${home.join('、')}`:'今は、ムー君だけの静かな殻。';
  $('craft-lamp').disabled=state.lamp||availableShards(state)<3;
  $('craft-lamp').textContent=state.lamp?'灯りを作った':'かけら3つで灯りを作る';
  $('memo-wall').replaceChildren();for(const memo of [...state.memos].reverse()){const li=document.createElement('li');li.textContent=memo;$('memo-wall').append(li);}
  $('save-notice').textContent=storageOK?'この端末に保存します。メモは最新12件まで。':'端末に保存できません。このページを閉じると今回の進行が失われます。';
}
function openShell(){if(!active||modalOpen())return;renderShell();openDialog($('shell'));}
$('craft-lamp').onclick=()=>{if(craftLamp(state)){save();renderShell();}};
$('save-memo').onclick=()=>{const text=$('memo').value.trim();if(!text)return;state.memos.push(text.slice(0,160));state.memos=state.memos.slice(-12);$('memo').value='';save();renderShell();$('save-notice').textContent=storageOK?'言葉を壁に残しました。':'保存できません。このページを閉じる前に言葉を控えてください。';};
function updateNearby(){
  nearest=null;let best=4.3;
  function consider(kind,item,pos){const d=player.position.distanceTo(pos);if(d<best){best=d;nearest={kind,item};}}
  consider('portal',portal,new THREE.Vector3(portal.x,portal.y,portal.z));
  for(const s of shards)if(s.obj.visible)consider('shard',s,s.obj.position);
  for(const n of npcs)if(n.obj.visible)consider('npc',n,n.obj.position);
  for(const p of meadow.markers)consider('memory',p,p.mesh.position);
  $('interact').hidden=!nearest;
  $('nearby-label').textContent=nearest?(nearest.kind==='npc'||nearest.kind==='memory'?nearest.item.name:nearest.kind==='portal'?'内省と生活の場所':'記憶のかけら'):'';
  $('interact').textContent=nearest?.kind==='memory'?'耳をすます · E':nearest?.kind==='npc'?'話しかける · E':nearest?.kind==='portal'?'殻へ帰る · E':'拾う · E';
  leapTarget=nearestReachable(player.position,platforms.filter(p=>{
    const dx=p.x-player.position.x,dz=p.z-player.position.z;return dx*Math.sin(yaw)+dz*Math.cos(yaw)>0;
  }));
  $('leap').disabled=!leapTarget||!!flight;$('leap').textContent=leapTarget?`「${leapTarget.word}」へ`:'思考へ';
}
const desiredCam=new THREE.Vector3(),lookAt=new THREE.Vector3();let hudTick=0;
function update(dt){
  elapsed+=dt;
  const movingAllowed=active&&!modalOpen();
  let moveX=0,moveZ=0;
  if(movingAllowed&&!flight){
    const dirs=[...held.values()];
    const forward=(keys.has('KeyW')||keys.has('ArrowUp')||dirs.includes('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||dirs.includes('back')?1:0);
    const side=(keys.has('KeyD')||keys.has('ArrowRight')||dirs.includes('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||dirs.includes('left')?1:0);
    const length=Math.hypot(side,forward)||1,speed=(runToggle||keys.has('ShiftLeft')||keys.has('ShiftRight')?8:4)*dt;
    moveX=(forward*Math.sin(yaw)-side*Math.cos(yaw))/length*speed;
    moveZ=(forward*Math.cos(yaw)+side*Math.sin(yaw))/length*speed;
    player.position.x=THREE.MathUtils.clamp(player.position.x+moveX,-110,110);player.position.z=THREE.MathUtils.clamp(player.position.z+moveZ,-110,110);
    // Resolve solid trunks and large rocks without trapping the player on contact.
    const resolved=resolveFieldPosition(player.position.x,player.position.z,player.position.y,meadow.colliders);
    player.position.x=resolved.x;player.position.z=resolved.z;
    const floor=standingHeight(player.position.x,player.position.z,player.position.y);
    verticalSpeed-=22*dt;player.position.y+=verticalSpeed*dt;
    if(player.position.y<=floor){player.position.y=floor;verticalSpeed=0;grounded=true;}else grounded=false;
  }
  if(flight&&movingAllowed){
    flight.t=Math.min(1,flight.t+dt/1.05);const t=flight.t,s=t*t*(3-2*t);
    player.position.lerpVectors(flight.from,flight.to,s);player.position.y+=Math.sin(Math.PI*t)*5;
    if(t===1){flight=null;grounded=true;}
  }
  if(avatar && (moveX||moveZ)){
    const target=Math.atan2(moveX,moveZ);
    const delta=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y));
    player.rotation.y+=delta*(1-Math.exp(-dt*12));
  }
  motion?.update(dt,{moving:Math.hypot(moveX,moveZ)>.0001,running:runToggle||keys.has('ShiftLeft')||keys.has('ShiftRight'),grounded,verticalSpeed,flight:!!flight,paused:!movingAllowed});
  for(const shard of shards)if(shard.obj.visible){shard.obj.rotation.y+=dt;shard.obj.position.y=shard.y+Math.sin(elapsed*1.8+shard.id)*.16;}
  npcs.forEach((n,i)=>{
    const relation=state.friends[n.id];n.obj.visible=relation!=='home';n.label.visible=n.obj.visible;
    if(relation==='follow'&&movingAllowed){
      const target=player.position.clone().add(new THREE.Vector3(Math.sin(yaw+2+i)*3,0,Math.cos(yaw+2+i)*3));
      n.obj.position.x=THREE.MathUtils.damp(n.obj.position.x,target.x,2,dt);n.obj.position.z=THREE.MathUtils.damp(n.obj.position.z,target.z,2,dt);
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
  lookAt.copy(player.position).add(new THREE.Vector3(0,1.7,0));
  desiredCam.set(player.position.x-Math.sin(yaw)*9,player.position.y+3+pitch*8,player.position.z-Math.cos(yaw)*9);
  desiredCam.y=Math.max(desiredCam.y,terrainHeight(desiredCam.x,desiredCam.z)+1.8);
  // Shorten the camera arm before terrain or a solid landscape object hides Mou.
  desiredCam.lerpVectors(lookAt,desiredCam,cameraClearance(lookAt,desiredCam,meadow.colliders));
  camera.position.lerp(desiredCam,1-Math.exp(-dt*8));
  camera.position.lerpVectors(lookAt,camera.position,cameraClearance(lookAt,camera.position,meadow.colliders));camera.lookAt(lookAt);
  hudTick+=dt;if(hudTick>.15){hudTick=0;updateNearby();const deg=((yaw*180/Math.PI)%360+360)%360;$('compass').textContent=['S','E','N','W'][Math.round(deg/90)%4];}
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();camera.position.set(0,7,10);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;$('fatal').hidden=false;});
function frame(ms){requestAnimationFrame(frame);const dt=Math.min((ms-lastTime)/1000,.04);lastTime=ms;if(document.hidden)return;update(dt);renderer.render(scene,camera);}
updateHUD();modelNote.textContent='野原は準備できました。ムー君の3Dは後から読み込まれます。';$('begin').disabled=false;openDialog($('welcome'));requestAnimationFrame(frame);
