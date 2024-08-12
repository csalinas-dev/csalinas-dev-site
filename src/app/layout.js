import Script from "next/script";
import { Sono } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";

const sono = Sono({ subsets: ["latin"], fallback: ["monospace"] });

export const metadata = {
  title: "Christopher Salinas Jr. | Software Engineer",
  description: "Portfolio for Christopher Salinas Jr. from Albuquerque, NM.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="G-V3GE5HTDV2" />
      <body className={sono.className}>
        {children}
        <Script
          src="https://kit.fontawesome.com/1e18be7ee9.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
