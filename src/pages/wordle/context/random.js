import words from "./words.json";

const getTodaysDateSeed = () => {
  const today = new Date();
  return (
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  );
};

const pseudoRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const selectRandomItem = (array) => {
  const seed = getTodaysDateSeed();
  const randomIndex = Math.floor(pseudoRandom(seed) * array.length);
  return array[randomIndex];
};

export const getTodaysRandomWord = () => selectRandomItem(words);
