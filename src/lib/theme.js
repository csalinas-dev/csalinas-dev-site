"use client";

import { createTheme } from "@mui/material/styles";

// Color palette from globals.css
const colors = {
  background: "#1f1f1f",
  muted: "rgba(255, 255, 255, 0.54)",
  foreground: "#cccccc",
  selectionBackground: "#add6ff26",
  absentBackground: "#28405826",
  vscode: "#0078d4",
  comment: "#6a9955",
  component: "#4fc1ff",
  const: "#569cd6",
  function: "#dcdcaa",
  invalid: "#f44747",
  module: "#c586c0",
  numeric: "#b5cea8",
  parenthesis: "#ffd700",
  selector: "#d7ac57",
  regex: "#d16969",
  string: "#ce9178",
  type: "#4ec9b0",
  var: "#9cdcfe",
};

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.vscode,
      contrastText: "#ffffff",
    },
    secondary: {
      main: colors.module,
      contrastText: "#ffffff",
    },
    error: { main: colors.invalid },
    warning: { main: colors.selector },
    info: { main: colors.const },
    success: { main: colors.comment },
    vscode: { main: colors.vscode },
    comment: { main: colors.comment },
    component: { main: colors.component },
    const: { main: colors.const },
    function: { main: colors.function },
    module: { main: colors.module },
    numeric: { main: colors.numeric },
    parenthesis: { main: colors.parenthesis },
    selector: { main: colors.selector },
    regex: { main: colors.regex },
    string: { main: colors.string },
    type: { main: colors.type },
    var: { main: colors.var },
    text: {
      primary: colors.foreground,
      secondary: colors.muted,
      disabled: "rgba(204, 204, 204, 0.5)",
    },
    background: {
      default: colors.background,
      paper: "#252525",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  typography: {
    fontFamily: "Sono, monospace",
    body1: {
      color: colors.foreground,
    },
    body2: {
      color: colors.muted,
    },
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.const,
          display: "inline-block",
          textDecoration: "none",
          "&:hover": {
            opacity: 0.78,
          },
        },
      },
    },
    MuiStack: {
      defaultProps: {
        useFlexGap: true,
      },
    },
  },
});

export default theme;
