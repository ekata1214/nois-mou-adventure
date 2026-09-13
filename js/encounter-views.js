import * as THREE from 'three';
import {terrainHeight} from './explore-state.js?v=20260908shell';

export function buildEncounterViews(scene,enemies){
  const surface=document.createElement('canvas');surface.width=surface.height=128;const ctx=surface.getContext('2d'),pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const vein=Math.abs(Math.sin(x*.18+Math.sin(y*.15)*2)),ridge=Math.sin(y*.7+Math.sin(x*.2));const n=155+ridge*24-(vein<.13?65:0);pixels.data.set([n,n*.97,n*.95,255],(y*128+x)*4);}ctx.putImageData(pixels,0,0);const skinMap=new THREE.CanvasTexture(surface);skinMap.colorSpace=THREE.SRGBColorSpace;
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  const views=enemies.map((e,index)=>{
    const group=new THREE.Group();scene.add(group);
    const armor=new THREE.MeshStandardMaterial({color:e.color,map:skinMap,bumpMap:skinMap,bumpScale:.045,roughness:.78,metalness:.18});
    armor.color.lerp(new THREE.Color(0x77716f),.62);
    const dark=new THREE.MeshStandardMaterial({color:0x302e29,roughness:.65,metalness:.35});
    function shellGeometry(radius,w=32,h=20){const g=new THREE.SphereGeometry(radius,w,h),p=g.attributes.position;for(let n=0;n<p.count;n++){const x=p.getX(n),y=p.getY(n),z=p.getZ(n);const f=1+.055*Math.sin(x*34+z*11)*Math.sin(y*27+index)+.035*Math.cos(z*48+y*7);p.setXYZ(n,x*f,y*f+(x>0?.10*Math.sin(z*6+index):0),z*f);}g.computeVertexNormals();return g;}
    const core=new THREE.Mesh(shellGeometry(.61),armor);core.scale.set(1,.85,1);core.castShadow=true;group.add(core);
    const faceMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
    faceMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))<.095)discard;');};
    // Temporary abstract inhabitants: a hollow mass, unequal folds, no literal face.
    const tendrils=[];
    const foldGeo=shellGeometry(.46,24,16);
    for(let k=0;k<3;k++){const fold=new THREE.Mesh(foldGeo,k===1?dark:armor);fold.position.set(Math.sin(k*2.4+index)*.24,.15+k*.13,-.12-k*.16);fold.scale.set(.65+k*.13,.7,1.4);fold.rotation.set(k*.28,k*.4,.3-k*.2);fold.castShadow=true;core.add(fold);tendrils.push(fold);}
    const hollow=new THREE.Mesh(new THREE.TorusGeometry(.26,.10,10,32),dark);hollow.position.set(-.12,.04,.53);hollow.scale.set(.65,1.3,.8);hollow.rotation.z=.3+index*.4;core.add(hollow);
    const voidFace=new THREE.Mesh(new THREE.CircleGeometry(.25,32),new THREE.MeshBasicMaterial({color:0x100f13,side:THREE.DoubleSide}));voidFace.position.copy(hollow.position);voidFace.position.z-=.035;voidFace.scale.set(.65,1.3,1);voidFace.rotation.z=hollow.rotation.z;core.add(voidFace);
    const legs=Array.from({length:4},()=>[0,1].map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,1,7),dark);m.castShadow=true;m.visible=false;group.add(m);return m;}));
    const tell=new THREE.Mesh(new THREE.RingGeometry(1.12,1.3,48),new THREE.MeshBasicMaterial({color:0xff9f4a,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));tell.rotation.x=-Math.PI/2;tell.position.y=.045;group.add(tell);
    const lane=new THREE.Mesh(new THREE.PlaneGeometry(.7,3.4),tell.material.clone());lane.rotation.x=-Math.PI/2;lane.position.set(0,.055,2);group.add(lane);
    const barBack=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.09),new THREE.MeshBasicMaterial({color:0x222728,depthTest:false}));barBack.position.y=2.65;group.add(barBack);
    const bar=new THREE.Mesh(new THREE.PlaneGeometry(1.76,.055),new THREE.MeshBasicMaterial({color:0xe68d65,depthTest:false}));bar.position.set(0,2.65,.005);group.add(bar);
    const target=new THREE.Mesh(new THREE.OctahedronGeometry(.13),new THREE.MeshBasicMaterial({color:0xffdf8a}));target.position.y=3;group.add(target);
    const shock=new THREE.Mesh(new THREE.SphereGeometry(.8,14,10),new THREE.MeshBasicMaterial({color:0xffe6a2,wireframe:true,transparent:true,opacity:0,depthWrite:false}));shock.position.y=1.15;group.add(shock);
    // Small, readable nests mark optional encounters off the main route.
    const cairnMaterial=new THREE.MeshStandardMaterial({color:0x797564,roughness:1});
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=e.homeX+Math.sin(a)*3.8,z=e.homeZ+Math.cos(a)*3.8;
      const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.35,1),cairnMaterial);rock.position.set(x,terrainHeight(x,z)+.1,z);rock.scale.y=.6;rock.receiveShadow=true;scene.add(rock);}
    return {group,core,armor,faceMaterial,legs,tell,lane,bar,barBack,target,shock,index,tendrils};
  });
  function segment(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);direction.copy(b).sub(a);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(up,direction.normalize());}
  return {update(time,camera,locked){
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i],v=views[i],speed=Math.min(1,Math.hypot(e.body.vx,e.body.vz)/2);
      v.group.position.set(e.x,e.y,e.z);v.group.rotation.y=e.heading;
      for(let k=0;k<v.tendrils.length;k++){v.tendrils[k].rotation.z=Math.sin(time*.9+k*1.8+i)*.13;v.tendrils[k].rotation.x=Math.cos(time*.7+k)*.10;}
      const calm=e.phase==='calmed',windup=e.phase==='windup';
      v.core.position.y=(calm?.8:1.25)+Math.sin(time*(windup?18:3)+i)* (windup?.055:.035);
      const scale=calm?.85:windup?1+Math.sin(time*18)*.055:1;v.core.scale.set(scale*(i===0?1.13:i===1?.82:1),scale*(i===2?1.14:.85),scale*(i===1?1.2:1));
      v.armor.emissive.setHex(e.flash>0?0xffd497:calm?0x426d58:windup?0x7b260c:0x000000);v.armor.emissiveIntensity=e.flash>0?1:.6;
      v.faceMaterial.color.setHex(calm?0xb9ebc9:windup?0xffb15e:0xffffff);
      for(let j=0;j<4;j++){
        const side=j%2?1:-1,front=j<2?1:-1,phase=time*9+(j%3)*Math.PI;
        const lx=side*(calm?.7:.9),lz=front*.55+Math.sin(phase)*.23*speed;
        const worldX=e.x+Math.cos(e.heading)*lx+Math.sin(e.heading)*lz,worldZ=e.z-Math.sin(e.heading)*lx+Math.cos(e.heading)*lz;
        const footY=terrainHeight(worldX,worldZ)-e.y+.03+Math.max(0,Math.cos(phase))*.18*speed;
        const a=new THREE.Vector3(side*.38,v.core.position.y-.12,front*.25),b=new THREE.Vector3(side*.82,.65,lz*.75),c=new THREE.Vector3(lx,footY,lz);
        segment(v.legs[j][0],a,b);segment(v.legs[j][1],b,c);
      }
      v.tell.visible=windup;v.lane.visible=windup;
      // Lay warning vertices onto the terrain instead of floating across slopes.
      if(windup){for(const m of [v.tell,v.lane]){const p=m.geometry.attributes.position;for(let k=0;k<p.count;k++){const lx=p.getX(k)+m.position.x,lz=-p.getY(k)+m.position.z,wx=e.x+Math.cos(e.heading)*lx+Math.sin(e.heading)*lz,wz=e.z-Math.sin(e.heading)*lx+Math.cos(e.heading)*lz;p.setZ(k,terrainHeight(wx,wz)-e.y+.02);}p.needsUpdate=true;}}

      v.tell.material.opacity=.4+Math.sin(time*13)*.25;
      const hpVisible=!calm&&(locked===e.id||!['patrol','return'].includes(e.phase));
      v.bar.visible=v.barBack.visible=hpVisible;v.bar.scale.x=e.hp/e.maxHp;v.bar.position.x=-(1-e.hp/e.maxHp)*.88;
      v.bar.quaternion.copy(camera.quaternion);v.barBack.quaternion.copy(camera.quaternion);
      // Cancel the parent heading so the bars face the camera in world space.
      const inverse=v.group.quaternion.clone().invert();v.bar.quaternion.premultiply(inverse);v.barBack.quaternion.premultiply(inverse);
      v.target.visible=locked===e.id;v.target.rotation.y=time;
      v.shock.material.opacity=e.flash>0?e.flash*2:0;v.shock.scale.setScalar(1+(1-e.flash/.3)*.8);
    }
  },views};
}
