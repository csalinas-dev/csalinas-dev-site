"use client";

import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
const Game = dynamic(() => import("./Game"), { ssr: false });

import { ContextProvider } from "./context";

export const metadata = {
  title: "Wordleverse | Christopher Salinas Jr.",
};

export default function Wordleverse() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  
  return (
    <ContextProvider date={date}>
      <Game />
    </ContextProvider>
  );
}
