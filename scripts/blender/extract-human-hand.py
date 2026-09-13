import bpy,bmesh,math,numpy as np
from mathutils import Vector
bpy.ops.import_scene.gltf(filepath='assets/muu/mou-actions.glb')
body=bpy.data.objects['Mou_Body'];rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');bone=rig.pose.bones['hand.L'];names={bone.name}|{b.name for b in bone.children_recursive};indices={g.index for g in body.vertex_groups if g.name in names}
selected={v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in indices)>.15}
deps=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(deps);mesh=evaluated.to_mesh();faces=[list(p.vertices) for p in mesh.polygons if all(i in selected for i in p.vertices)];used=sorted({i for f in faces for i in f});mapping={old:new for new,old in enumerate(used)};points=[body.matrix_world@mesh.vertices[i].co for i in used]
wrist=rig.matrix_world@bone.head;center=sum(points,Vector())/len(points);align=(center-wrist).normalized().rotation_difference(Vector((0,0,1)));points=[align@(p-wrist) for p in points]
xy=np.array([(p.x,p.y) for p in points]);eigen,vectors=np.linalg.eigh(np.cov(xy.T));wide=vectors[:,1];a=-math.atan2(wide[1],wide[0]);
points=[Vector((p.x*math.cos(a)-p.y*math.sin(a),p.x*math.sin(a)+p.y*math.cos(a),p.z)) for p in points];low=min(p.z for p in points);high=max(p.z for p in points);cx=(max(p.x for p in points)+min(p.x for p in points))/2;cy=(max(p.y for p in points)+min(p.y for p in points))/2
points=[((p.x-cx)/(high-low),(p.y-cy)/(high-low),(p.z-low)/(high-low)) for p in points]
new=bpy.data.meshes.new('Anatomical hand');new.from_pydata(points,[],[[mapping[i] for i in f] for f in faces]);new.update();o=bpy.data.objects.new('Human_hand',new);bpy.context.collection.objects.link(o)
# Close the wrist cut while retaining the source fingers, thumb web and knuckles.
bm=bmesh.new();bm.from_mesh(new);boundary=[e for e in bm.edges if e.is_boundary];bmesh.ops.holes_fill(bm,edges=boundary,sides=0);bm.to_mesh(new);bm.free()
for p in new.polygons:p.use_smooth=True
mat=bpy.data.materials.new('Pale human skin');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.56,.40,.34,1);bs.inputs['Roughness'].default_value=.67;o.data.materials.append(mat)
for obj in bpy.context.scene.objects:obj.select_set(False)
o.select_set(True);bpy.context.view_layer.objects.active=o
bpy.ops.export_scene.gltf(filepath='assets/hand/human-hand.glb',export_format='GLB',use_selection=True,export_materials='EXPORT')
print('HUMAN_HAND',len(new.vertices),len(new.polygons),list(o.dimensions))
