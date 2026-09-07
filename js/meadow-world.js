import {buildFieldSky} from './field-sky.js?v=20260908print';
import {CAMPS,CHESTS,RUNES,BERRIES} from './adventure-state.js?v=20260908shell';
import * as THREE from 'three';
import {buildPond} from './pond-water.js?v=20260907physics';
import { terrainHeight } from './explore-state.js?v=20260908shell';

// A deterministic, entirely local landscape. No additional image downloads.
export const MEMORY_PLACES = [
  {id:'water',x:-19,z:-38,name:'言葉になる前の水',text:'忘れたと思っていた声が、水面でほどける。思い出せなくても、ここにいたことは消えない。'},
  {id:'grove',x:-43,z:-29,name:'ひと息の木陰',text:'急がなくていい、と誰かが言った気がした。何も見つけない時間も、冒険の一部なのかもしれない。'},
  {id:'arch',x:-65,z:-62,name:'はじまりの見晴らし',text:'さっきまで遠くに見えていた場所に、自分の足で立っている。世界は、知らないままの方へ続いている。'},
];
export function pathDistance(x,z) {
  const route=[[0,0],[-12,-13],[-29,-25],[-45,-44],[-65,-62]];
  let distance=Infinity;
  for(let i=1;i<route.length;i++) {
    const [ax,az]=route[i-1],[bx,bz]=route[i];
    const t=THREE.MathUtils.clamp(((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2),0,1);
    distance=Math.min(distance,Math.hypot(x-ax-t*(bx-ax),z-az-t*(bz-az)));
  }
  return distance;
}
export function buildMeadow(scene,renderer,sun) {
  const touchDevice=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
  let seed=3817;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const dummy=new THREE.Object3D(),colliders=[],stumps=[];
  const stumpSpots=[[-7,-10,.8,1.3],[-19,-22,1.15,1.2],[-35,-34,1.4,1.5],[-49,-48,1.05,1.3]];
  function stoneTexture() {
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d'),data=ctx.createImageData(128,128);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
      const n=145+random()*65;
      const i=(y*128+x)*4;data.data.set([n,n*.97,n*.86,255],i);
    }
    ctx.putImageData(data,0,0);
    const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,4);tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }
  const texture=stoneTexture();
  const ground=new THREE.PlaneGeometry(240,240,200,200);ground.rotateX(-Math.PI/2);
  const pos=ground.attributes.position,colors=[];
  const grassColor=new THREE.Color(),earth=new THREE.Color('#9e9794');
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrainHeight(x,z));
    const patch=Math.sin(x*.12+Math.cos(z*.17))*Math.cos(z*.095);
    grassColor.setHSL(.18+patch*.055,.075,.34+patch*.05);
    const path=1-THREE.MathUtils.smoothstep(pathDistance(x,z),1.4,3.5);
    grassColor.lerp(earth,path*.85);
    colors.push(grassColor.r,grassColor.g,grassColor.b);
  }
  ground.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));ground.computeVertexNormals();
  const groundTexture=texture.clone();groundTexture.repeat.set(100,100);groundTexture.needsUpdate=true;
  const earthMesh=new THREE.Mesh(ground,new THREE.MeshStandardMaterial({vertexColors:true,map:groundTexture,bumpMap:groundTexture,bumpScale:.035,roughness:1}));
  earthMesh.receiveShadow=true;scene.add(earthMesh);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  sun.castShadow=true;sun.shadow.mapSize.set(touchDevice?1024:2048,touchDevice?1024:2048);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:180});
  sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;scene.add(sun.target);
  const stone=new THREE.MeshStandardMaterial({color:0xa3a0a1,map:texture,bumpMap:texture,bumpScale:.16,roughness:.95});
  const bark=new THREE.MeshStandardMaterial({color:0xd4d2cf,map:texture,bumpMap:texture,bumpScale:.15,roughness:1});
  function add(geo,mat,x,y,z,sx=1,sy=1,sz=1) {
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;scene.add(m);return m;
  }
  const ringsCanvas=document.createElement('canvas');ringsCanvas.width=ringsCanvas.height=128;
  const rings=ringsCanvas.getContext('2d');rings.fillStyle='#c49560';rings.fillRect(0,0,128,128);
  for(let r=5;r<65;r+=4){rings.beginPath();rings.strokeStyle=r%3?'#956438':'#dfb078';rings.lineWidth=1.3;rings.ellipse(64,64,r,r*.94,.1,0,Math.PI*2);rings.stroke();}
  const ringsTexture=new THREE.CanvasTexture(ringsCanvas);ringsTexture.colorSpace=THREE.SRGBColorSpace;
  const cutWood=new THREE.MeshStandardMaterial({map:ringsTexture,roughness:.92});
  for(const [x,z,h,r] of stumpSpots){
    const y=terrainHeight(x,z),top=y+h;
    add(new THREE.CylinderGeometry(r,r*1.16,h,18),[bark,cutWood,bark],x,y+h/2,z);
    for(let j=0;j<4;j++){const a=j*Math.PI/2;const root=add(new THREE.ConeGeometry(.25,.6,5),bark,x+Math.cos(a)*r,y+.16,z+Math.sin(a)*r);root.rotation.z=Math.cos(a)*.5;root.rotation.x=Math.sin(a)*.5;}
    stumps.push({x,z,y:top,r});colliders.push({x,z,r:r*1.05,h,top,walkable:true});
  }
  // Far ridges break up the horizon and keep the playable boundary in the distance.
  for(let i=0;i<34;i++) {
    const a=i/34*Math.PI*2,r=150+random()*40,x=Math.sin(a)*r,z=Math.cos(a)*r;
    add(new THREE.IcosahedronGeometry(1,2),stone,x,-10,z,24+random()*26,15+random()*29,25+random()*25);
  }
  // Shared weathered variants: broad fractures, smaller mineral grain, moss on top.
  const rockCanvas=document.createElement('canvas');rockCanvas.width=rockCanvas.height=256;
  const rockContext=rockCanvas.getContext('2d'),pixels=rockContext.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=x/256*Math.PI*2,v=y/256*Math.PI*2;
    const veins=Math.sin(u*3+Math.sin(v*2)*1.5)+Math.cos(v*4+Math.sin(u));
    const fracture=Math.exp(-Math.abs(veins)*28),grain=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
    const n=155+24*Math.sin(u+Math.cos(v*2))+12*grain-fracture*65;
    pixels.data.set([n,n*.98,n*.91,255],(y*256+x)*4);
  }
  rockContext.putImageData(pixels,0,0);
  const rockMap=new THREE.CanvasTexture(rockCanvas);rockMap.colorSpace=THREE.SRGBColorSpace;rockMap.wrapS=rockMap.wrapT=THREE.RepeatWrapping;
  const rockMaterial=new THREE.MeshStandardMaterial({map:rockMap,bumpMap:rockMap,bumpScale:.12,roughness:1,vertexColors:true});
  const rockVariants=Array.from({length:5},(_,variant)=>{
    const geo=new THREE.SphereGeometry(1,48,32),p=geo.attributes.position,colors=[];
    for(let i=0;i<p.count;i++){
      let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      let cavity=0;
      for(let k=0;k<28;k++){const a=k*2.399+variant,cy=-.6+(k%5)*.33,cr=Math.sqrt(Math.max(.05,1-cy*cy)),cx=Math.cos(a)*cr,cz=Math.sin(a)*cr;const d=(x-cx)**2+(y-cy)**2+(z-cz)**2;cavity=Math.max(cavity,Math.exp(-d/(.009+(k%3)*.007))*.42);}
      const warp=1-cavity+.14*Math.sin(x*5+variant)*Math.cos(z*4+y*3)+.08*Math.sin(y*8+variant);
      x*=warp;z*=warp;y=y*warp*.86;p.setXYZ(i,x,y,z);
      const moss=y>.25?Math.max(0,Math.sin(x*7+z*5+variant))*.3:0;
      const shade=.67-cavity*1.3+.16*Math.sin(x*3+y*2+variant);colors.push(shade-moss*.3,shade+moss*.08,shade*.94-moss*.4);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
  });
  const rockGeo=rockVariants[0];
  for(let i=0;i<165;i++) {
    const x=(random()-.58)*195,z=(random()-.58)*195;
    if([...CAMPS,...CHESTS,...RUNES,...BERRIES].some(p=>Math.hypot(x-p.x,z-p.z)<3.4))continue;
    if(stumpSpots.some(p=>Math.hypot(x-p[0],z-p[1])<p[3]+2))continue;
    if(MEMORY_PLACES.some(p=>Math.hypot(x-p.x,z-p.z)<3))continue;
    if(pathDistance(x,z)<4||Math.hypot(x+19,z+46)<12)continue;
    const s=.3+random()**3*3.5;
    const rock=add(rockVariants[i%5],rockMaterial,x,terrainHeight(x,z)-s*.2,z,s,s*(.5+random()),s*.85);rock.rotation.y=random()*6.28;
    if(s>1)colliders.push({x,z,r:s,top:rock.position.y+rock.scale.y*.8,h:Math.max(.1,rock.scale.y*.8-s*.2)});
  }
  // Tapered, fluted growths retain soft silhouettes instead of uniform pipes.
  function growth(points,radius,segments=24){
    const curve=new THREE.CatmullRomCurve3(points),g=new THREE.TubeGeometry(curve,segments,radius,10,false),p=g.attributes.position;
    for(let i=0;i<=segments;i++){const t=i/segments,c=curve.getPointAt(t),taper=.08+.92*Math.pow(1-t,.7);for(let j=0;j<=10;j++){const n=i*11+j,v=new THREE.Vector3().fromBufferAttribute(p,n).sub(c);v.multiplyScalar(taper*(1+.12*Math.sin(j*3.77+t*35)));v.add(c);p.setXYZ(n,v.x,v.y,v.z);}}
    g.computeVertexNormals();return g;
  }
  const limbGeo=growth([new THREE.Vector3(0,0,0),new THREE.Vector3(.12,.35,0),new THREE.Vector3(.45,.72,.08),new THREE.Vector3(.3,1,.14),new THREE.Vector3(.13,.96,.12)],.11);
  const limbs=new THREE.InstancedMesh(limbGeo,bark,2200);let limbCount=0;
  function instanceLimb(x,y,z,sx,sy,sz,ry,rz=0){dummy.position.set(x,y,z);dummy.rotation.set(0,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();limbs.setMatrixAt(limbCount++,dummy.matrix);}
  for(let i=0;i<80;i++){
    const x=-100+random()*175,z=-103+random()*183;
    if([...CAMPS,...CHESTS,...RUNES,...BERRIES,...MEMORY_PLACES].some(p=>Math.hypot(x-p.x,z-p.z)<4))continue;
    if(stumpSpots.some(p=>Math.hypot(x-p[0],z-p[1])<p[3]+3))continue;
    if(pathDistance(x,z)<6||Math.hypot(x+19,z+46)<14||Math.hypot(x+65,z+62)<13||Math.hypot(x,z)<9)continue;
    const h=4+random()*6,y=terrainHeight(x,z),rotation=random()*6.28;
    instanceLimb(x,y,z,3,h,3,rotation);colliders.push({x,z,r:.6,h});
    for(let j=0;j<5;j++){
      const a=rotation+j*2.4,branchY=y+h*(.25+j*.11);
      instanceLimb(x+Math.cos(rotation)*.4,branchY,z+Math.sin(rotation)*.4,2.3,h*(.35+random()*.15),2.3,a,.25);
      instanceLimb(x,y-.05,z,2.6,1.2,2.6,a,1.15);
      for(let k=0;k<2;k++)instanceLimb(x+Math.sin(a)*(.6+k*.5),branchY+h*.22,z+Math.cos(a)*(.6+k*.5),.6,1.3+k*.3,.6,a+k,.4);
    }
  }
  // Dense connected buttresses and small bridging veins create irregular openings.
  const groveX=-43,groveZ=-57,groveY=terrainHeight(groveX,groveZ);
  for(let k=0;k<13;k++){
    const a=k*2.399,r=5.5+(k%3)*.8,h=7+(k%5)*1.2;
    const points=[new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r),new THREE.Vector3(Math.cos(a+.2)*3,h*.22,Math.sin(a+.2)*3),new THREE.Vector3(Math.cos(a+.5)*1.7,h*.65,Math.sin(a+.5)*1.7),new THREE.Vector3(Math.cos(a+1)*2,h,Math.sin(a+1)*2),new THREE.Vector3(Math.cos(a+1.8)*2.7,h*.92,Math.sin(a+1.8)*2.7)];
    points[0].y=terrainHeight(groveX+points[0].x,groveZ+points[0].z)-groveY-.3;
    add(growth(points,.7,40),bark,groveX,groveY,groveZ);
    for(let j=0;j<3;j++){const t=.2+j*.18,curve=new THREE.CatmullRomCurve3(points),v=curve.getPoint(t),u=curve.getPoint(Math.min(.95,t+.22));const mid=v.clone().lerp(u,.5);mid.x+=Math.cos(a)*(.7+j*.2);mid.z+=Math.sin(a)*(.7+j*.2);add(growth([v,mid,u],.15,14),bark,groveX,groveY,groveZ);}
    const x=groveX+Math.cos(a)*r,z=groveZ+Math.sin(a)*r;colliders.push({x,z,r:.85,h:3});
  }
  limbs.count=limbCount;limbs.castShadow=limbs.receiveShadow=true;scene.add(limbs);
  // Distant birds use shared geometry; their gentle orbit adds life without input.
  const birds=[];
  const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.8,.08,.2,-.18,0,.4],3));wingGeo.computeVertexNormals();
  const wingMat=new THREE.MeshBasicMaterial({color:0x494750,side:THREE.DoubleSide});
  for(let i=0;i<9;i++){const bird=new THREE.Group(),left=new THREE.Mesh(wingGeo,wingMat),right=new THREE.Mesh(wingGeo,wingMat);right.scale.x=-1;bird.add(left,right);scene.add(bird);birds.push({bird,left,right,phase:i*1.7});}
  const wind={value:0};
  const bladeGeo=new THREE.BufferGeometry(),blades=[];
  for(let b=0;b<4;b++){
    const a=b*2.4,h=.35+b*.11,dx=Math.cos(a),dz=Math.sin(a),w=.018;
    const left=[-dz*w,0,dx*w],right=[dz*w,0,-dx*w],midL=[dx*.055-dz*w*.6,h*.6,dz*.055+dx*w*.6],midR=[dx*.055+dz*w*.6,h*.6,dz*.055-dx*w*.6],tip=[dx*.17,h,dz*.17];
    blades.push(...left,...right,...midL,...right,...midR,...midL,...midL,...midR,...tip);
  }
  bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));bladeGeo.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:1});
  grassMat.onBeforeCompile=shader=>{shader.uniforms.windTime=wind;shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(windTime * 1.4 + instanceMatrix[3].x * .3 + instanceMatrix[3].z * .2) * position.y * .16;');};
  const grass=new THREE.InstancedMesh(bladeGeo,grassMat,32000);let count=0;
  for(let i=0;i<32000;i++) {
    const extent=i<28000?115:180;
    const x=-105+random()*extent,z=-105+random()*extent;
    if(pathDistance(x,z)<2.3||Math.hypot(x+19,z+46)<9)continue;
    dummy.position.set(x,terrainHeight(x,z),z);dummy.rotation.set(0,random()*6.28,0);const s=.45+random()*.8;dummy.scale.set(s,s,s);dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);
    grass.setColorAt(count++,new THREE.Color().setHSL(.16+random()*.12,.09,.34+random()*.12));
  }
  grass.count=touchDevice?Math.floor(count*.55):count;grass.receiveShadow=true;scene.add(grass);
  // Small, readable five-petal flowers punctuate the quiet grey ground.
  const flowers=new THREE.InstancedMesh(new THREE.SphereGeometry(.11,6,4),new THREE.MeshStandardMaterial({roughness:.9}),600);
  const palette=[0xe7bd45,0x9684de,0x619ed3,0xd883b7];
  for(let i=0;i<120;i++){
    const a=i*2.399,r=.3+Math.sqrt(i%30)*.32,cx=[-5,-14,-39,-30][i%4],cz=[-6,-19,-28,-32][i%4];
    const x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r,y=terrainHeight(x,z)+.38;
    for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;dummy.position.set(x+Math.cos(angle)*.12,y,z+Math.sin(angle)*.12);dummy.scale.set(1,.45,1);dummy.rotation.set(0,angle,0);dummy.updateMatrix();flowers.setMatrixAt(i*5+j,dummy.matrix);flowers.setColorAt(i*5+j,new THREE.Color(palette[i%4]));}
  }flowers.receiveShadow=true;scene.add(flowers);

  const stemGeo=growth([new THREE.Vector3(),new THREE.Vector3(.05,.3,0),new THREE.Vector3(-.08,.65,.06),new THREE.Vector3(.12,.9,0)],.025,12);
  const stems=new THREE.InstancedMesh(stemGeo,bark,180),leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshStandardMaterial({color:0x777b70,roughness:1}),720);
  for(let i=0;i<180;i++){const a=i*2.399,cx=[-5,-14,-39,-30][i%4],cz=[-6,-19,-28,-32][i%4],r=.4+Math.sqrt(i%45)*.35,x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r,y=terrainHeight(x,z),h=.45+(i%5)*.09;dummy.position.set(x,y,z);dummy.rotation.set(0,a,0);dummy.scale.set(1,h,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);for(let j=0;j<4;j++){dummy.position.set(x+Math.sin(a+j)*.1,y+h*(.2+j*.12),z+Math.cos(a+j)*.1);dummy.rotation.set(.3,a+j,.5);dummy.scale.set(.055,.018,.18);dummy.updateMatrix();leaves.setMatrixAt(i*4+j,dummy.matrix);}}
  stems.receiveShadow=leaves.receiveShadow=true;scene.add(stems,leaves);

  // A shallow pool, kept outside the route, with animated ripples and a visible bed.
  const pond=buildPond(scene);
  for(let i=0;i<42;i++){const a=random()*6.28,r=8.2+random()*2.3,x=-19+Math.cos(a)*r,z=-46+Math.sin(a)*r;add(rockGeo,rockMaterial,x,terrainHeight(x,z)-.1,z,.25+random()*.5,.2+random()*.35,.3+random()*.4);}
  // A wooden lakeside pier, supported down to the pond bed.
  for(let j=0;j<20;j++){
    const z=-61+j*.85,y=-.43;
    add(new THREE.BoxGeometry(2.5,.18,.83),bark,-19,y-.09,z);
    stumps.push({x:-19,z,y,halfX:1.25,halfZ:.425});colliders.push({x:-19,z,halfX:1.25,halfZ:.425,bottom:y-.18,top:y,walkable:true});
    if(j%4===0)for(const side of [-1,1]){const bed=terrainHeight(-19+side*1.2,z),h=y+.85-bed;add(new THREE.CylinderGeometry(.065,.1,h,6),bark,-19+side*1.2,bed+h/2,z);}
  }
  // A weathered arch is the visible destination at the end of the winding path.
  const archY=terrainHeight(-65,-62);
  for(const side of [-1,1])for(let j=0;j<5;j++)add(new THREE.BoxGeometry(1.5,1.15,1.8),stone,-65+side*4,archY+.58+j*1.18,-62);
  for(let i=0;i<11;i++) {
    const a=i/10*Math.PI;
    const m=add(new THREE.BoxGeometry(1.24,1.65,1.8),stone,-65+Math.cos(a)*4,archY+5.9+Math.sin(a)*4,-62);m.rotation.z=a-Math.PI/2;
  }
  colliders.push({x:-69,z:-62,halfX:.8,halfZ:.9,bottom:archY,top:archY+6.2},{x:-61,z:-62,halfX:.8,halfZ:.9,bottom:archY,top:archY+6.2});
  for(let i=0;i<11;i++){const a=i/10*Math.PI;colliders.push({x:-65+Math.cos(a)*4,z:-62,halfX:.7,halfZ:.9,bottom:archY+5.9+Math.sin(a)*4-.8,top:archY+5.9+Math.sin(a)*4+.8});}
  for(let i=0;i<16;i++) {const a=random()*6.28,r=7+random()*5;add(rockGeo,rockMaterial,-65+Math.cos(a)*r,archY-.2,-62+Math.sin(a)*r,.9,.35,.7);}
  const markers=MEMORY_PLACES.map(place=>{
    const y=terrainHeight(place.x,place.z);
    const m=add(new THREE.CylinderGeometry(.65,.8,.9,8),stone,place.x,y+.45,place.z);
    stumps.push({x:place.x,z:place.z,y:y+.9,r:.65});colliders.push({x:place.x,z:place.z,r:.7,h:.9,top:y+.9,walkable:true});
    const light=new THREE.Mesh(new THREE.OctahedronGeometry(.2),new THREE.MeshStandardMaterial({color:0xffdb97,emissive:0xe4a64b,emissiveIntensity:1.4}));light.position.set(place.x,y+1.3,place.z);scene.add(light);
    return {...place,y,light,mesh:m};
  });
  const dustGeo=new THREE.BufferGeometry(),dust=[];
  for(let i=0;i<180;i++)dust.push(-85+random()*100,1+random()*12,-85+random()*100);
  dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dust,3));
  const particles=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xffe9af,size:.065,transparent:true,opacity:.6,depthWrite:false}));scene.add(particles);
  const sky=buildFieldSky(scene);
  return {colliders,markers,stumps,pond,rockMaterial,update(time,player){wind.value=time;for(const {bird,left,right,phase} of birds){const a=time*.045+phase;bird.position.set(-35+Math.cos(a)*24,23+Math.sin(a*1.3)*3,-45+Math.sin(a)*20);bird.rotation.y=-a;const flap=Math.sin(time*2.3+phase)*.28;left.rotation.z=flap;right.rotation.z=-flap;}pond.update(time,player);particles.position.y=Math.sin(time*.14)*.4;sky.update(time,player);sun.position.set(player.x-35,player.y+55,player.z-35);sun.target.position.copy(player);for(const p of markers){p.light.rotation.y=time*.7;p.light.position.y=p.y+1.3+Math.sin(time*1.4)*.1;}}};
}
