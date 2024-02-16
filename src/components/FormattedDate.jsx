import dateFormat from "dateformat";

import { Comment } from "./color";

export const FormattedDate = ({ date }) => {
  const month = dateFormat(date, "mmmm");
  const day = dateFormat(date, "d");
  const suffix = dateFormat(date, "S");
  const year = dateFormat(date, "yyyy");
  return (
    <Comment>
      {month} {day}
      <sup>{suffix}</sup>, {year}
    </Comment>
  );
};
