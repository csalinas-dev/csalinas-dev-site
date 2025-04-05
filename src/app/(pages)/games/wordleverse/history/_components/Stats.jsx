"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styled from "@emotion/styled";

import { getHistory } from "../_actions/getHistory";
import { getHistoryFromLocalStorage } from "../_lib/storage/localStorage";

// Styled components
const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 1rem;
`;

const StatsGrid = styled.div`
  display: ${(props) => (props.compact ? "grid" : "flex")};
  ${(props) => props.compact ? "grid-template-columns: repeat(2, 1fr);" : "flex-flow: row wrap;"}
  justify-content: center;
  gap: ${(props) => (props.compact ? "1rem" : "2rem")};
  width: 100%;
  ${(props) => !props.compact && "margin-bottom: 2rem;"}
`;

const StatBox = styled.div`
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.historyPage ? "var(--selectionBackground)" : "var(--background)"};
  border-radius: ${(props) => (props.historyPage ? "5px" : "0.5rem")};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: ${(props) => (props.compact ? "3.75rem" : "auto")};
  padding: ${(props) => (props.compact ? "0rem 0.7rem" : "1rem")};
  min-width: ${(props) => (props.historyPage ? "100px" : "auto")};

  @media (min-width: 768px) {
    ${(props) => props.compact && "height: 4.5rem; padding: 0rem 1rem;"}
  }
`;

const StatValue = styled.div`
  color: ${(props) => {
    if (props.highlight) return "var(--comment)";
    return props.historyPage ? "white" : "var(--foreground)";
  }};
  font-size: ${(props) => (props.compact ? "1.5rem" : "2rem")};
  font-weight: bold;
  line-height: ${(props) => (props.compact ? "1.5rem" : "normal")};
`;

const StatLabel = styled.div`
  color: ${(props) => (props.historyPage ? "#818384" : "var(--foreground)")};
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  line-height: ${(props) => (props.compact ? "0.8rem" : "normal")};
  opacity: ${(props) => (props.compact ? "0.7" : "1")};
  text-align: center;
  text-transform: uppercase;
`;

const BarChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.5rem;
  margin-top: 1rem;
  max-width: ${(props) => (props.historyPage ? "600px" : "100%")};
`;

const BarChartTitle = styled.div`
  font-size: ${(props) => (props.historyPage ? "1.2rem" : "1rem")};
  font-weight: bold;
  text-align: center;
  margin-bottom: ${(props) => (props.historyPage ? "1rem" : "0.5rem")};
  color: ${(props) => (props.historyPage ? "white" : "inherit")};
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
  color: ${(props) => (props.historyPage ? "white" : "inherit")};
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
  font-size: ${(props) => (props.historyPage ? "1rem" : "1.25rem")};
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

/**
 * Shared Stats component that can be used in both the game alert and history page
 * @param {Object} props - Component props
 * @param {Object} props.history - Optional history data (if provided, won't fetch data)
 * @param {boolean} props.historyPage - Whether this is being rendered on the history page
 * @param {boolean} props.compact - Whether to use compact styling (for alerts)
 * @param {boolean} props.showHistoryLink - Whether to show the link to history page
 * @returns {JSX.Element} Stats component
 */
const SharedStats = ({ 
  history: providedHistory, 
  historyPage = false, 
  compact = false,
  showHistoryLink = true
}) => {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState(providedHistory || {
    games: [],
    streak: 0,
    maxStreak: 0,
    guessCounts: [0, 0, 0, 0, 0, 0]
  });
  const [loading, setLoading] = useState(!providedHistory);

  useEffect(() => {
    // If history is provided as a prop, don't fetch it
    if (providedHistory) {
      setHistory(providedHistory);
      setLoading(false);
      return;
    }

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
              guessCounts: data.guessCounts || [0, 0, 0, 0, 0, 0]
            });
          } else {
            console.error("Failed to fetch history");
          }
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      } else {
        // Use localStorage for non-authenticated users
        const localData = getHistoryFromLocalStorage();
        setHistory({
          games: localData.games || [],
          streak: localData.streak || 0,
          maxStreak: localData.maxStreak || 0,
          guessCounts: localData.guessCounts || [0, 0, 0, 0, 0, 0]
        });
      }

      setLoading(false);
    };

    fetchHistory();
  }, [session, status, providedHistory]);

  const { games, streak, maxStreak, guessCounts = [0, 0, 0, 0, 0, 0] } = history;
  const gamesPlayed = games.filter((game) => game.completed).length;
  const gamesWon = games.filter((game) => game.win).length;
  const winPercentage = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  // Calculate the maximum value for scaling the bars
  const maxGuessCount = Math.max(...guessCounts, 1);

  if (loading) {
    return <div>Loading stats...</div>;
  }

  if (gamesPlayed === 0) {
    return null;
  }

  return (
    <StatsContainer>
      <StatsGrid compact={compact}>
        <StatBox historyPage={historyPage} compact={compact}>
          <StatValue historyPage={historyPage} compact={compact}>{gamesPlayed}</StatValue>
          <StatLabel historyPage={historyPage} compact={compact}>Played</StatLabel>
        </StatBox>
        <StatBox historyPage={historyPage} compact={compact}>
          <StatValue historyPage={historyPage} compact={compact}>{winPercentage}%</StatValue>
          <StatLabel historyPage={historyPage} compact={compact}>Win %</StatLabel>
        </StatBox>
        <StatBox historyPage={historyPage} compact={compact}>
          <StatValue historyPage={historyPage} compact={compact} highlight={true}>{streak}</StatValue>
          <StatLabel historyPage={historyPage} compact={compact}>Current Streak</StatLabel>
        </StatBox>
        <StatBox historyPage={historyPage} compact={compact}>
          <StatValue historyPage={historyPage} compact={compact}>{maxStreak}</StatValue>
          <StatLabel historyPage={historyPage} compact={compact}>Max Streak</StatLabel>
        </StatBox>
      </StatsGrid>

      <BarChartContainer historyPage={historyPage}>
        <BarChartTitle historyPage={historyPage}>Guess Distribution</BarChartTitle>
        {guessCounts.map((count, index) => (
          <BarRow key={index}>
            <BarLabel historyPage={historyPage}>{index + 1}</BarLabel>
            <BarContainer>
              <Bar historyPage={historyPage} width={(count / maxGuessCount) * 100}>
                {count > 0 && count}
              </Bar>
            </BarContainer>
          </BarRow>
        ))}
      </BarChartContainer>

      {showHistoryLink && !historyPage && (
        <Button href="/games/wordleverse/history">View Full History</Button>
      )}
    </StatsContainer>
  );
};

export default SharedStats;