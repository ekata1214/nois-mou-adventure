import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
let template=null,loading=false;
const waiting=[];
export function createHandSignal(seed=0){
  const root=new THREE.Group();
  root.material=new THREE.MeshStandardMaterial({color:0xc5a497,roughness:.67,emissive:0x38231e,emissiveIntensity:.12});
  // A stretched human arm: one elbow, tapered forearm and a narrow wrist.
  const length=2.55+Math.sin(seed*2.7)*.35;
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,-.16,0),new THREE.Vector3(-.12,length*.25,.035),
    new THREE.Vector3(-.21,length*.48,.075),new THREE.Vector3(-.08,length*.73,.025),
    new THREE.Vector3(0,length,0)
  ]);
  const geometry=new THREE.TubeGeometry(curve,40,1,16,false);
  const position=geometry.attributes.position;
  for(let i=0;i<=40;i++){
    const t=i/40,center=curve.getPointAt(t);
    const radius=.19*(1-t)+.087*t+.034*Math.exp(-Math.pow((t-.51)/.14,2));
    for(let j=0;j<=16;j++){
      const k=i*17+j;
      position.setXYZ(k,center.x+(position.getX(k)-center.x)*radius,
        center.y+(position.getY(k)-center.y)*radius,center.z+(position.getZ(k)-center.z)*radius*.86);
    }
  }
  geometry.computeVertexNormals();
  const arm=new THREE.Mesh(geometry,root.material);arm.castShadow=arm.receiveShadow=true;root.add(arm);
  root.userData.armHeight=length+1;
  function attach(source){source.updateMatrixWorld(true);source.traverse(o=>{if(!o.isMesh)return;const mesh=new THREE.Mesh(o.geometry,root.material);mesh.applyMatrix4(o.matrixWorld);mesh.position.y+=length-.035;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);});}
  if(template)attach(template);else{waiting.push(attach);if(!loading){loading=true;new GLTFLoader().load('assets/hand/human-hand.glb?v=20260909a',g=>{template=g.scene;for(const cb of waiting.splice(0))cb(template);},undefined,error=>{loading=false;waiting.length=0;console.warn('Hand sculpture could not load',error);});}}
  return root;
}
