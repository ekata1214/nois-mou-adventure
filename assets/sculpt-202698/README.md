# 202698 — authored wire sculptures

Source (read only): `/Volumes/Fast yomoya/UAデスクトップ/ムー君の冒険/202698.blend`.
Sphere = rock; Cylinder = stump. The source already contains baked wire geometry and has no materials or active modifiers.

`202698-variants.blend` is the editable local copy containing six full-topology variants with vertex-color materials. It is excluded from Git and deployment. Variant 0 retains the source topology; 1 and 2 use coherent displacement, regional grabs and twists. Geometry is normalized to fit the prototype placement bounds.

Game assets: rock/stump × 0/1/2 × near/far GLB. Near retains dense open topology; far welds nearby vertices before decimation. Color attributes carry grey fossil, soot and muted rust coloring without external textures. `build-report.json` records actual triangle counts. No original source file was overwritten.

Rebuild from project root using Blender with `--factory-startup --disable-autoexec`, source blend, then `--python scripts/blender/build-202698-variants.py`. It saves the full edit copy and invokes `export-202698-lods.py`. Validate using `node scripts/test-authored-scenery.mjs`.

The integration replaces field rocks, shoreline stones and four climbable stumps. Existing gameplay collision/support bounds are retained. Distant ridge silhouettes, puzzle objects and room furniture are outside this replacement.
