import assert from 'node:assert/strict';
import {freshState,sanitizeState,availableShards,makeFriend,craftLamp,regionAt,terrainHeight,nearestReachable} from '../js/explore-state.js';
// Invalid/old local saves must not manufacture crafting resources or relationships.
const cleaned=sanitizeState({collected:[0,0,3,23,24,-1,'2'],friends:{ki:'follow',do:'invalid',other:'home'},lamp:true,memos:['ok',7],visited:['ki','ki','unknown']});
assert.deepEqual(cleaned.collected,[0,3,23]);assert.deepEqual(cleaned.friends,{ki:'follow'});assert.deepEqual(cleaned.visited,['ki']);assert.deepEqual(cleaned.memos,['ok']);assert.equal(availableShards(cleaned),0);
assert.equal(sanitizeState({lamp:true}).lamp,false);
assert.deepEqual(sanitizeState(null),freshState());
const state=freshState();assert.equal(craftLamp(state),false);state.collected=[0,1,2,3];assert.equal(craftLamp(state),true);assert.equal(availableShards(state),1);assert.equal(craftLamp(state),false);assert.equal(availableShards(state),1);
for(const relation of ['follow','home','stay']){assert.equal(makeFriend(state,'ki',relation),true);assert.equal(state.friends.ki,relation);assert.equal(Object.keys(state.friends).length,1);}
assert.equal(makeFriend(state,'unknown','follow'),false);
assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(state))),state);
assert.equal(regionAt(-20,-20).id,'ki');assert.equal(regionAt(20,-20).id,'do');assert.equal(regionAt(20,20).id,'ai');assert.equal(regionAt(-20,20).id,'raku');
for(let x=-120;x<=120;x+=5)for(let z=-120;z<=120;z+=5)assert.ok(Number.isFinite(terrainHeight(x,z)));
const origin={x:0,y:0,z:0},near={x:10,y:3,z:0},far={x:80,y:0,z:0};assert.equal(nearestReachable(origin,[far,near]),near);assert.equal(nearestReachable(origin,[far]),null);assert.equal(nearestReachable(origin,[origin]),null);
console.log('test-explore: save recovery, crafting, friendship, regions, leap range OK');
