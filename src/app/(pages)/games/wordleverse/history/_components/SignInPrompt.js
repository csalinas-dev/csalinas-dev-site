"use client";

import styled from "@emotion/styled";
import Link from "next/link";

// Styled components
const PromptContainer = styled.div`
  align-items: center;
  color: #818384;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
`;

const SignInButton = styled.button`
  background-color: var(--comment);
  border-radius: 4px;
  border: none;
  color: white;
  cursor: pointer;
  font-weight: bold;
  padding: 0.5rem 1rem;

  &:hover {
    opacity: 0.87;
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
