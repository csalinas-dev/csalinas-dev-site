"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "@emotion/styled";
import dateFormat from "dateformat";

import CalendarHeader from "./CalendarHeader";
import CalendarDay from "./CalendarDay";

// Styled components
const CalendarContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  width: 100%;
`;

const MIN_YEAR = 2024;
const MIN_MONTH = 0; // January (0-indexed)

/**
 * Parse and validate a ?month=YYYY-MM param. Returns a Date set to the 1st
 * of that month, or null if invalid or out of range.
 */
function parseMonthParam(param) {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null;
  const [year, month] = param.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;

  const date = new Date(year, month - 1, 1);
  const today = new Date();
  const minDate = new Date(MIN_YEAR, MIN_MONTH, 1);
  const maxDate = new Date(today.getFullYear(), today.getMonth(), 1);

  if (date < minDate || date > maxDate) return null;
  return date;
}

function toMonthParam(date) {
  return dateFormat(date, "yyyy-mm");
}

/**
 * Calendar component to display a monthly calendar with game results
 * @param {Object} props - Component props
 * @param {Array} props.availableDates - Array of available dates with their status
 * @param {Array} props.games - Array of games with their results
 * @returns {JSX.Element} Calendar component
 */
const Calendar = ({ availableDates, games }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const monthParam = searchParams.get("month");
  const currentMonth = parseMonthParam(monthParam) ?? new Date();

  const setCurrentMonth = useCallback(
    (newMonth) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", toMonthParam(newMonth));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Check if current month is January 2024 (to disable previous button)
  const isPrevMonthDisabled = () => {
    return currentMonth.getFullYear() === MIN_YEAR && currentMonth.getMonth() === MIN_MONTH;
  };

  // Check if current month is the current month (to disable next button)
  const isNextMonthDisabled = () => {
    const today = new Date();
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth()
    );
  };

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled()) return;

    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled()) return;

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

    // Create calendar days
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<CalendarDay key={`empty-${i}`} empty />);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const future = date > new Date();
      const dateStr = dateFormat(date, "yyyy-mm-dd");
      const today = dateFormat(new Date(), "yyyy-mm-dd");

      const dateInfo = availableDates.find((d) => d.date === dateStr) || {
        date: dateStr,
        played: false,
        completed: false,
        isToday: today === dateStr,
      };

      const game = games.find((g) => g.date === dateStr);
      const isWin = game && game.win;
      const guesses = game
        ? (game.guesses?.length ?? (game.win ? game.row + 1 : game.row))
        : null;
      const playable =
        (dateInfo.played && !dateInfo.completed) ||
        (dateInfo.isToday && !dateInfo.completed) ||
        !future;

      days.push(
        <CalendarDay
          key={dateStr}
          date={dateStr}
          day={day}
          isToday={dateInfo.isToday}
          played={dateInfo.played}
          completed={dateInfo.completed}
          playable={playable}
          win={isWin}
          guesses={guesses}
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
        isPrevDisabled={isPrevMonthDisabled()}
        isNextDisabled={isNextMonthDisabled()}
      />
      <CalendarGrid>{renderCalendar()}</CalendarGrid>
    </CalendarContainer>
  );
};

export default Calendar;
