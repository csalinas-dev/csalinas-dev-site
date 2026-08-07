"use client";

import styled from "@emotion/styled";
import { Container } from "@mui/material";
import Link from "next/link";

// Styled components
const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const Links = styled.div`
  align-self: flex-start;
  display: flex;
  flex-flow: row wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const NavLink = styled(Link)`
  color: #818384;
  text-decoration: none;

  &:hover {
    color: white;
  }
`;

/**
 * Layout component for the leaderboard page
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Layout component
 */
const Layout = ({ children }) => {
  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        paddingTop: 4,
        paddingBottom: 10,
        gap: 4,
        "& > *": { width: "100%" },
      }}
    >
      <Header>
        <Links>
          <NavLink href="/games/wordleverse">← Back to Game</NavLink>
          <NavLink href="/games/wordleverse/history">History</NavLink>
        </Links>
        <Title>Wordleverse Leaderboard</Title>
      </Header>
      {children}
    </Container>
  );
};

export default Layout;
