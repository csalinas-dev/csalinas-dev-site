import { Container, Stack } from "@mui/material";

import { About } from "./About";
import { Splash } from "./Splash";

export default function Home() {
  return (
    <Container maxWidth="xl" component="main" sx={{ px: 4 }}>
      <Stack direction="column">
        <Splash />
        <About />
      </Stack>
    </Container>
  );
}
