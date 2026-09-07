import * as THREE from 'three';
import {terrainHeight} from './explore-state.js?v=20260907encounters';
import {advanceCharacter,canOccupy} from './field-physics.js?v=20260907physics';
import {createEncounters,createFighter,startStrike,startDodge,stepFighter,hitFighter,applyStrike,stepEncounter} from './field-encounters.js';
import {buildEncounterViews} from './encounter-views.js';

export function createFieldCombat(scene,player,colliders,surfaces,saved,onCalm,onDefeat){
  const fighter=createFighter(),enemies=createEncounters(saved);let locked=null;
  for(const e of enemies){
    // Find an unoccupied nearby patch without modifying the landscape.
    for(let i=0;i<120;i++){const a=i*2.4,r=Math.sqrt(i)*.4,x=e.homeX+Math.cos(a)*r,z=e.homeZ+Math.sin(a)*r,y=terrainHeight(x,z);
      if(canOccupy({x,y,z},colliders)){e.x=e.homeX=x;e.z=e.homeZ=z;e.y=y;break;}}
    Object.assign(e.body,{x:e.x,y:e.y,z:e.z});
  }
  const views=buildEncounterViews(scene,enemies);
  const slash=new THREE.Mesh(new THREE.RingGeometry(1.3,2.8,40,1,.15,2.5),new THREE.MeshBasicMaterial({color:0xffe5a0,side:THREE.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));
  slash.rotation.x=-Math.PI/2;slash.visible=false;scene.add(slash);
  function visible(a,b){
    const steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.25);
    for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t+1;
      if(y<terrainHeight(x,z))return false;
      if(colliders.some(c=>y>(c.bottom??terrainHeight(c.x,c.z))&&y<(c.top??terrainHeight(c.x,c.z)+(c.h??c.r*2))&&(c.halfX?Math.abs(x-c.x)<c.halfX&&Math.abs(z-c.z)<c.halfZ:Math.hypot(x-c.x,z-c.z)<c.r)))return false;
    }return true;
  }
  function target(){const e=enemies.find(e=>e.id===locked);return e&&e.hp>0&&Math.hypot(e.x-player.position.x,e.z-player.position.z)<20?e:null;}
  return {fighter,enemies,
    target,
    lock(){if(locked){locked=null;return;}locked=enemies.filter(e=>e.hp>0&&Math.hypot(e.x-player.position.x,e.z-player.position.z)<16&&visible(player.position,e)).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0]?.id;},
    strike(){const e=target();return startStrike(fighter,e?Math.atan2(e.x-player.position.x,e.z-player.position.z):player.rotation.y);},
    dodge(x,z){return startDodge(fighter,x,z);},
    reset(){Object.assign(fighter,createFighter(),{invincible:3});locked=null;for(const e of enemies)if(e.hp>0){Object.assign(e,{x:e.homeX,z:e.homeZ,y:terrainHeight(e.homeX,e.homeZ),hp:e.maxHp,phase:'patrol',timer:0});Object.assign(e.body,{x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,grounded:true});}},
    update(dt,time,camera,enabled){
      if(enabled){
        stepFighter(fighter,dt);
        for(const hit of applyStrike(fighter,player.position,enemies,visible))if(hit.calmed){fighter.hp=Math.min(5,fighter.hp+1);onCalm(hit.enemy);}
        const p={...player.position,hp:fighter.hp};
        for(const e of enemies)stepEncounter(e,p,dt,{visible,move(e,vx,vz,dt){const speed=Math.hypot(vx,vz);advanceCharacter(e.body,{x:speed?vx/speed:0,z:speed?vz/speed:0,speed},dt,colliders,surfaces);e.x=e.body.x;e.y=e.body.y;e.z=e.body.z;},damage(){if(hitFighter(fighter)&&fighter.hp===0)onDefeat();}});
      }
      if(!target())locked=null;
      slash.visible=['strike','strike2'].includes(fighter.action)&&fighter.actionTime>.1&&fighter.actionTime<.4;
      slash.position.copy(player.position);slash.position.y+=.95;slash.rotation.z=-fighter.heading-fighter.actionTime*7;
      views.update(time,camera,locked);
    }
  };
}
