import assert from 'node:assert/strict';
import {advanceCharacter,canOccupy,BODY} from '../js/field-physics.js';
import {terrainHeight,POND,waterDepth} from '../js/explore-state.js';
const make=(x=0,z=0)=>({x,z,y:terrainHeight(x,z),vx:0,vz:0,vy:0,grounded:true});
// Every point on the rendered circular rim meets the analytic shoreline.
for(let i=0;i<360;i++){
 const a=i*Math.PI/180,x=POND.x+Math.cos(a)*POND.radius,z=POND.z+Math.sin(a)*POND.radius;
 assert.ok(Math.abs(terrainHeight(x,z)-POND.level)<1e-6);
}
assert.equal(waterDepth(POND.x,POND.z),POND.depth);
const wall={x:3,z:0,r:.8,h:8};
for(const fps of [15,30,60,120]){
 const b=make();for(let i=0;i<fps*3;i++)advanceCharacter(b,{x:1,z:0,speed:8},1/fps,[wall],[]);
 assert.ok(b.x<1.851,'must not tunnel through wall');assert.ok(canOccupy(b,[wall]));
}
const results=[];
for(const fps of [30,60,120]){const b=make();for(let i=0;i<fps;i++)advanceCharacter(b,{x:-1,z:0,speed:4},1/fps,[],[]);results.push(b.x);}
assert.ok(Math.max(...results)-Math.min(...results)<.015,'frame-rate independence');
const airborne=make();airborne.grounded=false;airborne.vy=9;
const ceiling={x:0,z:0,halfX:3,halfZ:3,bottom:4,top:4.5};
for(let i=0;i<120;i++){advanceCharacter(airborne,{x:0,z:0,speed:4},1/120,[ceiling],[]);assert.ok(airborne.y+BODY.height<=4.001);}
assert.equal(airborne.grounded,true);
const stump={x:-7,z:-10,r:1.3,top:terrainHeight(-7,-10)+.8,h:.8,walkable:true};
const b=make(stump.x,stump.z);b.y=stump.top+1;b.vy=-2;b.grounded=false;
for(let i=0;i<180;i++)advanceCharacter(b,{x:0,z:0,speed:4},1/120,[stump],[{...stump,y:stump.top}]);
assert.ok(Math.abs(b.y-stump.top)<1e-5);assert.equal(b.grounded,true);
const wet=make(POND.x,POND.z),dry=make();
for(let i=0;i<30;i++){advanceCharacter(wet,{x:1,z:0,speed:4},1/120,[],[]);advanceCharacter(dry,{x:1,z:0,speed:4},1/120,[],[]);}
assert.ok(wet.vx<dry.vx*.6,'water resistance');assert.ok(wet.y>=terrainHeight(wet.x,wet.z)-.001);
const route=make(POND.x,POND.z+POND.radius+3);
for(let i=0;i<900;i++){advanceCharacter(route,{x:0,z:-1,speed:4},1/120,[],[]);assert.ok(Number.isFinite(route.y));assert.ok(route.y>=terrainHeight(route.x,route.z)-.001);}
assert.ok(waterDepth(route.x,route.z,route.y)>.1,'walk into pond');
console.log('Physics OK: shoreline, 15–120 Hz wall collision, frame independence, head clearance, stump landing, pond entry/resistance/bed.');
