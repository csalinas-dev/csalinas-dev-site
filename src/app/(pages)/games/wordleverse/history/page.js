"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styled from "@emotion/styled";
import dateFormat from "dateformat";

const formatDate = (dateString) => {
  return dateFormat(new Date(dateString), "mmmm d, yyyy");
};

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
  max-width: 500px;
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

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  gap: 1rem;
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #3a3a3c;
  border-radius: 5px;
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

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      
      if (status === "loading") {
        return;
      }
      
      if (session) {
        // Fetch history from database for authenticated users
        try {
          const response = await fetch("/api/wordleverse/history");
          if (response.ok) {
            const data = await response.json();
            setHistory(data);
          } else {
            console.error("Failed to fetch history");
          }
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      } else {
        // Use localStorage for non-authenticated users
        const localHistory = [];
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
        }
        
        // Sort by date (newest first)
        localHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(localHistory);
      }
      
      setLoading(false);
    };

    fetchHistory();
  }, [session, status]);

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
          
          {history.length > 0 ? (
            <HistoryList>
              {history.map((item) => (
                <HistoryItem key={item.date}>
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
          )}
        </>
      )}
    </Container>
  );
}