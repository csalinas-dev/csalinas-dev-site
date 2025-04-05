"use client";

import styled from "@emotion/styled";
import { Box } from "@mui/material";
import dateFormat from "dateformat";

// Styled components
const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  width: 100%;
`;

const MonthTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

const NavigationButton = styled.button`
  background-color: #3a3a3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  &:hover {
    background-color: ${(props) => (props.disabled ? "#3a3a3c" : "#4a4a4c")};
  }
`;

const DayHeadersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.5rem;
`;

const DayHeader = styled(Box)`
  text-align: center;
  font-weight: bold;
  color: #818384;
  padding: 0.5rem;
`;

// Days of the week
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * CalendarHeader component to display the month navigation and day headers
 * @param {Object} props - Component props
 * @param {Date} props.currentMonth - Current month being displayed
 * @param {Function} props.onPrevMonth - Handler for previous month button
 * @param {Function} props.onNextMonth - Handler for next month button
 * @returns {JSX.Element} CalendarHeader component
 */
const CalendarHeader = ({ currentMonth, onPrevMonth, onNextMonth, isPrevDisabled, isNextDisabled }) => {
  return (
    <>
      <HeaderContainer>
        <NavigationButton
          onClick={onPrevMonth}
          disabled={isPrevDisabled}
        >
          Previous
        </NavigationButton>
        <MonthTitle>{dateFormat(currentMonth, "mmmm yyyy")}</MonthTitle>
        <NavigationButton
          onClick={onNextMonth}
          disabled={isNextDisabled}
        >
          Next
        </NavigationButton>
      </HeaderContainer>

      <DayHeadersContainer>
        {DAYS_OF_WEEK.map((day) => (
          <DayHeader
            key={day}
            sx={{ fontSize: { xs: "0.75rem", sm: "1rem", md: "1.5rem" } }}
          >
            {day}
          </DayHeader>
        ))}
      </DayHeadersContainer>
    </>
  );
};

export default CalendarHeader;
