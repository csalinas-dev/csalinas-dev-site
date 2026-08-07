import Connect404Artwork from "./_artwork/Connect404";
import EdgeCaseArtwork from "./_artwork/EdgeCase";
import HashtagArtwork from "./_artwork/Hashtag";
import TicTacOverflowArtwork from "./_artwork/TicTacOverflow";
import WordleverseArtwork from "./_artwork/Wordleverse";

// Everything the /games index renders, in display order. `Artwork` is the
// component itself, not an element, so this stays a plain module with no JSX;
// `slug` is the React key.
//
// This is only what is *linked*: Mini Motorways is hidden for now — the page
// itself still lives at /games/mini-motorways, it just isn't listed here or in
// the nav.
export const GAMES = [
  {
    slug: "wordleverse",
    title: "Wordleverse",
    href: "/games/wordleverse",
    Artwork: WordleverseArtwork,
  },
  {
    slug: "hashtag",
    title: "Hashtag",
    href: "/games/hashtag",
    Artwork: HashtagArtwork,
  },
  {
    slug: "tic-tac-overflow",
    title: "Tic-Tac-Overflow",
    href: "/games/tic-tac-overflow",
    Artwork: TicTacOverflowArtwork,
  },
  {
    slug: "edge-case",
    title: "Edge Case",
    href: "/games/edge-case",
    Artwork: EdgeCaseArtwork,
  },
  {
    slug: "connect-404",
    title: "Connect 404",
    href: "/games/connect-404",
    Artwork: Connect404Artwork,
  },
];
