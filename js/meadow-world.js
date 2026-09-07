import * as THREE from 'three';
import {buildPond} from './pond-water.js?v=20260907physics';
import { terrainHeight } from './explore-state.js?v=20260907physics';

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
  const grassColor=new THREE.Color(),earth=new THREE.Color('#a3956c');
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrainHeight(x,z));
    const patch=Math.sin(x*.12+Math.cos(z*.17))*Math.cos(z*.095);
    grassColor.setHSL(.275+patch*.018,.52,.36+patch*.04);
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
  const stone=new THREE.MeshStandardMaterial({color:0x99917b,map:texture,bumpMap:texture,bumpScale:.16,roughness:.95});
  const bark=new THREE.MeshStandardMaterial({color:0x574735,map:texture,bumpMap:texture,bumpScale:.15,roughness:1});
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
    const geo=new THREE.IcosahedronGeometry(1,2),p=geo.attributes.position,colors=[];
    for(let i=0;i<p.count;i++){
      let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const warp=1+.14*Math.sin(x*5+variant)*Math.cos(z*4+y*3)+.08*Math.sin(y*8+variant);
      x*=warp;z*=warp;y=Math.min(.8,y*warp);p.setXYZ(i,x,y,z);
      const moss=y>.25?Math.max(0,Math.sin(x*7+z*5+variant))*.3:0;
      const shade=.67+.16*Math.sin(x*3+y*2+variant);colors.push(shade-moss*.3,shade+moss*.08,shade*.94-moss*.4);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
  });
  const rockGeo=rockVariants[0];
  for(let i=0;i<165;i++) {
    const x=(random()-.58)*195,z=(random()-.58)*195;
    if(stumpSpots.some(p=>Math.hypot(x-p[0],z-p[1])<p[3]+2))continue;
    if(MEMORY_PLACES.some(p=>Math.hypot(x-p.x,z-p.z)<3))continue;
    if(pathDistance(x,z)<4||Math.hypot(x+19,z+46)<12)continue;
    const s=.3+random()**3*3.5;
    const rock=add(rockVariants[i%5],rockMaterial,x,terrainHeight(x,z)-s*.2,z,s,s*(.5+random()),s*.85);rock.rotation.y=random()*6.28;
    if(s>1)colliders.push({x,z,r:s*.8});
  }
  // Real volumes instead of camera-facing tree cards; crowns share one draw call.
  const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;
  const leafCtx=leafCanvas.getContext('2d');
  for(let i=0;i<35;i++){
    const x=16+random()*96,y=16+random()*96;
    leafCtx.fillStyle=`hsl(${70+random()*20} 25% ${48+random()*27}%)`;
    leafCtx.beginPath();leafCtx.ellipse(x,y,4+random()*4,9+random()*6,random()*6.28,0,Math.PI*2);leafCtx.fill();
  }
  const leafTexture=new THREE.CanvasTexture(leafCanvas);leafTexture.colorSpace=THREE.SRGBColorSpace;
  const crowns=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({map:leafTexture,color:0xc3d59a,alphaTest:.45,side:THREE.DoubleSide,roughness:.9}),10000);
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.43,1,8),bark,400);
  let crownCount=0,trunkCount=0;
  for(let i=0;i<100;i++) {
    const x=-100+random()*175,z=-103+random()*183;
    if(stumpSpots.some(p=>Math.hypot(x-p[0],z-p[1])<p[3]+3))continue;
    if(MEMORY_PLACES.some(p=>Math.hypot(x-p.x,z-p.z)<3))continue;
    if(pathDistance(x,z)<5||Math.hypot(x+19,z+46)<14||Math.hypot(x+65,z+62)<13||Math.hypot(x,z)<9)continue;
    const h=5+random()*6,y=terrainHeight(x,z),width=2+random()*1.3;
    dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,random()*6.28,(random()-.5)*.1);dummy.scale.set(1,h,1);dummy.updateMatrix();trunks.setMatrixAt(trunkCount++,dummy.matrix);
    colliders.push({x,z,r:.55,h});
    for(let j=0;j<3;j++) {
      const a=j*2.1;dummy.position.set(x+Math.cos(a)*.65,y+h*.8,z+Math.sin(a)*.65);dummy.rotation.set(Math.sin(a)*.6,0,Math.cos(a)*.6);dummy.scale.set(.45,h*.45,.45);dummy.updateMatrix();trunks.setMatrixAt(trunkCount++,dummy.matrix);
    }
    for(let j=0;j<95;j++) {
      const a=random()*6.28,r=Math.sqrt(random())*width*1.45;
      dummy.position.set(x+Math.cos(a)*r,y+h+.5+(random()-.5)*width*1.5,z+Math.sin(a)*r);
      dummy.rotation.set(random()*Math.PI,random()*6.28,random()*Math.PI);const size=1.3+random()*.9;dummy.scale.set(size,size,1);dummy.updateMatrix();crowns.setMatrixAt(crownCount,dummy.matrix);
      crowns.setColorAt(crownCount++,new THREE.Color().setHSL(.24+random()*.035,.3,.7+random()*.15));
    }
  }
  crowns.count=crownCount;trunks.count=trunkCount;crowns.castShadow=trunks.castShadow=true;crowns.receiveShadow=trunks.receiveShadow=true;scene.add(crowns,trunks);
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
    grass.setColorAt(count++,new THREE.Color().setHSL(.235+random()*.045,.53,.43+random()*.14));
  }
  grass.count=touchDevice?Math.floor(count*.55):count;grass.receiveShadow=true;scene.add(grass);
  // A shallow pool, kept outside the route, with animated ripples and a visible bed.
  const pond=buildPond(scene);
  for(let i=0;i<42;i++){const a=random()*6.28,r=8.2+random()*2.3,x=-19+Math.cos(a)*r,z=-46+Math.sin(a)*r;add(rockGeo,rockMaterial,x,terrainHeight(x,z)-.1,z,.25+random()*.5,.2+random()*.35,.3+random()*.4);}
  // A weathered arch is the visible destination at the end of the winding path.
  const archY=terrainHeight(-65,-62);
  for(const side of [-1,1])for(let j=0;j<5;j++)add(new THREE.BoxGeometry(1.5,1.15,1.8),stone,-65+side*4,archY+.58+j*1.18,-62);
  for(let i=0;i<11;i++) {
    const a=i/10*Math.PI;
    const m=add(new THREE.BoxGeometry(1.24,1.65,1.8),stone,-65+Math.cos(a)*4,archY+5.9+Math.sin(a)*4,-62);m.rotation.z=a-Math.PI/2;
  }
  colliders.push({x:-69,z:-62,r:1,h:7},{x:-61,z:-62,r:1,h:7});
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
  const sky=new THREE.Mesh(new THREE.SphereGeometry(300,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vWorld; void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vWorld; void main(){vec3 d=normalize(vWorld); float h=smoothstep(-.05,.65,d.y); vec3 c=mix(vec3(.76,.77,.64),vec3(.22,.40,.47),h); float s=pow(max(dot(d,normalize(vec3(-.5,.7,-.5))),0.),180.); c+=vec3(1.,.72,.36)*s*.8; gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));scene.add(sky);
  return {colliders,markers,stumps,pond,update(time,player){wind.value=time;pond.update(time,player);particles.position.y=Math.sin(time*.14)*.4;sky.position.copy(player);sun.position.set(player.x-35,player.y+55,player.z-35);sun.target.position.copy(player);for(const p of markers){p.light.rotation.y=time*.7;p.light.position.y=p.y+1.3+Math.sin(time*1.4)*.1;}}};
}
