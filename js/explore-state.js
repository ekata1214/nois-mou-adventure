export const KEY = 'nois-mou-explore-v1';
export const REGIONS = [
  { id:'ki', name:'喜 / ほどける野原', note:'まだ知らないことが、光っている。', color:0xc5b87b, sky:0x708f88, x:-1,z:-1, word:'好奇心' },
  { id:'do', name:'怒 / 赤い残響', note:'言えなかった言葉が、立ち上がる。', color:0x915b4c, sky:0x86665e, x:1,z:-1, word:'なぜ' },
  { id:'ai', name:'哀 / 沈む記憶', note:'忘れたつもりの景色がある。', color:0x596f87, sky:0x637e99, x:1,z:1, word:'あの日' },
  { id:'raku', name:'楽 / まどろみの庭', note:'何もしない時間にも、居場所がある。', color:0x7d947d, sky:0x879e91, x:-1,z:1, word:'余白' },
];
export function terrainHeight(x,z){
  const base=Math.sin(x*.075)*2.3+Math.cos(z*.085)*1.8+Math.sin((x+z)*.043)*2;
  const hill=8*Math.exp(-((x+65)**2+(z+62)**2)/650);
  const pool=Math.exp(-((x+19)**2+(z+46)**2)/65);
  return (base+hill)*(1-pool)-3.3*pool;
}
export function regionAt(x,z){ return REGIONS.find(r=>r.x===(x<0?-1:1)&&r.z===(z<0?-1:1)); }
export function freshState(){ return {collected:[],friends:{},lamp:false,memos:[],visited:[],discoveries:[]}; }
export function sanitizeState(value){
  const s=freshState(); if(!value||typeof value!=='object') return s;
  s.collected=[...new Set(Array.isArray(value.collected)?value.collected.filter(x=>Number.isInteger(x)&&x>=0&&x<24):[])];
  for(const [id,relation] of Object.entries(value.friends||{})) if(REGIONS.some(r=>r.id===id)&&['follow','home','stay'].includes(relation)) s.friends[id]=relation;
  s.lamp=value.lamp===true && s.collected.length>=3;
  s.memos=(Array.isArray(value.memos)?value.memos:[]).filter(x=>typeof x==='string').map(x=>x.slice(0,160)).slice(-12);
  s.visited=[...new Set((Array.isArray(value.visited)?value.visited:[]).filter(x=>REGIONS.some(r=>r.id===x)))];
  s.discoveries=[...new Set((Array.isArray(value.discoveries)?value.discoveries:[]).filter(x=>['water','grove','arch'].includes(x)))];
  return s;
}
export function availableShards(s){return Math.max(0,s.collected.length-(s.lamp?3:0));}
export function makeFriend(s,id,relation){if(!REGIONS.some(r=>r.id===id)||!['follow','home','stay'].includes(relation))return false;s.friends[id]=relation;return true;}
export function craftLamp(s){if(s.lamp||availableShards(s)<3)return false;s.lamp=true;return true;}
export function nearestReachable(origin,points,maxDistance=23){let best=null;let distance=maxDistance;for(const p of points){const d=Math.hypot(p.x-origin.x,p.y-origin.y,p.z-origin.z);if(d<distance&&d>2){distance=d;best=p;}}return best;}
export function resolveFieldPosition(x,z,y,obstacles){
  for(const c of obstacles){
    const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),r=c.r+.35;
    if(d<r&&y<terrainHeight(c.x,c.z)+(c.h??c.r*2)+.5){const a=d>.001?Math.atan2(dz,dx):0;x=c.x+Math.cos(a)*r;z=c.z+Math.sin(a)*r;}
  }
  return {x,z};
}
export function cameraClearance(from,to,obstacles){
  for(let i=2;i<=24;i++){
    const t=i/24,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;
    if(y<terrainHeight(x,z)+.45||obstacles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.35&&y<terrainHeight(c.x,c.z)+(c.h??c.r*2)+.5))return Math.max(.12,(i-1)/24);
  }
  return 1;
}
