export const CAMPS=[{id:'entry',name:'入口の焚き火',x:-5,z:3},{id:'grove',name:'木陰の焚き火',x:-39,z:-25},{id:'arch',name:'丘の休憩所',x:-60,z:-54}];
export const CHESTS=[{id:'wind',name:'風の宝箱',x:-5,z:-18},{id:'pond',name:'水辺の宝箱',x:-29,z:-48},{id:'shrine',name:'祠の宝箱',x:-65,z:-68}];
export const RUNES=[{id:'leaf',name:'葉の灯り',x:-60,z:-67},{id:'water',name:'雫の灯り',x:-65,z:-73},{id:'sun',name:'光の灯り',x:-70,z:-67}];
export const BERRIES=[[-9,-2],[-16,-25],[-33,-24],[-36,-42],[-49,-52],[-57,-59]].map(([x,z],i)=>({id:String(i),name:'赤い木の実',x,z}));
export function freshAdventure(){return {camps:['entry'],checkpoint:'entry',chests:[],runes:[],berries:[],fruit:0,meals:0,peaceful:false,gentle:true,waypoint:'wind'};}
export function sanitizeAdventure(raw){
  const a=freshAdventure();if(!raw||typeof raw!=='object')return a;
  for(const [key,defs] of [['camps',CAMPS],['chests',CHESTS],['runes',RUNES],['berries',BERRIES]])a[key]=[...new Set((Array.isArray(raw[key])?raw[key]:[]).filter(id=>defs.some(d=>d.id===id)))];
  if(!a.camps.includes('entry'))a.camps.unshift('entry');
  a.checkpoint=a.camps.includes(raw.checkpoint)?raw.checkpoint:'entry';
  for(const k of ['fruit','meals'])a[k]=Number.isInteger(raw[k])?Math.max(0,Math.min(99,raw[k])):0;
  a.peaceful=raw.peaceful===true;a.gentle=raw.gentle!==false;
  a.waypoint=[...CAMPS,...CHESTS,...RUNES].some(d=>d.id===raw.waypoint)?raw.waypoint:'wind';
  // A completed shrine chest implies all three lights; discard impossible imports.
  if(a.runes.length<3)a.chests=a.chests.filter(id=>id!=='shrine');return a;
}
export function openChest(a,id){if(!CHESTS.some(c=>c.id===id)||a.chests.includes(id)||(id==='shrine'&&a.runes.length<3))return false;a.chests.push(id);a.meals=Math.min(99,a.meals+1);return true;}
export function gatherBerry(a,id){if(a.berries.includes(id)||!BERRIES.some(b=>b.id===id))return false;a.berries.push(id);a.fruit=Math.min(99,a.fruit+1);return true;}
export function cookMeal(a){if(a.fruit<2||a.meals>=99)return false;a.fruit-=2;a.meals++;return true;}
export function eatMeal(a,f){if(a.meals<1||f.hp>=f.maxHp||f.hp<=0)return false;a.meals--;f.hp=Math.min(f.maxHp,f.hp+3);return true;}
export function nextAdventureGoal(a){
  if(!a.chests.includes('wind'))return {id:'wind',text:'近くの宝箱で、風の布を見つけよう'};
  if(a.runes.length<3)return {id:RUNES.find(r=>!a.runes.includes(r.id)).id,text:`丘の祠で、3つの灯りをともそう（${a.runes.length}/3）`};
  if(!a.chests.includes('shrine'))return {id:'shrine',text:'灯りがそろった。祠の宝箱を開こう'};
  return {id:'entry',text:'祠を巡った。友達と自由に歩こう'};
}
