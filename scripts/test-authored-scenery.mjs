import fs from 'node:fs';import assert from 'node:assert/strict';
for(const kind of ['rock','stump'])for(let variant=0;variant<3;variant++){
 const counts={};for(const lod of ['near','far']){const path=new URL(`../assets/sculpt-202698/${kind}-${variant}-${lod}.glb`,import.meta.url),b=fs.readFileSync(path);assert.equal(b.toString('ascii',0,4),'glTF');const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));counts[lod]=0;for(const m of g.meshes)for(const p of m.primitives){counts[lod]+=g.accessors[p.indices].count/3;assert.ok(p.attributes.COLOR_0!==undefined,'authored material color survives export');const a=g.accessors[p.attributes.POSITION];for(const n of [...a.min,...a.max])assert.ok(Number.isFinite(n));}assert.ok(counts[lod]>100);}
 assert.ok(counts.far<counts.near*.25,'distant geometry must actually be lighter');
}
console.log('Authored sculpt assets: six tinted variants, finite bounds, far meshes below 25% of near triangles.');
