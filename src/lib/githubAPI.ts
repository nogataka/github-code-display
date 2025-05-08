// GitHubからリポジトリの内容を取得するための関数

/**
 * リポジトリのデフォルトブランチを取得する
 * @param owner オーナー（ユーザー名または組織名）
 * @param repo リポジトリ名
 * @param token トークン（オプション）
 * @returns デフォルトブランチ名
 */
export async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      ...(token ? { 'Authorization': `token ${token}` } : {})
    };

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );
    
    if (!response.ok) {
      console.error(`GitHub API error: ${response.statusText}`);
      return 'main'; // デフォルトでmainを使用
    }
    
    const data = await response.json();
    console.log(`Default branch for ${owner}/${repo} is ${data.default_branch}`);
    return data.default_branch;
  } catch (error) {
    console.error('Error fetching default branch:', error);
    return 'main'; // エラー時もデフォルトでmainを使用
  }
}

/**
 * GitHubリポジトリの内容を再帰的に取得する
 * @param owner オーナー（ユーザー名または組織名）
 * @param repo リポジトリ名
 * @param token トークン（オプション）
 * @param branch ブランチ名（オプション、指定がなければデフォルトブランチ）
 * @param path パス（空文字でリポジトリのルート）
 * @param depth 再帰の深さ（無限ループを防ぐため）
 * @param maxDepth 最大再帰深度
 * @returns ファイルパスとダウンロードURLのマップ
 */
export async function fetchRepositoryContents(
  owner: string,
  repo: string,
  token?: string,
  branch?: string,
  path: string = '',
  depth: number = 0,
  maxDepth: number = 3, // 最大再帰深度
  fileMap: Map<string, string | null> = new Map()
): Promise<Map<string, string | null>> {
  // 深すぎる再帰を防止
  if (depth > maxDepth) {
    return fileMap;
  }

  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      ...(token ? { 'Authorization': `token ${token}` } : {})
    };

    let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    if (branch) {
      url += `?ref=${branch}`;
    }

    console.log(`Fetching contents from: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 単一ファイルの場合
    if (!Array.isArray(data)) {
      fileMap.set(data.path, data.download_url);
      return fileMap;
    }
    
    // ディレクトリの場合は各アイテムを処理
    for (const item of data) {
      if (shouldIgnoreFile(item.name)) {
        continue;
      }
      
      if (item.type === 'file') {
        fileMap.set(item.path, item.download_url);
      } else if (item.type === 'dir' && depth < maxDepth) {
        // ディレクトリの場合は再帰的に取得
        fileMap.set(item.path, null); // ディレクトリはnullをセット
        await fetchRepositoryContents(owner, repo, token, branch, item.path, depth + 1, maxDepth, fileMap);
      }
    }
    
    return fileMap;
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    throw error;
  }
}

/**
 * ファイルの内容を取得する
 * @param url ファイルのダウンロードURL
 * @param token トークン（オプション）
 * @returns ファイルの内容
 */
export async function fetchFileContent(url: string, token?: string): Promise<string> {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      ...(token ? { 'Authorization': `token ${token}` } : {})
    };
    
    console.log(`Fetching file from: ${url}`);
    console.log(`Using token: ${token ? "Yes (token provided)" : "No"}`);
    
    // GitHubのURLからAPIエンドポイントを構築
    let apiUrl = url;
    
    // raw.githubusercontent.comからのURLをAPIエンドポイントに変換
    if (url.includes('raw.githubusercontent.com')) {
      // https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path} の形式から
      // https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch} に変換
      const parts = url.replace('https://raw.githubusercontent.com/', '').split('/');
      const owner = parts[0];
      const repo = parts[1];
      const branch = parts[2];
      const path = parts.slice(3).join('/');
      
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      console.log(`Converted URL to API endpoint: ${apiUrl}`);
    }
    
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      const errorDetail = await response.text().catch(() => "詳細情報を取得できませんでした");
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText} - ${errorDetail}`);
    }
    
    // レスポンスがJSONの場合（APIエンドポイントを使用した場合）
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      // base64デコード
      if (data.content && data.encoding === 'base64') {
        return atob(data.content.replace(/\n/g, ''));
      }
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw error;
  }
}

