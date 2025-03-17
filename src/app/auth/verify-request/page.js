"use client";

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

const Card = styled.div`
  width: 100%;
  max-width: 500px;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const Message = styled.p`
  margin-bottom: 1.5rem;
  color: #4b5563;
  line-height: 1.5;
`;

const EmailIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: #4f46e5;
`;

const Button = styled.a`
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #4f46e5;
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  margin-top: 1rem;
  
  &:hover {
    background-color: #4338ca;
  }
`;

export default function VerifyRequestPage() {
  return (
    <Container>
      <Card>
        <EmailIcon>
          <i className="fa-regular fa-envelope"></i>
        </EmailIcon>
        <Title>Check your email</Title>
        <Message>
          A sign in link has been sent to your email address.
          Please check your inbox (and spam folder) and click the link to verify your account.
        </Message>
        <Message>
          The link will expire after 24 hours.
        </Message>
        <Link href="/auth/signin" passHref>
          <Button>Return to Sign In</Button>
        </Link>
      </Card>
    </Container>
  );
}