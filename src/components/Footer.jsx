import { Stack, Typography } from "@mui/material";
import { String, Numeric, Var } from "./color";
import { Link } from ".";

export const Footer = () => {
  return (
    <Stack
      alignItems="center"
      component="footer"
      direction="row"
      justifyContent="center"
      spacing={2}
      sx={{ padding: 2 }}
    >
      <Typography>
        <Var>&copy;</Var> <Numeric>{new Date().getFullYear()}</Numeric>{" "}
        Christopher Salinas Jr.
      </Typography>
      <Link href="/privacy-policy">Privacy</Link>
      <Link href="/terms">Terms</Link>
    </Stack>
  );
};
