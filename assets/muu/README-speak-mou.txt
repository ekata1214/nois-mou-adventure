ムー君 speak_mou — GLB 自動生成
========================

## いちばん早い（1コマンド）

**Mac のターミナルでこれだけ:**

```bash
cd "/Users/takaearasaki/Desktop/MY GAMES/nois-mou-adventure"
chmod +x scripts/upload-muu-from-mac.sh
./scripts/upload-muu-from-mac.sh
```

→ GitHub に送る → **CI が有効な speak_mou.glb を自動生成** → `git pull` で取得

※ git-lfs なし → GLB のみ push（55MB OK）
※ speak-mou.blend (166MB) は git-lfs 必須: `brew install git-lfs`

## すでに GLB がある場合（ローカル修復）

Finder に `speak_mou.glb` や `re-speak2.glb` があるなら:

```bash
cd "/Users/takaearasaki/Desktop/MY GAMES/nois-mou-adventure"
git pull
./scripts/repair-speak-mou.sh
./setup-and-run.sh
```

修復内容: ウェイト正規化・骨重複修正・HumGenモーフ削除

## blend から生成する場合

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
