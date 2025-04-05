import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styled from "@emotion/styled";

import { getHistory } from "@wordleverse-history/_actions/getHistory";
import { getHistoryFromLocalStorage } from "@wordleverse-history/_lib/storage/localStorage";

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 1rem;
  margin-top: 1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  width: 100%;
`;

const StatBox = styled.div`
  align-items: center;
  justify-content: center;
  background-color: var(--background);
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 3.75rem;
  padding: 0rem 0.7rem;

  @media (min-width: 768px) {
    height: 4.5rem;
    padding: 0rem 1rem;
  }
`;

const StatValue = styled.div`
  color: ${(props) =>
    props.highlight ? "var(--comment)" : "var(--foreground)"};
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1.5rem;
`;

const StatLabel = styled.div`
  color: var(--foreground);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  line-height: 0.8rem;
  opacity: 0.7;
  text-align: center;
  text-transform: uppercase;
`;

const BarChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const BarChartTitle = styled.div`
  font-size: 1rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5rem;
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
  font-size: 1.25rem;
  height: 100%;
  justify-content: flex-end;
  padding-right: 8px;
  transition: width 0.5s ease;
  width: ${(props) => props.width}%;
`;

const Button = styled(Link)`
  background-color: var(--background);
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  margin-top: 1rem;
  text-decoration: none;
`;

export const Stats = () => {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState({
    games: [],
    streak: 0,
    maxStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [guessCounts, setGuessCounts] = useState([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

      if (status === "loading") {
        return;
      }

      if (session) {
        // Fetch history from database for authenticated users
        try {
          const data = await getHistory();
          if (!data.error) {
            setHistory({
              games: data.games || [],
              streak: data.streak || 0,
              maxStreak: data.maxStreak || 0,
            });

            // Calculate guess distribution
            const counts = [0, 0, 0, 0, 0, 0];
            data.games.forEach((game) => {
              if (game.win) {
                counts[game.guesses.length - 1]++;
              }
            });
            setGuessCounts(counts);
          } else {
            console.error("Failed to fetch history");
          }
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      } else {
        // Use consolidated localStorage functionality from history folder
        const localData = getHistoryFromLocalStorage();
        setHistory({
          games: localData.games || [],
          streak: localData.streak || 0,
          maxStreak: localData.maxStreak || 0,
        });
        setGuessCounts(localData.guessCounts || [0, 0, 0, 0, 0, 0]);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [session, status]);

  const totalGames = history.games.filter((game) => game.completed).length;
  const gamesWon = history.games.filter((game) => game.win).length;
  const winPercentage =
    totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

  const maxGuessCount = Math.max(...guessCounts, 1);

  if (loading) {
    return <div>Loading stats...</div>;
  }

  return (
    <StatsContainer>
      <StatsGrid>
        <StatBox>
          <StatValue>{totalGames}</StatValue>
          <StatLabel>Played</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{winPercentage}%</StatValue>
          <StatLabel>Win %</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue highlight={true}>{history.streak}</StatValue>
          <StatLabel>Current Streak</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{history.maxStreak}</StatValue>
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

      <Button href="/games/wordleverse/history">View Full History</Button>
    </StatsContainer>
  );
};
