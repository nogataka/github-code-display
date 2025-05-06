'use client';

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      // 2秒後に表示をリセット
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  return (
    <button 
      onClick={handleCopy} 
      className="absolute top-2 right-2 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded"
      aria-label="テキストをコピー"
    >
      {copied ? 'コピーしました！' : 'コピー'}
    </button>
  );
};

export default CopyButton;