/**
 * 無視すべきファイルかどうかを判定する
 * @param filename ファイル名
 * @returns true: 無視する, false: 無視しない
 */
function shouldIgnoreFile(filename: string): boolean {
  const ignorePatterns = [
    '.git',
    'node_modules',
    '.DS_Store',
    '.env',
    '.vscode',
    '.idea',
    '.next',
    'build',
    'dist',
    'out'
  ];
  
  return ignorePatterns.some(pattern => filename.includes(pattern));
}

/**
 * バイナリファイルかどうかを判定する
 * @param filename ファイル名
 * @returns true: バイナリファイル, false: テキストファイル
 */
export function isBinaryFile(filename: string): boolean {
  const binaryExtensions = [
    '.ico', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
    '.svg', '.pdf', '.zip', '.tar', '.gz', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.jar', '.war', '.ear',
    '.mp3', '.mp4', '.avi', '.mov', '.mkv',
    '.ttf', '.otf', '.woff', '.woff2',
    '.pyc', '.pyo', '.class',
    '.bin', '.dat', '.db', '.sqlite'
  ];
  
  return binaryExtensions.some(ext => 
    filename.toLowerCase().endsWith(ext)
  );
}

/**
 * ファイルの階層構造を整理する
 * @param fileMap ファイルパスとダウンロードURLのマップ
 * @returns ファイル階層構造のオブジェクト
 */
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  url: string | null;
  children: Map<string, FileNode>;
}

export function organizeFileStructure(fileMap: Map<string, string | null>): FileNode {
  const root: FileNode = {
    name: '',
    path: '',
    isDirectory: true,
    url: null,
    children: new Map()
  };

  // ファイルパスでソート
  const sortedEntries = Array.from(fileMap.entries()).sort((a, b) => {
    return a[0].localeCompare(b[0]);
  });

  for (const [path, url] of sortedEntries) {
    const isDirectory = url === null;
    const pathParts = path.split('/');
    
    let currentNode = root;
    let currentPath = '';
    
    // ディレクトリ階層を構築
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      // 最後の部分ならファイル、そうでなければディレクトリ
      const isLastPart = i === pathParts.length - 1;
      const isCurrentDirectory = !isLastPart || isDirectory;
      
      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          path: currentPath,
          isDirectory: isCurrentDirectory,
          url: isLastPart ? url : null,
          children: new Map()
        });
      }
      
      currentNode = currentNode.children.get(part)!;
    }
  }
  
  return root;
}

/**
 * インデントされたファイルリストを生成する
 * @param node ファイル階層構造のルートノード
 * @param level インデントレベル
 * @returns インデントされたファイルリスト文字列
 */
export function generateIndentedFileList(node: FileNode, level: number = 0): string {
  if (level === 0) {
    // ルートノードの場合は子ノードのみを処理
    const sortedChildren = Array.from(node.children.values())
      .sort((a, b) => {
        // ディレクトリが先、ファイルは後
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        // 同じタイプならアルファベット順
        return a.name.localeCompare(b.name);
      });
    
    return sortedChildren
      .map(child => generateIndentedFileList(child, level + 1))
      .join('');
  }
  
  const indent = level > 1 ? '    '.repeat(level - 1) : '';
  let result = '';
  
  if (node.isDirectory) {
    // ディレクトリの場合
    result += `${indent}├── ${node.name}/\n`;
    
    // 子ノードを処理
    const sortedChildren = Array.from(node.children.values())
      .sort((a, b) => {
        // ディレクトリが先、ファイルは後
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        // 同じタイプならアルファベット順
        return a.name.localeCompare(b.name);
      });
    
    if (sortedChildren.length > 0) {
      result += sortedChildren
        .map(child => generateIndentedFileList(child, level + 1))
        .join('');
    }
  } else {
    // ファイルの場合
    result += `${indent}├── ${node.name}\n`;
  }
  
  return result;
}