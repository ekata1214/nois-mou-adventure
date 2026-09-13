"""Keep the owner's baked wire sculpture, distort continuous regions, export LODs."""
import bpy,math,os,json,sys
from mathutils import Vector,noise
out=os.path.abspath('assets/sculpt-202698')
originals={o.name:o for o in bpy.context.scene.objects if o.type=='MESH'}
for o in originals.values():o.hide_render=True;o.hide_set(True)
made=[]
for kind,source_name in [('rock','Sphere'),('stump','Cylinder')]:
 source=originals[source_name]
 for variant in range(3):
  o=bpy.data.objects.new(f'{kind}-{variant}',source.data.copy());bpy.context.collection.objects.link(o)
  coords=[source.matrix_world@v.co for v in o.data.vertices];lo=Vector(tuple(min(v[k] for v in coords) for k in range(3)));hi=Vector(tuple(max(v[k] for v in coords) for k in range(3)));center=(hi+lo)/2;unit=max(hi-lo)
  for v,p in zip(o.data.vertices,coords):
   p=(p-center)/unit*2
   if variant:
    n=noise.noise_vector(p*1.8+Vector((variant*7,3,kind=='stump')))
    p+=n*(.16+variant*.11)
    # Broad grabbing and tearing, not unrelated vertex jitter that destroys the net.
    grab=math.exp(-((p.x-.3)**2+(p.z-.4)**2)*4)
    p.x+=grab*(.35 if variant==1 else -.6);p.z+=grab*.35
    angle=p.z*(.45 if variant==1 else -.7);x,y=p.x,p.y;p.x=x*math.cos(angle)-y*math.sin(angle);p.y=x*math.sin(angle)+y*math.cos(angle)
   v.co=p
  # Center footprint and normalize each authored shape for collision-safe placement.
  lo=Vector(tuple(min(v.co[k] for v in o.data.vertices) for k in range(3)));hi=Vector(tuple(max(v.co[k] for v in o.data.vertices) for k in range(3)))
  for v in o.data.vertices:v.co=Vector(((v.co.x-(hi.x+lo.x)/2)/(hi.x-lo.x)*2,(v.co.y-(hi.y+lo.y)/2)/(hi.y-lo.y)*2,(v.co.z-lo.z)/(hi.z-lo.z)))
  attr=o.data.color_attributes.new(name='SculptTint',type='FLOAT_COLOR',domain='POINT')
  for v,c in zip(o.data.vertices,attr.data):
   n=noise.noise(v.co*3+Vector((variant,1,3)));vein=math.sin(v.co.x*7+v.co.z*9)*math.cos(v.co.y*6)
   shade=.43+n*.20;rust=max(0,vein-.72)*.25
   c.color=(shade+rust,shade*.94-rust*.3,shade*.92-rust*.3,1)
  mat=bpy.data.materials.new(o.name+' grey fossil');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86;bs.inputs['Metallic'].default_value=.06;col=mat.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='SculptTint';mat.node_tree.links.new(col.outputs['Color'],bs.inputs['Base Color']);o.data.materials.clear();o.data.materials.append(mat)
  for f in o.data.polygons:f.use_smooth=True
  o.location=(variant*3.5,0 if kind=='rock' else 4,0);made.append(o)
# Editable full topology kept separately from export decimation.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'202698-variants.blend'))
exec(compile(open(os.path.join(os.path.dirname(__file__),'export-202698-lods.py')).read(),'export-202698-lods.py','exec'))
