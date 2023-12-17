import styled from "@emotion/styled";
import { Var, String, About } from "./components";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  min-height: 100vh;
  justify-content: center;
  padding: 2rem;
  width: 100%;

  @media (min-width: 696px) {
    width: 600px;
    margin: 0 auto;
  }

  @media (min-width: 896px) {
    width: 800px;
  }

  @media (min-width: 1296px) {
    width: 1200px;
  }
`;

const Splash = styled.div`
  display: inline-block;
  font-size: 3rem;
  font-weight: 600;
  line-height: initial;
  text-align: center;

  @media (min-width: 896px) {
    text-align: left;
  }
`;

export const App = () => (
  <>
    <Container>
      <Splash>
        <Var>Hello, I'm</Var>
        <br />
        <String>Christopher Salinas Jr</String>
      </Splash>
    </Container>
    <Container>
      <About />
    </Container>
  </>
);
