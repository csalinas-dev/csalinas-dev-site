/* eslint-disable react/jsx-no-comment-textnodes */
import React from "react";
import GitHubCalendar from "react-github-calendar";
import { Comment, Function, Section } from "./";

const explicitTheme = {
  dark: ["#383838", "#C586C0", "#4EC9B0", "#DCDCAA", "#4FC1FF"],
  // dark: ['#383838', '#4e5e6a', '#486982', '#3575a5', '#0078d4'],
  // dark: ['#383838', '#525c4e', '#617657', '#648555', '#6a9955'],
};

export const GitHub = () => (
  <Section>
    <h3>
      <Comment>// I definitely don't have any </Comment>
      <Function>commit</Function>
      <Comment>ment issues</Comment>
    </h3>
    <GitHubCalendar
      username="csalinas-dev"
      colorScheme="dark"
      theme={explicitTheme}
      style={{ color: "var(--comment)" }}
      blockSize={16}
    />
  </Section>
);
