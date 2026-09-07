import * as THREE from 'three';
import {terrainHeight} from './explore-state.js?v=20260907journey';
import {CAMPS,CHESTS,RUNES,BERRIES,openChest,gatherBerry,cookMeal,eatMeal,nextAdventureGoal} from './adventure-state.js?v=20260907journey';

export function buildFieldAdventure(scene,player,state,combat,colliders,save,toast,showDialog,travel){
  const a=state.adventure,$=id=>document.getElementById(id),items=[],lights=[];
  const wood=new THREE.MeshStandardMaterial({color:0x71503a,roughness:1}),metal=new THREE.MeshStandardMaterial({color:0xb7a571,metalness:.45,roughness:.55}),stone=new THREE.MeshStandardMaterial({color:0x8a927f,roughness:1});
  function mesh(parent,g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  for(const [kind,defs] of [['camp',CAMPS],['chest',CHESTS],['rune',RUNES],['berry',BERRIES]])for(const d of defs){
    const root=new THREE.Group(),y=terrainHeight(d.x,d.z);root.position.set(d.x,y,d.z);scene.add(root);const item={...d,kind,y,root};items.push(item);
    if(kind==='camp'){
      for(let i=0;i<8;i++){const t=i/8*Math.PI*2;mesh(root,new THREE.DodecahedronGeometry(.23),stone,Math.sin(t)*.75,.13,Math.cos(t)*.75);}
      for(let i=0;i<3;i++){const log=mesh(root,new THREE.CylinderGeometry(.12,.14,1.15,7),wood,0,.18,0);log.rotation.set(Math.PI/2,i*2,0);}
      const flame=mesh(root,new THREE.ConeGeometry(.28,.85,7),new THREE.MeshStandardMaterial({color:0xffc571,emissive:0xf59035,emissiveIntensity:2,transparent:true,opacity:.85}),0,.58,0);lights.push(flame);
      mesh(root,new THREE.BoxGeometry(2,.18,.5),wood,1.9,.48,0);for(const x of [1.2,2.6])mesh(root,new THREE.BoxGeometry(.16,.45,.4),wood,x,.22,0);
      colliders.push({x:d.x+1.9,z:d.z,halfX:1,halfZ:.25,bottom:y,top:y+.57});
    }else if(kind==='chest'){
      mesh(root,new THREE.BoxGeometry(1.5,.7,.9),wood,0,.35,0);const lid=new THREE.Group();lid.position.set(0,.72,-.45);root.add(lid);mesh(lid,new THREE.BoxGeometry(1.55,.15,.95),wood,0,0,.45);item.lid=lid;
      for(const x of [-.5,.5])mesh(root,new THREE.BoxGeometry(.09,.76,.96),metal,x,.37,0);mesh(root,new THREE.BoxGeometry(.2,.25,.1),metal,0,.6,.5);
      const glow=mesh(root,new THREE.OctahedronGeometry(.15),new THREE.MeshStandardMaterial({color:0xffdfa0,emissive:0xffc36e,emissiveIntensity:2}),0,1.15,0);item.glow=glow;
      colliders.push({x:d.x,z:d.z,halfX:.75,halfZ:.45,bottom:y,top:y+.82});
    }else if(kind==='rune'){
      mesh(root,new THREE.CylinderGeometry(.45,.65,1.15,7),stone,0,.57,0);
      const gem=mesh(root,new THREE.OctahedronGeometry(.26),new THREE.MeshStandardMaterial({color:0x7daba4,emissive:0x406b63,emissiveIntensity:.3}),0,1.45,0);item.glow=gem;
      const ring=mesh(root,new THREE.TorusGeometry(.55,.045,6,32),metal,0,1.45,0);item.ring=ring;
      colliders.push({x:d.x,z:d.z,r:.5,h:1.15});
    }else{
      for(let j=0;j<3;j++){const bush=mesh(root,new THREE.IcosahedronGeometry(.5,1),new THREE.MeshStandardMaterial({color:0x4b733a,roughness:1}),Math.sin(j*2)*.25,.4,Math.cos(j*2)*.25);bush.scale.y=.9;}
      item.fruit=new THREE.Group();root.add(item.fruit);for(let i=0;i<5;i++)mesh(item.fruit,new THREE.SphereGeometry(.12,8,6),new THREE.MeshStandardMaterial({color:0xb94335,roughness:.55}),Math.sin(i*2)*.35,.55+(i%2)*.18,Math.cos(i*2)*.35);
    }
  }
  // A low circular sanctuary frames the simple three-light puzzle.
  for(let i=0;i<16;i++){const t=i/16*Math.PI*2,x=-65+Math.sin(t)*8,z=-68+Math.cos(t)*8;
    mesh(scene,new THREE.BoxGeometry(1.2,.25,.9),stone,x,terrainHeight(x,z)+.04,z);}
  const glider=new THREE.Group();player.add(glider);glider.visible=false;
  const cloth=mesh(glider,new THREE.SphereGeometry(1.65,20,8,0,Math.PI*2,0,Math.PI*.47),new THREE.MeshStandardMaterial({color:0xe8d9af,side:THREE.DoubleSide,roughness:1}),0,2.65,0);cloth.scale.y=.28;
  for(const side of [-1,1]){const strut=mesh(glider,new THREE.CylinderGeometry(.025,.025,1.1,5),wood,side*.55,2.25,0);strut.rotation.z=-side*.4;}
  function currentCamp(){return CAMPS.find(c=>Math.hypot(c.x-player.position.x,c.z-player.position.z)<4&&Math.abs(terrainHeight(c.x,c.z)-player.position.y)<2);}
  function rest(c){a.checkpoint=c.id;if(!a.camps.includes(c.id))a.camps.push(c.id);combat.fighter.hp=combat.fighter.maxHp;combat.fighter.stamina=100;combat.fighter.action=null;a.berries=[];save();toast('ここでひと休み。体力が戻り、帰る場所を覚えた。');}
  function renderMap(){
    $('journey-title').textContent='地図と持ちもの';$('map-selected').textContent='印を押すと、その場所へ案内します。';$('quest-text').textContent=nextAdventureGoal(a).text;
    $('bag-count').textContent=`木の実 ${a.fruit} 個 · 料理 ${a.meals} 個 · 宝箱 ${a.chests.length}/3`;
    $('eat-meal').disabled=a.meals<1||combat.fighter.hp>=combat.fighter.maxHp;
    const camp=currentCamp();$('cook-meal').disabled=!camp||a.fruit<2;$('rest-camp').disabled=!camp;
    $('camp-note').textContent=camp?`${camp.name}：木の実2個で料理を作れます。`:'料理・休憩は、地図の焚き火へ。料理はどこでも食べられます。';
    $('peaceful').checked=a.peaceful;$('gentle').checked=a.gentle;
    $('map-destination').replaceChildren();for(const d of [...CAMPS,...CHESTS,...RUNES]){const option=document.createElement('option');option.value=d.id;option.textContent=d.name;$('map-destination').append(option);}$('map-destination').value=a.waypoint;
    $('map-pins').replaceChildren();
    for(const d of [...CAMPS,...CHESTS]){const b=document.createElement('button');const camp=CAMPS.includes(d),done=camp?a.camps.includes(d.id):a.chests.includes(d.id)||a.runes.includes(d.id);b.textContent=camp?'♨':RUNES.includes(d)?'◇':'▣';b.setAttribute('aria-label',`${d.name}${done?'（発見済み）':''}`);b.title=d.name;b.className=`map-pin ${done?'found':''}`;b.style.left=`${(d.x+90)/110*100}%`;b.style.top=`${(d.z+85)/105*100}%`;b.onclick=()=>{a.waypoint=d.id;save();$('map-selected').textContent=`${d.name}を目的地にしました。`;};$('map-pins').append(b);}
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
  return {items,glider,renderMap,
    candidates(){return items.filter(i=>i.kind==='camp'||i.kind==='chest'&&!a.chests.includes(i.id)||i.kind==='rune'&&!a.runes.includes(i.id)||i.kind==='berry'&&!a.berries.includes(i.id));},
    interact(i){
      if(i.kind==='camp'){rest(i);renderMap();showDialog($('journey'));}
      if(i.kind==='berry'&&gatherBerry(a,i.id)){save();toast('木の実を拾った。2個あれば、焚き火で料理に。');}
      if(i.kind==='chest'){
        if(!openChest(a,i.id)){toast('祠の灯りを、葉 → 雫 → 光の順にともそう。');return;}
        if(i.id==='shrine'){combat.fighter.maxHp=6;combat.fighter.hp=6;}
        a.waypoint=nextAdventureGoal(a).id;save();toast(i.id==='wind'?'風の布を見つけた！ 空中でもう一度「跳ぶ」で、ゆっくり滑空。':i.id==='shrine'?'祠の祝福。体力がひとつ増えた。':'料理をひとつ見つけた。地図と持ちものから食べられる。');
      }
      if(i.kind==='rune'){const next=RUNES.find(r=>!a.runes.includes(r.id));if(next?.id!==i.id){toast(`次は「${next?.name}」。葉 → 雫 → 光の順で触れよう。`);return;}a.runes.push(i.id);a.waypoint=nextAdventureGoal(a).id;save();toast(a.runes.length===3?'3つの灯りがそろった。中央の宝箱へ。':`${i.name}がともった。`);}
    },
    update(time,gliding){
      glider.visible=gliding;for(const l of lights){l.scale.setScalar(1+Math.sin(time*5+l.position.x)*.07);}
      for(const i of items){if(i.kind==='chest'){const opened=a.chests.includes(i.id);i.lid.rotation.x=opened?-1.15:0;i.glow.visible=!opened;i.glow.position.y=1.2+Math.sin(time*2)*.1;}if(i.kind==='berry')i.fruit.visible=!a.berries.includes(i.id);if(i.kind==='rune'){const lit=a.runes.includes(i.id);i.glow.material.emissiveIntensity=lit?2:.2;i.glow.material.color.setHex(lit?0xffda80:0x71968a);i.ring.rotation.y=time*.4;}}
      const goal=[...CAMPS,...CHESTS,...RUNES].find(d=>d.id===a.waypoint)||CHESTS[0],dx=goal.x-player.position.x,dz=goal.z-player.position.z;
      const label=`${goal.name}まで ${Math.round(Math.hypot(dx,dz))} 歩`;if($('objective').textContent!==label)$('objective').textContent=label;
      return {x:goal.x,z:goal.z};
    }
  };
}
