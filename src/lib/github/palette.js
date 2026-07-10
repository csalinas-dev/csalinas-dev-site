// GitHub stat card palette — mirrors src/app/globals.css (the csalinas.dev
// VS Code dark theme). Keep these in sync with the site's CSS variables.
export const palette = {
  background: "#1f1f1f",
  paper: "#252525",
  foreground: "#cccccc",
  muted: "#999999",
  border: "rgba(255, 255, 255, 0.12)",

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

// Monospace stack: prefers Sono (the site font); degrades to clean
// system monospace when the viewer doesn't have Sono installed.
export const fontFamily =
  "'Sono', ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
