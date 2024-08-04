"use client";

import styled from "@emotion/styled";
import { Invalid, Nav, Section } from "@/components";
import { Fragment } from "react";

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

export default function NotFound() {
  return (
    <Fragment>
      <Nav />
      <Section style={{ flex: "1 1 0px" }}>
        <Container>
          <Invalid>404 Error</Invalid>
          <br />
          <span>Route not found</span>
        </Container>
      </Section>
    </Fragment>
  );
}
