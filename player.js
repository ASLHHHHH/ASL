// Initialize Lucide icons
lucide.createIcons();

// DOM Elements
const tabPlayer = document.getElementById('tab-player');
const tabGd = document.getElementById('tab-gd');
const viewPlayer = document.getElementById('view-player');
const viewGd = document.getElementById('view-gd');

const audio = document.getElementById('audio-player');
const uploadAudio = document.getElementById('upload-audio');
const uploadLrc = document.getElementById('upload-lrc');
const songTitle = document.getElementById('song-title');

const lyricsPlaceholder = document.getElementById('lyrics-placeholder');
const lyricsContent = document.getElementById('lyrics-content');
const lyricsContainer = document.getElementById('lyrics-container');

const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const timeCurrent = document.getElementById('time-current');
const timeDuration = document.getElementById('time-duration');

const btnPlay = document.getElementById('btn-play');
const btnTopPlay = document.getElementById('btn-top-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

const volumeBar = document.getElementById('volume-bar');
const volumeFill = document.getElementById('volume-fill');
const btnMute = document.getElementById('btn-mute');
const iconVol = document.getElementById('icon-vol');
const iconVolMute = document.getElementById('icon-vol-mute');
const speedSelect = document.getElementById('speed-select');

const btnLrcMinus = document.getElementById('btn-lrc-minus');
const btnLrcPlus = document.getElementById('btn-lrc-plus');
const lrcOffsetDisplay = document.getElementById('lrc-offset-display');

const btnToggleTranslation = document.getElementById('btn-toggle-translation');
const btnTogglePlaylist = document.getElementById('btn-toggle-playlist');
const playlistDrawer = document.getElementById('playlist-drawer');
const btnClosePlaylist = document.getElementById('btn-close-playlist');
const playlistContent = document.getElementById('playlist-content');
const btnClearPlaylist = document.getElementById('btn-clear-playlist');

// State
let lyrics = [];
let activeLyricIndex = -1;
let isPlaying = false;
let isMuted = false;
let lastVolume = 1;
let showTranslation = true;

let isUserScrollingLyrics = false;
let lyricsScrollTimeout = null;

let playlist = [];
let currentSongId = null;

// --- IndexedDB Setup ---
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open('MinimalMusicDB', 1);
  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore('playlist', { keyPath: 'id' });
  };
  request.onsuccess = (e) => resolve(e.target.result);
  request.onerror = () => reject('DB Error');
});

async function saveToDB(songData) {
  const db = await dbPromise;
  const tx = db.transaction('playlist', 'readwrite');
  tx.objectStore('playlist').put(songData);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

async function loadFromDB() {
  const db = await dbPromise;
  const tx = db.transaction('playlist', 'readonly');
  const req = tx.objectStore('playlist').getAll();
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
  });
}

async function deleteFromDB(id) {
  const db = await dbPromise;
  const tx = db.transaction('playlist', 'readwrite');
  tx.objectStore('playlist').delete(id);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

async function clearDB() {
  const db = await dbPromise;
  const tx = db.transaction('playlist', 'readwrite');
  tx.objectStore('playlist').clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

// --- Playlist UI Logic ---
btnTogglePlaylist.addEventListener('click', () => {
    playlistDrawer.classList.toggle('-translate-x-full');
});

btnClosePlaylist.addEventListener('click', () => {
    playlistDrawer.classList.add('-translate-x-full');
});

// --- Swipe Gestures ---
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: true});

document.addEventListener('touchend', e => {
    if (e.target.tagName.toLowerCase() === 'input') return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
        if (diffX > 0) {
            // Swipe Right - Open Playlist
            playlistDrawer.classList.remove('-translate-x-full');
        } else {
            // Swipe Left - Close Playlist
            playlistDrawer.classList.add('-translate-x-full');
        }
    }
}, {passive: true});

btnClearPlaylist.addEventListener('click', async () => {
    if(confirm('确定要清空全部播放列表吗？')) {
        await clearDB();
        playlist = [];
        renderPlaylistUI();
        if(audio.src) {
            audio.pause();
            audio.src = '';
            songTitle.textContent = '未选择歌曲';
            updateLrcOffsetUI();
            resetPlaceholder();
        }
    }
});

