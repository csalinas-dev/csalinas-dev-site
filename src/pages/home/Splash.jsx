import styled from "@emotion/styled";
import { Var, String, Section } from "../../components";
import { Link } from "react-router-dom";

const Title = styled.h1`
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

const Navigation = styled.div`
  font-size: 2rem;
  display: flex;
  flex-flow: column nowrap;
  margin-top: 3rem;
  gap: 1rem;

  a {
    color: var(--foreground);
  }
`;

export const Splash = () => (
  <Section style={{ minHeight: "100vh" }}>
    <Title>
      <Var>Hello, I'm</Var>
      <br />
      <String>Christopher Salinas Jr</String>
    </Title>
    <Navigation>
      <a href="#about">
        <i className="fa-solid fa-fw fa-signature" /> About Me
      </a>
      <a href="#commits">
        <i className="fa-solid fa-fw fa-code-commit" /> Commits
      </a>
      <Link to="/projects">
        <i className="fa-solid fa-fw fa-box-archive" /> Projects
      </Link>
      <Link to="/wordleverse">
        <i className="fa-solid fa-fw fa-grip" /> Wordleverse
      </Link>
    </Navigation>
  </Section>
);
