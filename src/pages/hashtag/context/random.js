import { clone, filter, flatten } from "lodash";
import words from "data/words.json";

const getTodaysDateSeed = () => {
  const today = new Date();
  return (
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  );
};

const seededRandom = (seed) => {
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296; // 2^32

  seed = (a * seed + c) % m;
  return seed / m;
};

const shuffleArray = (array) => {
  let seed = getTodaysDateSeed();

  for (let i = array.length - 1; i > 0; i--) {
    let random = seededRandom(seed + i);
    let j = Math.floor(random * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
};

export const getTodaysWords = () => {
  const sWords = shuffleArray(clone(words));

  const getWords = (w1 = null, w2 = null, w3 = null, w4 = null) => {
    if (w4) {
      return [w1, w2, w3, w4];
    }

    if (!w1) {
      for (let i = 0; i < sWords.length; i++) {
        const next = getWords(sWords[i]);
        if (next) {
          return next;
        }
      }
      return null;
    }

    if (!w2) {
      const f = filter(sWords, (w) => w[1] === w1[3]);
      for (let i = 0; i < f.length; i++) {
        const next = getWords(w1, f[i]);
        if (next) {
          return next;
        }
      }
      return null;
    }

    if (!w3) {
      const f = filter(sWords, (w) => w[3] === w2[3]);
      for (let i = 0; i < f.length; i++) {
        const next = getWords(w1, w2, f[i]);
        if (next) {
          return next;
        }
      }
      return null;
    }

    const f = filter(sWords, (w) => w[1] === w1[1] && w[3] === w3[1]);
    if (!f.length) {
      return null;
    }

    return [w1, w2, w3, f[0]];
  };

  const puzzle = getWords();
  return puzzle;
};

export const setupPuzzle = (board, [w1, w2, w3, w4]) => {
  const target = flatten([
    w4[0],
    w2[0],
    w1.split(""),
    w4[2],
    w2[2],
    w3.split(""),
    w4[4],
    w2[4],
  ]);
  const puzzle = shuffleArray(clone(target));
  return { target, puzzle };
};
