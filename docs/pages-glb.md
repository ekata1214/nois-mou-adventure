# GitHub Pages と GLB（LFS）について

## なぜ「未アップロード」エラーが出るか

**GitHub Pages は Git LFS を展開しない。**

`main` ブランチをそのまま公開すると、GLB は 153MB の実体ではなく **134 バイトの LFS ポインタ**（`version https://git-lfs...`）が配信され、部屋もムー君も読めません。

| 状況 | 結果 |
|------|------|
| Pages の公開元 = **GitHub Actions**（昨日うまくいってた状態） | 実 GLB が配信される → 動く |
| Pages の公開元 = **main ブランチ**（今の壊れた状態） | ポインタだけ配信 → 壊れる |
| `git pull` だけ（ローカルで `git lfs pull` なし） | ローカルも壊れる |

## 直し方（1回だけ設定）

### 1. GitHub の設定を変える（必須）

1. https://github.com/ekata1214/nois-mou-adventure/settings/pages
2. **Build and deployment** → **Source** を **GitHub Actions** に変更
3. Actions タブで **Deploy GitHub Pages** が緑（成功）になるまで待つ（2〜3 分）
4. https://ekata1214.github.io/nois-mou-adventure/ を **Cmd+Shift+R** で強制リロード

> `main` ブランチ公開のままでは 100MB 超の GLB は絶対に動きません（LFS 非対応のため）。

### 2. ローカル（Mac）で動かすとき

```bash
brew install git-lfs   # 未導入なら
git lfs install
git lfs pull
./setup-and-run.sh
```

`assets/room/this ver2.glb` が **約 147MB** なら OK。**134 バイト** ならまだポインタ。

## GLB を新しく上げるとき（Mac）

```bash
./scripts/upload-for-pages.sh
```

push 後、上記の **GitHub Actions** デプロイが走れば Pages に反映されます。
