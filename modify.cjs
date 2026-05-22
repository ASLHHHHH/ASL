const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace the script tag
let startRegex = /<script>\s*\/\/\s*Initialize Lucide icons/;
let endRegex = /<\/script>\s*<\/body>/;

let startIndex = html.search(startRegex);
let endIndex = html.search(endRegex);

if (startIndex !== -1 && endIndex !== -1) {
    let before = html.substring(0, startIndex);
    let after = html.substring(endIndex + 9); // keep </body>
    
    // Add Playlist UI
    const playlistUI = `
  <!-- Playlist Drawer -->
  <div id="playlist-drawer" class="fixed inset-y-0 left-0 w-80 bg-zinc-900 border-r border-zinc-800 transform -translate-x-full transition-transform duration-300 z-50 flex flex-col shadow-2xl">
    <div class="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0 mt-16 sm:mt-0">
      <h3 class="font-semibold flex items-center gap-2"><i data-lucide="list" class="w-4 h-4"></i> 播放列表</h3>
      <button id="btn-close-playlist" class="text-zinc-400 hover:text-white p-1">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>
    <div id="playlist-content" class="flex-1 overflow-y-auto w-full no-scrollbar px-2 py-2">
      <!-- Playlist items go here -->
    </div>
    <div class="p-4 border-t border-zinc-800 shrink-0">
      <button id="btn-clear-playlist" class="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors">
        清空列表
      </button>
    </div>
  </div>`;
  
    // Add button UI
    const targetDiv = `<div class="p-2 bg-zinc-800 rounded-full">
          <i data-lucide="music" class="w-5 h-5 text-indigo-400"></i>
        </div>`;
    const newDiv = `<button id="btn-toggle-playlist" class="p-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-full" title="播放列表">
          <i data-lucide="list-music" class="w-5 h-5 text-indigo-400"></i>
        </button>`;
        
    before = before.replace(targetDiv, newDiv);
    
    // inject playlist UI after header
    before = before.replace('</header>', '</header>' + playlistUI);
    
    // Write changes
    const result = before + '\n  <script src="/player.js"></script>\n</body>' + after;
    fs.writeFileSync('index.html', result);
    console.log("Success");
} else {
    console.log("Could not find script tags, startIndex:", startIndex, "endIndex:", endIndex);
}
