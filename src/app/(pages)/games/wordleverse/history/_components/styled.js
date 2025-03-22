"use client";

import styled from "@emotion/styled";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  padding: 2rem;
  background-color: #121213;
  color: white;
`;

export const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 800px;
`;

export const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

export const BackLink = styled(Link)`
  align-self: flex-start;
  color: #818384;
  text-decoration: none;
  margin-bottom: 1rem;
  
  &:hover {
    color: white;
  }
`;

export const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 800px;
`;

export const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #3a3a3c;
  border-radius: 5px;
  padding: 1rem;
  min-width: 100px;
`;

export const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.highlight ? "#538d4e" : "white"};
`;

export const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #818384;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

export const TabContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 800px;
  margin-bottom: 1rem;
`;

export const Tab = styled.button`
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

export const ContentContainer = styled.div`
  width: 100%;
  max-width: 800px;
`;

export const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
`;

export const HistoryItem = styled.div`
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

export const DateDiv = styled.div`
  font-weight: bold;
`;

export const Word = styled.div`
  font-family: monospace;
  letter-spacing: 0.1em;
`;

export const Result = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const Guesses = styled.div`
  font-weight: ${(props) => (props.win ? "bold" : "normal")};
  color: ${(props) => (props.win ? "#538d4e" : "#ee4237")};
`;

export const CalendarContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  width: 100%;
`;

export const DayHeader = styled.div`
  text-align: center;
  font-weight: bold;
  color: #818384;
  padding: 0.5rem;
`;

export const CalendarDay = styled.div`
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

export const DayNumber = styled.div`
  font-size: 1rem;
  font-weight: ${props => props.isToday ? "bold" : "normal"};
`;

export const DayStatus = styled.div`
  font-size: 0.7rem;
  color: ${props => props.win ? "#538d4e" : props.lose ? "#ee4237" : "#818384"};
`;

export const NoHistory = styled.div`
  text-align: center;
  color: #818384;
  margin-top: 2rem;
`;

export const SignInPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
  gap: 1rem;
  text-align: center;
  color: #818384;
`;

export const SignInButton = styled.button`
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

export const GameDetails = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #3a3a3c;
  border-radius: 5px;
  padding: 1rem;
  margin-top: 1rem;
`;

export const GameDetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

export const GameDetailTitle = styled.h3`
  margin: 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: #818384;
  cursor: pointer;
  font-size: 1.2rem;
  
  &:hover {
    color: white;
  }
`;

export const GuessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

export const GuessCell = styled.div`
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

export const PlayButton = styled.button`
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