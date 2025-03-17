"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import dateFormat from "dateformat";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  padding: 2rem;
  background-color: #121213;
  color: white;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 800px;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const BackLink = styled(Link)`
  align-self: flex-start;
  color: #818384;
  text-decoration: none;
  margin-bottom: 1rem;
  
  &:hover {
    color: white;
  }
`;

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
  background-color: #3a3a3c;
  border-radius: 5px;
  padding: 1rem;
  min-width: 100px;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.highlight ? "#538d4e" : "white"};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #818384;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const TabContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 800px;
  margin-bottom: 1rem;
`;

const Tab = styled.button`
  flex: 1;
  background-color: ${props => props.active ? "#3a3a3c" : "transparent"};
  color: ${props => props.active ? "white" : "#818384"};
  border: none;
  border-bottom: 2px solid ${props => props.active ? "#538d4e" : "#3a3a3c"};
  padding: 0.5rem;
  cursor: pointer;
  font-weight: ${props => props.active ? "bold" : "normal"};
  
  &:hover {
    color: white;
  }
`;

const ContentContainer = styled.div`
  width: 100%;
  max-width: 800px;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #3a3a3c;
  border-radius: 5px;
  cursor: ${props => props.clickable ? "pointer" : "default"};
  
  &:hover {
    background-color: ${props => props.clickable ? "#4a4a4c" : "#3a3a3c"};
  }
`;

const DateDiv = styled.div`
  font-weight: bold;
`;

const Word = styled.div`
  font-family: monospace;
  letter-spacing: 0.1em;
`;

const Result = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Guesses = styled.div`
  font-weight: ${(props) => (props.win ? "bold" : "normal")};
  color: ${(props) => (props.win ? "#538d4e" : "#ee4237")};
`;

const CalendarContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  width: 100%;
`;

const DayHeader = styled.div`
  text-align: center;
  font-weight: bold;
  color: #818384;
  padding: 0.5rem;
`;

const CalendarDay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background-color: ${props => 
    props.isToday ? "#538d4e" : 
    props.completed ? "#3a3a3c" : 
    props.played ? "#4a4a4c" : 
    "transparent"};
  border: 1px solid ${props => props.empty ? "transparent" : "#3a3a3c"};
  border-radius: 5px;
  color: ${props => props.empty ? "transparent" : "white"};
  cursor: ${props => (props.empty || (!props.playable && !props.completed)) ? "default" : "pointer"};
  opacity: ${props => (props.empty || (!props.playable && !props.completed)) ? 0.3 : 1};
  
  &:hover {
    background-color: ${props => 
      (props.empty || (!props.playable && !props.completed)) ? 
      (props.isToday ? "#538d4e" : props.completed ? "#3a3a3c" : props.played ? "#4a4a4c" : "transparent") : 
      "#4a4a4c"};
  }
`;

const DayNumber = styled.div`
  font-size: 1rem;
  font-weight: ${props => props.isToday ? "bold" : "normal"};
`;

const DayStatus = styled.div`
  font-size: 0.7rem;
  color: ${props => props.win ? "#538d4e" : props.lose ? "#ee4237" : "#818384"};
`;

const NoHistory = styled.div`
  text-align: center;
  color: #818384;
  margin-top: 2rem;
`;

const SignInPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
  gap: 1rem;
  text-align: center;
  color: #818384;
`;

const SignInButton = styled.button`
  background-color: #538d4e;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #6aaa5e;
  }
`;

const GameDetails = styled.div`
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
    props.status === "correct" ? "#538d4e" : 
    props.status === "present" ? "#b59f3b" : 
    props.status === "absent" ? "#3a3a3c" : 
    "#121213"};
  border: 2px solid ${props => 
    props.status === "correct" ? "#538d4e" : 
    props.status === "present" ? "#b59f3b" : 
    props.status === "absent" ? "#3a3a3c" : 
    "#3a3a3c"};
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: bold;
`;

const PlayButton = styled.button`
  background-color: #538d4e;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
  margin-top: 1rem;
  
  &:hover {
    background-color: #6aaa5e;
  }
`;

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (dateString) => {
  return dateFormat(new Date(dateString), "mmmm d, yyyy");
};

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [history, setHistory] = useState({ games: [], streak: 0, maxStreak: 0 });
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
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
          const response = await fetch("/api/wordleverse/history?includeDates=true");
          if (response.ok) {
            const data = await response.json();
            setHistory({
              games: data.games || [],
              streak: data.streak || 0,
              maxStreak: data.maxStreak || 0
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
            const yesterday = dateFormat(new Date(Date.now() - 86400000), "yyyy-mm-dd");
            
            for (let i = 0; i < localHistory.length; i++) {
              const game = localHistory[i];
              const gameDate = game.date;
              
              if (i === 0 && (gameDate === today || gameDate === yesterday) && game.win) {
                currentStreak = 1;
              } else if (i > 0) {
                const prevGame = localHistory[i-1];
                const dayDiff = Math.round((new Date(prevGame.date) - new Date(gameDate)) / (1000 * 60 * 60 * 24));
                
                if (dayDiff === 1 && game.win) {
                  currentStreak++;
                } else {
                  break;
                }
              }
            }
            
            streak = currentStreak;
            maxStreak = Math.max(...localHistory.filter(game => game.win).map(game => game.guesses || 0));
          }
        }
        
        setHistory({
          games: localHistory,
          streak,
          maxStreak
        });
        
        // Create available dates for localStorage (simplified)
        const today = new Date();
        const availableDates = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = dateFormat(date, "yyyy-mm-dd");
          const game = localHistory.find(g => g.date === dateStr);
          
          availableDates.push({
            date: dateStr,
            played: !!game,
            completed: !!game,
            isToday: i === 0
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
        const response = await fetch(`/api/wordleverse/game?date=${game.date}`);
        if (response.ok) {
          const gameData = await response.json();
          setSelectedGame({
            ...game,
            board: gameData.board,
            guesses: gameData.guesses
          });
        }
      } catch (error) {
        console.error("Error fetching game details:", error);
      }
    }
  };

  const handleCalendarDayClick = (date) => {
    const dateObj = availableDates.find(d => d.date === date);
    if (!dateObj || (!dateObj.played && !dateObj.isToday)) return;
    
    // If it's a completed game, show details
    if (dateObj.completed) {
      const game = history.games.find(g => g.date === date);
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
    DAYS_OF_WEEK.forEach(day => {
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
      const dateInfo = availableDates.find(d => d.date === dateStr) || {
        date: dateStr,
        played: false,
        completed: false,
        isToday: dateFormat(new Date(), "yyyy-mm-dd") === dateStr
      };
      
      const game = history.games.find(g => g.date === dateStr);
      
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
    
    return (
      <CalendarContainer>
        {days}
      </CalendarContainer>
    );
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
                {history.games.filter(game => game.win).length}
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
                          <Guesses win={true}>
                            {item.guesses}/6
                          </Guesses>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                    {selectedGame.board.slice(0, selectedGame.guesses || 6).map((row, rowIndex) => (
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
                    
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
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