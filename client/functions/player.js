// functions/player.js

export function renderTrackStack(tracks, focusIndex, onCardClick) {
  const container = document.getElementById("track-stack-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!Array.isArray(tracks) || tracks.length === 0) {
    container.innerHTML = '<div class="text-stone-400 p-4">No tracks available</div>';
    return;
  }

  tracks.forEach((track, index) => {
    const card = document.createElement("div");
    const offset = index - focusIndex;
    const artistName = (track.artists && track.artists.length > 0) ? track.artists[0].name : "Unknown Artist";
    
    // Determine styling based on position relative to focus
    let className = "absolute w-full max-w-sm p-6 rounded-2xl border transition-all duration-300 cursor-pointer ";
    let zIndex, scale, opacity, transform;
    
    if (offset === 0) {
      // Focused card - center, full size
      className += "bg-[#1c1c1c] border-stone-500 z-20 scale-100 opacity-100 shadow-2xl";
      zIndex = 20;
      scale = 100;
      opacity = 100;
      transform = "translateY(0px)";
    } else if (offset === -1) {
      // Card above - smaller, faded, translated up
      className += "bg-[#252525] border-stone-800 z-10 scale-90 opacity-40 shadow-lg";
      zIndex = 10;
      scale = 90;
      opacity = 40;
      transform = "translateY(-32px)";
    } else if (offset === 1) {
      // Card below - smaller, faded, translated down
      className += "bg-[#252525] border-stone-800 z-10 scale-90 opacity-40 shadow-lg";
      zIndex = 10;
      scale = 90;
      opacity = 40;
      transform = "translateY(32px)";
    } else {
      // Hidden cards beyond immediate neighbors
      className += "bg-[#1a1a1a] border-stone-900 z-0 scale-75 opacity-0 pointer-events-none";
      zIndex = 0;
      scale = 75;
      opacity = 0;
      transform = offset < -1 ? "translateY(-64px)" : "translateY(64px)";
    }
    
    card.className = className;
    card.style.cssText = `
      z-index: ${zIndex};
      transform: scale(${scale / 100}) ${transform};
      opacity: ${opacity / 100};
    `;
    
    card.innerHTML = `
      <div class="flex flex-col">
        <span class="text-2xl font-semibold text-white truncate">${track.name}</span>
        <span class="text-stone-400 text-sm mt-1">${artistName}</span>
      </div>
      <div class="mt-4 flex justify-between items-center">
        <span class="text-xs text-stone-500 uppercase tracking-widest font-bold">
          ${index + 1} / ${tracks.length}
        </span>
        ${offset === 0 ? '<span class="text-stone-300 font-mono text-sm">NOW PLAYING</span>' : ''}
      </div>
    `;
    
    card.onclick = (e) => {
      e.stopPropagation();
      onCardClick(index);
    };
    
    container.appendChild(card);
  });
}

export function renderTrackList(tracks, allUris, playCallback) {
  const trackList = document.getElementById("tracks");
  trackList.innerHTML = "";

  if (!Array.isArray(tracks) || tracks.length === 0) {
    trackList.innerHTML = '<li class="text-stone-400 p-4">No tracks available</li>';
    return;
  }

  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.className =
      "group bg-[#1c1c1c] p-6 rounded-2xl flex justify-between items-center border border-stone-800 hover:border-stone-500 hover:bg-[#252525] cursor-pointer";

    const artistName = (track.artists && track.artists.length > 0) ? track.artists[0].name : "Unknown Artist";
    li.innerHTML = `
      <div class="flex flex-col">
        <span class="text-2xl font-semibold text-white">${track.name}</span>
        <span class="text-stone-500 text-sm">${artistName}</span>
      </div>
      <span class="text-stone-400 font-mono text-base group-hover:text-white">Play</span>
    `;

    li.onclick = () => playCallback(allUris, index);
    trackList.appendChild(li);
  });
}

export function displayError(message) {
  const trackList = document.getElementById("tracks");
  trackList.innerHTML = `<li class="text-red-500 p-4">Error: ${message}</li>`;
}
