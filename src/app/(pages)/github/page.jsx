import Link from "next/link";
import GitHubCalendar from "react-github-calendar";
import { Comment, Function, Section } from "@/components";
import { Button, Typography } from "@mui/material";

const theme = {
  dark: ["#383838", "#C586C0", "#4EC9B0", "#DCDCAA", "#4FC1FF"],
};

export default function Page() {
  return (
    <Section sx={{ flex: "1 1 0px" }}>
      <Typography variant="h4" component="h1" gutterBottom>
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
  );
}
