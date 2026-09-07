import * as THREE from 'three';
import {terrainHeight} from './explore-state.js?v=20260908shell';

export function buildEncounterViews(scene,enemies){
  const texture=new THREE.TextureLoader().load('assets/icons/giger/eyeball.png');texture.colorSpace=THREE.SRGBColorSpace;
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  const views=enemies.map((e,index)=>{
    const group=new THREE.Group();scene.add(group);
    const armor=new THREE.MeshStandardMaterial({color:e.color,roughness:.32,metalness:.7});
    armor.color.lerp(new THREE.Color(0x29272b),.78);
    const dark=new THREE.MeshStandardMaterial({color:0x302e29,roughness:.65,metalness:.35});
    const core=new THREE.Mesh(new THREE.SphereGeometry(.61,24,16),armor);core.scale.set(1,.85,1);core.castShadow=true;group.add(core);
    const faceMaterial=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    faceMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))<.095)discard;');};
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.95,1.95),faceMaterial);face.position.z=.58;core.add(face);face.scale.setScalar(.38);face.position.z=.63;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2,spike=new THREE.Mesh(new THREE.ConeGeometry(.09,.48,7),dark);
      spike.position.set(Math.cos(a)*.65,Math.sin(a)*.5,-.1);spike.rotation.z=a-Math.PI/2;spike.castShadow=true;core.add(spike);
    }
    // A physical eye socket and overlapping carapace make the original emblem a creature.
    const socket=new THREE.Mesh(new THREE.TorusGeometry(.37,.11,10,32),dark);socket.position.set(0,.06,.58);core.add(socket);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.31,24,16),new THREE.MeshStandardMaterial({color:0x45343b,roughness:.25}));eye.scale.set(1,.38,.65);eye.position.set(0,.06,.67);core.add(eye);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(.17,18,12),new THREE.MeshStandardMaterial({color:index===0?0xd09a42:index===1?0x80bdb1:0xa6adc9,roughness:.25,emissive:0x302314}));iris.scale.z=.28;iris.position.set(0,.06,.86);core.add(iris);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),dark);pupil.scale.set(.6,1.4,.3);pupil.position.set(0,.06,.91);core.add(pupil);
    for(let j=0;j<5;j++){const plate=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),armor);plate.position.set(Math.sin(j*2.4)*.38,.25+Math.cos(j*2.4)*.22,-.3-j*.085);plate.scale.set(1,.42,1.1);plate.rotation.z=j*.4;plate.castShadow=true;core.add(plate);}
    for(const side of [-1,1]){
      const horn=new THREE.Mesh(new THREE.ConeGeometry(index===0?.16:.09,index===1?1.2:.7,7),dark);horn.position.set(side*.5,.56,-.18);horn.rotation.z=-side*.45;core.add(horn);
      const jaw=new THREE.Mesh(new THREE.ConeGeometry(.14,.5,7),armor);jaw.position.set(side*.39,-.4,.49);jaw.rotation.z=side*.7+Math.PI;core.add(jaw);
    }
    if(index===2){for(let j=0;j<7;j++){const rib=new THREE.Mesh(new THREE.TorusGeometry(.52+j*.025,.025,6,20,Math.PI*1.6),dark);rib.position.set(0,-j*.065,-.2-j*.08);rib.rotation.x=.55;core.add(rib);}}
    // Ribbed exoskeleton, elongated crown and breathing hoses; original geometry.
    const crown=new THREE.Mesh(new THREE.SphereGeometry(.55,24,12),armor);crown.scale.set(.78,.58,2.05);crown.position.set(0,.48,-.45);core.add(crown);
    for(let j=0;j<9;j++){
      const rib=new THREE.Mesh(new THREE.TorusGeometry(.43+j*.013,.043,6,24,Math.PI*1.65),j%2?armor:dark);rib.position.set(0,-.04,-.16-j*.11);rib.rotation.z=.55;core.add(rib);
    }
    for(const side of [-1,1]){
      const points=[new THREE.Vector3(side*.36,.3,-.65),new THREE.Vector3(side*.85,.55,-.95),new THREE.Vector3(side*.98,-.4,-.55),new THREE.Vector3(side*.38,-.55,.2)];
      const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.085,6,false),dark);core.add(tube);
      for(let k=0;k<4;k++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.035,.2,5),armor);tooth.position.set(side*(.09+k*.065),-.3,.65);tooth.rotation.x=Math.PI;core.add(tooth);}
    }
    const legs=Array.from({length:4},()=>[0,1].map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,1,7),dark);m.castShadow=true;group.add(m);return m;}));
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
    return {group,core,armor,faceMaterial,legs,tell,lane,bar,barBack,target,shock,index};
  });
  function segment(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);direction.copy(b).sub(a);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(up,direction.normalize());}
  return {update(time,camera,locked){
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i],v=views[i],speed=Math.min(1,Math.hypot(e.body.vx,e.body.vz)/2);
      v.group.position.set(e.x,e.y,e.z);v.group.rotation.y=e.heading;
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
