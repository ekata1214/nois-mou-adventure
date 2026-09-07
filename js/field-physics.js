import {terrainHeight,waterDepth,supportHeight} from './explore-state.js?v=20260907journey';

export const BODY={radius:.35,height:2.05,gravity:22,maxStep:.3};
const approach=(value,target,delta)=>value+Math.max(-delta,Math.min(delta,target-value));
function bounds(c){return {bottom:c.bottom??terrainHeight(c.x,c.z),top:c.top??terrainHeight(c.x,c.z)+(c.h??c.r*2)};}
function pushOut(body,c){
  const {bottom,top}=bounds(c);
  if(body.y>=top-.055||body.y+BODY.height<=bottom+.01)return false;
  let nx=0,nz=0,penetration=0;
  if(c.halfX){
    const dx=body.x-c.x,dz=body.z-c.z;
    const px=c.halfX+BODY.radius-Math.abs(dx),pz=c.halfZ+BODY.radius-Math.abs(dz);
    if(px<=0||pz<=0)return false;
    if(px<pz){nx=dx<0?-1:1;penetration=px;}else{nz=dz<0?-1:1;penetration=pz;}
  }else{
    const dx=body.x-c.x,dz=body.z-c.z,d=Math.hypot(dx,dz),radius=c.r+BODY.radius;
    if(d>=radius)return false;
    nx=d>.0001?dx/d:1;nz=d>.0001?dz/d:0;penetration=radius-d;
  }
  body.x+=nx*(penetration+.00001);body.z+=nz*(penetration+.00001);
  const toward=body.vx*nx+body.vz*nz;
  if(toward<0){body.vx-=toward*nx;body.vz-=toward*nz;}
  return true;
}
function footprint(body,c){return c.halfX?Math.abs(body.x-c.x)<c.halfX+BODY.radius&&Math.abs(body.z-c.z)<c.halfZ+BODY.radius:Math.hypot(body.x-c.x,body.z-c.z)<c.r+BODY.radius;}
export function canOccupy(body,colliders){return !colliders.some(c=>{const b=bounds(c);return footprint(body,c)&&body.y<b.top-.055&&body.y+BODY.height>b.bottom+.01;});}

export function advanceCharacter(body,input,dt,colliders,surfaces){
  // Bound displacement per substep to <7 cm at running speed. This also keeps
  // landings and side collisions stable at 30/60/120 Hz and after slow frames.
  const count=Math.max(1,Math.ceil(Math.min(dt,.15)*120)),step=Math.min(dt,.15)/count;
  for(let n=0;n<count;n++){
    const depth=waterDepth(body.x,body.z,body.y),immersion=Math.min(1,depth/BODY.height);
    const resistance=1/(1+depth*1.6),speed=input.speed*resistance;
    const oldX=body.x,oldZ=body.z,oldY=body.y;
    const control=body.grounded?32:7;
    body.vx=approach(body.vx,input.x*speed,control*step);
    body.vz=approach(body.vz,input.z*speed,control*step);
    if(depth>0){const drag=Math.exp(-depth*.8*step);body.vx*=drag;body.vz*=drag;}
    body.x=Math.max(-110,Math.min(110,body.x+body.vx*step));body.z=Math.max(-110,Math.min(110,body.z+body.vz*step));
    const ground=terrainHeight(body.x,body.z);
    if(body.grounded&&ground-oldY>BODY.maxStep){body.x=oldX;body.z=oldZ;body.vx=body.vz=0;}
    const floor=supportHeight(body.x,body.z,oldY+(body.grounded&&body.vy<=0?BODY.maxStep:0),surfaces);
    if(body.grounded&&body.vy<=0&&Math.abs(oldY-floor)<=BODY.maxStep){body.y=floor;body.vy=0;}
    else{
      // Displaced water partly offsets weight; this shallow pool permits wading.
      body.vy-=BODY.gravity*(1-immersion*.92)*step;
      if(input.gliding&&depth===0)body.vy=Math.max(body.vy,-2.2);
      body.vy*=Math.exp(-immersion*2.5*step);
      body.y+=body.vy*step;body.grounded=false;
      if(body.vy>0)for(const c of colliders){
        const b=bounds(c);
        if(footprint(body,c)&&oldY+BODY.height<=b.bottom+.03&&body.y+BODY.height>=b.bottom){body.y=b.bottom-BODY.height-.01;body.vy=0;}
      }
      if(body.y<=floor&&body.vy<=0){body.y=floor;body.vy=0;body.grounded=true;}
    }
    for(let pass=0;pass<3;pass++)for(const c of colliders)pushOut(body,c);
    // Resolve horizontal projection onto a slope without sinking below it.
    const finalFloor=supportHeight(body.x,body.z,body.y,surfaces);
    if(body.y<finalFloor&&body.vy<=0){body.y=finalFloor;body.vy=0;body.grounded=true;}
  }
  return body;
}
