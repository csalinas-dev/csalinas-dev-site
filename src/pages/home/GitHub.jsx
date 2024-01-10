/* eslint-disable react/jsx-no-comment-textnodes */
import React from "react";
import GitHubCalendar from "react-github-calendar";
import { Comment, Function, Section } from "../../components";

const explicitTheme = {
  dark: ["#383838", "#C586C0", "#4EC9B0", "#DCDCAA", "#4FC1FF"],
};

export const GitHub = () => (
  <Section id="github">
    <h3>
      <Comment>// I definitely don't have any </Comment>
      <Function>commit</Function>
      <Comment>ment issues</Comment>
    </h3>
    <GitHubCalendar
      username="csalinas-dev"
      colorScheme="dark"
      theme={explicitTheme}
      blockSize={16}
    />
  </Section>
);
