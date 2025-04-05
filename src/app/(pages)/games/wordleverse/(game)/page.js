import { Button, Stack, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Invalid } from "@/components";

const Game = dynamic(() => import("./Game"), { ssr: false });

export const metadata = {
  title: "Wordleverse | Christopher Salinas Jr.",
};

const Error = ({ children }) => (
  <Stack
    sx={{ flex: "1 1 0px", width: "100%" }}
    alignItems="center"
    justifyContent="center"
    spacing={4}
  >
    <Typography variant="h2" component="h1">
      <Invalid>{children}</Invalid>
    </Typography>
    <Button
      component={Link}
      href="/games/wordleverse"
      variant="contained"
      color="error"
    >
      Go Back
    </Button>
  </Stack>
);

export default function Wordleverse({ searchParams: { date } }) {
  if (date) {
    const dateObj = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date("2024-01-01T00:00:00");

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return <Error>INVALID DATE FORMAT</Error>;
    }

    // Check if date is before 2024-01-01
    if (dateObj < minDate || dateObj > today) {
      return <Error>DATE OUT OF RANGE</Error>;
    }
  }

  return <Game />;
}