function renderPlaylistUI() {
    if (playlist.length === 0) {
        playlistContent.innerHTML = '<p class="text-zinc-500 text-sm text-center mt-4">歌单为空</p>';
        return;
    }
    
    playlistContent.innerHTML = '';
    playlist.forEach(song => {
        const item = document.createElement('div');
        const isActive = song.id === currentSongId;
        item.className = `flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors group ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-zinc-800 text-zinc-300'}`;
        
        const titleSec = document.createElement('div');
        titleSec.className = 'flex items-center gap-3 overflow-hidden flex-1';
        titleSec.innerHTML = `
            <i data-lucide="${isActive ? 'chart-bar' : 'music'}" class="w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}"></i>
            <div class="truncate">
                <div class="text-sm font-medium truncate ${isActive ? 'text-indigo-200' : 'text-zinc-200'}">${song.title || song.id}</div>
                <div class="text-xs truncate ${isActive ? 'text-indigo-400/70' : 'text-zinc-500'}">${song.artist || '未知歌手'}</div>
            </div>
        `;
        
        const delBtn = document.createElement('button');
        delBtn.className = 'p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0';
        delBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
        
        titleSec.addEventListener('click', () => {
            playSongFromPlaylist(song);
        });
        
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteFromDB(song.id);
            playlist = playlist.filter(s => s.id !== song.id);
            renderPlaylistUI();
            if (song.id === currentSongId) {
                 audio.pause();
                 audio.src = '';
                 songTitle.textContent = '未选择歌曲';
                 updateLrcOffsetUI();
                 lyrics = [];
                 resetPlaceholder();
            }
        });
        
        item.appendChild(titleSec);
        
        if (song.lyricsStr && song.manualLyricsStr) {
            const select = document.createElement('select');
            select.className = 'bg-zinc-800 text-xs text-zinc-300 rounded outline-none p-1 shrink-0 border border-white/10 hover:border-white/20 transition-colors mr-2';
            select.innerHTML = `
                <option value="auto" ${song.activeLyricType !== 'manual' ? 'selected' : ''}>自动歌词</option>
                <option value="manual" ${song.activeLyricType === 'manual' ? 'selected' : ''}>手动歌词</option>
            `;
            select.addEventListener('click', e => e.stopPropagation());
            select.addEventListener('change', async (e) => {
                song.activeLyricType = e.target.value;
                await saveToDB(song);
                if (song.id === currentSongId) {
                    const activeLrc = song.activeLyricType === 'manual' && song.manualLyricsStr 
                        ? song.manualLyricsStr 
                        : (song.activeLyricType !== 'manual' && song.lyricsStr ? song.lyricsStr : (song.manualLyricsStr || song.lyricsStr));
                    if (activeLrc) {
                        parseLRC(activeLrc);
                    } else {
                        lyrics = [];
                        resetPlaceholder();
                    }
                }
            });
            item.appendChild(select);
        }
        
        item.appendChild(delBtn);
        playlistContent.appendChild(item);
    });
    lucide.createIcons();
}

async function playSongFromPlaylist(song) {
    currentSongId = song.id;
    renderPlaylistUI();
    playlistDrawer.classList.add('-translate-x-full');
    
    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(song.file);
    audio.playbackRate = parseFloat(speedSelect.value);
    
    songTitle.textContent = song.title || song.id;
    songTitle.title = song.title || song.id;
    updateLrcOffsetUI();
    
    btnPlay.disabled = false;
    btnTopPlay.disabled = false;
    btnPrev.disabled = false;
    btnNext.disabled = false;
    progressBar.disabled = false;
    
    const activeLrc = song.activeLyricType === 'manual' && song.manualLyricsStr 
        ? song.manualLyricsStr 
        : (song.activeLyricType !== 'manual' && song.lyricsStr ? song.lyricsStr : (song.manualLyricsStr || song.lyricsStr));
        
    if (activeLrc) {
        parseLRC(activeLrc);
    } else {
        lyrics = [];
        resetPlaceholder();
    }
    
    updateMediaSession(song.title, song.artist);
    audio.play().catch(console.error);
}

// Load initialization immediately
(async function init() {
    playlist = await loadFromDB();
    renderPlaylistUI();
})();

