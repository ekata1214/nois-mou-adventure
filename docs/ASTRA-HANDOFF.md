# アストラ引き継ぎ書 — UNGR ARCHIVE / ムー君の冒険

> 作成目的: 制作をアストラに引き継ぐための**思想・構想・技術・運用・優先順位**の一本化。  
> リポジトリ: `ekata1214/nois-mou-adventure`  
> 本ドキュメント更新時点の `main`: ホーム先行入口・ポケモン風RPG・十字キー修正・バグ掃討まで反映済み。

---

## 0. まず開くもの

| 用途 | URL |
|------|-----|
| **ユーザー向け入口（ホーム）** | https://ekata1214.github.io/nois-mou-adventure/ |
| ゲーム本体 | https://ekata1214.github.io/nois-mou-adventure/game.html |
| 共有用（QR等） | https://ekata1214.github.io/nois-mou-adventure/mobile.html |
| GitHub | https://github.com/ekata1214/nois-mou-adventure |

**ルール:** 人に渡すリンク・毎回の確認リンクは、原則**ホーム**を出す。ゲーム直リンクは「遊ぶときだけ」。

---

## 1. これは何のプロダクトか

### 一言
**UNGR ARCHIVE（アングラアーカイブ）** という「脳の中の議論をする場」の中に、体験プロトタイプとして **ムー君の冒険（Nois Mou）** が入っている。

- チャンネル / ブランドが本体の顔
- ゲームはフックであり、アーカイブの一部
- 「弱いSNS」や「機能フルアプリ」を目指していない

### ブランドの核（`data/archive.json`）
- 名前: UNGR ARCHIVE / アングラアーカイブ
- ハンドル: `@ungr.archive`
- タグライン: **脳の中の議論をする場**
- ステートメント: 議論が華。なぜ好きか / なぜ嫌いかを議論する
- キーワード: アングラ・批評・表現・倫理・思想
- 役割: 世界観設計 / 映像 / CG / ディレクション

### ムー君の世界観（ゲーム側）
- ムー君は**人間の思考の中でしか生きられない**
- **殻（INTROVERT）** = 内省・言葉・生活・回復
- **NOU（EXTROVERT）** = 外のフィールド・遭遇・採集・緊張
- VOID に触れすぎると存在を保てない（ゲームオーバー文言にも反映）
- 人間メーター / 闇の思念体 / 体力が中核リソース

### 二本柱（絶対に混ぜて壊さない）
1. **NOU** — 移動・遭遇・選択・緊張・祝福と警告
2. **殻ライフ** — ゆっくり・触れる・見せびらかさない温かさ（競争・暴力以外の遊び）

詳細構想: `docs/shell-life.md`

---

## 2. 作者（オーナー）の思想・判断基準

アストラが迷ったら、ここに戻る。

### プロダクト判断
- **意味が薄い機能は足さない。** 作者本人が「これ意味ある？」と感じる瞬間がある。その感覚は正しいセンサー。
- 足すなら核を強化するものだけ:
  - アーカイブとしての「視点の痕跡」
  - ムー君体験の手触り
- **チャット／ユーザー同士の本格コミュニケーションは今はやらない。** 需要はあっても、運用・荒らし・空の広場問題が本体を壊す。外の X / Discord に逃がす想定。
- **感想・批評の軽い置き場**は将来相性が良い（映画・美術の1〜3行など）。ただし「弱いSNS化」は避ける。最初は作者視点＋超短い反応まで。
- ゲームはフック。ブランドをゲームタイトルだけで上書きしない。

### UI / デザイン判断（フロント作業時）
- 既存の UNGR / Netflix風ハブの言語を壊さない（赤 `#e50914`、暗背景、ロゴは **オリジナル** `assets/ungr-avatar.jpg`）
- AI生成の脳マーク等は採用済みで却下済み。**オリジナルアバター以外のマークを勝手に足さない**
- ハブの第一画面は「アーカイブのホーム」。ゲームは明示PLAYで入る
- ゲーム画面は携帯の強制横画面（`force-landscape`）を前提に検証する
- 過剰なカードUI・紫グラデ・クリーム＋テラコッタ定番AI見た目は避ける（既存ルールがある場合はそれに従う）

### 開発スタイル
- 小さく直して `main` に載せて Pages で確認
- キャッシュバスト `?v=日付+タグ` を忘れない（特に携帯）
- LFS必須アセット（部屋・ムーGLB）を壊さない。Pagesは Actions 経由（`docs/pages-glb.md`）
- 推測で世界観を薄めない。不明なら「試作」「未実装」と明示

---

## 3. 現在の体験フロー（ユーザー視点）

