"use client";

import { Box, Stack, styled, useTheme, useMediaQuery } from "@mui/material";
import Link from "next/link";

// Styled components
const DayContainer = styled(Stack)`
  aspect-ratio: 1;
  border-radius: 5px;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  text-decoration: none;
`;

const DayStatus = styled(Box)`
  font-size: "1rem";
  font-weight: "light";
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
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const disabled = !playable;
  let backgroundColor = "var(--selectionBackground)";
  let color = "white";

  if (empty) {
    return (
      <DayContainer
        sx={{
          cursor: "default",
          backgroundColor: "var(--absentBackground)",
          color: "var(--absentForeground)",
          userSelect: "none",
        }}
      />
    );
  }

  if (isToday && !completed) {
    backgroundColor = "var(--var)"; // Today (not completed) - light blue
    color = "var(--background)";
  } else if (completed && win) {
    backgroundColor = "var(--comment)"; // Win - green
  } else if (completed && !win) {
    backgroundColor = "var(--invalid)"; // Lose - red
  } else if (played) {
    backgroundColor = "var(--selector)"; // Played - orange-yellow
  } else if (disabled) {
    backgroundColor = "var(--absentBackground)"; // disabled - gray
    color = "var(--absentForeground)";
  }

  const props = {};
  if (disabled) {
    props["aria-disabled"] = true;
  } else {
    props.component = Link;
    props.href = `/games/wordleverse?date=${date}`;
  }

  return (
    <DayContainer
      {...props}
      direction="column"
      justifyContent={disabled || mobile ? "center" : "space-between"}
      alignItems="center"
      sx={{
        backgroundColor,
        color,
        cursor: disabled ? "default" : "pointer",
        padding: { xs: 0, md: "1rem" },
        userSelect: disabled ? "none" : "auto",
        textShadow: mobile ? "initial" : "1px 1px var(--background)",
        "&:hover": {
          opacity: disabled ? 1 : 0.87,
        },
      }}
    >
      <Box
        sx={{
          fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" },
          fontWeight: "bold",
        }}
      >
        {day}
      </Box>
      {!mobile && (
        <>
          {completed && <DayStatus>{win ? `${guesses}/6` : "X"}</DayStatus>}
          {!completed && !disabled && <DayStatus>Play</DayStatus>}
        </>
      )}
      {children}
    </DayContainer>
  );
};

export default CalendarDay;
