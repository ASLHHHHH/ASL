import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Upload, Music, ListMusic, FileText } from 'lucide-react';

interface LyricLine {
  time: number; // in seconds
  text: string;
}

export function Player() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('未选择歌曲');
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Calculate active lyric
  const activeLyricIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  // Handle Media API & Background Playback
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: audioName,
        artist: '本地音乐播放器',
        album: 'Minimalist Player',
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
      
      // Update position state for media session if supported
      try {
        navigator.mediaSession.setPositionState({
          duration: isNaN(duration) || duration === 0 ? 0 : duration,
          playbackRate: audioRef.current?.playbackRate || 1,
          position: isNaN(currentTime) ? 0 : currentTime,
        });
      } catch (e) {
        // Ignored, some older browsers don't support setPositionState fully
      }
    }
  }, [audioName, duration, currentTime]);

  // Scroll active lyric into view
  useEffect(() => {
    if (activeLyricIndex !== -1 && lyricsContainerRef.current && lyricRefs.current[activeLyricIndex]) {
      const el = lyricRefs.current[activeLyricIndex];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) URL.revokeObjectURL(audioUrl); // cleanup
      setAudioUrl(URL.createObjectURL(file));
      setAudioName(file.name.replace(/\.[^/.]+$/, ""));
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  const handleLrcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseLRC(text);
      };
      reader.readAsText(file);
    }
  };

  const parseLRC = (lrcStr: string) => {
    const lines = lrcStr.split('\n');
    const parsedLyrics: LyricLine[] = [];
    // Matches standard LRC time tag format [mm:ss.xx] or [mm:ss.xxx]
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g; 

    for (let line of lines) {
      const matches = [...line.matchAll(timeReg)];
      if (matches.length > 0) {
        const text = line.replace(timeReg, '').trim();
        if (text) {
          for (let match of matches) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3]);
            // Format can be 2 digit (hundreths) or 3 digit (thousandths)
            const msFraction = match[3].length === 2 ? ms / 100 : ms / 1000;
            const time = min * 60 + sec + msFraction;
            parsedLyrics.push({ time, text });
          }
        }
      }
    }
    setLyrics(parsedLyrics.sort((a, b) => a.time - b.time));
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleLyricClick = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      audioRef.current.volume = newMutedState ? 0 : volume;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      if (vol > 0 && isMuted) {
        setIsMuted(false);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden relative">
      
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={onEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Header / Uploaders */}
      <div className="flex-none p-4 md:p-6 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-zinc-800 rounded-full">
            <Music className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="font-medium text-zinc-100 truncate max-w-[200px] sm:max-w-xs" title={audioName}>
            {audioName}
          </h2>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <label className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg cursor-pointer text-sm font-medium">
            <Upload className="w-4 h-4" />
            <span>音频文件</span>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>
          <label className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg cursor-pointer text-sm font-medium">
            <FileText className="w-4 h-4" />
            <span>LRC歌词</span>
            <input type="file" accept=".lrc" onChange={handleLrcUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Content: Lyrics */}
      <div 
        ref={lyricsContainerRef}
        className="flex-1 flex flex-col items-center overflow-y-auto px-6 py-20 md:py-32 scrollbar-hide relative no-scrollbar"
        style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        {lyrics.length === 0 ? (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-zinc-500 space-y-4">
            <ListMusic className="w-16 h-16 mx-auto opacity-50" />
            <p>暂无歌词，请上传 LRC 文件</p>
            <p className="text-sm opacity-60">或点击上方按钮选取本地音乐直接播放</p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = idx === activeLyricIndex;
            return (
              <div
                key={idx}
                ref={(el) => (lyricRefs.current[idx] = el)}
                onClick={() => handleLyricClick(line.time)}
                className={`py-3 px-4 text-center cursor-pointer transition-all duration-300 md:max-w-2xl w-full rounded-xl select-none ${
                  isActive 
                    ? 'text-white text-xl md:text-2xl font-semibold scale-105 bg-white/5' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {line.text}
              </div>
            );
          })
        )}
      </div>

      {/* Player Controls (Fixed Bottom) */}
      <div className="flex-none bg-zinc-900 border-t border-zinc-800 p-4 md:px-8 md:py-6 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* Timeline scruber */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-zinc-400 font-medium w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!audioUrl}
            className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
            style={{
               background: `linear-gradient(to right, #6366f1 ${(currentTime / (duration || 100)) * 100}%, #3f3f46 0)`
            }}
          />
          <span className="text-xs text-zinc-400 font-medium w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400 w-1/3">
            {/* Can add extra options here like loop/shuffle later */}
          </div>

          <div className="flex items-center justify-center gap-6 w-1/3">
            <button 
              className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={!audioUrl}
              onClick={() => {
                const newIndex = Math.max(0, activeLyricIndex - 1);
                const prevLine = lyrics[newIndex];
                if (prevLine) handleLyricClick(prevLine.time);
                else {
                    if(audioRef.current) { audioRef.current.currentTime = 0; setCurrentTime(0); }
                }
              }}
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            <button 
              onClick={togglePlay}
              disabled={!audioUrl}
              className="w-14 h-14 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 text-white rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:hover:bg-indigo-500"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </button>

            <button 
              className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={!audioUrl}
              onClick={() => {
                const newIndex = Math.min(lyrics.length - 1, activeLyricIndex + 1);
                const nextLine = lyrics[newIndex];
                if (nextLine) handleLyricClick(nextLine.time);
              }}
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-end gap-2 w-1/3">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 lg:w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden sm:block"
              style={{
                 background: `linear-gradient(to right, #6366f1 ${(isMuted ? 0 : volume) * 100}%, #3f3f46 0)`
              }}
            />
          </div>
        </div>
      </div>
{/* Custom style for range slider since Tailwind doesn't fully cover cross-browser thumb styling easily without plugins */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          margin-top: -3px; /* centers the thumb vertically for webKit */
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        input[type=range]::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
