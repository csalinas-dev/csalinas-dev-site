import styled from "@emotion/styled";
import dateFormat from "dateformat";

import { Numeric } from "../../components";
import { useContext } from "react";
import { Context } from "./context";

const Container = styled.header`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 1rem;
  grid-area: header;
  justify-content: center;
`;

const Title = styled.h1`
  align-self: center;
  font-size: 2rem;
  line-height: 2rem;
  justify-self: center;
  user-select: none;
  margin: 0;

  @media (min-width: 360px) {
    font-size: 3rem;
    line-height: 3rem;
  }

  @media (min-width: 768px) {
    font-size: 5rem;
    line-height: 5rem;
  }
`;

const Header = () => {
  const {
    state: { title },
  } = useContext(Context);

  let titleContent;
  if (title) {
    titleContent = <Numeric>{title}</Numeric>;
  } else {
    const now = new Date();
    const month = dateFormat(now, "mmmm");
    const day = dateFormat(now, "d");
    const suffix = dateFormat(now, "S");
    const year = dateFormat(now, "yyyy");
    titleContent = (
      <Numeric>
        {month} {day}
        <sup>{suffix}</sup>, {year}
      </Numeric>
    );
  }

  return (
    <Container>
      <Title>Wordleverse</Title>
      {titleContent}
    </Container>
  );
};

export default Header;
