"use client";

import { useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { Box, Paper, Typography, Button, Alert } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have access to this resource.",
    Verification: "The verification link may have been used or is invalid.",
    MissingToken: "The verification token is missing.",
    InvalidToken: "The verification token is invalid or has already been used.",
    TokenExpired:
      "The verification token has expired. Please request a new one.",
    UserNotFound: "The user associated with this token could not be found.",
    VerificationFailed: "Email verification failed. Please try again.",
    Default: "An error occurred during authentication.",
  };

  const errorMessage = errorMessages[error] || errorMessages.Default;

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
      <Paper
        sx={{
          width: "100%",
          maxWidth: "md",
          p: 4,
          textAlign: "center",
        }}
      >
        <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 60 }} />
        </Box>

        <Typography variant="h4" component="h1" gutterBottom>
          Authentication Error
        </Typography>

        <Alert severity="error" sx={{ mb: 4, mt: 2 }}>
          {errorMessage}
        </Alert>

        <Button
          component={NextLink}
          href="/"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          Return to Home
        </Button>
      </Paper>
    </Box>
  );
}
