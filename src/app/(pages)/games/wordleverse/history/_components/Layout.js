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

const BackLink = styled(Link)`
  align-self: flex-start;
  color: #818384;
  text-decoration: none;
  margin-bottom: 1rem;

  &:hover {
    color: white;
  }
`;

/**
 * Layout component for the history page
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
        gap: 10,
        "& > *": { width: "100%" },
      }}
    >
      <Header>
        <BackLink href="/games/wordleverse">← Back to Game</BackLink>
        <Title>Wordleverse History</Title>
      </Header>
      {children}
    </Container>
  );
};

export default Layout;
