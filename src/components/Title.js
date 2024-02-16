import styled from "@emotion/styled";

export const Title = styled.h1`
  align-self: center;
  font-size: 2rem;
  line-height: 2rem;
  justify-self: center;
  user-select: none;
  margin-top: 0;
  margin-bottom: 0.75rem;

  @media (min-width: 360px) {
    font-size: 3rem;
    line-height: 3rem;
  }

  @media (min-width: 768px) {
    font-size: 5rem;
    line-height: 5rem;
  }
`;
