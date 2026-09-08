"use client";

import styled from "@emotion/styled";

// Text for screen readers only. Clipped rather than `display: none`, which
// would take it out of the accessibility tree along with everything else.
export const VisuallyHidden = styled.span`
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
`;
