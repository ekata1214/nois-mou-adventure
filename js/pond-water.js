import * as THREE from 'three';
import {POND,waterDepth} from './explore-state.js?v=20260907physics';

export function buildPond(scene){
  const clock={value:0},waves={value:Array.from({length:12},()=>new THREE.Vector4(0,0,-100,0))};
  const material=new THREE.MeshStandardMaterial({color:0x639f98,transparent:true,opacity:.7,roughness:.22,metalness:.12,side:THREE.FrontSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.waterTime=clock;shader.uniforms.disturbances=waves;
    shader.vertexShader='varying vec2 waterUV;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterUV=(modelMatrix*vec4(position,1.)).xz;');
    shader.fragmentShader='uniform float waterTime; uniform vec4 disturbances[12]; varying vec2 waterUV;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec2 ripple=vec2(sin(waterUV.x*2.8+waterTime),cos(waterUV.y*3.2+waterTime*.8))*.035;
      for(int i=0;i<12;i++){
        float age=waterTime-disturbances[i].z;
        if(age>=0.&&age<2.4){
          vec2 offset=waterUV-disturbances[i].xy;float distance=max(length(offset),.01);
          float band=exp(-pow((distance-age*1.7)/.35,2.))*exp(-age*.9)*disturbances[i].w;
          ripple+=offset/distance*band*sin(distance*13.-age*18.)*.3;
        }
      }
      normal=normalize(normal+vec3(ripple,0.));`);
  };
  const water=new THREE.Mesh(new THREE.CircleGeometry(POND.radius,128),material);
  water.rotation.x=-Math.PI/2;water.position.set(POND.x,POND.level,POND.z);water.receiveShadow=true;scene.add(water);
  const rings=Array.from({length:12},()=>{
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),new THREE.MeshBasicMaterial({color:0xc4e3d9,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return mesh;
  });
  let cursor=0,previous=null,previousDepth=0,previousTime=0,lastWake=-100,emitted=0;
  function emit(position,time,strength){
    waves.value[cursor].set(position.x,position.z,time,strength);
    const ring=rings[cursor];ring.position.set(position.x,POND.level+.018,position.z);
    ring.userData={start:time,strength,maxRadius:Math.max(.05,POND.radius-Math.hypot(position.x-POND.x,position.z-POND.z))};
    ring.visible=true;cursor=(cursor+1)%rings.length;emitted++;
  }
  return {water,get emitted(){return emitted;},update(time,position){
    clock.value=time;
    const depth=waterDepth(position.x,position.z,position.y),dt=Math.max(.001,time-previousTime);
    if(previous){
      const speed=Math.hypot(position.x-previous.x,position.z-previous.z)/dt;
      if(depth>.02&&(previousDepth<=.02||(speed>.3&&time-lastWake>.28))){
        emit(position,time,Math.min(1,.35+Math.abs(position.y-previous.y)/dt*.08+speed*.08));lastWake=time;
      }else if(previousDepth>.02&&depth<=.02){emit(previous,time,.35);lastWake=time;}
    }
    for(const ring of rings)if(ring.visible){
      const age=time-ring.userData.start,radius=.12+age*1.7;
      if(age>2||radius>ring.userData.maxRadius){ring.visible=false;continue;}
      ring.scale.setScalar(radius);ring.material.opacity=(1-age/2)*.48*ring.userData.strength;
    }
    previous={x:position.x,y:position.y,z:position.z};previousDepth=depth;previousTime=time;
  }};
}
