ムー君 speak_mou — GLB 自動生成
========================

## やること（1回だけ）

1. `speak-mou.blend` をこのフォルダに置く:
   ```
   assets/muu/speak-mou.blend
   ```

2. ターミナルで:
   ```bash
   cd "/Users/takaearasaki/Desktop/MY GAMES/nois-mou-adventure"
   git add assets/muu/speak-mou.blend
   git commit -m "Add speak-mou blend"
   git push
   ```
   ※ ファイルが大きい場合は GitHub Desktop か `git lfs` を使用

3. 生成:
   ```bash
   ./scripts/export-speak-mou.sh
   ```
   または
   ```bash
   ./setup-and-run.sh
   ```

## 何が起きるか

- Blender がバックグラウンドで export
- ウェイト正規化・モーフ削除・マテリアル修正
- glTF Validator で検証
- 失敗したら **3パターン自動リトライ**
- 成功すると `assets/muu/speak_mou.glb` ができる

## Mac で Blender のパス

```bash
BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender" ./scripts/export-speak-mou.sh
```
