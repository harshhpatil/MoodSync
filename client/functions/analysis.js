// functions/analysis.js
export const MOOD_PLAYLIST_INDICES = {
  happy: 0,
  sad: 5,
  angry: 8,
  energetic: 1,
  calm: 3,
  neutral: 2,
};

export const MOOD_KEYWORDS = {
  happy: ["happy", "great", "amazing", "wonderful"],
  sad: ["sad", "tired", "down", "lonely"],
  angry: ["angry", "mad", "annoyed"],
  energetic: ["pumped", "excited"],
  calm: ["relaxed", "chill", "peaceful"],
};

export function parseMoodFromText(text) {
  const cleanText = text.toLowerCase();
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((kw) => cleanText.includes(kw))) return mood;
  }
  return "neutral";
}
