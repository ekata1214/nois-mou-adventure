# GitHub Pages と GLB（LFS）について

## なぜ「未アップロード」エラーが出るか

GitHub Pages は **Git LFS を展開しない**。

`main` ブランチをそのまま公開すると、GLB は 153MB の実体ではなく **134 バイトの LFS ポインタ**（`version https://git-lfs...`）が配信され、部屋もムー君も読めません。

昨日動いて今日動かない典型パターン:

| 状況 | 結果 |
|------|------|
| Actions デプロイで実 GLB が配信されていた | 動く |
| `git pull` だけ（ローカルで `git lfs pull` なし） | ローカルで壊れる |
| Pages の公開元が `main` ブランチに戻った | リンクでも壊れる |

## 直し方（どちらか一度だけ）

### 推奨: GitHub Actions を公開元にする

1. GitHub → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. `Deploy GitHub Pages` ワークフローが成功するのを待つ（2〜3 分）
4. ブラウザで **強制リロード**（Mac: `Cmd+Shift+R`）

### 代替: `gh-pages` ブランチを公開元にする

1. `Deploy gh-pages branch (LFS binaries)` ワークフローが成功するのを待つ
2. Settings → Pages → Source: **Deploy from a branch**
3. Branch: **`gh-pages`** / **`/ (root)`**
4. 強制リロード

## ローカル（Mac）で動かすとき

```bash
git lfs install
git lfs pull
./setup-and-run.sh   # または python -m http.server
```

`assets/room/this ver2.glb` が **約 147MB**、`assets/muu/speak_mou.glb` が **約 55MB** なら OK。  
**134 バイト** ならまだポインタ → `git lfs pull` 不足。

## GLB を新しく上げるとき（Mac）

```bash
brew install git-lfs && git lfs install
./scripts/upload-for-pages.sh
```

push 後、上の Pages 設定どおり Actions または `gh-pages` ブランチで再デプロイされる。
