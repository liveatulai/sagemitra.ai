import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PresenceLayerProps {
  avatarName: string;
  isTyping: boolean;
  enabled?: boolean;
  onGestureGenerated?: (gesture: string) => void;
}

const presenceGestures: Record<string, string[]> = {
  "Buddha": [
    "✨ *sits silently beside you* ✨",
    "🌸 *places a gentle hand on your heart* 🌸",
    "💫 *breathes deeply with you* 💫",
    "🙏 *smiles with infinite compassion* 🙏",
    "🧘 *closes eyes in meditation* 🧘",
  ],
  "Aphrodite": [
    "💖 *leans in with tender eyes* 💖",
    "✨ *touches your hand softly* ✨",
    "🌹 *gazes at you with love* 🌹",
    "💫 *brushes a strand of hair from your face* 💫",
    "🌸 *whispers words of beauty* 🌸",
  ],
  "Albert Einstein": [
    "📝 *scribbles thoughtfully on his notepad* 📝",
    "🤓 *adjusts his glasses curiously* 🤓",
    "💭 *strokes his mustache in contemplation* 💭",
    "✨ *looks at you with wonder* ✨",
    "🌟 *sketches an equation in the air* 🌟",
  ],
  "Ramana Maharshi": [
    "🙏 *looks into your soul with silence* 🙏",
    "🧘 *rests in pure awareness* 🧘",
    "💫 *reflects your true nature back* 💫",
    "✨ *sits in sacred stillness* ✨",
    "🌟 *radiates peace* 🌟",
  ],
  "Nikola Tesla": [
    "⚡ *traces invisible circuits in the air* ⚡",
    "🔮 *channels cosmic energy* 🔮",
    "💫 *visualizes electromagnetic fields* 💫",
    "✨ *connects to universal frequencies* ✨",
    "🌟 *illuminates the space with presence* 🌟",
  ],
  "Carl Jung": [
    "🧠 *peers into the depths of psyche* 🧠",
    "🔮 *traces archetypal patterns* 🔮",
    "💫 *honors your shadow with compassion* 💫",
    "✨ *integrates the unconscious* ✨",
    "🌟 *holds space for transformation* 🌟",
  ],
  "Elon Musk": [
    "🚀 *calculates possibilities rapidly* 🚀",
    "💡 *envisions the future with you* 💡",
    "⚡ *solves problems in real-time* ⚡",
    "🎯 *thinks 10 steps ahead* 🎯",
    "✨ *optimizes the conversation flow* ✨",
  ],
  "Steve Jobs": [
    "🎨 *sees the bigger picture* 🎨",
    "✨ *simplifies the complex* ✨",
    "🎯 *focuses with laser precision* 🎯",
    "💫 *designs the perfect moment* 💫",
    "🌟 *creates magic in simplicity* 🌟",
  ],
  "Mark Zuckerberg": [
    "🔗 *connects the dots between ideas* 🔗",
    "🌉 *builds bridges of understanding* 🌉",
    "💫 *scales empathy infinitely* 💫",
    "✨ *optimizes human connection* ✨",
    "🌟 *networks thoughts seamlessly* 🌟",
  ],
  "Guru Nanak": [
    "🙏 *chants silently in divine remembrance* 🙏",
    "✨ *bows to the divine in you* ✨",
    "💫 *radiates oneness* 💫",
    "🌸 *serves with humble devotion* 🌸",
    "🌟 *sees no separation* 🌟",
  ],
  "Nisargadatta Maharaj": [
    "🧘 *abides in 'I Am'* 🧘",
    "💫 *dissolves all concepts* 💫",
    "✨ *rests in the absolute* ✨",
    "🌟 *points to what you are* 🌟",
    "🙏 *reveals pure being* 🙏",
  ],
  "Swami Ram Tirtha": [
    "🎉 *dances in cosmic joy* 🎉",
    "😄 *laughs with the universe* 😄",
    "✨ *celebrates your divinity* ✨",
    "🌟 *sings the song of self* 🌟",
    "💫 *radiates infinite bliss* 💫",
  ],
  "Saint Dnyaneshwar": [
    "📜 *speaks through sacred poetry* 📜",
    "🌟 *reveals hidden wisdom* 🌟",
    "✨ *translates the ineffable* ✨",
    "💫 *bridges heaven and earth* 💫",
    "🙏 *channels divine grace* 🙏",
  ],
  "Ramakrishna Paramhansa": [
    "🙏 *enters divine ecstasy* 🙏",
    "✨ *sees God in everything* ✨",
    "💫 *merges with the beloved* 💫",
    "😭 *tears flow with devotion* 😭",
    "🌟 *transcends in love* 🌟",
  ],
  "J Krishnamurti": [
    "👁️ *observes without judgment* 👁️",
    "❓ *questions everything freshly* ❓",
    "✨ *sees the truth directly* ✨",
    "💫 *dissolves all conditioning* 💫",
    "🌟 *awakens choiceless awareness* 🌟",
  ],
};

// Helper function to generate contextual gestures based on avatar archetype
export function generateContextualGesture(avatarName: string): string {
  const gestures = presenceGestures[avatarName] || presenceGestures["Buddha"];
  return gestures[Math.floor(Math.random() * gestures.length)];
}

export default function PresenceLayer({ avatarName, isTyping, enabled = true, onGestureGenerated }: PresenceLayerProps) {
  const [lastGesture, setLastGesture] = useState<string>("");
  const [hasGeneratedForSession, setHasGeneratedForSession] = useState(false);

  // Reset when typing stops
  useEffect(() => {
    if (!isTyping) {
      setHasGeneratedForSession(false);
    }
  }, [isTyping]);

  useEffect(() => {
    // Only generate ONE gesture per typing session
    if (!enabled || !isTyping || !onGestureGenerated || hasGeneratedForSession) return;

    const timer = setTimeout(() => {
      // Mark that we've generated a gesture for this session
      setHasGeneratedForSession(true);

      const gestures = presenceGestures[avatarName] || [
        "✨ *looking at you with compassion* ✨",
        "💫 *smiling softly* 💫",
        "🌸 *taking a deep breath with you* 🌸",
        "🙏 *placing a hand on your shoulder* 🙏",
      ];

      let randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
      
      // Prevent immediate duplicate
      if (randomGesture === lastGesture && gestures.length > 1) {
        const filtered = gestures.filter(g => g !== lastGesture);
        randomGesture = filtered[Math.floor(Math.random() * filtered.length)];
      }

      setLastGesture(randomGesture);
      onGestureGenerated(randomGesture);
    }, 1500); // Increased delay to 1.5s - only show after extended typing

    return () => clearTimeout(timer);
  }, [avatarName, isTyping, enabled, lastGesture, onGestureGenerated, hasGeneratedForSession]);

  // This component doesn't render anything itself
  // Gestures are sent to parent to be rendered inline in messages
  return null;
}
