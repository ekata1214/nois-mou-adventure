import bpy,bmesh,os,json
out=os.path.abspath('assets/sculpt-202698');report=[]
for o in list(bpy.context.scene.objects):
 if not o.name.startswith(('rock-','stump-')):o.hide_set(True);o.select_set(False);continue
for o in [o for o in bpy.context.scene.objects if o.name.startswith(('rock-','stump-'))]:
 for a in bpy.context.scene.objects:a.select_set(False)
 o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o;original=o.data;o.location=(0,0,0)
 for lod in ['near','far']:
  o.data=original.copy()
  if lod=='far':
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.025);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.001);bm.to_mesh(o.data);bm.free()
  mod=o.modifiers.new('density','DECIMATE');mod.ratio=.25 if lod=='near' else .12;mod.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=mod.name)
  o.data.validate();o.data.update();o.data.calc_loop_triangles();tris=len(o.data.loop_triangles)
  bpy.ops.export_scene.gltf(filepath=os.path.join(out,o.name+'-'+lod+'.glb'),export_format='GLB',use_selection=True,export_apply=False,export_materials='EXPORT')
  report.append({'name':o.name,'lod':lod,'triangles':tris,'bytes':os.path.getsize(os.path.join(out,o.name+'-'+lod+'.glb'))});temp=o.data;o.data=original;bpy.data.meshes.remove(temp)
print('LOD_REPORT',json.dumps(report));open(os.path.join(out,'build-report.json'),'w').write(json.dumps(report,indent=2))
