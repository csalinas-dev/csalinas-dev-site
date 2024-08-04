"use client";

import styled from "@emotion/styled";

export const Section = styled.section`
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  padding: 2rem;
  width: 100%;

  @media (min-width: 696px) {
    width: 600px;
    margin: 0 auto;
  }

  @media (min-width: 896px) {
    width: 800px;
  }

  @media (min-width: 1296px) {
    width: 1200px;
  }

  @media (min-width: 1596px) {
    width: 1500px;
  }
`;
