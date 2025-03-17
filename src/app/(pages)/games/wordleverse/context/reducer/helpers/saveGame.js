import dateFormat from "dateformat";

export const saveGame = async (state) => {
  const { error, guess, title, word, wordsRemaining, session, ...game } = state;

  if (title !== null) {
    return;
  }

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  
  // If user is authenticated, save to database
  if (session?.user) {
    try {
      // Convert enum values to strings for database storage
      const dbBoard = game.board.map(row =>
        row.map(cell => ({
          ...cell,
          status: cell.status.toString().toLowerCase()
        }))
      );
      
      const dbKeyboard = game.keyboard.map(key => ({
        ...key,
        status: key.status.toString().toLowerCase()
      }));
      
      const gameState = {
        ...game,
        board: dbBoard,
        keyboard: dbKeyboard,
        completed: game.win !== null || game.row > 5
      };
      
      await fetch('/api/wordleverse/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameState),
      });
    } catch (error) {
      console.error("Error saving game to database:", error);
      // Fallback to localStorage if database save fails
      localStorage.setItem(`WORDLEVERSE-${today}`, JSON.stringify(game));
    }
  } else {
    // For non-authenticated users, use localStorage
    localStorage.setItem(`WORDLEVERSE-${today}`, JSON.stringify(game));
  }
  
  // Always save expert mode preference to localStorage for convenience
  localStorage.setItem("expert", game.expert);
};
