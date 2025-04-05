"use client";

import styled from "@emotion/styled";
import Link from "next/link";

// Styled components
const PromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
  gap: 1rem;
  text-align: center;
  color: #818384;
`;

const SignInButton = styled.button`
  background-color: var(--comment);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #7ab966;
  }
`;

/**
 * SignInPrompt component to prompt users to sign in
 * @returns {JSX.Element} SignInPrompt component
 */
const SignInPrompt = () => {
  return (
    <PromptContainer>
      <p>Sign in to save your game history across devices!</p>
      <Link href="/auth/signin" passHref>
        <SignInButton>Sign In</SignInButton>
      </Link>
    </PromptContainer>
  );
};

export default SignInPrompt;