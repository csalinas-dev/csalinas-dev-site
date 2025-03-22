"use client";

import styled from "@emotion/styled";
import NextImage from "next/image";
import NextLink from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

import logo from "@/assets/logo.png";

const Header = styled.header`
  align-items: stretch;
  background-color: #343a40;
  border-bottom: 1px solid var(--selectionBackground);
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  position: sticky;
  top: 0;
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
  font-size: 0.7rem;
  justify-content: flex-start;
  padding: 0.25rem 0.5rem;
  white-space: nowrap;

  @media (min-width: 400px) {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }

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
  border-bottom: 1px solid var(--selectionBackground);
  border-left: 1px solid var(--selectionBackground);
  border-radius: 0 0 0.5rem 0.5rem;
  border-right: 1px solid var(--selectionBackground);
  flex-flow: column nowrap;
  justify-content: flex-start;
  right: 0;
  position: absolute;
  top: 100%;


  @media (min-width: 600px) {
    left: 0;
    right: initial;

    &.right {
      left: initial;
      right: 0;
    }
  }
`;

const SubTitle = styled.small`
  display: inline-block;
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
`;

export const Nav = () => {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  return (
    <Header>
      <Link href="/" className="primary">
        <Logo
          src={logo}
          height="20"
          width="20"
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
      <div style={{ flexGrow: 1 }} />
      <Dropdown>
        <Link href="#">{session ? session.user?.name : "Account"}</Link>
        <Menu className="menu right">
          {loading && <Link href="#">Loading ...</Link>}
          {!loading && !session && (
            <Link href="#" onClick={() => signIn()}>
              <i className="fa-solid fa-sign-in-alt" />
              &nbsp;Sign in
            </Link>
          )}
          {!loading && session && (
            <Link href="#" onClick={() => signOut()}>
              <i className="fa-solid fa-sign-out-alt" />
              &nbsp;Sign out
            </Link>
          )}
        </Menu>
      </Dropdown>
    </Header>
  );
};
