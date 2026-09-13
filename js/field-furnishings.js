import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const templates=new Map();
function sculpt(parent,name,position,scale,color){
  if(!templates.has(name))templates.set(name,new GLTFLoader().loadAsync(`assets/sculpt-202698/${name}-far.glb?v=20260909a`));
  templates.get(name).then(g=>{const piece=g.scene.clone(true);piece.position.set(...position);piece.scale.set(...scale);piece.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiply(new THREE.Color(color));o.castShadow=o.receiveShadow=true;}});parent.add(piece);}).catch(error=>console.warn('Sculpt furnishing unavailable',error));
}
export function createUncannyStep(seed=0){
  const root=new THREE.Group();
  // The top stays level for standing; the torn rim and underside carry the distortion.
  const geo=new THREE.PlaneGeometry(6,4,18,12);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=Math.max(Math.abs(x)/3,Math.abs(z)/2),shrink=edge>.75?1-.18*(.5+.5*Math.sin(x*2.7+z*1.8+seed)):1;p.setXYZ(i,x*shrink,0,z*shrink);}
  const membrane=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x716b6a,roughness:.94,side:THREE.DoubleSide}));membrane.receiveShadow=true;root.add(membrane);
  sculpt(root,`rock-${seed%3}`,[.08,-.76,-.05],[2.92,.74,1.92],0xada3a1);
  const threads=new THREE.LineSegments(new THREE.WireframeGeometry(geo),new THREE.LineBasicMaterial({color:0xaaa39d,transparent:true,opacity:.25}));threads.position.y=.006;root.add(threads);
  return root;
}
export function createUncannyHearth(seed=0){
  const root=new THREE.Group();
  sculpt(root,`stump-${seed%3}`,[0,0,0],[.86,.58,.68],0x625455);
  sculpt(root,`rock-${(seed+1)%3}`,[.4,-.04,-.2],[.55,.3,.42],0x625455);
  const flames=[];
  for(let k=0;k<5;k++){
    const points=[new THREE.Vector3(0,0,0),new THREE.Vector3(.08,.2,.04),new THREE.Vector3(-.035,.45,.015),new THREE.Vector3(.12,.65,0)];
    const curve=new THREE.CatmullRomCurve3(points),geo=new THREE.TubeGeometry(curve,18,.055,6,false),p=geo.attributes.position;
    for(let i=0;i<=18;i++){const c=curve.getPointAt(i/18);for(let j=0;j<=6;j++){const n=i*7+j,v=new THREE.Vector3().fromBufferAttribute(p,n).sub(c).multiplyScalar(1-i/19).add(c);p.setXYZ(n,v.x,v.y,v.z);}}geo.computeVertexNormals();
    const flame=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:k%2?0xcf7250:0xe9b279,emissive:0xa02d17,emissiveIntensity:1.4,transparent:true,opacity:.84,depthWrite:false}));flame.position.set(Math.sin(k*2.4)*.23,.15,Math.cos(k*2.4)*.17);flame.rotation.y=k*2.4;root.add(flame);flames.push(flame);
  }
  root.userData.update=time=>flames.forEach((f,k)=>{f.scale.set(1+Math.sin(time*2+k)*.13,.8+Math.sin(time*3.1+k*2)*.23,1);f.rotation.z=Math.sin(time*1.7+k)*.12;});
  return root;
}

export function createWornBlock(width,height,depth,seed=0){
  const root=new THREE.Group();
  sculpt(root,`${height>width?'stump':'rock'}-${seed%3}`,[0,-height/2,0],[width/2,height,depth/2],0x9b9392);
  return root;
}
export function createFruitGrowth(seed=0){
  const root=new THREE.Group(),fruit=new THREE.Group();
  sculpt(root,`stump-${seed%3}`,[0,-.04,0],[.65,.9,.55],0x8b807f);
  const skin=new THREE.MeshStandardMaterial({color:0x75413f,roughness:.65});
  for(let i=0;i<5;i++){
    const a=i*2.399,geo=new THREE.SphereGeometry(.13,16,12),p=geo.attributes.position;
    for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),fold=1+.22*Math.sin(Math.atan2(z,x)*5+y*15+i);p.setXYZ(j,x*fold,y*(1.2+i*.05),z*fold);}geo.computeVertexNormals();
    const berry=new THREE.Mesh(geo,skin);berry.position.set(Math.sin(a)*.34,.52+(i%3)*.14,Math.cos(a)*.3);berry.rotation.z=Math.sin(a)*.4;fruit.add(berry);
    const net=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xb68679,roughness:1,wireframe:true}));net.scale.setScalar(1.025);berry.add(net);
    const points=[new THREE.Vector3(0,.25,0),new THREE.Vector3(Math.sin(a)*.18,.65,Math.cos(a)*.15),berry.position.clone().add(new THREE.Vector3(0,.10,0))];
    const stem=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.019,5,false),skin);root.add(stem);
  }
  root.add(fruit);return {root,fruit};
}
