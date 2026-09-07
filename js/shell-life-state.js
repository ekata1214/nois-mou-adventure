// The room keeps objects and the player's words, without judging their meaning.
export const FRAGMENT_WAIT=300000;
export function shellState(v={}){
 v=v&&typeof v==='object'?v:{};
 const count=n=>Number.isFinite(n)?Math.max(0,Math.min(999,Math.floor(n))):0;
 return {fragments:count(v.fragments),spots:Array.from({length:6},(_,i)=>Number.isFinite(v.spots?.[i])?Math.max(0,v.spots[i]):0),items:(Array.isArray(v.items)?v.items:[]).filter(x=>x&&typeof x.text==='string').slice(0,60).map(x=>({text:x.text.slice(0,500)})),care:Number.isFinite(v.care)?Math.max(0,v.care):0};
}
export function collectFragment(s,index,now=Date.now()){
 if(!Number.isInteger(index)||index<0||index>5||s.fragments>=999||s.spots[index]>now)return false;
 s.spots[index]=now+FRAGMENT_WAIT;s.fragments++;return true;
}
export function makeVessel(s){if(s.fragments<3||s.items.length>=60)return false;s.fragments-=3;s.items.push({text:''});return true;}
export function inscribe(s,index,text){if(typeof text!=='string'||!text.trim()||!s.items[index]||s.items[index].text)return false;s.items[index].text=text.trim().slice(0,500);return true;}
