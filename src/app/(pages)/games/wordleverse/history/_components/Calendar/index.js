"use client";

import { useState } from "react";
import styled from "@emotion/styled";
import dateFormat from "dateformat";

import CalendarHeader from "./CalendarHeader";
import CalendarDay from "./CalendarDay";

// Styled components
const CalendarContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  width: 100%;
`;

/**
 * Calendar component to display a monthly calendar with game results
 * @param {Object} props - Component props
 * @param {Array} props.availableDates - Array of available dates with their status
 * @param {Array} props.games - Array of games with their results
 * @param {Function} props.onDayClick - Handler for day click
 * @returns {JSX.Element} Calendar component
 */
const Calendar = ({ availableDates, games, onDayClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

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

      const game = games.find((g) => g.date === dateStr);
      const isWin = game && game.win;
      const isLose = game && !game.win;
      const guesses = game ? game.guesses : null;

      days.push(
        <CalendarDay
          key={dateStr}
          day={day}
          isToday={dateInfo.isToday}
          played={dateInfo.played}
          completed={dateInfo.completed}
          playable={!dateInfo.completed || dateInfo.isToday}
          win={isWin}
          lose={isLose}
          guesses={guesses}
          onClick={() => onDayClick(dateStr, dateInfo)}
        />
      );
    }

    return days;
  };

  return (
    <CalendarContainer>
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />
      <CalendarGrid>
        {renderCalendar()}
      </CalendarGrid>
    </CalendarContainer>
  );
};

export default Calendar;