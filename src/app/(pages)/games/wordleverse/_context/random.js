import words from "@/data/words.json";
import dateFormat from "dateformat";

/**
 * Generates a seed based on a date
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {number} - Seed value
 */
export const getDateSeed = (date) => {
  // If date is a string, convert it to a Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return (
    dateObj.getFullYear() * 10000 + (dateObj.getMonth() + 1) * 100 + dateObj.getDate()
  );
};

/**
 * Gets today's date seed
 * @returns {number} - Seed value for today
 */
export const getTodaysDateSeed = () => {
  return getDateSeed(new Date());
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
 * Selects a random item from an array based on a date
 * @param {Array} array - Array to select from
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {*} - Random item from the array
 */
export const selectRandomItemForDate = (array, date) => {
  const seed = getDateSeed(date);
  const randomIndex = Math.floor(pseudoRandom(seed) * array.length);
  return array[randomIndex];
};

/**
 * Selects a random item from an array based on today's date
 * @param {Array} array - Array to select from
 * @returns {*} - Random item from the array
 */
export const selectRandomItem = (array) => {
  return selectRandomItemForDate(array, new Date());
};

/**
 * Gets a random word for a specific date
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {string} - Random word for the given date
 */
export const getRandomWordForDate = (date) => {
  return selectRandomItemForDate(words, date);
};

/**
 * Gets a random word for today
 * @returns {string} - Random word for today
 */
export const getTodaysRandomWord = () => {
  return getRandomWordForDate(new Date());
};
