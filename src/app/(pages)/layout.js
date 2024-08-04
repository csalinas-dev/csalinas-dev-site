import { Fragment } from "react";
import { Nav } from "@/components";

export default function PagesLayout({ children }) {
  return (
    <Fragment>
      <Nav />
      <main>{children}</main>
    </Fragment>
  );
}
