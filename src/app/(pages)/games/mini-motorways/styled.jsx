"use client";

import styled from "@emotion/styled";
import NextImage from "next/image";

export const Container = styled.div`
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
  grid-template-rows: auto;

  @media (min-width: 696px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (min-width: 896px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.div`
  aspect-ratio: 2 / 4;
  background-color: var(--selectionBackground);
  border-radius: 2rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  overflow: hidden;
  position: relative;
  user-select: none;
  width: 100%;

  @media (min-width: 896px) {
    aspect-ratio: 4 / 2;
    flex-flow: row nowrap;
  }

  @media (min-width: 1296px) {
    aspect-ratio: 5 / 2;
  }
`;

export const Map = styled.div`
  aspect-ratio: 1 / 1;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  padding: 0.5rem;
  width: 100%;

  @media (min-width: 896px) {
    gap: 1.25rem;
    height: 100%;
    padding: 1.25rem;
    width: auto;
  }
`;

export const ImageContainer = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 0px;
  position: relative;
  justify-content: center;
  width: 100%;
`;

export const Image = styled(NextImage)`
  object-fit: contain;
`;

export const Title = styled.h2`
  color: #121212 !important;
  font-size: 2.5rem;
  margin: 0;
  text-align: center;

  @media (min-width: 696px) {
    font-size: 1.7rem;
  }

  @media (min-width: 896px) {
    font-size: 2rem;
  }

  @media (min-width: 1296px) {
    font-size: 2.75rem;
  }
`;

export const Info = styled.div`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  flex: 1 1 0px;
  font-size: 2rem;
  gap: 0.5rem;
  justify-content: center;
  padding: 2rem;

  @media (min-width: 696px) {
    font-size: 1.25rem;
  }

  @media (min-width: 896px) {
    font-size: 2rem;
  }

  @media (min-width: 1296px) {
    font-size: 2.75rem;
  }
`;

export const Score = styled.p`
  margin: 0;
`;
