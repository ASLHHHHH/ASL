import React, { useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

export function GDStudioWebview() {
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          GD 音乐台联动
        </h2>
        <a 
          href="https://music.gdstudio.xyz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <span>在新标签页打开完全版</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      
      <div className="flex-1 relative bg-black">
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-zinc-900">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4 opacity-80" />
            <h3 className="text-xl font-bold mb-2">无法加载外部网页</h3>
            <p className="text-zinc-400 mb-6 max-w-md">
              目标网站 (GD 音乐台) 可能设置了安全策略（如 X-Frame-Options），禁止在当前应用内嵌。
            </p>
            <a 
              href="https://music.gdstudio.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors border border-zinc-700"
            >
              点击此处直接前往网站播放
            </a>
          </div>
        )}
        
        <iframe 
          src="https://music.gdstudio.xyz"
          className="w-full h-full border-none relative z-0"
          title="GD Music Studio"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onError={() => setIframeError(true)}
          // Simple heuristic: if iframe loads but is inaccessible, it's blocked.
        />
      </div>
    </div>
  );
}
