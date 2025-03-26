"use client";

import NextLink from "next/link";
import { Link as MuiLink } from "@mui/material";

export const Link = (props) => <MuiLink component={NextLink} {...props} />;
