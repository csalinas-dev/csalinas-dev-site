"use client";

import NextImage from "next/image";
import NextLink from "next/link";
import styled from "@emotion/styled";

import logo from "@/assets/logo.png";

const Header = styled.header`
  align-items: stretch;
  background-color: var(--selectionBackground);
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  z-index: 5000;
`;

const Logo = styled(NextImage)`
  display: inline;
  margin-right: 0.5rem;
`;

const Link = styled(NextLink)`
  align-items: center;
  color: var(--var) !important;
  display: inline-flex;
  flex-flow: row nowrap;
  font-size: 0.8rem;
  justify-content: flex-start;
  padding: 0.5rem 0.75rem;
  white-space: nowrap;

  @media (min-width: 500px) {
    font-size: 1rem;
  }

  &.primary {
    color: var(--const) !important;
  }

  &:active {
    display: inline-flex;
  }

  &:hover {
    background-color: var(--selectionBackground);

    .submenu {
      display: block;
    }
  }
`;

const Dropdown = styled.div`
  align-items: center;
  display: inline-flex;
  justify-content: center;
  position: relative;

  &:hover .menu {
    display: flex;
  }

  .menu {
    background-color: #343a40;
    display: none;
  }
`;

const Menu = styled.div`
  align-items: stretch;
  flex-flow: column nowrap;
  justify-content: flex-start;
  left: 0;
  position: absolute;
  top: 100%;
`;

const SubTitle = styled.small`
  display: inline-block;
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
`;

export const Nav = () => (
  <Header>
    <Link href="/" className="primary">
      <Logo
        src={logo}
        height="20"
        width="20"
        placeholder="blur"
        alt="Christopher Salinas Jr Portfolio Logo"
      />
      Chris Salinas Jr
    </Link>
    <Link href="/github">GitHub</Link>
    <Link href="/projects">Projects</Link>
    <Dropdown>
      <Link href="/games">Games</Link>
      <Menu className="menu">
        <SubTitle>Play</SubTitle>
        <Link href="/games/wordleverse">Wordleverse</Link>
        <Link href="/games/hashtag">Hashtag</Link>
        <SubTitle>Compare</SubTitle>
        <Link href="/games/mini-motorways">Mini Motorways</Link>
      </Menu>
    </Dropdown>
  </Header>
);
