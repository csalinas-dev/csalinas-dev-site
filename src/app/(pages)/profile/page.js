"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Grid,
  Stack,
  styled,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import DeleteIcon from "@mui/icons-material/Delete";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  maxWidth: 600,
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[4],
}));

const SocialButton = styled(Button)(({ theme }) => ({
  justifyContent: "flex-start",
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
    marginRight: theme.spacing(1),
  },
}));

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch linked accounts
  useEffect(() => {
    if (session?.user) {
      fetchLinkedAccounts();
    }
  }, [session]);

  const fetchLinkedAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/linked-accounts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch linked accounts");
      }

      setLinkedAccounts(data.accounts || []);
    } catch (error) {
      console.error("Error fetching linked accounts:", error);
      setError(error.message || "Failed to fetch linked accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (provider) => {
    try {
      // Use NextAuth signIn to initiate OAuth flow
      await signIn(provider, {
        callbackUrl: `/profile?link=true&provider=${provider}`,
      });
    } catch (error) {
      console.error(`Error linking ${provider} account:`, error);
      setError(`Failed to link ${provider} account`);
    }
  };

  const handleUnlinkAccount = async (accountId) => {
    try {
      const response = await fetch(`/api/auth/unlink-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unlink account");
      }

      setSuccess("Account unlinked successfully");
      fetchLinkedAccounts(); // Refresh the list
    } catch (error) {
      console.error("Error unlinking account:", error);
      setError(error.message || "Failed to unlink account");
    }
  };

  if (status === "loading" || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
      }}
    >
      <StyledPaper>
        <Typography variant="h4" component="h1" gutterBottom>
          Account Settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Typography>
            <strong>Name:</strong> {session.user.name || "Not provided"}
          </Typography>
          <Typography>
            <strong>Email:</strong> {session.user.email}
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Linked Accounts
          </Typography>

          {linkedAccounts.length > 0 ? (
            <List>
              {linkedAccounts.map((account) => (
                <ListItem key={account.id}>
                  <ListItemIcon>
                    <LinkIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                    secondary={`Connected on ${new Date(account.createdAt).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="unlink"
                      onClick={() => handleUnlinkAccount(account.id)}
                      disabled={linkedAccounts.length === 1} // Prevent unlinking the last account
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No linked accounts found.</Typography>
          )}
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Link Additional Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Link your account with these services to enable alternative sign-in methods.
          </Typography>

          <Grid container spacing={2}>
            {/* Only show Google button if not already linked */}
            {!linkedAccounts.some((account) => account.provider === "google") && (
              <Grid item xs={12} sm={6}>
                <SocialButton
                  fullWidth
                  onClick={() => handleLinkAccount("google")}
                  startIcon={
                    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                  }
                >
                  Link Google Account
                </SocialButton>
              </Grid>
            )}

            {/* Only show GitHub button if not already linked */}
            {!linkedAccounts.some((account) => account.provider === "github") && (
              <Grid item xs={12} sm={6}>
                <SocialButton
                  fullWidth
                  onClick={() => handleLinkAccount("github")}
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
                  Link GitHub Account
                </SocialButton>
              </Grid>
            )}
          </Grid>
        </Box>
      </StyledPaper>
    </Box>
  );
}