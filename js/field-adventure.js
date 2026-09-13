import {createUncannyStep,createUncannyHearth,createFruitGrowth,createWornBlock} from './field-furnishings.js?v=20260909growth';
import {createHandSignal} from './hand-signal.js?v=20260909groundarm';
import {createWatcher} from './uncanny-props.js?v=20260909eye';
import * as THREE from 'three';
import {terrainHeight} from './explore-state.js?v=20260907journey';
import {CAMPS,CHESTS,RUNES,BERRIES,openChest,gatherBerry,cookMeal,eatMeal,nextAdventureGoal} from './adventure-state.js?v=20260909hands';

export function buildFieldAdventure(scene,player,state,combat,colliders,save,toast,showDialog,travel){
  const a=state.adventure,$=id=>document.getElementById(id),items=[],lights=[];
  const wood=new THREE.MeshStandardMaterial({color:0x71503a,roughness:1}),metal=new THREE.MeshStandardMaterial({color:0xb7a571,metalness:.45,roughness:.55}),stone=new THREE.MeshStandardMaterial({color:0x8a927f,roughness:1});
  function mesh(parent,g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  for(const [kind,defs] of [['camp',CAMPS],['chest',CHESTS],['rune',RUNES],['berry',BERRIES]])for(const d of defs){
    const root=new THREE.Group(),y=terrainHeight(d.x,d.z);root.position.set(d.x,y,d.z);scene.add(root);const item={...d,kind,y,root};items.push(item);
    if(kind==='camp'){
      const hearth=createUncannyHearth(items.length);root.add(hearth);lights.push(hearth);
      const seat=createUncannyStep(items.length);seat.position.set(1.9,.57,0);seat.scale.set(1/3,.6,.125);root.add(seat);
      colliders.push({x:d.x+1.9,z:d.z,halfX:1,halfZ:.25,bottom:y,top:y+.57});
    }else if(kind==='chest'){
      const watcher=createWatcher();root.add(watcher.root);item.watcher=watcher;
      colliders.push({x:d.x,z:d.z,halfX:.75,halfZ:.45,bottom:y,top:y+.82});
    }else if(kind==='rune'){
      const hand=createHandSignal(d.x);root.add(hand);item.hand=hand;item.glow=hand;
      colliders.push({x:d.x,z:d.z,r:.19,h:hand.userData.armHeight});
    }else{
      const growth=createFruitGrowth(Number(d.id));root.add(growth.root);item.fruit=growth.fruit;
    }
  }
  // A low circular sanctuary frames the simple three-light puzzle.
  for(let i=0;i<16;i++){const t=i/16*Math.PI*2,x=-65+Math.sin(t)*8,z=-68+Math.cos(t)*8;
    const step=createWornBlock(1.25,.32,.95,i%3);
    step.position.set(x,terrainHeight(x,z)+.04,z);step.rotation.y=t+Math.sin(i*3.7)*.3;scene.add(step);}
  function currentCamp(){return CAMPS.find(c=>Math.hypot(c.x-player.position.x,c.z-player.position.z)<4&&Math.abs(terrainHeight(c.x,c.z)-player.position.y)<2);}
  function rest(c){a.checkpoint=c.id;if(!a.camps.includes(c.id))a.camps.push(c.id);combat.fighter.hp=combat.fighter.maxHp;combat.fighter.stamina=100;combat.fighter.action=null;a.berries=[];save();toast('ここでひと休み。体力が戻り、帰る場所を覚えた。');}
  function renderMap(){
    $('journey-title').textContent='地図と持ちもの';$('map-selected').textContent='印を押すと、その場所へ案内します。';$('quest-text').textContent=nextAdventureGoal(a).text;
    $('bag-count').textContent=`木の実 ${a.fruit} 個 · 料理 ${a.meals} 個 · 眼球 ${a.chests.length}/3`;
    $('eat-meal').disabled=a.meals<1||combat.fighter.hp>=combat.fighter.maxHp;
    const camp=currentCamp();$('cook-meal').disabled=!camp||a.fruit<2;$('rest-camp').disabled=!camp;
    $('camp-note').textContent=camp?`${camp.name}：木の実2個で料理を作れます。`:'料理・休憩は、地図の焚き火へ。料理はどこでも食べられます。';
    $('peaceful').checked=a.peaceful;$('gentle').checked=a.gentle;
    $('map-destination').replaceChildren();for(const d of [...CAMPS,...CHESTS,...RUNES]){const option=document.createElement('option');option.value=d.id;option.textContent=d.name;$('map-destination').append(option);}$('map-destination').value=a.waypoint;
    $('map-pins').replaceChildren();
    for(const d of [...CAMPS,...CHESTS]){const b=document.createElement('button');const camp=CAMPS.includes(d),done=camp?a.camps.includes(d.id):a.chests.includes(d.id)||a.runes.includes(d.id);b.textContent=camp?'♨':RUNES.includes(d)?'◇':'◉';b.setAttribute('aria-label',`${d.name}${done?'（発見済み）':''}`);b.title=d.name;b.className=`map-pin ${done?'found':''}`;b.style.left=`${(d.x+90)/110*100}%`;b.style.top=`${(d.z+85)/105*100}%`;b.onclick=()=>{a.waypoint=d.id;save();$('map-selected').textContent=`${d.name}を目的地にしました。`;};$('map-pins').append(b);}
    $('map-player').style.left=`${Math.max(2,Math.min(98,(player.position.x+90)/110*100))}%`;$('map-player').style.top=`${Math.max(2,Math.min(98,(player.position.z+85)/105*100))}%`;
    $('travel-list').replaceChildren();for(const c of CAMPS.filter(c=>a.camps.includes(c.id))){const b=document.createElement('button');b.textContent=`${c.name}へ移動`;b.onclick=()=>{travel(c);$('journey').close();toast(`${c.name}へ戻った。`);};$('travel-list').append(b);}
  }
  $('journey-open').onclick=()=>{renderMap();showDialog($('journey'));};$('close-journey').onclick=$('close-journey-top').onclick=()=>$('journey').close();
  $('eat-meal').onclick=()=>{if(eatMeal(a,combat.fighter)){save();toast('あたたかい料理で、体力が戻った。');}renderMap();};
  $('cook-meal').onclick=()=>{if(currentCamp()&&cookMeal(a)){save();toast('木の実を煮て、料理をひとつ作った。');}renderMap();};
  $('rest-camp').onclick=()=>{const c=currentCamp();if(c)rest(c);renderMap();};
  $('peaceful').onchange=()=>{a.peaceful=$('peaceful').checked;save();};$('gentle').onchange=()=>{a.gentle=$('gentle').checked;save();};
  $('map-destination').onchange=()=>{a.waypoint=$('map-destination').value;save();};
  $('guide-next').onclick=()=>{a.waypoint=nextAdventureGoal(a).id;save();renderMap();};
  return {items,renderMap,
    candidates(){return items.filter(i=>i.kind==='camp'||i.kind==='chest'&&!a.chests.includes(i.id)||i.kind==='rune'&&!a.runes.includes(i.id)||i.kind==='berry'&&!a.berries.includes(i.id));},
    interact(i){
      if(i.kind==='camp'){rest(i);renderMap();showDialog($('journey'));}
      if(i.kind==='berry'&&gatherBerry(a,i.id)){save();toast('木の実を拾った。2個あれば、焚き火で料理に。');}
      if(i.kind==='chest'){
        if(!openChest(a,i.id)){toast('祠の灯りを、葉 → 雫 → 光の順にともそう。');return;}
        if(i.id==='shrine'){combat.fighter.maxHp=6;combat.fighter.hp=6;}
        a.waypoint=nextAdventureGoal(a).id;save();toast(i.id==='shrine'?'祠の祝福。体力がひとつ増えた。':'料理をひとつ見つけた。地図と持ちものから食べられる。');
      }
      if(i.kind==='rune'){const next=RUNES.find(r=>!a.runes.includes(r.id));if(next?.id!==i.id){toast(`次は「${next?.name}」。葉 → 雫 → 光の順で触れよう。`);return;}a.runes.push(i.id);a.waypoint=nextAdventureGoal(a).id;save();toast(a.runes.length===3?'3つの灯りがそろった。中央の眼球へ。':`${i.name}がともった。`);}
    },
    update(time){
      for(const l of lights){l.userData.update(time);}
      for(const i of items){if(i.kind==='chest'){const opened=a.chests.includes(i.id);i.watcher.update(time,opened,{x:player.position.x-i.root.position.x,z:player.position.z-i.root.position.z});}if(i.kind==='berry')i.fruit.visible=!a.berries.includes(i.id);if(i.kind==='rune'){const lit=a.runes.includes(i.id);i.glow.material.emissiveIntensity=lit?.65:.12;i.glow.material.color.setHex(lit?0xd3b39f:0xc5a497);i.hand.rotation.z=Math.sin(time*.45+i.x)*.035;}}
      const goal=[...CAMPS,...CHESTS,...RUNES].find(d=>d.id===a.waypoint)||CHESTS[0],dx=goal.x-player.position.x,dz=goal.z-player.position.z;
      const label=`${goal.name}まで ${Math.round(Math.hypot(dx,dz))} 歩`;if($('objective').textContent!==label)$('objective').textContent=label;
      return {x:goal.x,z:goal.z};
    }
  };
}
