"use client";

import styled from "@emotion/styled";
import NextImage from "next/image";
import { Link } from "@/components";
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

const NavLink = styled(Link)`
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
      <NavLink href="/" className="primary">
        <Logo
          src={logo}
          height="20"
          width="20"
          alt="Christopher Salinas Jr Portfolio Logo"
        />
        Chris Salinas Jr
      </NavLink>
      <NavLink href="/github">GitHub</NavLink>
      <NavLink href="/projects">Projects</NavLink>
      <Dropdown>
        <NavLink href="/games">Games</NavLink>
        <Menu className="menu">
          <SubTitle>Play</SubTitle>
          <NavLink href="/games/wordleverse">Wordleverse</NavLink>
          <NavLink href="/games/hashtag">Hashtag</NavLink>
          <SubTitle>Compare</SubTitle>
          <NavLink href="/games/mini-motorways">Mini Motorways</NavLink>
        </Menu>
      </Dropdown>
      <div style={{ flexGrow: 1 }} />
      <Dropdown>
        <NavLink href="#">{session ? session.user?.name : "Account"}</NavLink>
        <Menu className="menu right">
          {loading && <NavLink href="#">Loading ...</NavLink>}
          {!loading && !session && (
            <NavLink href="#" onClick={() => signIn()}>
              <i className="fa-solid fa-sign-in-alt" />
              &nbsp;Sign in
            </NavLink>
          )}
          {!loading && session && (
            <NavLink href="#" onClick={() => signOut()}>
              <i className="fa-solid fa-sign-out-alt" />
              &nbsp;Sign out
            </NavLink>
          )}
        </Menu>
      </Dropdown>
    </Header>
  );
};
