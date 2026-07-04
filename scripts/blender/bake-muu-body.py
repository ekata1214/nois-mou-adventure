#!/usr/bin/env python3
"""HumGen Apply Modifiers が ARP 後に落ちるとき、viewport 体型をメッシュに焼く。

Blender 内: Scripting → Open → Run
ターミナル:
  BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender" \\
    "$BLENDER_BIN" assets/muu/speak-mou.blend --python scripts/blender/bake-muu-body.py
"""
import re
import bpy


def find_body_mesh():
    patterns = [r"speak[-_]?mou", r"female_body", r"hg_body", r"body"]
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if re.search(r"brain|eye|teeth|tongue", obj.name, re.I):
            continue
        if any(re.search(p, obj.name, re.I) for p in patterns):
            return obj
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if re.search(r"brain|eye|teeth|tongue", obj.name, re.I):
            continue
        for mod in obj.modifiers:
            if mod.type == "ARMATURE":
                return obj
    return None


def log_shape_keys(obj):
    if not obj.data.shape_keys:
        print(f"[info] {obj.name}: shape keys なし")
        return
    active = [(kb.name, round(kb.value, 4)) for kb in obj.data.shape_keys.key_blocks if abs(kb.value) > 1e-5]
    if active:
        preview = ", ".join(f"{n}={v}" for n, v in active[:6])
        print(f"[info] {obj.name}: active shape keys: {preview}")
    else:
        print(f"[warn] {obj.name}: shape keys は全部 0 — viewport と違うなら Live Keys が driver 経由の可能性")


def rest_pose(armature):
    if not armature:
        return
    scene = bpy.context.scene
    scene.frame_set(scene.frame_start)
    for pb in armature.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()


def bake_viewport_mesh(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    obj_eval = obj.evaluated_get(depsgraph)
    baked = bpy.data.meshes.new_from_object(
        obj_eval,
        preserve_all_data_layers=True,
        depsgraph=depsgraph,
    )
    old = obj.data
    obj.data = baked
    if old.users <= 1:
        bpy.data.meshes.remove(old, do_unlink=True)
    print(f"[ok] baked viewport mesh: {obj.name} ({len(baked.vertices)} verts)")


def main():
    body = find_body_mesh()
    if not body:
        print("[error] body mesh not found")
        return

    armature = None
    for mod in body.modifiers:
        if mod.type == "ARMATURE" and mod.object:
            armature = mod.object
            break

    print(f"[info] target mesh: {body.name}")
    log_shape_keys(body)
    rest_pose(armature)

    for mod in body.modifiers:
        if mod.type == "PARTICLE_SYSTEM":
            mod.show_viewport = False
            mod.show_render = False

    bake_viewport_mesh(body)
    print("[next] 1) viewport で体型確認  2) Ctrl+S  3) GLB export (NLA Tracks) → speak-mou6.glb")


if __name__ == "__main__":
    main()
