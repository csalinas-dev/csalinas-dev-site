import styled from "@emotion/styled";
import { Invalid, Section } from "components";

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

export const NotFound = () => (
  <Section style={{ minHeight: "100vh" }}>
    <Container>
      <Invalid>404 Error</Invalid>
      <br />
      <span>Route not found</span>
    </Container>
  </Section>
);
