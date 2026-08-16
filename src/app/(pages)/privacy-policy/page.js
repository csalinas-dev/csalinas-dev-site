import { Section, Title } from "@/components";
import { Typography, List, ListItem } from "@mui/material";

export const metadata = { title: "Privacy Policy | Christopher Salinas Jr." };

const PrivacyPolicy = () => {
  return (
    <Section sx={{ gap: 3 }}>
      <Title>Privacy Policy</Title>

      <Typography variant="h4" component="h2" gutterBottom>
        Last Updated: August 16, 2026
      </Typography>

      <Typography variant="body1" paragraph>
        This Privacy Policy describes how I collect, use, and share your personal information when you visit csalinas.dev (the &quot;Website&quot;).
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Information I Collect
      </Typography>

      <Typography variant="body1" paragraph>
        When you visit the Website, my server receives the information any web request carries: your IP address, your browser and device type, and the page you asked for. The analytics service described below also records which pages you view and what site or search referred you.
      </Typography>

      <Typography variant="body1" paragraph>
        Your IP address is additionally used, in memory only, to rate limit a few endpoints — creating a multiplayer room, for example — so that one visitor cannot flood them. Those counters expire within a minute, are lost when the server restarts, and are never written to the database.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Accounts
      </Typography>

      <Typography variant="body1" paragraph>
        An account is optional. Nothing on the Website requires one; signing in to Wordleverse saves your game history to the database so it follows you between devices, and that is the whole of it.
      </Typography>

      <Typography variant="body1" paragraph>
        If you register with an email address and password, I store your name, your email address, and a hashed version of your password — the password itself is never stored. If you sign in with Google or GitHub instead, I store the name, email address, and profile image that service returns, plus the tokens needed to keep you signed in. Registration sends you a verification email, which means your address also passes through my email provider.
      </Typography>

      <Typography variant="body1" paragraph>
        While you are signed in, the Wordleverse games you play are saved against your account: the date, the word, your guesses, the board, and your streak. Signed out, those same games are kept only in your browser.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Multiplayer Games
      </Typography>

      <Typography variant="body1" paragraph>
        Several of the games can be played online against other people. Playing online creates a room — one database row, identified by a four-character code — holding the game in progress and, for each player, a seat number, a colour, a display name, and the times they joined and were last seen. No account is involved, and nothing in a room is linked to one even if you happen to be signed in.
      </Typography>

      <Typography variant="body1" paragraph>
        A room is deleted 60 minutes after its last move. Nothing is archived first: when the room goes, the game, the names, and the seats go with it, and requests for it are answered as though it never existed.
      </Typography>

      <Typography variant="body1" paragraph>
        Anyone holding a room&apos;s code can watch that game and see the display names in it, whether or not they are playing. Codes are four characters and are listed nowhere, but they are not secret either — share one only with the people you want in the game.
      </Typography>

      <Typography variant="body1" paragraph>
        Edge Case asks for a display name in its lobby and remembers your last one in your browser. The other online games do not ask, and call you by your seat or your colour. Whatever you type is shown to everyone in the room, so treat it as public and do not put anything in it you would not want a stranger to read.
      </Typography>

      <Typography variant="body1" paragraph>
        The Website needs some way to tell which browser holds which seat, and it does not use an account for that. The first time you open an online game — playing or watching — your browser generates a random identifier and saves it under CSALINAS-PLAYER-TOKEN in both local storage and a cookie of the same name — either one alone is enough, and keeping both is what stops a refresh in a private window turning you into a different player. It travels with your moves so the server can work out whose turn was just taken, which is also how you get your seat back after a refresh or a dropped connection.
      </Typography>

      <Typography variant="body1" paragraph>
        That identifier is not an account. It is not connected to one if you have one, it carries no information about you, and it is not used for advertising or to follow you across other websites — only csalinas.dev can read it, and only the rooms you have joined mean anything by it. Clearing your browser&apos;s site data removes it, and the next room you join will simply treat you as a new player.
      </Typography>

      <Typography variant="body1" paragraph>
        Keeping a game live uses one more short-lived credential: a single-use ticket, good for about thirty seconds, that lets your browser open the streaming connection. Tickets are held in the server&apos;s memory and are never written to the database.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        How I Use Your Information
      </Typography>

      <Typography variant="body1" paragraph>
        I use the information I collect to:
      </Typography>

      <List>
        <ListItem>Run the Website and the games on it</ListItem>
        <ListItem>Keep you signed in and save your game history if you have an account</ListItem>
        <ListItem>Understand which pages and games people actually use</ListItem>
        <ListItem>Rate limit requests and otherwise protect the Website from abuse</ListItem>
      </List>

      <Typography variant="h4" component="h2" gutterBottom>
        Sharing Your Information
      </Typography>

      <Typography variant="body1" paragraph>
        I may share your personal information with third-party service providers to help me operate my Website, such as web hosting providers, analytics services, and other service providers.
      </Typography>

      <Typography variant="body1" paragraph>
        I do not sell your personal information. I may disclose it if required by law or if I believe that such action is necessary to comply with legal obligations or protect and defend my rights or property.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Cookies and Local Storage
      </Typography>

      <Typography variant="body1" paragraph>
        The Website sets a cookie when you sign in — that is how a session survives a page load — and a CSALINAS-PLAYER-TOKEN cookie holding the multiplayer identifier described above, alongside the copy in local storage. The analytics and anti-spam services described below set cookies of their own. There are no advertising cookies.
      </Typography>

      <Typography variant="body1" paragraph>
        Most of what the Website remembers about you is kept in your browser&apos;s local storage rather than in a cookie:
      </Typography>

      <List>
        <ListItem>WORDLEVERSE-… — your Wordleverse games, while you are playing signed out</ListItem>
        <ListItem>expert — whether Wordleverse expert mode is switched on</ListItem>
        <ListItem>HASHTAG-… — your saved Hashtag puzzles</ListItem>
        <ListItem>TICTACOVERFLOW-PREVIEW — whether Tic-Tac-Overflow hints at the mark your next move will clear</ListItem>
        <ListItem>EDGECASE-NAME — the display name you last used in Edge Case</ListItem>
        <ListItem>CSALINAS-PLAYER-TOKEN — the multiplayer identifier described above, kept here and in a cookie of the same name</ListItem>
      </List>

      <Typography variant="body1" paragraph>
        These stay on your device unless the Website has a reason to send them: signing in moves your saved Wordleverse games onto your account, and your Edge Case name goes to a room when you join one. Clearing site data for csalinas.dev deletes all of it. You can also instruct your browser to refuse cookies; you will still be able to read the site and play the games that do not need an account.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Third-Party Services
      </Typography>

      <Typography variant="body1" paragraph>
        The Website loads a handful of third-party services in your browser. Each of them will see your IP address and the usual request information:
      </Typography>

      <List>
        <ListItem>Google Analytics, loaded through Google Tag Manager, for page view statistics</ListItem>
        <ListItem>Google reCAPTCHA, on the registration form, to keep automated sign-ups out</ListItem>
        <ListItem>Font Awesome, which serves the site&apos;s icons</ListItem>
        <ListItem>github-contributions-api.jogruber.de, on the GitHub page only, which supplies the contribution graph</ListItem>
        <ListItem>substackcdn.com, on blog posts that came from my newsletter, which serves the images in them and therefore sees your IP address when one of those posts loads</ListItem>
        <ListItem>Google or GitHub, but only if you choose to sign in with one of them</ListItem>
      </List>

      <Typography variant="body1" paragraph>
        Two things on the Website are written somewhere else and fetched by my server rather than by your browser: the Mini Motorways page&apos;s data, which comes from Hygraph, and the text of the blog posts that started life on my Substack newsletter, which my server collects on a schedule and stores. Your browser never contacts either one to read a post here.
      </Typography>

      <Typography variant="body1" paragraph>
        My Website may also contain links to other websites that are not operated by me. If you click on a third-party link, you will be directed to that third party&apos;s site. I strongly advise you to review the Privacy Policy of every site you visit.
      </Typography>

      <Typography variant="body1" paragraph>
        I have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Data Retention
      </Typography>

      <Typography variant="body1" paragraph>
        How long something is kept depends on what it is:
      </Typography>

      <List>
        <ListItem>Multiplayer rooms — 60 minutes after the last move, then deleted outright</ListItem>
        <ListItem>Streaming tickets and rate limit counters — seconds to a minute, in memory only</ListItem>
        <ListItem>Your account and its Wordleverse history — for as long as the account exists</ListItem>
        <ListItem>Anything in local storage — until you clear it</ListItem>
        <ListItem>The CSALINAS-PLAYER-TOKEN cookie — one year, renewed each time you open an online game, or until you clear it</ListItem>
      </List>

      <Typography variant="body1" paragraph>
        There is no delete-my-account button yet. Email me at the address below and I will delete your account and its game history.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Changes to This Privacy Policy
      </Typography>

      <Typography variant="body1" paragraph>
        I may update my Privacy Policy from time to time. I will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
      </Typography>

      <Typography variant="body1" paragraph>
        You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Contact Me
      </Typography>

      <Typography variant="body1" paragraph>
        If you have any questions about this Privacy Policy, please contact me at:
      </Typography>

      <Typography variant="body1" paragraph>
        Email: contact@csalinas.dev
      </Typography>
    </Section>
  );
};

export default PrivacyPolicy;
