"""Derive a small browser room; never modify the authored source GLB."""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / 'assets/room/this ver2.glb'))
# Retain the authored walls, floor, ceiling, lights and furniture.
for image in bpy.data.images:
    if image.size[0] > 1024 or image.size[1] > 1024:
        scale = 1024 / max(image.size)
        image.scale(max(1, int(image.size[0] * scale)), max(1, int(image.size[1] * scale)))
        image.pack()
for obj in bpy.data.objects:
    if obj.type != 'MESH' or len(obj.data.polygons) < 18000:
        continue
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Browser simplification', 'DECIMATE')
    budget = 220000 if obj.name == "room.002" else 26000
    modifier.ratio = min(1, budget / len(obj.data.polygons))
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    print('SIMPLIFIED', obj.name, len(obj.data.polygons), flush=True)
bpy.ops.export_scene.gltf(filepath=str(root / 'assets/room/shell-lite.glb'), export_format='GLB', export_image_format='AUTO', export_animations=False, export_apply=True)
print('OUTPUT', (root / 'assets/room/shell-lite.glb').stat().st_size, flush=True)
