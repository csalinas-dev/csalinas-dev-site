"use client";

import NextImage from "next/image";
import { Box, styled } from "@mui/material";

export const Links = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

export const Image = styled(NextImage)`
  aspect-ratio: 3 / 2;
  border-radius: 2rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  object-fit: cover;
  user-select: none;
  width: 100%;
`;

export const Article = styled("article")`
  font-size: 1.5rem !important;

  h2 {
    color: var(--comment);

    &:before {
      content: "// ";
    }
  }

  h3 {
    color: var(--function);
  }

  strong {
    color: var(--var);
  }
`;
