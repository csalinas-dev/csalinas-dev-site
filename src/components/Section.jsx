"use client";

import styled from "@emotion/styled";
import { Container as MuiContainer } from "@mui/material";

const Container = styled(MuiContainer)`
  display: flex;
  flex-flow: column nowrap;
  font-size: 1.5rem !important;
  justify-content: center;
  padding: 2rem;
`;

export const Section = (props) => (
  <Container as="section" maxWidth="xl" {...props} />
);
