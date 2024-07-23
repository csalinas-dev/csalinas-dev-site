"use client";

import styled from "@emotion/styled";

export const VSCode = styled.span`
  color: var(--vscode);
`;

export const Comment = styled.span`
  color: var(--comment);

  &:first-of-type:before {
    content: "// ";
  }
`;

export const Component = styled.span`
  color: var(--component);
`;

export const Const = styled.span`
  color: var(--const);
`;

export const Function = styled.span`
  color: var(--function);
`;

export const Invalid = styled.span`
  color: var(--invalid);
`;

export const Module = styled.span`
  color: var(--module);
`;

export const Numeric = styled.span`
  color: var(--numeric);
`;

export const Parenthesis = styled.span`
  color: var(--parenthesis);
`;

export const Regex = styled.span`
  color: var(--regex);
`;

export const String = styled.span`
  color: var(--string);
`;

export const Type = styled.span`
  color: var(--type);
`;

export const Var = styled.span`
  color: var(--var);
`;

export const Selector = styled.span`
  color: var(--selector);
`;
