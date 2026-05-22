import React, { useState } from 'react';
import { Player } from './components/Player';
import { GDStudioWebview } from './components/GDStudioWebview';
import { Music2, Globe, Disc3 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'gd'>('player');

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Header / App Bar */}
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Disc3 className="w-5 h-5 text-white animate-[spin_5s_linear_infinite]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Minimal Music</h1>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'player' 
                ? 'bg-zinc-700 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music2 className="w-4 h-4" />
            <span className="hidden sm:inline">高级本地播放器</span>
          </button>
          <button
            onClick={() => setActiveTab('gd')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'gd' 
                ? 'bg-zinc-700 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">GD 音乐台</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'player' ? <Player /> : <GDStudioWebview />}
      </main>
    </div>
  );
}
