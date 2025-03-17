"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styled from "@emotion/styled";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--foreground);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--foreground);
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

const EmailInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #4a4a4a;
  border-radius: 4px 4px 0 0;
  font-size: 1rem;
  background-color: #333333;
  color: var(--foreground);
  
  &:focus {
    outline: none;
    border-color: var(--vscode);
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
    z-index: 10;
  }
  
  &::placeholder {
    color: #6b7280;
  }
`;

const PasswordInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #4a4a4a;
  border-radius: 0 0 4px 4px;
  font-size: 1rem;
  background-color: #333333;
  color: var(--foreground);
  margin-top: -1px;
  
  &:focus {
    outline: none;
    border-color: var(--vscode);
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
    z-index: 10;
  }
  
  &::placeholder {
    color: #6b7280;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1rem;
  background-color: var(--vscode);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
  
  &:hover {
    background-color: #006cc1;
  }
  
  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #f87171;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid #991b1b;
  border-radius: 4px;
`;

const Divider = styled.div`
  position: relative;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #4a4a4a;
  }
`;

const DividerText = styled.span`
  position: relative;
  display: inline-block;
  padding: 0 0.5rem;
  background-color: var(--background);
  color: #9ca3af;
  font-size: 0.875rem;
`;

const DividerTextContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const SocialButtonsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const SocialButton = styled.button`
  display: inline-flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #333333;
  color: var(--foreground);
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #444444;
  }
  
  svg {
    height: 1.25rem;
    width: 1.25rem;
  }
`;

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <FormContainer>
        <Title>Sign in to your account</Title>
        
        {error && (
          <ErrorMessage>{error}</ErrorMessage>
        )}
        
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="email-address">
              Email address
            </Label>
            <EmailInput
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </InputGroup>
          
          <InputGroup>
            <Label htmlFor="password">
              Password
            </Label>
            <PasswordInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </InputGroup>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </Form>
        
        <Divider>
          <DividerTextContainer>
            <DividerText>Or continue with</DividerText>
          </DividerTextContainer>
        </Divider>
        
        <SocialButtonsContainer>
          <SocialButton
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <span className="sr-only">Sign in with Google</span>
            <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
          </SocialButton>
          
          <SocialButton
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/" })}
          >
            <span className="sr-only">Sign in with GitHub</span>
            <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </SocialButton>
        </SocialButtonsContainer>
      </FormContainer>
    </Container>
  );
}