"use client";

import styled from "@emotion/styled";
import dateFormat from "dateformat";

// Styled components
const GameDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #3a3a3c;
  border-radius: 5px;
  padding: 1rem;
  margin-top: 1rem;
`;

const GameDetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const GameDetailTitle = styled.h3`
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #818384;
  cursor: pointer;
  font-size: 1.2rem;
  
  &:hover {
    color: white;
  }
`;

const GuessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

const GuessCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background-color: ${props => 
    props.status === "correct" ? "var(--comment)" : 
    props.status === "present" ? "#b59f3b" : 
    props.status === "absent" ? "#3a3a3c" : 
    "#121213"};
  border: 2px solid ${props => 
    props.status === "correct" ? "var(--comment)" : 
    props.status === "present" ? "#b59f3b" : 
    props.status === "absent" ? "#3a3a3c" : 
    "#3a3a3c"};
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: bold;
`;

const ResultMessage = styled.p`
  text-align: center;
  margin: 1rem 0;
`;

const PlayButton = styled.button`
  background-color: var(--comment);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
  margin-top: 1rem;
  
  &:hover {
    background-color: #7ab966;
  }
`;

// Helper function to format date
const formatDate = (dateString) => {
  return dateFormat(new Date(dateString), "mmmm d, yyyy");
};

/**
 * GameDetails component to display details of a selected game
 * @param {Object} props - Component props
 * @param {Object} props.game - Selected game data
 * @param {Function} props.onClose - Handler for close button
 * @param {Function} props.onPlay - Handler for play button
 * @returns {JSX.Element} GameDetails component
 */
const GameDetails = ({ game, onClose, onPlay }) => {
  if (!game) return null;

  return (
    <GameDetailsContainer>
      <GameDetailHeader>
        <GameDetailTitle>
          {formatDate(game.date)} - {game.word}
        </GameDetailTitle>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameDetailHeader>

      {game.board ? (
        <div>
          {game.board
            .slice(0, game.guesses || 6)
            .map((row, rowIndex) => (
              <GuessGrid key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <GuessCell
                    key={`${rowIndex}-${cellIndex}`}
                    status={cell.status}
                  >
                    {cell.letter}
                  </GuessCell>
                ))}
              </GuessGrid>
            ))}

          <ResultMessage>
            {game.win ? (
              <span>Solved in {game.guesses} guesses</span>
            ) : (
              <span>Better luck next time!</span>
            )}
          </ResultMessage>
        </div>
      ) : (
        <ResultMessage>
          {game.win
            ? `Solved in ${game.guesses} guesses`
            : "Not solved"}
        </ResultMessage>
      )}

      {!game.completed && (
        <PlayButton onClick={() => onPlay(game.date)}>
          Play This Puzzle
        </PlayButton>
      )}
    </GameDetailsContainer>
  );
};

export default GameDetails;