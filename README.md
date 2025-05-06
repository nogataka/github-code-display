# GitHub Code Display Tool

GitHubリポジトリのコードを取得し、テキスト形式で表示するシンプルなWebアプリケーションです。

## 機能

- GitHubリポジトリのURLを入力してコードを表示
- GETパラメーターによるリポジトリの指定 (`?url=https://github.com/user/repo`)
- インデントされたファイル構造表示
- 行番号付きのコード表示

## 使用技術

- Next.js 14
- TypeScript
- Tailwind CSS

## 使用方法

### 標準モード
通常の入力フォームからGitHubリポジトリのURLを入力して表示します。

### シンプルモード
URLパラメーターを使用してリポジトリを指定します：