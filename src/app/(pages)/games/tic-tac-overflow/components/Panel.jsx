import styled from "@emotion/styled";

// Every screen that is not the board — the mode picker, the join form, the
// waiting room, a lost connection. They share one shell so moving between them
// never shifts the layout, and so all of them sit in the same place the board
// would (same flex growth, same top padding to clear the toolbar).

export const Panel = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-flow: column nowrap;
  gap: 1.25rem;
  justify-content: center;
  padding: 3.5rem 1.5rem 1.5rem;
  text-align: center;
  width: 100%;
`;

export const PanelHeading = styled.h1`
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 2rem;
  margin: 0;

  @media (min-width: 600px) {
    font-size: 1.75rem;
  }
`;

export const PanelText = styled.p`
  color: var(--absentForeground);
  line-height: 1.5rem;
  margin: 0;
  max-width: 30rem;
`;

/** Reserved for something the player did wrong — a bad code, a dead room. */
export const PanelError = styled(PanelText)`
  color: var(--invalid);
`;

export const PanelActions = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row wrap;
  gap: 0.75rem;
  justify-content: center;
`;
