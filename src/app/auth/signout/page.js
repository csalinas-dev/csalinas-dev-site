"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";

export default function SignOut() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut({ redirect: false });
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error("Error signing out:", error);
      } finally {
        setIsLoading(false);
      }
    };

    handleSignOut();
  }, [router]);

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
        {isLoading ? (
          <>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Signing out...
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h4" component="h1" gutterBottom>
              You have been signed out
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You will be redirected to the home page shortly.
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
