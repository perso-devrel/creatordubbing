# sub2tube

[🇰🇷 한국어](../../README.md) | [🇺🇸 English](./README.en.md) | [🇯🇵 日本語](./README.ja.md) | [🇨🇳 中文](./README.zh.md)

> **クリエイター向け AI 多言語ダビング & YouTube 自動アップロードプラットフォーム。**
> 一本の動画をアップロードするだけで、複数言語への AI ダビング、字幕付きの YouTube 自動アップロード、視聴分析までダッシュボードで一気通貫に確認できます。

[Perso.ai](https://developers.perso.ai) API を基盤として動作します。

## 主な機能

- **AI 多言語ダビング** — 5 ステップのウィザードで動画をアップロードすると、元話者のトーンを保ったまま複数言語へ自動ダビングします。
- **リップシンク** — 翻訳後の音声に合わせて口の動きを調整します（オプション）。
- **スクリプト編集** — 翻訳結果を文単位で修正し、音声を再生成できます。
- **YouTube 自動アップロード** — ダビング済み動画をサーバー経由で YouTube Data API v3 に送信し、字幕（SRT）も同時に公開します。
- **Multi-audio Track 補助** — YouTube のマルチオーディオトラック API が使えない環境でも、言語ごとの動画を体系的に管理できます。
- **クレジットシステム** — 動画の長さ（分）に基づき、ダビング前に事前チェックし、完了時に消費します。
- **ダッシュボード & 分析** — 言語別再生数・高評価、月次クレジット使用量、YouTube Analytics 連携を提供します。

## 技術スタック

| 領域 | 技術 |
| ---- | ---- |
| フレームワーク | Next.js 16.2.3 (App Router) |
| ランタイム | React 19, TypeScript 5 |
| スタイリング | Tailwind CSS v4 |
| 状態管理 | Zustand 5 |
| データ取得 | TanStack React Query v5 |
| バリデーション | Zod v4 |
| データベース | Turso (libSQL) / `@libsql/client` |
| ダビングエンジン | Perso.ai API |
| アップロード / 統計 | YouTube Data API v3 + Analytics API v2 |
| 認証 | Google OAuth 2.0 + 署名付きセッション Cookie |
| テスト | Vitest, Playwright, Lighthouse |

> **注意:** 本プロジェクトは Next.js 16 の破壊的変更を前提としています。コードを修正する前に `node_modules/next/dist/docs/` のガイドを必ず参照してください。

## はじめに

### 前提条件

- Node.js 20 以上
- [Perso.ai](https://developers.perso.ai) API キー
- Turso データベース
- OAuth と YouTube Data API を有効化した Google Cloud プロジェクト

### インストール

```bash
git clone https://github.com/perso-devrel/sub2tube.git
cd sub2tube
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env.local` を作成してください。

```bash
cp .env.example .env.local
```

```env
# Perso.ai
PERSO_API_KEY=
PERSO_API_BASE_URL=https://api.perso.ai
NEXT_PUBLIC_PERSO_FILE_BASE_URL=https://perso.ai

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# セッション Cookie 署名用
SESSION_SECRET=

# Turso DB
TURSO_URL=
TURSO_AUTH_TOKEN=
```

### 開発サーバー

```bash
npm run dev         # http://localhost:3000
```

### テスト & 検証

```bash
npx tsc --noEmit              # 型チェック
npm run lint                  # ESLint
npm run test                  # Vitest (ユニット)
npm run build                 # 本番ビルド
npm run test:e2e              # Playwright E2E
npm run test:lighthouse:gate  # Lighthouse パフォーマンスゲート
```

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # 認証が必要なルート (dashboard, dubbing, batch, billing, youtube, uploads, settings)
│   ├── (marketing)/        # 公開ページ（ランディング等）
│   ├── api/                # Route Handlers
│   │   ├── auth/           # ログイン・セッション・トークン同期
│   │   ├── dashboard/      # mutations（単一エンドポイント）, jobs, summary, credit-usage, language-performance
│   │   ├── perso/          # Perso.ai プロキシ (spaces, upload, project, queue, progress, download …)
│   │   └── youtube/        # upload, caption, stats, analytics, videos
│   └── layout.tsx
├── features/               # ドメイン別機能
│   ├── dubbing/            # 5 ステップウィザード、Zustand ストア、型
│   ├── dashboard/          # チャート・テーブル・サマリーカード
│   ├── landing/            # ランディングセクション
│   ├── auth/               # OAuth UI
│   └── billing/            # クレジット・料金プラン
├── lib/
│   ├── db/                 # libSQL クライアント + queries/{users,jobs,youtube,dashboard}
│   ├── perso/              # persoFetch ラッパー、エラーマッピング、ルートヘルパー
│   ├── youtube/            # アップロード・字幕・統計・分析
│   ├── validators/         # Zod スキーマ（discriminated-union 型 mutation）
│   ├── auth/               # セッション検証
│   └── env.ts              # 環境変数パース
├── stores/                 # Zustand (auth, notification, theme)
├── hooks/                  # React Query フック
├── components/             # 共通 UI・レイアウト・プロバイダ
└── services/               # 外部 API サービスレイヤー
```

## ダビングワークフロー

```
動画入力 → 言語選択 → スクリプト編集 → 処理 → アップロード
```

1. **動画入力** — YouTube URL 貼り付けまたはローカルファイルをアップロード。メタデータを Perso space に登録します。
2. **言語選択** — ソース言語（自動検出）とターゲット言語を複数選択し、リップシンクを切り替えます。
3. **スクリプト編集** — 翻訳された字幕を文単位で修正、または特定区間を除外します。
4. **処理** — Perso API でジョブを作成し、リアルタイムに進捗をポーリングします。
5. **アップロード** — YouTube に自動アップロード（タイトル/説明/タグ/公開設定を編集可能なモーダルを提供）。

## 既知の制約

- YouTube のマルチオーディオトラック API は未対応のため、言語ごとに別動画としてアップロードしています。
- Perso の `progressReason` は UPPERCASE と PascalCase が混在するため、両方を処理する必要があります。

## コントリビューション

1. リポジトリを Fork
2. 機能ブランチを作成 (`git checkout -b feature/awesome`)
3. コミット (`git commit -m 'feat: add awesome'`)
4. Push して Pull Request を作成

Git フロー: `main ← develop ← issue ブランチ`、squash マージ。`main` と `develop` は永続ブランチで削除禁止です。

## セキュリティ

脆弱性情報を **公開 Issue として投稿しないでください。** GitHub Private Vulnerability Reporting をご利用ください。詳細は [.github/SECURITY.md](../../.github/SECURITY.md) を参照してください。

## ライセンス

本リポジトリは **プロプライエタリ**です。すべての権利は著作権者に帰属します。書面による事前許可なく再配布・再利用はできません。

## 謝辞

- [Perso.ai](https://perso.ai) — AI ダビングエンジン
- [Turso](https://turso.tech) — データベース
- [Vercel](https://vercel.com) — デプロイプラットフォーム
- 姉妹プロジェクト [AniVoice](https://github.com/perso-devrel/anivoice) — 同じく Perso ベースのダビングプラットフォーム
