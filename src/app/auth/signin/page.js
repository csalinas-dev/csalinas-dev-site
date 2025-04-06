"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  Divider,
  Grid,
  Stack,
  styled,
} from "@mui/material";

// Use styled from @mui/material
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  maxWidth: 400,
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[4],
}));

const SocialButton = styled(Button)(({ theme }) => ({
  justifyContent: "center",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& svg": {
    height: "1.25rem",
    width: "1.25rem",
  },
}));
// Component that uses useSearchParams
function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);

  // Check URL parameters on load
  useEffect(() => {
    const verified = searchParams.get("verified");
    const error = searchParams.get("error");
    const emailParam = searchParams.get("email");

    if (verified === "true") {
      setSuccess(
        "Your email has been verified successfully. You can now sign in."
      );
    }

    if (error === "EMAIL_NOT_VERIFIED" && emailParam) {
      setUnverifiedEmail(emailParam);
      setError(
        "Your email is not verified. Please verify your email before signing in."
      );
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setUnverifiedEmail("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      // If there's an error or the user is redirected
      if (!result?.ok) {
        // Check if we were redirected due to unverified email
        if (
          result?.error === "EMAIL_NOT_VERIFIED" ||
          (result?.url && result.url.includes("error=EMAIL_NOT_VERIFIED"))
        ) {
          setUnverifiedEmail(email);
          setError(
            "Your email is not verified. Please verify your email before signing in."
          );
          setIsLoading(false);
          return;
        }

        setError(result?.error || "An error occurred during sign in");
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    setResendingEmail(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      setSuccess(
        "Verification email has been resent. Please check your inbox."
      );
    } catch (error) {
      setError(error.message || "Failed to resend verification email");
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 2,
      }}
    >
      <StyledPaper>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          Sign in to your account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {unverifiedEmail && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Your email address needs to be verified before you can sign in.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleResendVerification}
              disabled={resendingEmail}
              fullWidth
            >
              {resendingEmail ? "Sending..." : "Resend Verification Email"}
            </Button>
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              id="email-address"
              name="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />

            <TextField
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </Stack>
        </Box>

        <Typography align="center" variant="body2" sx={{ mt: 2 }}>
          Don&apos;t have an account?{" "}
          <Link component={NextLink} href="/auth/register" color="primary">
            Register
          </Link>
        </Typography>

        <Divider sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Or continue with
          </Typography>
        </Divider>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <SocialButton
              variant="outlined"
              fullWidth
              onClick={() => signIn("google", { callbackUrl: "/" })}
              startIcon={
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
              }
            >
              Google
            </SocialButton>
          </Grid>

          <Grid item xs={6}>
            <SocialButton
              variant="outlined"
              fullWidth
              onClick={() => signIn("github", { callbackUrl: "/" })}
              startIcon={
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            >
              GitHub
            </SocialButton>
          </Grid>
        </Grid>
      </StyledPaper>
    </Box>
  );
}

// Fallback component to show while loading
function SignInFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 2,
      }}
    >
      <StyledPaper>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          Loading...
        </Typography>
      </StyledPaper>
    </Box>
  );
}

// Main component with Suspense boundary
export default function SignIn() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
