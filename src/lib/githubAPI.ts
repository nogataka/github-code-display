// GitHubからリポジトリの内容を取得するための関数

/**
 * GitHubリポジトリの内容を再帰的に取得する
 * @param owner オーナー（ユーザー名または組織名）
 * @param repo リポジトリ名
 * @param path パス（空文字でリポジトリのルート）
 * @param depth 再帰の深さ（無限ループを防ぐため）
 * @returns ファイルパスとダウンロードURLのマップ
 */
export async function fetchRepositoryContents(
  owner: string,
  repo: string,
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
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );
    
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
        await fetchRepositoryContents(owner, repo, item.path, depth + 1, maxDepth, fileMap);
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
 * @returns ファイルの内容
 */
export async function fetchFileContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
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