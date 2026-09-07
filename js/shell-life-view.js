import * as THREE from 'three';
import {createStarfield} from './shell-starfield.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export function createShellLifeView(player,onCollect,npcs=[]){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#000000');
 const stars=createStarfield(scene,{starCount:2800,brightStarCount:48});
 const camera=new THREE.PerspectiveCamera(43,1,.1,250);camera.position.set(7,7,10);camera.lookAt(0,.65,0);
 scene.add(new THREE.AmbientLight(0xffffff,.7));
 const key=new THREE.DirectionalLight(0xfff0e0,1.15);key.position.set(2,4,3);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc8d8ff,.5);fill.position.set(-3,1,-2);scene.add(fill);
 const geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:0x363038,roughness:.9});
 function box(x,y,z,sx,sy,sz,color){const m=new THREE.Mesh(geo,mat.clone());m.material.color.set(color);m.position.set(x,y,z);m.scale.set(sx,sy,sz);scene.add(m);return m;}
 // Temporary floor while the original complete room downloads.
 const loadingFloor=box(0,-.18,0,5.6,.36,5.6,0x272329);
 new GLTFLoader().load('assets/room/shell-lite.glb?v=20260908cosmos3',gltf=>{scene.remove(loadingFloor);scene.add(gltf.scene);},undefined,()=>{});
 const spots=[[-1.8,.7],[-.5,1.4],[1.2,.8],[2.2,-.1],[.1,-.2],[-1.3,-.4]].map(([x,z],i)=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(.18),new THREE.MeshStandardMaterial({color:0xe4b8b5,emissive:0xa82134,emissiveIntensity:.9}));m.position.set(x,.3,z);m.userData.spot=i;scene.add(m);return m;});
 const shelf=[];for(let i=0;i<12;i++){
  const vessel=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,1),mat.clone());vessel.position.set(-2.3,.2,.1+(i%6)*.38);scene.add(vessel);
  const paper=new THREE.Mesh(new THREE.PlaneGeometry(.62,.42),new THREE.MeshBasicMaterial({color:0xffffff}));paper.position.set(-2.68,.85+Math.floor(i/4)*.55,-.65+(i%4)*.72);paper.rotation.y=Math.PI/2;scene.add(paper);shelf.push({vessel,paper,text:null});
 }
 const guests=npcs.map((n,i)=>{const sprite=n.obj.clone();sprite.position.set(-2.3+i*1.2,.9,-2.5);sprite.scale.set(1,1,1);scene.add(sprite);return {sprite,id:n.id};});
 const lamp=new THREE.PointLight(0xffd39a,0,9);lamp.position.set(-2,2,-1.8);scene.add(lamp);
 let restored=null,target=new THREE.Vector3(0,0,0),nextWander=0,time=0,pending=null;
 return {scene,camera,
 enter(){restored={parent:player.parent,position:player.position.clone(),rotation:player.rotation.clone(),scale:player.scale.clone()};scene.add(player);player.scale.setScalar(.72);player.position.set(0,0,.6);target.copy(player.position);pending=null;nextWander=time+8;},
 leave(){if(!restored)return;restored.parent.add(player);player.position.copy(restored.position);player.rotation.copy(restored.rotation);player.scale.copy(restored.scale);restored=null;},
 collect(i){if(!spots[i]?.visible)return;target.set(spots[i].position.x,0,spots[i].position.z);pending=i;},
 touch(event,canvas){const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(spots.filter(m=>m.visible))[0];if(hit)this.collect(hit.object.userData.spot);},
 update(dt,s,paused,friends={},lit=false){
  guests.forEach(g=>g.sprite.visible=friends[g.id]==='home');lamp.intensity=lit?12:0;
  spots.forEach((m,i)=>{m.visible=s.spots[i]<=Date.now();m.rotation.y=time+i;m.position.y=.3+Math.sin(time*2+i)*.055;});
  shelf.forEach((entry,i)=>{
   const text=s.items[i]?.text;entry.vessel.visible=i<s.items.length&&!text;entry.paper.visible=!!text;
   if(text&&text!==entry.text){const c=document.createElement('canvas');c.width=320;c.height=220;const ctx=c.getContext('2d');ctx.fillStyle='#d6bfb1';ctx.fillRect(0,0,320,220);ctx.fillStyle='#aa1728';ctx.fillRect(18,18,42,8);ctx.fillStyle='#291b25';ctx.font='24px sans-serif';for(let line=0;line<4;line++)ctx.fillText(text.slice(line*10,(line+1)*10),18,64+line*36);entry.paper.material.map?.dispose();entry.paper.material.map=new THREE.CanvasTexture(c);entry.paper.material.map.colorSpace=THREE.SRGBColorSpace;entry.paper.material.needsUpdate=true;entry.text=text;}
  });
  if(paused)return false;time+=dt;stars.update(time);
  if(time>nextWander&&pending===null&&Date.now()-s.care>120000){const angle=time*.73;target.set(Math.sin(angle)*1.3,0,Math.cos(angle)*.7+.35);nextWander=time+9;}
  const distance=target.distanceTo(player.position),moving=distance>.06;
  if(moving){const delta=target.clone().sub(player.position);player.rotation.y=Math.atan2(delta.x,delta.z);player.position.addScaledVector(delta,Math.min(1,dt*.8/distance));}
  else if(pending!==null){onCollect(pending);pending=null;nextWander=time+8;}
  return moving;
 },resize(w,h){camera.aspect=w/h;camera.position.set(0,w<h?3.5:2.8,w<h?14:12);camera.lookAt(0,w<h?-1:1,0);camera.updateProjectionMatrix();}};
}
