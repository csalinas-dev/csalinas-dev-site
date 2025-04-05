"use client";

import styled from "@emotion/styled";

// Styled components
const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 800px;
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--selectionBackground);
  border-radius: 5px;
  padding: 1rem;
  min-width: 100px;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.highlight ? "var(--comment)" : "white"};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #818384;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

/**
 * Stats component to display game statistics
 * @param {Object} props - Component props
 * @param {Object} props.history - History data containing games, streak, and maxStreak
 * @returns {JSX.Element} Stats component
 */
const Stats = ({ history }) => {
  const { games, streak, maxStreak } = history;
  const gamesPlayed = games.length;
  const gamesWon = games.filter(game => game.win).length;

  return (
    <StatsContainer>
      <StatBox>
        <StatValue>{gamesPlayed}</StatValue>
        <StatLabel>Played</StatLabel>
      </StatBox>
      <StatBox>
        <StatValue>{gamesWon}</StatValue>
        <StatLabel>Won</StatLabel>
      </StatBox>
      <StatBox>
        <StatValue highlight={true}>{streak}</StatValue>
        <StatLabel>Current Streak</StatLabel>
      </StatBox>
      <StatBox>
        <StatValue>{maxStreak}</StatValue>
        <StatLabel>Max Streak</StatLabel>
      </StatBox>
    </StatsContainer>
  );
};

export default Stats;