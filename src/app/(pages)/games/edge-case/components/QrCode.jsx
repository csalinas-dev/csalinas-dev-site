import { useMemo } from "react";

import { encodeQr, qrPath } from "@/lib/qr";

/**
 * A QR code, encoded in this process and drawn as inline SVG.
 *
 * No image service, no library, no request: `@/lib/qr` does the encoding, which
 * matters here because this renders on a TV that may be on a guest network and
 * because the room code has no business in a third party's logs.
 *
 * Fixed colours rather than palette variables. A QR reader needs dark modules on
 * a light field with real contrast, and it is photographed off a screen at an
 * angle in a lit room — this is the one thing on the page that must not follow
 * the theme. The quiet zone is part of the symbol, not a margin: without four
 * modules of white around it, plenty of scanners simply do not see the code.
 *
 * @param {Object} props
 * @param {String} props.value - What the code encodes, e.g. a join URL
 * @param {String} [props.label] - Accessible name for the image
 * @param {Number} [props.size] - Rendered size in pixels
 */
export const QrCode = ({ value, label, size = 176 }) => {
  const symbol = useMemo(() => {
    try {
      return encodeQr(value);
    } catch {
      // Nothing this component is asked to encode should overflow version 10,
      // but a missing QR is a worse answer than a missing screen.
      return null;
    }
  }, [value]);

  if (!symbol) return null;

  const quiet = 4;
  const span = symbol.size + quiet * 2;

  return (
    <svg
      aria-label={label ?? `QR code for ${value}`}
      height={size}
      role="img"
      shapeRendering="crispEdges"
      style={{ borderRadius: "0.5rem", display: "block" }}
      viewBox={`0 0 ${span} ${span}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#ffffff" height={span} width={span} x="0" y="0" />
      <path
        d={qrPath(symbol.modules)}
        fill="#000000"
        transform={`translate(${quiet} ${quiet})`}
      />
    </svg>
  );
};
