"use client";

import dateFormat from "dateformat";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { getHistory } from "./_actions/getHistory";
import {
  BackLink,
  CalendarContainer,
  CalendarDay,
  CloseButton,
  Container,
  ContentContainer,
  DateDiv,
  DayHeader,
  DayNumber,
  DayStatus,
  GameDetailHeader,
  GameDetailTitle,
  GameDetails,
  GuessCell,
  GuessGrid,
  Guesses,
  Header,
  HistoryItem,
  HistoryList,
  NoHistory,
  PlayButton,
  Result,
  SignInButton,
  SignInPrompt,
  StatBox,
  StatLabel,
  StatValue,
  StatsContainer,
  Tab,
  TabContainer,
  Title,
  Word,
} from "./_components/styled";
import { getOrCreateGame } from "../_actions/getOrCreateGame";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (dateString) => {
  return dateFormat(new Date(dateString), "mmmm d, yyyy");
};

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [history, setHistory] = useState({
    games: [],
    streak: 0,
    maxStreak: 0,
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedGame, setSelectedGame] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

      if (status === "loading") {
        return;
      }

      if (session) {
        // Fetch history from database for authenticated users
        try {
          const data = await getHistory({ includeAvailableDates: true });
          if (!data.error) {
            setHistory({
              games: data.games || [],
              streak: data.streak || 0,
              maxStreak: data.maxStreak || 0,
            });
            setAvailableDates(data.availableDates || []);
          } else {
            console.error("Failed to fetch history");
          }
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      } else {
        // Use localStorage for non-authenticated users
        const localHistory = [];
        let streak = 0;
        let maxStreak = 0;

        if (typeof window !== "undefined") {
          // Get all localStorage keys
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith("WORDLEVERSE-")) {
              try {
                const date = key.replace("WORDLEVERSE-", "");
                const gameData = JSON.parse(localStorage.getItem(key));

                if (gameData.win !== null) {
                  localHistory.push({
                    date,
                    word: gameData.word || "?????",
                    guesses: gameData.win ? gameData.row : null,
                    win: gameData.win,
                  });
                }
              } catch (error) {
                console.error("Error parsing localStorage item:", error);
              }
            }
          }

          // Calculate streak (simplified version for localStorage)
          if (localHistory.length > 0) {
            // Sort by date (newest first)
            localHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Calculate current streak
            let currentStreak = 0;
            const today = dateFormat(new Date(), "yyyy-mm-dd");
            const yesterday = dateFormat(
              new Date(Date.now() - 86400000),
              "yyyy-mm-dd"
            );

            for (let i = 0; i < localHistory.length; i++) {
              const game = localHistory[i];
              const gameDate = game.date;

              if (
                i === 0 &&
                (gameDate === today || gameDate === yesterday) &&
                game.win
              ) {
                currentStreak = 1;
              } else if (i > 0) {
                const prevGame = localHistory[i - 1];
                const dayDiff = Math.round(
                  (new Date(prevGame.date) - new Date(gameDate)) /
                    (1000 * 60 * 60 * 24)
                );

                if (dayDiff === 1 && game.win) {
                  currentStreak++;
                } else {
                  break;
                }
              }
            }

            streak = currentStreak;
            maxStreak = Math.max(
              ...localHistory
                .filter((game) => game.win)
                .map((game) => game.guesses || 0)
            );
          }
        }

        setHistory({
          games: localHistory,
          streak,
          maxStreak,
        });

        // Create available dates for localStorage (simplified)
        const today = new Date();
        const availableDates = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = dateFormat(date, "yyyy-mm-dd");
          const game = localHistory.find((g) => g.date === dateStr);

          availableDates.push({
            date: dateStr,
            played: !!game,
            completed: !!game,
            isToday: i === 0,
          });
        }

        setAvailableDates(availableDates);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [session, status]);

  const handleGameClick = async (game) => {
    setSelectedGame(game);

    // If authenticated, fetch the full game details
    if (session && game) {
      try {
        const gameData = getOrCreateGame(game.date);
        if (!gameData.error) {
          setSelectedGame({
            ...game,
            board: gameData.board,
            guesses: gameData.guesses,
          });
        }
      } catch (error) {
        console.error("Error fetching game details:", error);
      }
    }
  };

  const handleCalendarDayClick = (date) => {
    const dateObj = availableDates.find((d) => d.date === date);
    if (!dateObj || (!dateObj.played && !dateObj.isToday)) return;

    // If it's a completed game, show details
    if (dateObj.completed) {
      const game = history.games.find((g) => g.date === date);
      if (game) {
        handleGameClick(game);
      }
    } else {
      // Otherwise, play this date's game
      playGame(date);
    }
  };

  const playGame = (date) => {
    // Redirect to the game page with the date parameter
    router.push(`/games/wordleverse?date=${date}`);
  };

  const closeGameDetails = () => {
    setSelectedGame(null);
  };

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();

    // Calculate total days in the calendar view (including padding)
    const totalDays = firstDayOfWeek + lastDay.getDate();
    const totalWeeks = Math.ceil(totalDays / 7);

    // Create calendar days
    const days = [];

    // Add day headers
    DAYS_OF_WEEK.forEach((day) => {
      days.push(<DayHeader key={`header-${day}`}>{day}</DayHeader>);
    });

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<CalendarDay key={`empty-${i}`} empty />);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = dateFormat(date, "yyyy-mm-dd");
      const dateInfo = availableDates.find((d) => d.date === dateStr) || {
        date: dateStr,
        played: false,
        completed: false,
        isToday: dateFormat(new Date(), "yyyy-mm-dd") === dateStr,
      };

      const game = history.games.find((g) => g.date === dateStr);

      days.push(
        <CalendarDay
          key={dateStr}
          isToday={dateInfo.isToday}
          played={dateInfo.played}
          completed={dateInfo.completed}
          playable={!dateInfo.completed || dateInfo.isToday}
          onClick={() => handleCalendarDayClick(dateStr)}
        >
          <DayNumber isToday={dateInfo.isToday}>{day}</DayNumber>
          {game && (
            <DayStatus win={game.win} lose={!game.win}>
              {game.win ? `${game.guesses}/6` : "X"}
            </DayStatus>
          )}
        </CalendarDay>
      );
    }

    return <CalendarContainer>{days}</CalendarContainer>;
  };

  const changeMonth = (increment) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCalendarMonth(newMonth);
  };

  return (
    <Container>
      <Header>
        <BackLink href="/games/wordleverse">← Back to Game</BackLink>
        <Title>Wordleverse History</Title>
      </Header>

      {loading ? (
        <div>Loading history...</div>
      ) : (
        <>
          {!session && (
            <SignInPrompt>
              <p>Sign in to save your game history across devices!</p>
              <Link href="/auth/signin" passHref>
                <SignInButton>Sign In</SignInButton>
              </Link>
            </SignInPrompt>
          )}

          <StatsContainer>
            <StatBox>
              <StatValue>{history.games.length}</StatValue>
              <StatLabel>Played</StatLabel>
            </StatBox>
            <StatBox>
              <StatValue>
                {history.games.filter((game) => game.win).length}
              </StatValue>
              <StatLabel>Won</StatLabel>
            </StatBox>
            <StatBox>
              <StatValue highlight={true}>{history.streak}</StatValue>
              <StatLabel>Current Streak</StatLabel>
            </StatBox>
            <StatBox>
              <StatValue>{history.maxStreak}</StatValue>
              <StatLabel>Max Streak</StatLabel>
            </StatBox>
          </StatsContainer>

          <TabContainer>
            <Tab
              active={activeTab === "list"}
              onClick={() => setActiveTab("list")}
            >
              List View
            </Tab>
            <Tab
              active={activeTab === "calendar"}
              onClick={() => setActiveTab("calendar")}
            >
              Calendar View
            </Tab>
          </TabContainer>

          <ContentContainer>
            {activeTab === "list" ? (
              history.games.length > 0 ? (
                <HistoryList>
                  {history.games.map((item) => (
                    <HistoryItem
                      key={item.date}
                      clickable
                      onClick={() => handleGameClick(item)}
                    >
                      <DateDiv>{formatDate(item.date)}</DateDiv>
                      <Word>{item.word}</Word>
                      <Result>
                        {item.win ? (
                          <Guesses win={true}>{item.guesses}/6</Guesses>
                        ) : (
                          <Guesses win={false}>X/6</Guesses>
                        )}
                      </Result>
                    </HistoryItem>
                  ))}
                </HistoryList>
              ) : (
                <NoHistory>
                  <p>No game history found.</p>
                  <p>Complete a game to see your history!</p>
                </NoHistory>
              )
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <button onClick={() => changeMonth(-1)}>Previous</button>
                  <h3>{dateFormat(calendarMonth, "mmmm yyyy")}</h3>
                  <button onClick={() => changeMonth(1)}>Next</button>
                </div>
                {renderCalendar()}
              </>
            )}

            {selectedGame && (
              <GameDetails>
                <GameDetailHeader>
                  <GameDetailTitle>
                    {formatDate(selectedGame.date)} - {selectedGame.word}
                  </GameDetailTitle>
                  <CloseButton onClick={closeGameDetails}>×</CloseButton>
                </GameDetailHeader>

                {selectedGame.board ? (
                  <div>
                    {selectedGame.board
                      .slice(0, selectedGame.guesses || 6)
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

                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                      {selectedGame.win ? (
                        <p>Solved in {selectedGame.guesses} guesses</p>
                      ) : (
                        <p>Better luck next time!</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>
                    {selectedGame.win
                      ? `Solved in ${selectedGame.guesses} guesses`
                      : "Not solved"}
                  </p>
                )}

                {!selectedGame.completed && (
                  <PlayButton onClick={() => playGame(selectedGame.date)}>
                    Play This Puzzle
                  </PlayButton>
                )}
              </GameDetails>
            )}
          </ContentContainer>
        </>
      )}
    </Container>
  );
}
