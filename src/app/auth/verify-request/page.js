"use client";

import NextLink from "next/link";
import { Box, Paper, Typography, Button } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";

export default function VerifyRequestPage() {
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
          maxWidth: 500,
          padding: 4,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <EmailIcon
          sx={{
            fontSize: 60,
            mb: 2,
            color: "primary.main",
          }}
        />

        <Typography variant="h5" component="h1" gutterBottom>
          Check your email
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          A sign in link has been sent to your email address. Please check your
          inbox (and spam folder) and click the link to verify your account.
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          The link will expire after 24 hours.
        </Typography>

        <Button
          component={NextLink}
          href="/auth/signin"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          Return to Sign In
        </Button>
      </Paper>
    </Box>
  );
}
