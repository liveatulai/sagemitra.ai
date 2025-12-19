/**
 * Sanitize text for TTS by removing or replacing emojis
 * Prevents emoji names from being read aloud
 */
export function sanitizeTextForTTS(text: string): string {
  // Remove emoji characters (Unicode ranges for common emoji)
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, ' ') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, ' ') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, ' ') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ' ') // Regional country flags
    .replace(/[\u{2600}-\u{26FF}]/gu, ' ') // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, ' ') // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, ' ') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, ' ') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, ' ') // Symbols and Pictographs Extended-A
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
