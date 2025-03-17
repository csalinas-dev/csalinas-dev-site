import { prisma } from "./prisma";
import dateFormat from "dateformat";

// Get or create a game for the current user and date
export async function getOrCreateGame(userId, word) {
  if (!userId) return null;

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  
  // Try to find an existing game for this user and date
  let game = await prisma.wordleGame.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  // If no game exists, create a new one
  if (!game) {
    // Initialize empty board
    const board = Array(6).fill().map((_, row) =>
      Array(5).fill().map((_, col) => ({
        key: `${row}${col}`,
        letter: "",
        status: "default",
      }))
    );

    // Initialize keyboard
    const keyboard = [
      { key: "00", label: "Q", status: "default" },
      { key: "01", label: "W", status: "default" },
      { key: "02", label: "E", status: "default" },
      { key: "03", label: "R", status: "default" },
      { key: "04", label: "T", status: "default" },
      { key: "05", label: "Y", status: "default" },
      { key: "06", label: "U", status: "default" },
      { key: "07", label: "I", status: "default" },
      { key: "08", label: "O", status: "default" },
      { key: "09", label: "P", status: "default" },
      { key: "10", label: "A", status: "default" },
      { key: "11", label: "S", status: "default" },
      { key: "12", label: "D", status: "default" },
      { key: "13", label: "F", status: "default" },
      { key: "14", label: "G", status: "default" },
      { key: "15", label: "H", status: "default" },
      { key: "16", label: "J", status: "default" },
      { key: "17", label: "K", status: "default" },
      { key: "18", label: "L", status: "default" },
      { key: "20", label: "ENTER", status: "default" },
      { key: "21", label: "Z", status: "default" },
      { key: "22", label: "X", status: "default" },
      { key: "23", label: "C", status: "default" },
      { key: "24", label: "V", status: "default" },
      { key: "25", label: "B", status: "default" },
      { key: "26", label: "N", status: "default" },
      { key: "27", label: "M", status: "default" },
      { key: "28", label: "DELETE", status: "default" },
    ];

    // Create new game
    game = await prisma.wordleGame.create({
      data: {
        userId,
        date: today,
        word,
        board: board,
        keyboard: keyboard,
        row: 0,
        expert: false,
        win: null,
        completed: false,
      },
    });
  }

  return game;
}

// Save game state
export async function saveGameState(userId, gameState) {
  if (!userId) return null;

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const { board, keyboard, row, expert, win, completed } = gameState;

  // Update the game
  const updatedGame = await prisma.wordleGame.update({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    data: {
      board,
      keyboard,
      row,
      expert,
      win,
      completed,
    },
  });

  // If the game is completed, add to history
  if (completed && updatedGame.win !== null) {
    await prisma.wordleHistory.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        guesses: updatedGame.win ? row : null,
        win: updatedGame.win,
      },
      create: {
        userId,
        date: today,
        word: updatedGame.word,
        guesses: updatedGame.win ? row : null,
        win: updatedGame.win,
      },
    });
  }

  return updatedGame;
}

// Get user's game history
export async function getUserGameHistory(userId) {
  if (!userId) return [];

  const history = await prisma.wordleHistory.findMany({
    where: {
      userId,
    },
    orderBy: {
      date: 'desc',
    },
  });

  return history;
}

// Set user preference for expert mode
export async function setExpertMode(userId, expertMode) {
  if (!userId) return null;

  const today = dateFormat(new Date(), "yyyy-mm-dd");

  // Update the current game if it exists
  const game = await prisma.wordleGame.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  if (game) {
    await prisma.wordleGame.update({
      where: {
        id: game.id,
      },
      data: {
        expert: expertMode,
      },
    });
  }

  return { expert: expertMode };
}