// function defininf the spotify 
export const API_BASE_URL = window.location.origin;

export async function fetchToken() {
  const res = await fetch(`${API_BASE_URL}/api/token`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to get token");
  const data = await res.json();
  return data.token;
}

export async function getTopTracks() {
  const res = await fetch(`${API_BASE_URL}/top-tracks`, {
    method: "GET",
    credentials: "include",
    headers: { "Accept": "application/json" }
  });
  if (!res.ok) throw new Error("Auth failed");
  return await res.json();
}

export async function playSpotifyUri(token, deviceId, uriList, startIndex) {
  const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    body: JSON.stringify({
      uris: uriList,
      offset: { position: startIndex },
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to play track");
  return res;
}