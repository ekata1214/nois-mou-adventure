#!/usr/bin/env python3
"""⚠️ 作業用コピー専用。本体 speak-mou.blend では実行しないこと。

HumGen Apply Modifiers が ARP 後に落ちる場合、viewport 体型をメッシュ頂点に焼く。
体型のキーフレーム（Shape Keys）を GLB に静的形状として載せたいときだけ使う。

使い方:
  1. speak-mou.blend を speak-mou-export.blend として別名保存
  2. そのコピーに対してのみ実行
  3. 元の speak-mou.blend は開き直さない（アニメ・マテリアル保持用）

ターミナル:
  BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender"
  "$BLENDER_BIN" assets/muu/speak-mou-export.blend --python scripts/blender/bake-muu-body.py
"""
import re
import sys
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
        return 0
    active = [(kb.name, round(kb.value, 4)) for kb in obj.data.shape_keys.key_blocks if abs(kb.value) > 1e-5]
    if active:
        preview = ", ".join(f"{n}={v}" for n, v in active[:6])
        print(f"[info] {obj.name}: active shape keys: {preview}")
    else:
        print(f"[warn] {obj.name}: shape keys は全部 0")
    return len(active)


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
    print("[warn] このスクリプトは speak-mou-export.blend 等のコピー専用です")
    print("[warn] 元ファイルで実行すると Shape Keys アニメ・マテリアルが壊れます")

    body = find_body_mesh()
    if not body:
        print("[error] body mesh not found")
        sys.exit(1)

    print(f"[info] target mesh: {body.name}")
    active_keys = log_shape_keys(body)

    for mod in body.modifiers:
        if mod.type == "PARTICLE_SYSTEM":
            mod.show_viewport = False
            mod.show_render = False

    # 骨ポーズは触らない（ARP リグを壊すため）
    bake_viewport_mesh(body)
    print("[info] 体型キーフレームは GLB には載りません（静的メッシュ化）")
    print("[next] 1) 体型・マテリアル確認  2) Save  3) GLB export (NLA Tracks)")

    if active_keys:
        print("[tip] 体型アニメも GLB に載せたい → 元 blend から Shape Keys ✓ で export（このスクリプトは使わない）")


if __name__ == "__main__":
    main()
