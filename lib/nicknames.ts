// Each animal has a stable `key` (stored in DB, used for i18n lookup) and an emoji.
// The localized name is resolved at render time via the `animals` message namespace.
export const ANIMALS: { emoji: string; key: string }[] = [
  { emoji: "🦊", key: "fox" },
  { emoji: "🐻", key: "bear" },
  { emoji: "🦁", key: "lion" },
  { emoji: "🐸", key: "frog" },
  { emoji: "🐺", key: "wolf" },
  { emoji: "🐬", key: "dolphin" },
  { emoji: "🦅", key: "eagle" },
  { emoji: "🐧", key: "penguin" },
  { emoji: "🐝", key: "bee" },
  { emoji: "🦩", key: "flamingo" },
  { emoji: "🐨", key: "koala" },
  { emoji: "🦈", key: "shark" },
  { emoji: "🐯", key: "tiger" },
  { emoji: "🦉", key: "owl" },
  { emoji: "🐼", key: "panda" },
  { emoji: "🦦", key: "otter" },
  { emoji: "🐮", key: "cow" },
  { emoji: "🐷", key: "pig" },
  { emoji: "🐴", key: "horse" },
  { emoji: "🦒", key: "giraffe" },
  { emoji: "🦓", key: "zebra" },
  { emoji: "🐘", key: "elephant" },
  { emoji: "🦏", key: "rhino" },
  { emoji: "🐊", key: "crocodile" },
  { emoji: "🐢", key: "turtle" },
  { emoji: "🐍", key: "snake" },
  { emoji: "🦜", key: "parrot" },
  { emoji: "🦆", key: "duck" },
  { emoji: "🐳", key: "whale" },
  { emoji: "🦀", key: "crab" },
  { emoji: "🐌", key: "snail" },
  { emoji: "🕷️", key: "spider" },
  { emoji: "🦔", key: "hedgehog" },
  { emoji: "🐿️", key: "squirrel" },
  { emoji: "🐰", key: "rabbit" },
  { emoji: "🐭", key: "mouse" },
  { emoji: "🐵", key: "monkey" },
  { emoji: "🦍", key: "gorilla" },
  { emoji: "🐪", key: "camel" },
  { emoji: "🦘", key: "kangaroo" },
  { emoji: "🐑", key: "sheep" },
  { emoji: "🐐", key: "goat" },
  { emoji: "🦌", key: "deer" },
  { emoji: "🐕", key: "dog" },
  { emoji: "🐈", key: "cat" },
  { emoji: "🦝", key: "raccoon" },
  { emoji: "🦛", key: "hippo" },
  { emoji: "🦄", key: "unicorn" },
];

const ANIMAL_BY_KEY = new Map(ANIMALS.map((animal) => [animal.key, animal]));

export function generateNickname(): string {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)].key;
}

/** Pick a nickname key not already present in `taken`. Falls back to a random key. */
export function pickUniqueNickname(taken: Set<string>): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const key = generateNickname();
    if (!taken.has(key)) return key;
  }
  const free = ANIMALS.find((animal) => !taken.has(animal.key));
  return free ? free.key : generateNickname();
}

/** Resolve a stored nickname to "emoji Name". Legacy/unknown values are returned as-is. */
export function formatNickname(stored: string | null, translate: (key: string) => string): string {
  if (!stored) return "???";
  const animal = ANIMAL_BY_KEY.get(stored);
  if (!animal) return stored;
  return `${animal.emoji} ${translate(stored)}`;
}
