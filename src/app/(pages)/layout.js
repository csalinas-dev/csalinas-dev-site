import { Fragment } from "react";
import { Nav, Footer } from "@/components";
import { Stack } from "@mui/material";

export default function PagesLayout({ children }) {
  return (
    <Fragment>
      <Nav />
      <Stack component="main" direction="column" sx={{ flex: "1 1 0px" }}>
        {children}
      </Stack>
      <Footer />
    </Fragment>
  );
}
