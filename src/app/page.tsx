'use client';

import { useState, useEffect } from 'react';
import { fetchRepositoryContents, fetchFileContent, organizeFileStructure, generateIndentedFileList, isBinaryFile, getDefaultBranch } from '@/lib/githubAPI';
import CopyButton from '@/components/CopyButton';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSimpleView, setIsSimpleView] = useState(false);

  // URLからGETパラメーターを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      setRepoUrl(urlParam);
      setIsSimpleView(true);
      // 自動的に解析を実行
      handleFetchRepository(urlParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchRepository(repoUrl);
  };

  const handleFetchRepository = async (url: string) => {
    setIsLoading(true);
    setError('');
    setOutputText('');
    
    try {
      // GitHubのURLをパースして、ユーザー名とリポジトリ名を取得
      const parsedUrl = new URL(url);
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length < 2 || !parsedUrl.hostname.includes('github.com')) {
        throw new Error('有効なGitHubリポジトリのURLを入力してください。');
      }
      
      const owner = pathSegments[0];
      const repo = pathSegments[1];

      // 環境変数からトークンを取得
      const githubToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
      
      // デフォルトブランチを取得
      const defaultBranch = await getDefaultBranch(owner, repo, githubToken);
      console.log(`Using branch: ${defaultBranch}`);
      
      // リポジトリの内容を再帰的に取得して処理
      const rootContents = await fetchRepositoryContents(owner, repo, githubToken, defaultBranch);
      if (!rootContents) {
        throw new Error('リポジトリの内容を取得できませんでした。');
      }
      
      // ファイル構造を階層的に整理してインデントされたテキストを生成
      const fileStructure = organizeFileStructure(rootContents);
      const fileListText = generateIndentedFileList(fileStructure);
      
      // ファイル内容テキストを生成
      let fileContentsText = '';
      for (const [path, url] of rootContents.entries()) {
        if (url && !isBinaryFile(path)) {
          try {
            const content = await fetchFileContent(url, githubToken);
            fileContentsText += `\n--------------------------------------------------------------------------------\n`;
            fileContentsText += `/${path}:\n`;
            fileContentsText += `--------------------------------------------------------------------------------\n`;
            
            // 行番号付きでコンテンツを表示
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              const lineNumber = index + 1;
              // 行番号を3桁で右寄せ
              const paddedLineNumber = lineNumber.toString().padStart(3, ' ');
              fileContentsText += `${paddedLineNumber} | ${line}\n`;
            });
            fileContentsText += '\n';
          } catch (err) {
            console.error(`ファイル ${path} の内容取得に失敗しました:`, err);
            // エラーの詳細情報を表示する
            fileContentsText += `\n--------------------------------------------------------------------------------\n`;
            fileContentsText += `/${path}:\n`;
            fileContentsText += `--------------------------------------------------------------------------------\n`;
            fileContentsText += `エラー: ${(err as any).message || 'Unknown error'}\n`;
            fileContentsText += `URL: ${url}\n`;
            fileContentsText += `Token使用: ${githubToken ? 'あり' : 'なし'}\n\n`;
          }
        } else if (url && isBinaryFile(path)) {
          // バイナリファイルの場合は内容を表示せず、ファイル名だけ表示
          fileContentsText += `\n--------------------------------------------------------------------------------\n`;
          fileContentsText += `/${path}:\n`;
          fileContentsText += `--------------------------------------------------------------------------------\n`;
          fileContentsText += `バイナリファイルのため表示をスキップします。\n\n`;
        }
      }
      
      // 最終的なテキストを設定
      setOutputText(fileListText + fileContentsText);
      
    } catch (err: any) {
      setError(err.message || '処理中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // シンプルビューの場合は装飾なし
  if (isSimpleView) {
    return (
      <main style={{ backgroundColor: 'white', margin: 0, padding: 0 }}>
        {isLoading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        {outputText && <pre style={{ 
          whiteSpace: 'pre', 
          fontFamily: 'monospace', 
          margin: 0, 
          paddingLeft: '20px',
          paddingTop: '10px'
        }}>{outputText}</pre>}
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">GitHub コード表示ツール</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="GitHubリポジトリのURLを入力してください（例: https://github.com/username/repo）"
            className="flex-grow p-2 border rounded"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
          disabled={isLoading || !repoUrl.trim()}
        >
          {isLoading ? '処理中...' : '解析'}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {outputText && (
        <div className="mt-8">
          <div className="bg-white p-4 rounded-md border border-gray-200 relative">
            <CopyButton text={outputText} />
            <pre id="textToCopy" className="overflow-auto whitespace-pre text-sm pr-16">
              {outputText}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}