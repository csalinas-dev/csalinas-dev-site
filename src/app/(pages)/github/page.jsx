import Link from "next/link";
import GitHubCalendar from "react-github-calendar";
import { Comment, Function, Section } from "@/components";

const theme = {
  dark: ["#383838", "#C586C0", "#4EC9B0", "#DCDCAA", "#4FC1FF"],
};

export default function Page() {
  return (
    <Section id="commits" style={{ minHeight: "calc(100vh - 36px)" }}>
      <h3>
        <Comment>I definitely don&apos;t have any </Comment>
        <Function>commit</Function>
        <Comment>ment issues</Comment>
      </h3>
      <GitHubCalendar
        username="csalinas-dev"
        colorScheme="dark"
        theme={theme}
        blockSize={16}
      />
      <div style={{ marginTop: "2rem" }}>
        <Link
          href="https://github.com/csalinas-dev"
          rel="noopener noreferrer"
          target="_blank"
        >
          <i className="fa-brands fa-github" /> Visit My GitHub
        </Link>
      </div>
    </Section>
  );
}
