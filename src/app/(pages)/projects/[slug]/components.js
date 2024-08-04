"use client";

import NextImage from "next/image";
import styled from "@emotion/styled";
import { Section } from "@/components";

export const Container = styled(Section)`
  display: flex;
  flex-flow: column nowrap;
  gap: 2rem;

  & > * {
    margin: 0;
  }
`;

export const Links = styled.div`
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

export const Article = styled.article`
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
