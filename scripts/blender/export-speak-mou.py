#!/usr/bin/env python3
"""Blender headless: speak-mou.blend → speak_mou.glb（HumGen 向けクリーン export）"""
import json
import os
import re
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MUU_DIR = os.path.join(ROOT, "assets", "muu")
OUT_GLB = os.path.join(MUU_DIR, "speak_mou.glb")
EXPORT_OPTS_PATH = os.path.join(MUU_DIR, ".export-options.json")

BLEND_CANDIDATES = [
    "speak-mou.blend",
    "speak_mou.blend",
    "speak-mouのコピー.blend",
    "mu kun base2のコピー6.blend",
]


def find_blend():
    for name in BLEND_CANDIDATES:
        path = os.path.join(MUU_DIR, name)
        if os.path.isfile(path):
            return path
    for name in os.listdir(MUU_DIR):
        if name.lower().endswith(".blend"):
            return os.path.join(MUU_DIR, name)
    return None


def load_export_opts():
    if not os.path.isfile(EXPORT_OPTS_PATH):
        return {}
    with open(EXPORT_OPTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def reset_shape_keys(obj):
    if obj.type != "MESH" or not obj.data.shape_keys:
        return
    for block in obj.data.shape_keys.key_blocks:
        block.value = 0.0


def clamp_materials():
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            rough = node.inputs.get("Roughness")
            if rough and rough.default_value > 1.0:
                rough.default_value = 1.0


def normalize_mesh_weights(obj, limit=4):
    if obj.type != "MESH":
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        if mod.type == "PARTICLE_SYSTEM":
            mod.show_viewport = False
            mod.show_render = False
    if obj.vertex_groups:
        try:
            bpy.ops.object.vertex_group_limit_total(limit=limit)
            bpy.ops.object.vertex_group_normalize_all()
        except Exception as err:
            print(f"[warn] weight normalize failed for {obj.name}: {err}")
    obj.select_set(False)


def find_armature():
    patterns = [r"speak[-_]?mou", r"hg_armature", r"armature"]
    for obj in bpy.data.objects:
        if obj.type != "ARMATURE":
            continue
        name = obj.name.lower()
        if any(re.search(p, name) for p in patterns):
            return obj
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            return obj
    return None


def meshes_for_armature(armature):
    meshes = []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object == armature:
                meshes.append(obj)
                break
    if meshes:
        return meshes
    return [obj for obj in bpy.data.objects if obj.type == "MESH"]


def rename_active_action(armature, target_name="speak_mou"):
    if not armature or not armature.animation_data:
        return
    action = armature.animation_data.action
    if action:
        action.name = target_name
    for track in armature.animation_data.nla_tracks:
        for strip in track.strips:
            if strip.action:
                strip.action.name = target_name
            strip.name = target_name


def select_export_set(armature, meshes):
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    for mesh in meshes:
        mesh.select_set(True)


def export_glb(opts):
    os.makedirs(MUU_DIR, exist_ok=True)
    export_morph = bool(opts.get("export_morph", False))
    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_animations=True,
        export_nla_strips=bool(opts.get("export_nla_strips", True)),
        export_def_bones=True,
        export_optimize_animation_size=False,
        export_anim_slide_to_zero=False,
        export_bake_animation=True,
        export_anim_single_armature_action=bool(opts.get("single_action", True)),
        export_reset_pose_bones=True,
        export_skins=True,
        export_morph=export_morph,
        export_morph_normal=export_morph,
        export_morph_tangent=False,
        export_colors=False,
        export_cameras=False,
        export_lights=False,
        export_image_format="AUTO",
    )
    print(f"[ok] exported -> {OUT_GLB}")


def main():
    opts = load_export_opts()
    blend_path = find_blend()
    if not blend_path:
        print("[error] assets/muu/ に .blend がありません", file=sys.stderr)
        sys.exit(2)

    print(f"[info] open {blend_path}")
    bpy.ops.wm.open_mainfile(filepath=blend_path)

    armature = find_armature()
    if not armature:
        print("[error] armature not found", file=sys.stderr)
        sys.exit(3)

    meshes = meshes_for_armature(armature)
    print(f"[info] armature={armature.name} meshes={[m.name for m in meshes]}")

    for mesh in meshes:
        reset_shape_keys(mesh)
        normalize_mesh_weights(mesh, limit=int(opts.get("weight_limit", 4)))

    clamp_materials()
    rename_active_action(armature, opts.get("animation_name", "speak_mou"))
    select_export_set(armature, meshes)
    export_glb(opts)


if __name__ == "__main__":
    main()
