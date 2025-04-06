"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  FormControl,
  Link,
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

export default function RegisterPage() {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!executeRecaptcha) {
      setErrors({ form: "reCAPTCHA not available" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha("register");

      // Submit registration
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Show success message
      setSuccessMessage(data.message);

      // Clear form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      // Redirect to verification page after a delay
      setTimeout(() => {
        router.push("/auth/verify-request");
      }, 3000);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
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
          Create an Account
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {errors.form && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.form}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <FormControl error={!!errors.name} fullWidth>
              <TextField
                id="name"
                name="name"
                label="Name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
              />
            </FormControl>

            <FormControl error={!!errors.email} fullWidth>
              <TextField
                id="email"
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
              />
            </FormControl>

            <FormControl error={!!errors.password} fullWidth>
              <TextField
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                error={!!errors.password}
                helperText={errors.password}
                fullWidth
              />
            </FormControl>

            <FormControl error={!!errors.confirmPassword} fullWidth>
              <TextField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                fullWidth
              />
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </Button>
          </Stack>
        </Box>

        <Typography align="center" variant="body2" sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Link component={NextLink} href="/auth/signin" color="primary">
            Sign in
          </Link>
        </Typography>
      </StyledPaper>
    </Box>
  );
}
