import * as THREE from 'three';

// Shared, feathered sprites make the collectible a volume of soot, not a gem.
let sootTexture;
export function createSootShard(seed=0){
  if(!sootTexture){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),p=ctx.createImageData(64,64);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5),n=.8+.2*Math.sin(x*.6+Math.sin(y*.4)*2);p.data.set([8,7,10,Math.max(0,1-r)**1.8*n*220],(y*64+x)*4);}ctx.putImageData(p,0,0);sootTexture=new THREE.CanvasTexture(c);}
  const root=new THREE.Group(),wisps=[];
  const material=new THREE.SpriteMaterial({map:sootTexture,transparent:true,depthWrite:false,color:0xffffff});
  for(let i=0;i<9;i++){const sprite=new THREE.Sprite(material);root.add(sprite);wisps.push(sprite);}
  root.userData.animate=time=>{wisps.forEach((w,i)=>{const a=i*2.399+time*(.15+i*.013)+seed;w.position.set(Math.cos(a)*(.12+i*.028),Math.sin(a*1.7)*.22+Math.sin(time*.6+i)*.1,Math.sin(a)*(.12+i*.028));const size=.65+.25*Math.sin(i+time*.7);w.scale.set(size,size*1.2,1);});};
  root.userData.animate(0);return root;
}

let irisTexture,scleraTexture;
function eyeTextures(){
  if(irisTexture)return;
  function texture(size,pixel){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),image=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++)image.data.set(pixel(x,y,size),(y*size+x)*4);ctx.putImageData(image,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
  irisTexture=texture(512,(x,y,size)=>{const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);const fiber=Math.sin(a*137+Math.sin(r*39)*1.7)+.5*Math.sin(a*263+r*17);const crypt=Math.max(0,Math.sin(a*41+Math.sin(r*21)*2))**7;const edge=1-THREE.MathUtils.smoothstep(r,.82,1),ring=Math.exp(-(((r-.39)*18)**2));const n=(62+fiber*18-crypt*22+ring*29)*edge;return [n*1.25+9,n*.91+8,n*.56+6,r<=1?255:0];});
  scleraTexture=texture(512,(x,y,size)=>{const u=x/size,v=y/size;let vessel=0;for(let k=0;k<6;k++){const path=(k+.45)/6+.025*Math.sin(v*19+k)+.012*Math.sin(v*43+k*3);const d=Math.abs(u-path);vessel=Math.max(vessel,Math.exp(-d*d*190000)*(.4+.6*Math.abs(v-.5)*2));}const grain=Math.sin(x*12.989+y*78.233)*2;return [222+grain-vessel*35,211+grain-vessel*99,198+grain-vessel*91,255];});
}

export function createWatcher(){
  eyeTextures();
  const root=new THREE.Group();
  const skin=new THREE.MeshPhysicalMaterial({color:0xffffff,map:scleraTexture,roughness:.2,clearcoat:1,clearcoatRoughness:.09}),rimMaterial=new THREE.MeshStandardMaterial({color:0x846260,roughness:.55});
  const eye=new THREE.Group();eye.position.y=.52;root.add(eye);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(.52,32,24),skin);globe.scale.set(1.08,1,.95);eye.add(globe);
  const iris=new THREE.Mesh(new THREE.CircleGeometry(.235,64),new THREE.MeshStandardMaterial({map:irisTexture,transparent:true,roughness:.45,depthWrite:false}));iris.position.z=.495;eye.add(iris);
  const pupil=new THREE.Mesh(new THREE.CircleGeometry(.083,40),new THREE.MeshBasicMaterial({color:0x050405}));pupil.position.z=.5;eye.add(pupil);
  const cornea=new THREE.Mesh(new THREE.SphereGeometry(.242,40,24),new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.13,roughness:.035,clearcoat:1,clearcoatRoughness:.025,depthWrite:false}));cornea.scale.set(1,1,.30);cornea.position.z=.49;eye.add(cornea);
  const catchlight=new THREE.Mesh(new THREE.SphereGeometry(.026,12,8),new THREE.MeshBasicMaterial({color:0xfff9eb,transparent:true,opacity:.82}));catchlight.scale.set(.65,1,.12);catchlight.position.set(-.065,.087,.552);eye.add(catchlight);
  const lid=new THREE.Mesh(new THREE.SphereGeometry(.54,28,16),rimMaterial);lid.scale.set(1.10,1,.96);lid.position.y=.52;lid.visible=false;root.add(lid);
  const nervePoints=[new THREE.Vector3(0,.35,-.35),new THREE.Vector3(.15,.18,-.55),new THREE.Vector3(-.1,.05,-.68),new THREE.Vector3(-.32,.02,-.62)];root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nervePoints),20,.045,8,false),rimMaterial));
  root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  return {root,update(time,opened,player){const dx=player.x-root.position.x,dz=player.z-root.position.z;eye.rotation.y=Math.max(-.7,Math.min(.7,Math.atan2(dx,dz)));const blink=Math.max(0,Math.sin(time*.72+root.position.x)*18-17);eye.visible=!opened&&blink<.75;lid.visible=opened||blink>=.75;}};
}
