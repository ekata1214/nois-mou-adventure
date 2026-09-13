import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Shared instances preserve the owner's open wire topology. Near/far meshes
// share placement and collision bounds; only mesh density changes with distance.
export function createAuthoredScenery(scene,slots){
  const loader=new GLTFLoader(),batches=[],matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),position=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const nearDistance=matchMedia('(pointer:coarse)').matches?9:15;
  let loaded=false,last=-Infinity;
  const ready=Promise.all(['rock','stump'].flatMap(kind=>Array.from({length:3},(_,variant)=>['near','far'].map(async lod=>{
    const gltf=await loader.loadAsync(`assets/sculpt-202698/${kind}-${variant}-${lod}.glb?v=20260909a`);
    gltf.scene.updateMatrixWorld(true);
    const assigned=slots.filter((s,i)=>s.kind===kind&&s.variant===variant);
    gltf.scene.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const mesh=new THREE.InstancedMesh(geo,o.material,Math.max(1,assigned.length));mesh.count=0;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;batches.push({mesh,assigned,lod});});
  })).flat())).then(()=>{for(const b of batches)scene.add(b.mesh);for(const s of slots)for(const o of s.fallback)o.visible=false;loaded=true;}).catch(error=>{for(const b of batches)b.mesh.geometry.dispose();console.warn('Authored scenery could not load; original scenery retained.',error);});
  return {ready,update(time,player){if(!loaded||time-last<.3)return;last=time;for(const {mesh,assigned,lod} of batches){let count=0;for(const s of assigned){const near=Math.hypot(player.x-s.x,player.z-s.z)<nearDistance;if(near!==(lod==='near'))continue;position.set(s.x,s.y,s.z);scale.set(s.sx,s.height,s.sz);rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),s.angle);matrix.compose(position,rotation,scale);mesh.setMatrixAt(count++,matrix);}mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}}};
}
