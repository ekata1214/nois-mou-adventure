import {ENTITY_DEFS} from './entities.js';
import {PATTERNS} from './enemy-patterns.js';

export const ENCOUNTER_DEFS=[
  {id:'ember',type:'anger',pattern:'charger',x:24,z:-9,hp:42,mode:'action'},
  {id:'thorn',type:'envy',pattern:'strafe',x:-51,z:-36,hp:48,mode:'rpg'},
  {id:'shade',type:'loneliness',pattern:'charger',x:76,z:64,hp:60,mode:'action'},
];
export function createEncounters(saved={}){return ENCOUNTER_DEFS.map(d=>({...d,name:ENTITY_DEFS[d.type].name,color:ENTITY_DEFS[d.type].color,maxHp:d.hp,hp:saved[d.id]?0:d.hp,homeX:d.x,homeZ:d.z,y:0,heading:0,phase:saved[d.id]?'calmed':'patrol',timer:0,elapsed:0,flash:0,attackHit:false,friendly:saved[d.id]==='friend',body:{x:d.x,y:0,z:d.z,vx:0,vy:0,vz:0,grounded:true}}));}
export function createFighter(){return {hp:5,maxHp:5,stamina:100,regenWait:0,action:null,actionTime:0,actionDuration:0,hitApplied:false,invincible:0,combo:0,heading:0,dodgeX:0,dodgeZ:0};}
export function startStrike(f,heading){
  if(f.hp<=0||f.action||f.stamina<14)return false;
  f.stamina-=14;f.regenWait=.75;f.action=f.combo++%2?'strike2':'strike';f.actionTime=0;f.actionDuration=.55;f.hitApplied=false;f.heading=heading;return true;
}
export function startDodge(f,x,z){
  if(f.hp<=0||f.action||f.stamina<26)return false;
  const length=Math.hypot(x,z);if(length<.001)return false;
  f.stamina-=26;f.regenWait=.8;f.action='dodge';f.actionTime=0;f.actionDuration=.48;f.dodgeX=x/length;f.dodgeZ=z/length;f.invincible=.34;return true;
}
export function stepFighter(f,dt){
  f.invincible=Math.max(0,f.invincible-dt);f.regenWait=Math.max(0,f.regenWait-dt);
  if(!f.regenWait)f.stamina=Math.min(100,f.stamina+24*dt);
  if(f.action){f.actionTime+=dt;if(f.actionTime>=f.actionDuration){f.action=null;f.actionTime=0;}}
}
export function hitFighter(f){
  if(f.hp<=0||f.invincible>0)return false;
  f.hp=Math.max(0,f.hp-1);f.invincible=1.1;f.action='hurt';f.actionTime=0;f.actionDuration=.32;return true;
}
export function applyStrike(f,player,enemies,visible=()=>true){
  if(!['strike','strike2'].includes(f.action)||f.hitApplied||f.actionTime<.17)return [];
  f.hitApplied=true;const hits=[];
  for(const e of enemies){
    const dx=e.x-player.x,dz=e.z-player.z,d=Math.hypot(dx,dz);
    if(e.mode==='rpg'||e.hp<=0||d>3.05||Math.abs(e.y-player.y)>1.8||!visible(player,e))continue;
    if(d>.2&&(dx*Math.sin(f.heading)+dz*Math.cos(f.heading))/d<.3)continue;
    e.hp=Math.max(0,e.hp-(f.action==='strike2'?18:16));e.flash=.3;e.timer=.48;e.phase=e.hp?'stagger':'calmed';
    if(e.body){e.body.vx+=Math.sin(f.heading)*3;e.body.vz+=Math.cos(f.heading)*3;}
    hits.push({enemy:e,calmed:e.hp===0});
  }
  return hits;
}
export function stepEncounter(e,player,dt,{visible=()=>true,move=()=>{},damage=()=>{}}={}){
  e.elapsed+=dt;e.flash=Math.max(0,e.flash-dt);e.timer=Math.max(0,e.timer-dt);
  const dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz),homeDistance=Math.hypot(e.x-e.homeX,e.z-e.homeZ);
  let vx=0,vz=0;
  function toward(x,z,speed){const l=Math.hypot(x,z)||1;vx=x/l*speed;vz=z/l*speed;}
  function phase(name,timer){e.phase=name;e.timer=timer;}
  if(e.phase==='calmed'){
    if(e.friendly&&d>3.5)toward(dx,dz,Math.min(3,d*.5));
  }else if(player.hp<=0){phase('return',0);}
  else if(!['return','patrol'].includes(e.phase)&&(d>21||homeDistance>17))phase('return',0);
  switch(e.phase){
    case 'patrol':
      toward(e.homeX+Math.sin(e.elapsed*.27)*2-e.x,e.homeZ+Math.cos(e.elapsed*.27)*2-e.z,.65);
      if(d<11&&Math.abs(player.y-e.y)<3&&visible(e,player))phase('notice',.65);
      break;
    case 'notice':e.heading=Math.atan2(dx,dz);if(!e.timer)phase('chase',0);break;
    case 'chase':{
      e.heading=Math.atan2(dx,dz);
      const strafe=e.pattern==='strafe'?Math.sin(e.elapsed*1.5)*.8:0;
      toward(dx+dz*strafe,dz-dx*strafe,2.4);
      if(d<4.2&&Math.abs(player.y-e.y)<1.6&&visible(e,player)){
        const p=PATTERNS[e.pattern];phase('windup',p.telegraph||.8);e.aimX=dx/(d||1);e.aimZ=dz/(d||1);e.attackHit=false;vx=vz=0;
      }
      break;
    }
    case 'windup':if(!e.timer)phase('lunge',.4);break;
    case 'lunge':
      vx=e.aimX*(e.pattern==='charger'?8:6.5);vz=e.aimZ*(e.pattern==='charger'?8:6.5);
      if(!e.attackHit&&d<1.65&&Math.abs(player.y-e.y)<1.4&&visible(e,player)){e.attackHit=true;damage(e);}
      if(!e.timer)phase('recover',1.1);
      break;
    case 'recover':case 'stagger':if(!e.timer)phase('chase',0);break;
    case 'return':
      toward(e.homeX-e.x,e.homeZ-e.z,2.3);e.hp=Math.min(e.maxHp,e.hp+dt*8);
      if(homeDistance<.7)phase('patrol',0);break;
  }
  if(Math.hypot(vx,vz)>.05&&['patrol','return','calmed'].includes(e.phase))e.heading=Math.atan2(vx,vz);
  move(e,vx,vz,dt);
}
