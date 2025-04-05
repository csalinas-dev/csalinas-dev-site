"use client";

import styled from "@emotion/styled";

// Styled components
const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  width: 100%;
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
  color: ${(props) => (props.highlight ? "var(--comment)" : "white")};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #818384;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const BarChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.5rem;
  margin-top: 1rem;
  max-width: 600px;
`;

const BarChartTitle = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1rem;
  color: white;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 0.5rem;
`;

const BarLabel = styled.div`
  width: 1rem;
  text-align: right;
  color: white;
`;

const BarContainer = styled.div`
  flex: 1;
  height: 1.5rem;
  background-color: var(--background);
  border-radius: 0.25rem;
  overflow: hidden;
`;

const Bar = styled.div`
  align-items: center;
  background-color: var(--comment);
  color: var(--background);
  display: flex;
  font-size: 1rem;
  height: 100%;
  justify-content: flex-end;
  padding-right: 8px;
  transition: width 0.5s ease;
  width: ${(props) => props.width}%;
`;

/**
 * Stats component to display game statistics
 * @param {Object} props - Component props
 * @param {Object} props.history - History data containing games, streak, and maxStreak
 * @returns {JSX.Element} Stats component
 */
const Stats = ({ history }) => {
  const { games, streak, maxStreak, guessCounts = [0, 0, 0, 0, 0, 0] } = history;
  const gamesPlayed = games.filter((game) => game.completed).length;
  const gamesWon = games.filter((game) => game.win).length;

  if (gamesPlayed === 0) {
    return null;
  }

  // Calculate the maximum value for scaling the bars
  const maxGuessCount = Math.max(...guessCounts, 1);

  return (
    <StatsContainer>
      <StatsGrid>
        <StatBox>
          <StatValue>{gamesPlayed}</StatValue>
          <StatLabel>Played</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{gamesWon}</StatValue>
          <StatLabel>Won</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{Math.round(gamesWon / gamesPlayed * 100, 0)}%</StatValue>
          <StatLabel>Win %</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue highlight={true}>{streak}</StatValue>
          <StatLabel>Current Streak</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{maxStreak}</StatValue>
          <StatLabel>Max Streak</StatLabel>
        </StatBox>
      </StatsGrid>

      <BarChartContainer>
        <BarChartTitle>Guess Distribution</BarChartTitle>
        {guessCounts.map((count, index) => (
          <BarRow key={index}>
            <BarLabel>{index + 1}</BarLabel>
            <BarContainer>
              <Bar width={(count / maxGuessCount) * 100}>
                {count > 0 && count}
              </Bar>
            </BarContainer>
          </BarRow>
        ))}
      </BarChartContainer>
    </StatsContainer>
  );
};

export default Stats;
