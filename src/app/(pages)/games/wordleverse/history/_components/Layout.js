"use client";

import styled from "@emotion/styled";
import Link from "next/link";

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
  width: 100%;
  max-width: 800px;
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

const ContentContainer = styled.div`
  width: 100%;
  max-width: 800px;
`;

/**
 * Layout component for the history page
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Layout component
 */
const Layout = ({ children }) => {
  return (
    <Container>
      <Header>
        <BackLink href="/games/wordleverse">← Back to Game</BackLink>
        <Title>Wordleverse History</Title>
      </Header>
      <ContentContainer>
        {children}
      </ContentContainer>
    </Container>
  );
};

export default Layout;