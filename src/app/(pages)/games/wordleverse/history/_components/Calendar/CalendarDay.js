"use client";

import { Box, Stack, styled } from "@mui/material";
import Link from "next/link";

// Styled components
const DayContainer = styled(Stack)`
  aspect-ratio: 1;
  border-radius: 5px;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  text-decoration: none;
  padding: 0.5rem;
  ${"" /* transition: opacity 0.2s ease-in-out; */}
`;

const DayStatus = styled(Box)`
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
  day,
  date,
  guesses,
  children,
}) => {
  const disabled = !playable;
  let backgroundColor = "var(--selectionBackground)";

  if (empty) {
    return (
      <DayContainer
        sx={{
          backgroundColor,
          cursor: "default",
          opacity: 0.3,
          userSelect: "none",
        }}
      />
    );
  }

  if (isToday && !completed) {
    backgroundColor = "var(--var)"; // Today (not completed) - light blue
  } else if (completed && win) {
    backgroundColor = "var(--comment)"; // Win - green
  } else if (completed && !win) {
    backgroundColor = "var(--invalid)"; // Lose - red
  } else if (played) {
    backgroundColor = "var(--selector)"; // Played - orange-yellow
  }

  return (
    <DayContainer
      component={Link}
      href={`/games/wordleverse?date=${date}`}
      direction="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        backgroundColor,
        color:
          backgroundColor === "var(--selectionBackground)"
            ? "var(--foreground)"
            : "var(--background)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        userSelect: disabled ? "none" : "auto",
        "&:hover": {
          opacity: disabled ? 0.3 : 0.87,
        },
      }}
    >
      <Box sx={{ fontSize: "2rem", fontWeight: isToday ? "bold" : "normal" }}>
        {day}
      </Box>
      {completed && (
        <DayStatus sx={{ fontSize: "1rem" }}>
          {win ? `${guesses}/6` : "X"}
        </DayStatus>
      )}
      {children}
    </DayContainer>
  );
};

export default CalendarDay;
