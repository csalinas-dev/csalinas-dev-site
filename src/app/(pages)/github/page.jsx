import Link from "next/link";
import GitHubCalendar from "react-github-calendar";
import { Comment, Function, Section, Type } from "@/components";
import { Box, Button, Typography } from "@mui/material";

const theme = {
  dark: ["#383838", "#C586C0", "#4EC9B0", "#DCDCAA", "#4FC1FF"],
};

export default function Page() {
  return (
    <>
      <Section sx={{ pb: 0 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Comment>The </Comment>
          <Type>README</Type>
          <Comment> version of me</Comment>
        </Typography>
        {/* The same SVG card served to the csalinas-dev profile README, rendered
            straight from /api/github/card. Loading it as an image (rather than
            inlining the markup) keeps the card's embedded font and styles inside
            the image sandbox, and lets the browser cache it independently. */}
        <Box
          component="img"
          src="/api/github/card"
          alt="GitHub profile card for Christopher Salinas Jr. — contribution streak, totals, and most-used languages"
          sx={{
            alignSelf: "flex-start",
            height: "auto",
            maxWidth: "100%",
            width: 760,
          }}
        />
      </Section>
      <Section sx={{ flex: "1 1 0px" }}>
        <Typography variant="h4" component="h2" gutterBottom>
          <Comment>I definitely don&apos;t have any </Comment>
          <Function>commit</Function>
          <Comment>ment issues</Comment>
        </Typography>
        <GitHubCalendar
          username="csalinas-dev"
          colorScheme="dark"
          theme={theme}
          blockSize={16}
        />
        <div style={{ marginTop: "2rem" }}>
          <Button
            color="primary"
            component={Link}
            href="https://github.com/csalinas-dev"
            rel="noopener noreferrer"
            target="_blank"
            variant="contained"
          >
            <i className="fa-brands fa-github" />
            &nbsp;Visit My GitHub
          </Button>
        </div>
      </Section>
    </>
  );
}
