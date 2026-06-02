export type EmojiGroup = {
  id: string;
  label: string;
  tint: string;
  emojis: string[];
};

export const CHAT_EMOJI_GROUPS: EmojiGroup[] = [
  {
    id: "smile",
    label: "Smileys",
    tint: "bg-amber-500/15",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😢", "😭", "😤", "😡", "🤔", "😴", "🤗"],
  },
  {
    id: "hands",
    label: "Gestures",
    tint: "bg-sky-500/15",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "🤞", "👋", "🫶", "🤙", "👌", "✋", "🖐️"],
  },
  {
    id: "work",
    label: "Work",
    tint: "bg-violet-500/15",
    emojis: ["💼", "📎", "📌", "✅", "❌", "⭐", "🔥", "💡", "🎯", "📈", "📉", "🚀", "⚡", "🏆", "📣", "🔔"],
  },
  {
    id: "hearts",
    label: "Hearts",
    tint: "bg-rose-500/15",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💖", "💗", "💘", "💝", "✨", "🌟", "🎉"],
  },
  {
    id: "food",
    label: "Food",
    tint: "bg-orange-500/15",
    emojis: ["☕", "🍕", "🍔", "🌮", "🍩", "🎂", "🍎", "🥗", "🍜", "🍣", "🧁", "🍿", "🥤", "🍺", "🥂"],
  },
];

export const ALL_CHAT_EMOJIS = CHAT_EMOJI_GROUPS.flatMap((g) => g.emojis);
