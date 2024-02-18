import dateFormat from "dateformat";

import { Module } from "./color";

export const FormattedDate = ({ date }) => {
  if (typeof date !== Date) {
    date = Date.parse(date);
  }
  const month = dateFormat(date, "mmmm");
  const day = dateFormat(date, "d");
  const suffix = dateFormat(date, "S");
  const year = dateFormat(date, "yyyy");
  return (
    <Module>
      {month} {day}
      <sup>{suffix}</sup>, {year}
    </Module>
  );
};
