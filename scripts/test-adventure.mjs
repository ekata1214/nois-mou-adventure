import assert from 'node:assert/strict';
import {freshAdventure,sanitizeAdventure,openChest,gatherBerry,cookMeal,eatMeal,nextAdventureGoal} from '../js/adventure-state.js';
import {sanitizeState,terrainHeight} from '../js/explore-state.js';
import {advanceCharacter} from '../js/field-physics.js';
const a=freshAdventure();assert.equal(nextAdventureGoal(a).id,'wind');
assert(!openChest(a,'shrine'));assert(openChest(a,'wind'));assert(!openChest(a,'wind'));assert.equal(a.meals,1);assert.equal(nextAdventureGoal(a).id,'leaf');
assert(gatherBerry(a,'0'));assert(!gatherBerry(a,'0'));assert(gatherBerry(a,'1'));assert(cookMeal(a));assert(!cookMeal(a));assert.equal(a.fruit,0);assert.equal(a.meals,2);
const f={hp:5,maxHp:5};assert(!eatMeal(a,f));f.hp=1;assert(eatMeal(a,f));assert.equal(f.hp,4);assert.equal(a.meals,1);f.hp=0;assert(!eatMeal(a,f));
a.runes=['leaf','water','sun'];assert(openChest(a,'shrine'));assert.equal(nextAdventureGoal(a).id,'entry');
assert.deepEqual(sanitizeAdventure(JSON.parse(JSON.stringify(a))),a);
for(const raw of [null,[],false,5,'bad',{camps:'entry',chests:['shrine','bad'],berries:[0],fruit:Infinity,meals:-1,checkpoint:'bad',peaceful:'true'}]){
  const safe=sanitizeAdventure(raw);assert(safe.camps.includes('entry'));assert.equal(safe.checkpoint,'entry');assert.equal(safe.meals,0);assert(!safe.chests.includes('shrine'));
}
assert.equal(sanitizeState({encounters:{ember:'friend-stay'}}).encounters.ember,'friend-stay');
for(const hz of [15,30,60,120]){
  const b={x:5,y:terrainHeight(5,5)+15,z:5,vx:0,vy:0,vz:0,grounded:false};
  for(let i=0;i<hz*2;i++)advanceCharacter(b,{x:0,z:0,speed:0,gliding:true},1/hz,[],[]);
  assert(b.vy>=-2.21);assert(b.y>terrainHeight(5,5)+10);assert(!b.grounded);
}
console.log('Adventure OK: chest and harvest deduplication, puzzle gate, cooking, healing, malformed saves, friendship while waiting, glide at 15–120 Hz.');
