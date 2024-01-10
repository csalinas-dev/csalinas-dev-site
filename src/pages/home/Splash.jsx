import React from "react";
import styled from "@emotion/styled";
import { Var, String, Section } from "../../components";

const Container = styled.h1`
  display: inline-block;
  font-size: 3rem;
  font-weight: 600;
  line-height: initial;
  margin: 0;
  text-align: center;

  @media (min-width: 896px) {
    text-align: left;
  }
`;

export const Splash = () => (
  <Section style={{ minHeight: "100vh" }}>
    <Container>
      <Var>Hello, I'm</Var>
      <br />
      <String>Christopher Salinas Jr</String>
    </Container>
  </Section>
);
