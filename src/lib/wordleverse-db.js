import { prisma } from "./prisma";
import dateFormat from "dateformat";

// Get or create a game for the current user and date
export async function getOrCreateGame(userId, word, date = null) {
  if (!userId) return null;

  const gameDate = date || dateFormat(new Date(), "yyyy-mm-dd");
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const isPastGame = date && date !== today;
  
  // Try to find an existing game for this user and date
  let game = await prisma.wordleGame.findUnique({
    where: {
      userId_date: {
        userId,
        date: gameDate,
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
        date: gameDate,
        word,
        board,
        keyboard,
        guesses: [],
        row: 0,
        expert: false,
        win: null,
        completed: false,
        playable: true,
      },
    });
  }

  return game;
}

// Get a specific game by date
export async function getGameByDate(userId, date) {
  if (!userId || !date) return null;
  
  const game = await prisma.wordleGame.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  });
  
  return game;
}

// Save game state
export async function saveGameState(userId, gameState, date = null) {
  if (!userId) return null;

  const gameDate = date || dateFormat(new Date(), "yyyy-mm-dd");
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const { board, keyboard, row, expert, win, completed, guesses } = gameState;

  // Update the game
  const updatedGame = await prisma.wordleGame.update({
    where: {
      userId_date: {
        userId,
        date: gameDate,
      },
    },
    data: {
      board,
      keyboard,
      guesses: guesses || [],
      row,
      expert,
      win,
      completed,
      playable: !completed,
    },
  });

  // If the game is completed, add to history and update streak
  if (completed && updatedGame.win !== null) {
    await prisma.wordleHistory.upsert({
      where: {
        userId_date: {
          userId,
          date: gameDate,
        },
      },
      update: {
        guesses: updatedGame.win ? row : null,
        win: updatedGame.win,
      },
      create: {
        userId,
        date: gameDate,
        word: updatedGame.word,
        guesses: updatedGame.win ? row : null,
        win: updatedGame.win,
      },
    });

    // Only update streak for today's game
    if (gameDate === today) {
      await updateStreak(userId, updatedGame.win);
    }
  }

  return updatedGame;
}

// Update user's streak
async function updateStreak(userId, isWin) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak, maxStreak, lastPlayedDate },
  });

  if (!user) return;

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const yesterday = dateFormat(new Date(Date.now() - 86400000), "yyyy-mm-dd");
  
  let newStreak = 0;
  let newMaxStreak = user.maxStreak;

  if (isWin) {
    // If user won and played yesterday, increment streak
    if (user.lastPlayedDate === yesterday) {
      newStreak = user.streak + 1;
    }
    // If user won but didn't play yesterday, reset streak to 1
    else {
      newStreak = 1;
    }
    
    // Update max streak if needed
    if (newStreak > user.maxStreak) {
      newMaxStreak = newStreak;
    }
  } else {
    // If user lost, reset streak to 0
    newStreak = 0;
  }

  // Update user's streak information
  await prisma.user.update({
    where: { id: userId },
    data: {
      streak: newStreak,
      maxStreak: newMaxStreak,
      lastPlayedDate: today,
    },
  });
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

  // Get user's streak information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak, maxStreak },
  });

  return {
    games: history,
    streak: user?.streak || 0,
    maxStreak: user?.maxStreak || 0
  };
}

// Get all available dates for a user
export async function getAvailableDates(userId) {
  if (!userId) return [];

  // Get all dates from the beginning of the game to today
  const startDate = new Date('2022-01-01'); // Adjust this to when your game started
  const today = new Date();
  const allDates = [];
  
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    allDates.push(dateFormat(d, "yyyy-mm-dd"));
  }
  
  // Get all games the user has played
  const playedGames = await prisma.wordleGame.findMany({
    where: {
      userId,
    },
    select: {
      date: true,
      completed: true,
    },
  });
  
  const playedDates = new Set(playedGames.map(game => game.date));
  const completedDates = new Set(playedGames.filter(game => game.completed).map(game => game.date));
  
  // Return all dates with their status
  return allDates.map(date => ({
    date,
    played: playedDates.has(date),
    completed: completedDates.has(date),
    isToday: date === dateFormat(today, "yyyy-mm-dd"),
  }));
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