// --- LRCLIB Fetch Logic ---
async function fetchLyricsFromLRCLIB(title, artist) {
  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}`;
    if (artist) url += `&artist_name=${encodeURIComponent(artist)}`;
    let res = await fetch(url);
    if (!res.ok) {
        let q = title;
        if (artist) q += ' ' + artist;
        let search = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
        if (search.ok) {
            let data = await search.json();
            if (data && data.length > 0) return data[0].syncedLyrics || data[0].plainLyrics;
        }
    } else {
        let data = await res.json();
        return data.syncedLyrics || data.plainLyrics;
    }
  } catch (e) {
      console.error('LRCLIB error:', e);
  }
  return null;
}

async function adjustLrcOffset(delta) {
  if (!currentSongId) return;
  const songIdx = playlist.findIndex(s => s.id === currentSongId);
  if (songIdx !== -1) {
    const song = playlist[songIdx];
    song.lrcOffset = (song.lrcOffset || 0) + delta;
    song.lrcOffset = Math.round(song.lrcOffset * 10) / 10;
    await saveToDB(song);
    updateLrcOffsetUI();
    updateLyrics(true);
  }
}

function updateLrcOffsetUI() {
  const song = playlist.find(s => s.id === currentSongId);
  const offset = song?.lrcOffset || 0;
  lrcOffsetDisplay.textContent = (offset > 0 ? '+' : '') + offset.toFixed(1) + 's';
}

btnLrcMinus.addEventListener('click', () => adjustLrcOffset(-0.1));
btnLrcPlus.addEventListener('click', () => adjustLrcOffset(0.1));

// --- Translation Toggle ---
btnToggleTranslation.addEventListener('click', () => {
  showTranslation = !showTranslation;
  btnToggleTranslation.classList.toggle('text-indigo-400', showTranslation);
  btnToggleTranslation.classList.toggle('text-zinc-400', !showTranslation);
  
  document.querySelectorAll('.lyric-translation').forEach(el => {
    el.style.display = showTranslation ? 'block' : 'none';
  });
});

// --- Tabs Logic ---
tabPlayer.addEventListener('click', () => {
  tabPlayer.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-zinc-700 text-white shadow-sm';
  tabGd.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-zinc-200';
  viewPlayer.classList.remove('hidden');
  viewPlayer.classList.add('flex');
  viewGd.classList.add('hidden');
});

tabGd.addEventListener('click', () => {
  tabGd.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-zinc-700 text-white shadow-sm';
  tabPlayer.className = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-zinc-200';
  viewGd.classList.remove('hidden');
  viewPlayer.classList.add('hidden');
  viewPlayer.classList.remove('flex');
});

// --- File Upload Logic ---
uploadAudio.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    let baseFileName = file.name.replace(/\.[^/.]+$/, "");
    let titlePart = baseFileName;
    let artistPart = '';
    if (baseFileName.includes(' - ')) {
        const parts = baseFileName.split(' - ');
        artistPart = parts[0].trim();
        titlePart = parts[1].trim();
    }
    
    // Read embedded tags
    let tags = await new Promise((resolve) => {
      if (window.jsmediatags) {
        window.jsmediatags.read(file, {
          onSuccess: resolve,
          onError: (e) => resolve(null)
        });
      } else {
        resolve(null);
      }
    });
    
    let title = tags?.tags?.title || titlePart;
    let artist = tags?.tags?.artist || artistPart;
    let displayTitle = artist && artist !== title ? `${artist} - ${title}` : title;
    
    let lrcString = null;
    if (tags?.tags?.lyrics) lrcString = tags.tags.lyrics.lyrics || tags.tags.lyrics;
    else if (tags?.tags?.USLT) lrcString = tags.tags.USLT.lyrics || tags.tags.USLT.text || tags.tags.USLT.description;
    
    lyricsPlaceholder.classList.remove('hidden');
    lyricsContent.innerHTML = '';
    lyricsPlaceholder.innerHTML = '<i data-lucide="loader-2" class="w-16 h-16 mx-auto opacity-50 animate-[spin_3s_linear_infinite]"></i><p>正在搜索歌词并处理...</p>';
    lucide.createIcons();
    
    if (!lrcString) {
        lrcString = await fetchLyricsFromLRCLIB(title, artist);
    }
    
    const songId = `${title}-${artist}-${Date.now()}`;
    const songObj = {
        id: songId,
        title: title,
        artist: artist,
        file: file,
        lyricsStr: lrcString
    };
    
    await saveToDB(songObj);
    
    // Add to playlist memory and re-render
    playlist.push(songObj);
    playSongFromPlaylist(songObj);
    e.target.value = '';
  }
});

function resetPlaceholder() {
  if (lyrics.length === 0) {
    lyricsPlaceholder.innerHTML = '<i data-lucide="list-music" class="w-16 h-16 mx-auto opacity-50"></i><p>未找到或加载歌词失败，请手动上传 LRC</p><p class="text-sm opacity-60">或尝试播放其他歌曲</p>';
    lucide.createIcons();
  }
}

uploadLrc.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file && currentSongId) {
    const reader = new FileReader();
    reader.onload = async (event) => {
        const lrcStr = event.target.result;
        parseLRC(lrcStr);
        // Save to current song in DB
        const songIdx = playlist.findIndex(s => s.id === currentSongId);
        if (songIdx !== -1) {
            playlist[songIdx].manualLyricsStr = lrcStr;
            playlist[songIdx].activeLyricType = 'manual';
            await saveToDB(playlist[songIdx]);
            renderPlaylistUI();
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  } else if (!currentSongId) {
      alert("请先播放歌曲，再导入歌词");
  }
});

const topBarContainer = document.getElementById('top-bar-container');
const appHeader = document.getElementById('app-header');
const bottomBar = document.getElementById('bottom-bar');

let isTopBarCollapsed = false;

appHeader.addEventListener('click', (e) => {
    // Ignore if clicked on the tab switcher buttons
    if (e.target.closest('button')) return;
    
    isTopBarCollapsed = !isTopBarCollapsed;
    if (isTopBarCollapsed) {
        topBarContainer.classList.add('-translate-y-full');
    } else {
        topBarContainer.classList.remove('-translate-y-full');
    }
});

// --- Lyrics Logic ---
function handleUserLyricsScroll() {
  isUserScrollingLyrics = true;
  if (bottomBar) bottomBar.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
  if (lyricsScrollTimeout) clearTimeout(lyricsScrollTimeout);
  lyricsScrollTimeout = setTimeout(() => {
    isUserScrollingLyrics = false;
    if (bottomBar) bottomBar.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
    updateLyrics(true); // force scroll
  }, 2000);
}

lyricsContainer.addEventListener('wheel', handleUserLyricsScroll, {passive: true});
lyricsContainer.addEventListener('touchmove', handleUserLyricsScroll, {passive: true});

function parseLRC(lrcStr) {
  const lines = lrcStr.split(/\r?\n/);
  const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  
  const lyricsMap = new Map();
  let hasTimestamps = false;

  for (const line of lines) {
    const matches = [...line.matchAll(timeReg)];
    if (matches.length > 0) {
      hasTimestamps = true;
      const text = line.replace(timeReg, '').trim();
      if (text) {
        for (const match of matches) {
          const min = parseInt(match[1]);
          const sec = parseInt(match[2]);
          const ms = match[3] ? parseInt(match[3]) : 0;
          const msFraction = match[3] ? (match[3].length === 2 ? ms / 100 : ms / 1000) : 0;
          const time = min * 60 + sec + msFraction;
          
          const key = time.toFixed(3);
          if (lyricsMap.has(key)) {
            lyricsMap.get(key).push(text);
          } else {
            lyricsMap.set(key, [text]);
          }
        }
      }
    }
  }
  
  if (hasTimestamps) {
    lyrics = Array.from(lyricsMap.entries()).map(([timeStr, texts]) => {
      return {
        time: parseFloat(timeStr),
        text: texts[0],
        translation: texts.length > 1 ? texts.slice(1).join('\n') : '',
        isStatic: false
      };
    }).sort((a, b) => a.time - b.time);
  } else {
    lyrics = lines.filter(l => l.trim().length > 0).map((text, idx) => ({
      time: idx === 0 ? 0 : -1,
      text: text.trim(),
      translation: '',
      isStatic: true
    }));
  }
  renderLyrics();
}

function renderLyrics() {
  if (lyrics.length > 0) {
    lyricsPlaceholder.classList.add('hidden');
  } else {
    lyricsPlaceholder.classList.remove('hidden');
  }
  
  lyricsContent.innerHTML = '';
  lyrics.forEach((line, idx) => {
    const el = document.createElement('div');
    
    if (line.isStatic) {
      el.className = 'py-2 px-4 text-center md:max-w-2xl w-full text-zinc-400';
      el.textContent = line.text;
    } else {
      el.className = 'lyric-line py-3 px-4 text-center cursor-pointer md:max-w-2xl w-full rounded-xl select-none text-zinc-500 hover:text-zinc-300 hover:bg-white/5 flex flex-col justify-center';
      el.id = `lyric-${idx}`;
      
      const textSpan = document.createElement('span');
      textSpan.textContent = line.text;
      el.appendChild(textSpan);

      if (line.translation) {
        const transSpan = document.createElement('span');
        transSpan.className = 'lyric-translation text-sm opacity-70 mt-1';
        transSpan.textContent = line.translation;
        transSpan.style.display = showTranslation ? 'block' : 'none';
        el.appendChild(transSpan);
      }

      let longPressTimer;
      let isLongPress = false;

      const startLongPress = (e) => {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          const textToCopy = line.translation ? `${line.text}\n${line.translation}` : line.text;
          navigator.clipboard.writeText(textToCopy).then(() => {
            const originalColor = el.style.color;
            el.style.color = '#10b981'; // green-500
            setTimeout(() => {
              el.style.color = originalColor;
            }, 1000);
          }).catch(console.error);
        }, 1500);
      };

      const cancelLongPress = () => {
        clearTimeout(longPressTimer);
      };

      el.addEventListener('mousedown', startLongPress);
      el.addEventListener('touchstart', startLongPress, {passive: true});
      el.addEventListener('mouseup', cancelLongPress);
      el.addEventListener('mouseleave', cancelLongPress);
      el.addEventListener('touchend', cancelLongPress);
      el.addEventListener('touchcancel', cancelLongPress);

      el.addEventListener('click', (e) => {
        if (isLongPress) {
          e.preventDefault();
          return;
        }
        if (audio.src) {
          try {
            audio.currentTime = line.time;
            if (audio.paused) {
              audio.play().catch(err => console.log('Audio play error:', err));
            }
          } catch(e) {
            console.log('Error setting audio time:', e);
          }
        }
        updateLyrics(true);
      });
    }
    lyricsContent.appendChild(el);
  });
  activeLyricIndex = -1;
  updateLyrics();
}

function updateLyrics(forceScroll = false) {
  if (!lyrics.length || lyrics[0].isStatic) return;
  const currentTime = audio.currentTime;
  const currentSong = playlist.find(s => s.id === currentSongId);
  const offset = currentSong?.lrcOffset || 0;
  
  let newActiveIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    const adjustedTime = line.time + offset;
    const nextAdjustedTime = nextLine ? nextLine.time + offset : Infinity;
    return currentTime >= adjustedTime && currentTime < nextAdjustedTime;
  });

  const activeIndexChanged = (newActiveIndex !== activeLyricIndex && newActiveIndex !== -1);

  if (activeIndexChanged) {
    if (activeLyricIndex !== -1) {
      const prevEl = document.getElementById(`lyric-${activeLyricIndex}`);
      if (prevEl) prevEl.className = 'lyric-line py-3 px-4 text-center cursor-pointer md:max-w-2xl w-full rounded-xl select-none text-zinc-500 hover:text-zinc-300 hover:bg-white/5 flex flex-col justify-center';
    }
    activeLyricIndex = newActiveIndex;
    const newEl = document.getElementById(`lyric-${activeLyricIndex}`);
    if (newEl) {
      newEl.className = 'lyric-line py-3 px-4 text-center cursor-pointer md:max-w-2xl w-full rounded-xl select-none lyric-active flex flex-col justify-center';
    }
  }

  const shouldScroll = forceScroll || (activeIndexChanged && !isUserScrollingLyrics);

  if (activeLyricIndex !== -1 && shouldScroll) {
    const activeEl = document.getElementById(`lyric-${activeLyricIndex}`);
    if (activeEl) {
      const elRect = activeEl.getBoundingClientRect();
      const containerRect = lyricsContainer.getBoundingClientRect();
      const elCenter = elRect.top - containerRect.top + lyricsContainer.scrollTop + elRect.height / 2;
      const containerCenter = containerRect.height / 2;
      lyricsContainer.scrollTo({
        top: elCenter - containerCenter,
        behavior: 'smooth'
      });
    }
  }
}

// --- Audio Player Logic ---
function formatTime(time) {
  if (isNaN(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

audio.addEventListener('loadedmetadata', () => {
  progressBar.max = audio.duration;
  timeDuration.textContent = formatTime(audio.duration);
  const curSong = playlist.find(s => s.id === currentSongId);
  updateMediaSession(curSong?.title, curSong?.artist);
});

audio.addEventListener('timeupdate', () => {
  if (!progressBar.matches(':active')) {
    progressBar.value = audio.currentTime;
    const pct = (audio.currentTime / audio.duration) * 100 || 0;
    progressFill.style.width = `${pct}%`;
  }
  timeCurrent.textContent = formatTime(audio.currentTime);
  updateLyrics();
});

audio.addEventListener('play', () => {
  isPlaying = true;
  btnPlay.innerHTML = '<i data-lucide="pause" class="w-5 h-5 sm:w-6 sm:h-6 fill-current"></i>';
  btnTopPlay.innerHTML = '<i data-lucide="pause" class="w-4 h-4 sm:w-5 sm:h-5"></i>';
  lucide.createIcons();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  btnPlay.innerHTML = '<i data-lucide="play" class="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-1"></i>';
  btnTopPlay.innerHTML = '<i data-lucide="play" class="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 ml-0.5"></i>';
  lucide.createIcons();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
});

audio.addEventListener('ended', () => {
  // Try play next in playlist
  const idx = playlist.findIndex(s => s.id === currentSongId);
  if (idx !== -1 && idx < playlist.length - 1) {
      playSongFromPlaylist(playlist[idx + 1]);
  } else {
      audio.currentTime = 0;
      audio.pause();
  }
});

btnPlay.addEventListener('click', () => {
  if (audio.paused) audio.play().catch(console.error);
  else audio.pause();
});

btnTopPlay.addEventListener('click', () => {
  if (audio.paused) audio.play().catch(console.error);
  else audio.pause();
});

progressBar.addEventListener('input', (e) => {
  const pct = (e.target.value / audio.duration) * 100 || 0;
  progressFill.style.width = `${pct}%`;
  timeCurrent.textContent = formatTime(e.target.value);
});

progressBar.addEventListener('change', (e) => {
  audio.currentTime = e.target.value;
});

// Skip buttons now control playlist
btnPrev.addEventListener('click', () => {
    const idx = playlist.findIndex(s => s.id === currentSongId);
    if (idx > 0) {
        playSongFromPlaylist(playlist[idx - 1]);
    } else if (idx === 0) {
        audio.currentTime = 0;
    }
});

btnNext.addEventListener('click', () => {
    const idx = playlist.findIndex(s => s.id === currentSongId);
    if (idx !== -1 && idx < playlist.length - 1) {
        playSongFromPlaylist(playlist[idx + 1]);
    }
});

// --- Volume Logic ---
function updateVolumeDisplay(vol) {
  volumeFill.style.width = `${vol * 100}%`;
  if (vol === 0) {
    iconVol.classList.add('hidden');
    iconVolMute.classList.remove('hidden');
  } else {
    iconVol.classList.remove('hidden');
    iconVolMute.classList.add('hidden');
  }
}

volumeBar.addEventListener('input', (e) => {
  const vol = parseFloat(e.target.value);
  audio.volume = vol;
  isMuted = vol === 0;
  if (!isMuted) lastVolume = vol;
  updateVolumeDisplay(vol);
});

btnMute.addEventListener('click', () => {
  if (isMuted) {
    audio.volume = lastVolume || 1;
    volumeBar.value = lastVolume || 1;
    isMuted = false;
  } else {
    lastVolume = audio.volume;
    audio.volume = 0;
    volumeBar.value = 0;
    isMuted = true;
  }
  updateVolumeDisplay(audio.volume);
});

speedSelect.addEventListener('change', (e) => {
  audio.playbackRate = parseFloat(e.target.value);
});

// --- MediaSession API (Background Playback) ---
function updateMediaSession(title = '', artist = '') {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || songTitle.textContent || '未知歌曲',
      artist: artist || '本地音乐播放器',
      album: 'Minimalist Player'
    });

    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.fastSeek && 'fastSeek' in audio) {
        audio.fastSeek(details.seekTime);
        return;
      }
      audio.currentTime = details.seekTime;
    });
    
    // Previous/Next track syncs with playlist
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        const idx = playlist.findIndex(s => s.id === currentSongId);
        if (idx > 0) {
            playSongFromPlaylist(playlist[idx - 1]);
        } else {
            audio.currentTime = 0;
        }
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        const idx = playlist.findIndex(s => s.id === currentSongId);
        if (idx !== -1 && idx < playlist.length - 1) {
            playSongFromPlaylist(playlist[idx + 1]);
        }
    });
  }
}

setInterval(() => {
  if ('mediaSession' in navigator && isPlaying && !isNaN(audio.duration)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    } catch (e) {}
  }
}, 1000);

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
  // Ignore shortcuts when typing in inputs
  if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (audio.src) {
      if (audio.paused) audio.play().catch(console.error);
      else audio.pause();
    }
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    if (audio.src) {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    }
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (audio.src) {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
    }
  }
});
