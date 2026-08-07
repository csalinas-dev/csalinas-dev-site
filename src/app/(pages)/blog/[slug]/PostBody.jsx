"use client";

import { useEffect, useRef, useState } from "react";

import { Grid, Progress, Toc, TocEntry, TocList, TocSpacer } from "./components";

// The issue's "not for posts under ~2 screens of content" rule. It lives here
// and nowhere else.
export const LONG_POST_SCREENS = 2;

// Keep in sync with the 900px media queries in components.jsx.
const WIDE = "(min-width: 900px)";

// A heading counts as the one being read once it has passed this far up the
// viewport — the TOC's 60px sticky offset plus a little slack.
const ACTIVE_MARGIN = 120;

/**
 * The reading affordances around a post body: the progress bar, the sticky
 * heading TOC, and the two-column body grid. This is the only part of a post
 * that is measured from the rendered page, which is why it is also the only
 * client component in the layout — `children` is the server-rendered
 * `<Article>` and passes straight through.
 */
export const PostBody = ({ children }) => {
  const articleRef = useRef(null);
  const headingEls = useRef([]);
  const [headings, setHeadings] = useState([]);
  const [long, setLong] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  // Everything below is measured, so it all runs after mount: the first client
  // render has to match the prerendered HTML, which carries neither the bar nor
  // the TOC.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    // remark-gfm appends its own <h2 id="footnote-label">Footnotes</h2>, which
    // is not a section of the post.
    headingEls.current = Array.from(article.querySelectorAll("h2")).filter(
      (h) => !h.closest("[data-footnotes]")
    );
    setHeadings(
      headingEls.current.map((h) => ({ id: h.id, text: h.textContent }))
    );

    const measure = () =>
      setLong(
        article.getBoundingClientRect().height >=
          window.innerHeight * LONG_POST_SCREENS
      );
    measure();

    // Images finishing their load and the user resizing both change the answer.
    const observer = new ResizeObserver(measure);
    observer.observe(article);
    window.addEventListener("resize", measure);

    // Open on wide screens, where the summary is a label rather than a control;
    // collapsed below 900px, per the responsive spec.
    const wide = window.matchMedia(WIDE);
    const follow = () => setOpen(wide.matches);
    follow();
    wide.addEventListener("change", follow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      wide.removeEventListener("change", follow);
    };
  }, []);

  useEffect(() => {
    if (!long) return;
    const article = articleRef.current;
    if (!article) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      // Progress through the <article>, not the document: 0% when its top edge
      // reaches the top of the viewport, 100% when its bottom reaches the
      // bottom. Reading it out of the viewport rect means no scroll-container
      // arithmetic — see the note in CLAUDE.md about body being the scroller.
      const total = rect.height - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0);

      let active = headingEls.current[0]?.id ?? null;
      for (const el of headingEls.current) {
        if (el.getBoundingClientRect().top > ACTIVE_MARGIN) break;
        active = el.id;
      }
      setActiveId(active);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    // document.body is the scroll container (globals.css sets body { height:
    // 100vh; overflow-y: auto }), so window never fires this event.
    document.body.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.body.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [long]);

  const showToc = long && headings.length > 0;

  return (
    <>
      {long && <Progress style={{ width: `${progress * 100}%` }} />}
      <Grid>
        {showToc ? (
          <Toc open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
            <summary>Contents</summary>
            <TocList>
              {headings.map(({ id, text }) => (
                <TocEntry
                  key={id}
                  href={`#${id}`}
                  className={id === activeId ? "active" : undefined}
                >
                  {text}
                </TocEntry>
              ))}
            </TocList>
          </Toc>
        ) : (
          <TocSpacer />
        )}
        <div ref={articleRef}>{children}</div>
      </Grid>
    </>
  );
};
