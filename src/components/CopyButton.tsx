'use client';

import { useState } from 'react';
import { ClipboardIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

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
      className="absolute top-2 right-10 p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors shadow-sm"
      aria-label="テキストをコピー"
      title={copied ? 'コピーしました！' : 'コピー'}
    >
      {copied ? (
        <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-600" />
      ) : (
        <ClipboardIcon className="h-5 w-5" />
      )}
    </button>
  );
};

export default CopyButton;