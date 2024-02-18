import styled from "@emotion/styled";

export const Title = styled.h1`
  align-self: center;
  font-size: 2rem;
  justify-self: center;
  line-height: 2rem;
  margin-bottom: 0.75rem;
  margin-top: 0;
  user-select: none;

  @media (min-width: 360px) {
    font-size: 3rem;
    line-height: 3rem;
  }

  @media (min-width: 768px) {
    font-size: 5rem;
    line-height: 5rem;
  }
`;
