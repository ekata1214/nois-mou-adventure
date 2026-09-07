import * as THREE from 'three';

// Small local-space deformation before skinning: the brain keeps following the
// head bone, and the shadow uses the same surface as the visible material.
export function createMouAppearance(root) {
  const time={value:0};let brainCount=0;
  const deform=`transformed += normal * (
    sin(position.x * 29.0 + brainTime * .8) * sin(position.z * 23.0 - brainTime * .65) * .0018
    + sin(brainTime * 1.15 + position.y * 17.0) * .0012);`;
  function animate(material){
    material.onBeforeCompile=shader=>{
      shader.uniforms.brainTime=time;
      shader.vertexShader='uniform float brainTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+deform);
    };
    material.customProgramCacheKey=()=> 'mou-brain-pulse-v1';
    material.needsUpdate=true;
  }
  root.traverse(object=>{
    if(!object.isMesh)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(!materials.some(m=>m.name.includes('Brain Meat')))return;
    brainCount++;
    for(const m of materials){
      m.color.set(0xb57777);m.roughness=.38;m.metalness=0;animate(m);
    }
    object.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});animate(object.customDepthMaterial);
    object.geometry.computeBoundingSphere();object.geometry.boundingSphere.radius+=.004;
  });
  return {brainCount,update(seconds){time.value=seconds;}};
}
