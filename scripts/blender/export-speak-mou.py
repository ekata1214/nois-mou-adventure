#!/usr/bin/env python3
"""Blender headless: speak-mou.blend → speak_mou.glb（HumGen 向けクリーン export）"""
import json
import os
import re
import sys

import bpy

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


def settle_scene():
    """HumGen が blend 読み込み後に体型を反映するまで待つ。"""
    scene = bpy.context.scene
    for _ in range(3):
        scene.frame_set(scene.frame_current)
        bpy.context.view_layer.update()
    try:
        bpy.context.evaluated_depsgraph_get().update()
    except Exception:
        pass


def try_bake_humgen_live_keys(armature):
    """HumGen Live Keys（数値いじり）をメッシュに焼く。失敗しても export は続行。"""
    try:
        from HumGen3D import Human
        from HumGen3D.human.process.apply_modifiers import apply_modifiers, refresh_modapply
    except ImportError:
        print("[warn] HumGen3D API なし — Blender で Pre-bake が必要かも")
        return False

    human = Human.from_existing(armature, strict_check=False)
    if not human:
        print("[warn] HumGen human が見つかりません")
        return False

    context = bpy.context
    rig = human.objects.rig
    context.view_layer.objects.active = rig
    rig.select_set(True)

    try:
        refresh_modapply(None, context)
        col = context.scene.modapply_col
        for item in col:
            if item.mod_type == "ARMATURE":
                item.enabled = False
            elif item.mod_type in {"PARTICLE_SYSTEM", "DECIMATE"}:
                item.enabled = False
            else:
                item.enabled = True
        apply_modifiers(human, context=context)
        print("[info] HumGen Live Keys baked via apply_modifiers")
        return True
    except Exception as err:
        print(f"[warn] HumGen apply_modifiers failed: {err}")
        return False
    finally:
        rig.select_set(False)


def log_shape_keys(obj):
    if obj.type != "MESH" or not obj.data.shape_keys:
        return
    active = [(kb.name, round(kb.value, 4)) for kb in obj.data.shape_keys.key_blocks if abs(kb.value) > 1e-5]
    if active:
        preview = ", ".join(f"{n}={v}" for n, v in active[:8])
        extra = f" (+{len(active) - 8} more)" if len(active) > 8 else ""
        print(f"[info] shape keys kept on {obj.name}: {preview}{extra}")
    else:
        print(f"[info] shape keys on {obj.name}: all at 0 (base mesh — HumGen default?)")


def bake_viewport_mesh(obj):
    """Viewport の見た目（HumGen シェイプキー・モディファイア）をメッシュ頂点に焼き付ける。"""
    if obj.type != "MESH":
        return
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
    print(f"[info] baked viewport mesh: {obj.name} ({len(baked.vertices)} verts)")


def apply_non_armature_modifiers(obj):
    """Armature 以外のモディファイアを適用（HumGen 等）。"""
    if obj.type != "MESH":
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        if mod.type == "ARMATURE":
            continue
        if mod.type == "PARTICLE_SYSTEM":
            try:
                obj.modifiers.remove(mod)
            except Exception:
                pass
            continue
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
            print(f"[info] applied modifier {mod.name} on {obj.name}")
        except Exception as err:
            print(f"[warn] could not apply {mod.name} on {obj.name}: {err}")
    obj.select_set(False)


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
        if re.search(r"brain", obj.name, re.I):
            print(f"[info] skip mesh (no GLB export): {obj.name}")
            continue
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object == armature:
                meshes.append(obj)
                break
    if meshes:
        return meshes
    return [obj for obj in bpy.data.objects if obj.type == "MESH" and not re.search(r"brain", obj.name, re.I)]


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


def gltf_export_kwargs(**kwargs):
    """Blender バージョン差を吸収（4.4 で rename された引数など）。"""
    aliases = {
        "export_anim_single_armature_action": "export_anim_single_armature",
    }
    normalized = {}
    for key, value in kwargs.items():
        normalized[aliases.get(key, key)] = value

    try:
        valid = {prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties}
    except Exception:
        valid = set(normalized.keys())

    filtered = {k: v for k, v in normalized.items() if k in valid}
    skipped = sorted(set(normalized) - set(filtered))
    if skipped:
        print(f"[info] skip unsupported glTF export opts: {', '.join(skipped)}")
    return filtered


def export_glb(opts):
    os.makedirs(MUU_DIR, exist_ok=True)
    export_morph = bool(opts.get("export_morph", False))
    kwargs = gltf_export_kwargs(
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
        export_anim_single_armature=bool(opts.get("single_action", True)),
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
    bpy.ops.export_scene.gltf(**kwargs)
    print(f"[ok] exported -> {OUT_GLB}")


def prepare_mesh_for_export(mesh, opts):
    """HumGen のカスタム体型を維持したまま export 用に整える。"""
    log_shape_keys(mesh)
    if opts.get("apply_modifiers", True):
        apply_non_armature_modifiers(mesh)
    if opts.get("bake_viewport", True):
        bake_viewport_mesh(mesh)
    normalize_mesh_weights(mesh, limit=int(opts.get("weight_limit", 4)))


def main():
    opts = load_export_opts()
    blend_path = find_blend()
    if not blend_path:
        print("[error] assets/muu/ に .blend がありません", file=sys.stderr)
        sys.exit(2)

    print(f"[info] open {blend_path}")
    bpy.ops.wm.open_mainfile(filepath=blend_path)
    settle_scene()

    armature = find_armature()
    if not armature:
        print("[error] armature not found", file=sys.stderr)
        sys.exit(3)

    if opts.get("humgen_bake", True):
        baked = try_bake_humgen_live_keys(armature)
        if not baked:
            print(
                "[warn] HumGen 体型が export に乗らない場合 → Blender で Pre-bake してから再実行:"
            )
            print("       HumGen パネル → Process → Apply Modifiers（Armature 以外）→ Save")
        settle_scene()

    meshes = meshes_for_armature(armature)
    print(f"[info] armature={armature.name} meshes={[m.name for m in meshes]}")

    for mesh in meshes:
        prepare_mesh_for_export(mesh, opts)

    clamp_materials()
    rename_active_action(armature, opts.get("animation_name", "speak_mou"))
    select_export_set(armature, meshes)
    export_glb(opts)


if __name__ == "__main__":
    main()
