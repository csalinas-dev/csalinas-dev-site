"use client";

import styled from "@emotion/styled";

// Styled components
const DayContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background-color: ${props => 
    props.empty ? "transparent" :
    props.isToday && !props.completed ? "var(--var)" : // Today (not completed) - light blue
    props.win ? "var(--comment)" : // Win - green
    props.lose ? "var(--invalid)" : // Lose - red
    props.played ? "#4a4a4c" : 
    "transparent"};
  border: 2px solid ${props => 
    props.empty ? "transparent" : 
    props.isToday && !props.completed ? "var(--var)" :
    props.win ? "var(--comment)" :
    props.lose ? "var(--invalid)" :
    "#3a3a3c"};
  border-radius: 5px;
  color: ${props => props.empty ? "transparent" : "white"};
  cursor: ${props => (props.empty || (!props.playable && !props.completed)) ? "default" : "pointer"};
  opacity: ${props => (props.empty || (!props.playable && !props.completed)) ? 0.3 : 1};
  
  &:hover {
    background-color: ${props => 
      (props.empty || (!props.playable && !props.completed)) ? 
      (props.isToday && !props.completed ? "var(--var)" : 
       props.win ? "var(--comment)" : 
       props.lose ? "var(--invalid)" : 
       props.played ? "#4a4a4c" : "transparent") : 
      "#4a4a4c"};
  }
`;

const DayNumber = styled.div`
  font-size: 1rem;
  font-weight: ${props => props.isToday ? "bold" : "normal"};
`;

const DayStatus = styled.div`
  font-size: 0.7rem;
  color: white;
  font-weight: bold;
`;

/**
 * CalendarDay component to display a single day in the calendar
 * @param {Object} props - Component props
 * @param {Boolean} props.empty - Whether the day is empty (padding)
 * @param {Boolean} props.isToday - Whether the day is today
 * @param {Boolean} props.played - Whether the game for this day has been played
 * @param {Boolean} props.completed - Whether the game for this day has been completed
 * @param {Boolean} props.playable - Whether the game for this day is playable
 * @param {Boolean} props.win - Whether the game for this day was won
 * @param {Boolean} props.lose - Whether the game for this day was lost
 * @param {Number} props.day - The day number
 * @param {Number} props.guesses - Number of guesses made (if won)
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} CalendarDay component
 */
const CalendarDay = ({ 
  empty, 
  isToday, 
  played, 
  completed, 
  playable, 
  win, 
  lose, 
  day, 
  guesses, 
  onClick, 
  children 
}) => {
  if (empty) {
    return <DayContainer empty />;
  }

  return (
    <DayContainer
      isToday={isToday}
      played={played}
      completed={completed}
      playable={playable}
      win={win}
      lose={lose}
      onClick={onClick}
    >
      <DayNumber isToday={isToday}>{day}</DayNumber>
      {completed && (
        <DayStatus>
          {win ? `${guesses}/6` : "X"}
        </DayStatus>
      )}
      {children}
    </DayContainer>
  );
};

export default CalendarDay;