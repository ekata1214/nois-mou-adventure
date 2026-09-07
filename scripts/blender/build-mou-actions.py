"""Build reusable skeletal locomotion clips from the existing, textured Mou rig.
Never modifies the source GLB or the external SSD assets.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/muu'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / 'speak-mou.glb'))
rig = max((o for o in bpy.data.objects if o.type == 'ARMATURE'), key=lambda o: len(o.data.bones))
for obj in bpy.data.objects:
    obj.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
rig.rotation_mode = 'QUATERNION'
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'
    for constraint in list(bone.constraints):
        bone.constraints.remove(constraint)

# Reshape the rest mesh AND the bind skeleton, so the silhouette is consistent
# in every clip rather than faked with a single idle pose or object scaling.
def masculine_point(point):
    p=point.copy();z=p.z
    shoulder=math.exp(-((z-1.4)/.19)**2)*max(0,min(1,(1.6-z)/.15))
    hips=math.exp(-((z-.92)/.17)**2)
    waist=math.exp(-((z-1.15)/.14)**2)
    p.x += max(-.23,min(.23,p.x))*(.20*shoulder-.12*hips+.055*waist)
    return p
for obj in bpy.data.objects:
    if obj.type!='MESH':continue
    for vertex in obj.data.vertices:
        vertex.co=masculine_point(vertex.co)
        if any(m and m.name=='.Human' for m in obj.data.materials):
            z=vertex.co.z
            if vertex.co.y<0:
                chest=math.exp(-((z-1.33)/.13)**2)*math.exp(-(vertex.co.x/.22)**4)
                vertex.co.y*=1-.22*chest
            else:vertex.co.y*=1-.18*math.exp(-((z-.92)/.17)**2)
    if any(m and m.name=='.Human' for m in obj.data.materials):obj.name='Mou_Body'
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    bone.head=masculine_point(bone.head);bone.tail=masculine_point(bone.tail)
bpy.ops.object.mode_set(mode='OBJECT')

def rotation(name, axis, angle):
    bone = rig.pose.bones.get(name)
    if not bone: return
    local_axis = bone.bone.matrix_local.to_quaternion().inverted() @ Vector(axis)
    bone.rotation_quaternion = Quaternion(local_axis, angle) @ bone.rotation_quaternion

def relax_arm(side):
    bone = rig.pose.bones.get('upper_arm.' + side)
    if not bone: return
    rest = bone.bone.matrix_local.to_quaternion()
    current = rest @ Vector((0, 1, 0))
    target = Vector((.19 if side == 'L' else -.19, 0, -1)).normalized()
    bone.rotation_quaternion = rest.inverted() @ current.rotation_difference(target) @ rest

CLIPS = {'idle': 2.4, 'walk': 1.0, 'run': .64, 'jump': .36,
         'fall': .8, 'land': .3, 'wave': 1.6, 'pickup': 1.1, 'thought': 1.05}
animated = ['spine', 'spine.001', 'spine.002', 'neck', 'head'] + [n+'.'+s for s in ['L','R'] for n in ['upper_arm','forearm','hand','thigh','shin','foot']]
fps = 30
bpy.context.scene.render.fps = fps
rig.animation_data_create()
for name, duration in CLIPS.items():
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    end = round(duration * fps)
    for frame in range(end + 1):
        t = frame / end; phase = t * math.tau
        for bone in rig.pose.bones:
            bone.location = (0,0,0); bone.rotation_quaternion = (1,0,0,0); bone.scale = (1,1,1)
        for side in ['L','R']:
            relax_arm(side)
            rotation('forearm.'+side, (1,0,0), -.12)
            rotation('thigh.'+side,(0,1,0),-.035 if side=='L' else .035)
        rotation('spine.002', (1,0,0), .008 * math.sin(phase))
        rotation('head', (0,0,1), .012 * math.sin(phase))
        if name in ['walk','run']:
            running = name == 'run'; stride = .67 if running else .40
            rotation('spine.001', (1,0,0), .12 if running else .035)
            rotation('spine.002', (0,0,1), math.sin(phase)*.018)
            for side, offset in [('L',0),('R',math.pi)]:
                swing = math.sin(phase + offset)
                rotation('thigh.'+side,(1,0,0),stride*swing)
                rotation('shin.'+side,(1,0,0),max(0,-swing)*(1.0 if running else .55))
                rotation('foot.'+side,(1,0,0),-.15*max(0,-swing))
                rotation('upper_arm.'+side,(1,0,0),-swing*(.6 if running else .32))
                rotation('forearm.'+side,(1,0,0),-.9 if running else -.2)
        elif name in ['jump','fall','thought']:
            lift = math.sin(t*math.pi/2) if name == 'jump' else 1
            for side in ['L','R']:
                rotation('thigh.'+side,(1,0,0),-.42*lift)
                rotation('shin.'+side,(1,0,0),.7*lift)
                rotation('upper_arm.'+side,(0,1,0),(-.55 if side=='L' else .55)*lift)
                rotation('forearm.'+side,(1,0,0),-.35)
            rotation('spine.001',(1,0,0),.12)
        elif name in ['land','pickup']:
            bend = math.sin(math.pi*t) * (.65 if name == 'pickup' else .35)
            rotation('spine.001',(1,0,0),bend)
            for side in ['L','R']:
                rotation('thigh.'+side,(1,0,0),-bend)
                rotation('shin.'+side,(1,0,0),bend*1.7)
            if name == 'pickup': rotation('upper_arm.R',(1,0,0),-bend*.9)
        elif name == 'wave':
            envelope = min(1,t*5,(1-t)*5)
            rotation('upper_arm.R',(0,1,0),2.2*envelope)
            rotation('forearm.R',(1,0,0),-.5*envelope)
            rotation('hand.R',(0,1,0),math.sin(t*math.tau*3)*.35*envelope)
            rotation('head',(0,0,1),-.09*envelope)
        for bone_name in animated:
            bone = rig.pose.bones.get(bone_name)
            if bone: bone.keyframe_insert('rotation_quaternion',frame=frame+1,group=bone_name)
    action.use_fake_user = True
    track = rig.animation_data.nla_tracks.new(); track.name = name
    strip = track.strips.new(name,1,action)
    strip.action_frame_start = 1; strip.action_frame_end = end+1
    track.mute = True
rig.animation_data.action = bpy.data.actions['idle']
bpy.context.scene.frame_set(1)
# Packed images are lazy-loaded by the glTF importer: has_data=False does NOT
# mean missing. Touch pixels before deciding whether an image is unavailable.
for image in bpy.data.images:
    if image.packed_file:
        _ = image.pixels[:4]
for material in bpy.data.materials:
    if not material.use_nodes: continue
    for node in list(material.node_tree.nodes):
        if node.type == 'TEX_IMAGE' and node.image:
            image = node.image
            if not image.size[0] and not image.packed_file:
                material.node_tree.nodes.remove(node)
# The source body base-color export points at a mask rather than skin albedo.
# Use the owner's requested skin tone; preserve the source face/teeth images.
skin = bpy.data.materials.get('.Human')
if skin:
    skin.node_tree.nodes.clear()
    bsdf=skin.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value=(.62,.355,.235,1)
    bsdf.inputs['Roughness'].default_value=.64
    bsdf.inputs['Subsurface Weight'].default_value=.08
    output=skin.node_tree.nodes.new('ShaderNodeOutputMaterial')
    skin.node_tree.links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
brain = next(m for m in bpy.data.materials if 'Brain Meat' in m.name)
bsdf=next(n for n in brain.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
brain_image=bpy.data.images.load(str(OUT/'brain-baked.png'),check_existing=True)
brain_image.pack()
texture=brain.node_tree.nodes.new('ShaderNodeTexImage');texture.image=brain_image
brain.node_tree.links.new(texture.outputs['Color'],bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value=.38
bsdf.inputs['Specular IOR Level'].default_value=.35
(OUT/'actions').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'actions'/'mou-actions.blend'))
props=bpy.ops.export_scene.gltf.get_rna_type().properties
options={'filepath':str(OUT/'mou-actions.glb'),'export_format':'GLB','export_animations':True,'export_skins':True}
if 'export_animation_mode' in props: options['export_animation_mode']='ACTIONS'
if 'export_all_armature_actions' in props: options['export_all_armature_actions']=True
bpy.ops.export_scene.gltf(**options)
print('MOU_ACTIONS_COMPLETE', json.dumps(CLIPS))
