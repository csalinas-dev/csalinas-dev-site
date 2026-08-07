"use client";

import styled from "@emotion/styled";

// Full-bleed on purpose: the tile grid is the page, so it runs to the viewport
// edges rather than sitting in the `xl` Container every other page uses. The
// gutter lives on GameGrid, next to the gap it has to match. Flex column
// because <Title> centres itself with `align-self`.
export const GamesSection = styled.section`
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  padding: 2rem 0;
  width: 100%;
`;