1. ホーム（`index.html`）を開く → UNGR ARCHIVE ハブ
2. 「ムー君を遊ぶ / PLAY / 冒険」で `game.html`
3. タイトル「スタート」→ NOU フィールド
4. 十字キーで移動（携帯は**十字のみ**。キャンバスタップ移動は無効）
5. 気配に触れる → 遭遇
   - 喜・楽エリア → **RPG**（初期ポケモン風UI）
   - 怒・哀エリア → **ACTION**（リアルタイム）
6. Tab / 「殻へ戻る」→ 殻（3D部屋・質問100字・クラフト）
7. 左端スワイプ / ホームボタン → アーカイブホームへ（ブラウザ戻るに依存しない）

章進行（`js/story.js`）:
0 殻で100字 → 1 遭遇3回 → 2 採集5 → 3 クラフト1 → 4 使う1回 → 5 人間60%

---

## 4. リポジトリ地図（アストラが触る場所）

### エントリ
| ファイル | 役割 |
|----------|------|
| `index.html` + `js/app.js` + `css/app.css` | アーカイブハブ |
| `game.html` + `js/main.js` + `css/style.css` | ゲーム |
| `css/game-back.css` | ホーム戻りUI |
| `mobile.html` | 共有・QR（ホーム優先） |
| `data/archive.json` | ブランド・動画・お知らせ |
| `manifest.webmanifest` | PWA（`start_url` = index） |

### ゲーム中核
| 領域 | 主なファイル |
|------|----------------|
| 進行・魂 | `js/soul.js`, `js/story.js` |
| ワールド | `js/world.js`, `js/field-art.js`, `js/props.js` |
| エンティティ / 遭遇 | `js/entities.js`, `js/encounter-transition.js`, `js/battle-field.js` |
| RPG UI | `game.html` `#encounter-screen`, `css/style.css` `.rpg-*` |
| ACTION | `js/combat-action.js`, `js/enemy-patterns.js`, `js/difficulty.js` |
| 殻3D | `js/shell-room.js`, `js/shell-muu-3d.js`, `js/muu-gltf-loader.js`, `js/shell-*.js` |
| 採集クラフト | `js/gatherables.js`, `js/gather-craft.js`, `js/craft-effects.js` |
| 音 | `js/bgm.js`, `js/audio.js` |
| 携帯操作 | `js/mobile-controls.js`, `js/dpad-input.js`, `js/mobile-viewport.js` |
| スワイプ戻る | `js/swipe-back.js` |

### アセット（重要）
- 2Dムー: `assets/muu/{front,back,left,right}.png`
- 3Dムー: `assets/muu/*.glb` + `manifest.json`（希望: `speak-mou5.glb` / `good-mou.glb`）
- 部屋: `assets/room/this ver2.glb` + `manifest.json`
- アイコン: `assets/icons/{hylics,giger}/`
- 景色: `assets/scenery/`
- BGM/VO: `assets/bgm/`, `assets/vo/`
- ブランド: `assets/ungr-avatar.jpg`, `assets/title.png`

**注意:** GLBは Git LFS。ローカルで `git lfs pull` しないとポインタのまま。Pagesは workflow で LFS checkout。

---

## 5. すでに `main` に入っている主な成果（重複作業しない）

| 内容 | メモ |
|------|------|
| ハブ先行入口 | リンクはホーム。ヒーロー全体タップでゲーム直行しない |
| Netflix風ハブ | ホーム / 動画 / 冒険 / 情報 |
| オリジナルロゴ | AI脳マーク不採用 |
| アプリ内ホーム戻り | スワイプ＋ボタン → `index.html` |
| 携帯長押し抑制 | テキスト選択・コールアウト対策 |
| タイトルUI | スタート / ホームに戻る |
| ゲームオーバーループ修正 | 復活HP・遭遇ハードクリア |
| 移動は十字のみ | タップ移動オフ |
| RPGを初期ポケモン風 | 左右斜め立ち・HP・右下コマンド |
| 十字ヒット修正 | **指の下のボタン判定**（回転AABBアナログ廃止） |
| バグ掃討 | 戦闘中誤VOID、逃走二重連敗、難易度二重、BGM無音、ランプ回復、文字数緩和など |

直近キャッシュ例: `?v=20260730dpadbtn`

---

## 6. 既知の注意点・壊れやすいところ

1. **強制横画面 (`force-landscape`)**  
   `#app` を CSS 回転。`vw/vh`・`position:fixed`・safe-area・タッチ座標がズレやすい。UIは `#app` 基準・`%` / container / `--app-w/h` を優先。

2. **十字キー**  
   アナログ中心計算は失敗済み。現状は `elementsFromPoint` でボタン直下。挙動が変なら**見た目ボタンとの一致**を最初に疑う。

3. **戦闘中の座標**  
   バトルフィールド座標をワールドVOID判定に使うとHPが溶ける。`fieldVoidProbe()` / overworld snapshot を維持。

