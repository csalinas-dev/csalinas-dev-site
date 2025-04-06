"use client";

import { Stack, Typography, styled } from "@mui/material";

import { Var, String, Link } from "@/components";

const NavLink = styled(Link)`
  align-items: center;
  color: var(--foreground);
  display: flex;
  gap: 1rem;
  font-size: 2rem;
`;

export const Splash = () => (
  <Stack
    direction="column"
    alignItems={{ xs: "center", md: "flex-start" }}
    justifyContent="center"
    sx={{ py: 4, minHeight: "100vh" }}
    spacing={4}
  >
    <Typography
      component="h1"
      sx={{
        display: "flex",
        flexFlow: "column wrap",
        fontWeight: 600,
        gap: "1rem",
        textAlign: { xs: "center", md: "left" },
      }}
      variant="h3"
    >
      <Var>Hello, I&apos;m</Var>
      <String>Christopher Salinas Jr</String>
    </Typography>
    <Stack direction="column" spacing={2}>
      <NavLink href="#about">
        <i className="fa-solid fa-fw fa-signature" /> About Me
      </NavLink>
      <NavLink href="/github">
        <i className="fa-brands fa-fw fa-github" /> GitHub
      </NavLink>
      <NavLink href="/projects">
        <i className="fa-solid fa-fw fa-code" /> Projects
      </NavLink>
      <NavLink href="/games">
        <i className="fa-solid fa-fw fa-gamepad" /> Games
      </NavLink>
    </Stack>
  </Stack>
);
