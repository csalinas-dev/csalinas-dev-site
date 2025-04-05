import words from "@/data/words.json";

/**
 * Generates a seed based on a date
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {number} - Seed value
 */
export const getDateSeed = (date) => {
  // If date is a string, convert it to a Date object
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return (
    dateObj.getFullYear() * 10000 +
    (dateObj.getMonth() + 1) * 100 +
    dateObj.getDate()
  );
};

/**
 * Generates a pseudo-random number between 0 and 1 based on a seed
 * @param {number} seed - Seed value
 * @returns {number} - Pseudo-random number between 0 and 1
 */
export const pseudoRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Gets a random word based on the current date
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {string} - Random word
 */
export const getRandomWord = (date = new Date()) => {
  const seed = getDateSeed(date);
  const randomIndex = Math.floor(pseudoRandom(seed) * words.length);
  return words[randomIndex];
};