4. **BGMクロスフェード**  
   プレイヤーごとにフェードタイマー。共有1本に戻すと無音バグ再発。

5. **殻GLB欠落**  
   空の `roomRoot` で NaN 配置しない（空ボックスはフォールバック）。

6. **キャッシュ**  
   `game.html` の `main.js?v=` と、`main.js` 内の `mobile-controls.js?v=` 等を揃える。片方だけ古いと「直ってない」に見える。

7. **ハブCSSキャッシュ**  
   `index.html` は `?v=20260729swipe` など。ハブ変更時もバストする。

---

## 7. 殻ライフ構想（未完〜一部実装）

`docs/shell-life.md` が正。要約:

| Phase | 内容 | 状態イメージ |
|-------|------|----------------|
| Life 0 | 殻タップ移動 | 未完寄り |
| Life 1 | メモの壁 | 一部（クラフト memo_wall） |
| Life 2 | 採集＋簡易クラフト | **実装済み寄り**（lamp / pot / memo） |
| Life 3 | 庭 | 未実装 |
| Life 4 | ペット | 未実装 |
| Life 5 | 別荘 | 未実装 |

方針: NOUだけ強くせず、**拠点が育つ**。ゼルダの「本拠が変わる喜び」を、暴力以外でやる。

---

## 8. 次にやると良いこと（優先候補）

アストラは全部やらなくていい。オーナーとすり合わせつつ、上から。

### A. 体験の安定（今すぐ価値）
- 実機（iPhone縦持ち強制横）で十字・遭遇・殻・ホーム戻りを通しプレイ
- 残る操作違和感・レイアウト切れの個別修正
- LFS / Pages で3Dが本番でも出るか確認

### B. 核の強化（意味がある方向）
- 殻ライフ Life 0（タップで寄る）またはメモ壁の手触り向上
- RPG/ACTIONの手触り差をもう少し明確に（今は様式は分かれている）
- 章ヒント・チュートリアルの分かりやすさ

### C. アーカイブ側（慎重に）
- 作者の短い感想／作品メモを置ける最小UI（SNS化しない）
- `archive.json` の更新運用を簡単に

### D. やらない／後回し
- アプリ内チャット・フォロー・タイムライン本格実装
- Store申請前提の大改装（まずWeb/PWA）
- 機能の横展開ラッシュ

---

## 9. 開発・デプロイ手順（最短）

```bash
git lfs pull
# ローカル
./setup-and-run.sh   # or serve.py / start-local.sh → :8765

# 変更後
# ブランチ cursor/<name>-5547 → PR → main マージ
# GitHub Actions「Deploy GitHub Pages」成功を待つ
# ハードリロードで確認
```

- ブランチ名慣例（クラウド作業）: `cursor/<descriptive-name>-5547`
- base: `main`
- ユーザーへの確認リンク: **ホーム** https://ekata1214.github.io/nois-mou-adventure/

テスト補助:
- `node scripts/test-dpad-input.mjs`
- `node scripts/test-bug-sweep.mjs`

---

## 10. セーブデータ

- キー: `localStorage` `nois-mou-soul-v1`（`js/soul.js`）
- 中身: HP、人間、闇、feeds、inventory、crafted、章、勝敗ストリーク等
- 破壊的変更時はキーバージョンかマイグレーションを意識

---

## 11. トーン＆ボイス（文章を足すとき）

- 説教くどくしない。短い。余白がある
- アングラだが中二病コピペにしない
- 殻は優しいが甘くない（「ごまかせない」）
- NOUは選択の重さ（殺す／食べる／無視／友達）
- UIラベルは日本語メイン、ブランド英語の添い（ENCOUNTER 等）は既存踏襲

---

## 12. 連絡・参照

- メール: ungr.archive@gmail.com
- YouTube / TikTok / IG: @ungr.archive
- 既存ドキュメント: `docs/shell-life.md`, `docs/pages-glb.md`
- 本引き継ぎ: `docs/ASTRA-HANDOFF.md`（これ）

---

## 13. アストラへの短い依頼文（コピペ用）

```
UNGR ARCHIVE / ムー君の冒険を引き継いで。
正本は docs/ASTRA-HANDOFF.md と docs/shell-life.md。
入口リンクは常にホーム https://ekata1214.github.io/nois-mou-adventure/
ゲームはフック、アーカイブが顔。機能は増やしすぎない。
殻ライフと NOU の二本柱を壊さない。
強制横画面・十字キー・LFS/Pages キャッシュに注意。
まず実機通しプレイで残バグを見てから、殻ライフか手触り改善へ。
```

---

*このファイルは制作引き継ぎ用。実装の詳細がコードと食い違う場合はコードと `main` の履歴を優先し、この文書を更新すること。*
