const adjectives = [
  "fizzy",
  "golden",
  "smoky",
  "bitter",
  "crisp",
  "hazy",
  "bold",
  "mellow",
  "spicy",
  "frosty",
  "tangy",
  "silky",
  "bubbly",
  "zesty",
  "dark",
  "bright",
];

const nouns = [
  "mojito",
  "pint",
  "negroni",
  "spritz",
  "stout",
  "lager",
  "daiquiri",
  "mule",
  "sour",
  "porter",
  "pilsner",
  "shandy",
  "toddy",
  "gimlet",
  "julep",
  "flip",
];

export function generateSlug(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}-${noun}-${num}`;
}
