/**
 * A QR code encoder, in-process.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * The spectator view (`/games/edge-case`, #94) puts a join code on a TV and a QR
 * beside it. Every obvious way to get that QR is out:
 *
 *   - An image service (`api.qrserver.com`, Google Charts) is a third-party
 *     request from a page that makes none, it leaks the room code to somebody
 *     else's logs, and this site's CSP would refuse it anyway.
 *   - A client-side npm library is 20-40 kB of bundle for one screen.
 *
 * So it is encoded here, on the fly, and rendered as inline SVG. No request, no
 * dependency, and it works with the network off.
 *
 * SCOPE — deliberately small
 * --------------------------
 * Byte mode (UTF-8), error correction level M, versions 1 through 10. That
 * covers 1 to 213 bytes, and the thing being encoded is a URL of about fifty:
 *
 *     https://csalinas.dev/games/edge-case?room=K7F2
 *
 * Anything longer throws rather than silently producing a code that will not
 * scan. Byte mode alone costs about 20% capacity against alphanumeric mode on an
 * upper-case URL, which at this length is worth far less than the segmenting
 * logic it would take to exploit — and level M's 15% recovery is what makes a QR
 * survive being photographed off a television at an angle.
 *
 * WHAT IS CANONICAL HERE
 * ----------------------
 * Everything in this file is ISO/IEC 18004. The two tables at the top are the
 * only numbers that cannot be derived; the rest — module count, alignment
 * pattern positions, the BCH format and version bits, the mask penalty — are
 * computed from the spec's formulae, which is both shorter and harder to typo
 * than transcribing four forty-column tables.
 *
 * The structure follows Nayuki's public-domain reference implementation, which
 * is the one everybody's QR library is a translation of. It is reimplemented
 * rather than vendored: the vendored file is ~1,200 lines covering four ECC
 * levels, all forty versions, four encoding modes and segment optimisation, and
 * carrying all of that to encode one short URL is not a saving.
 */

// ---------------------------------------------------------------------------
// The two tables the spec does not let you derive. Level M, versions 1-10.
// ---------------------------------------------------------------------------

// Error correction codewords per block.
const ECC_CODEWORDS_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];

// How many blocks the data is split across.
const ECC_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

// The resulting data capacity, in codewords: 16, 28, 44, 64, 86, 108, 124, 154,
// 182, 216 — which is the published table for level M, and the cheapest way to
// tell whether the two arrays above survived being typed.

export const MIN_VERSION = 1;
export const MAX_VERSION = 10;

// Level M's own two bits, as they appear in the format information.
const ECL_FORMAT_BITS = 0b00;

// Byte mode's four-bit mode indicator.
const MODE_BYTE = 0b0100;

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// ---------------------------------------------------------------------------
// GF(256) — the field Reed-Solomon lives in, x^8 + x^4 + x^3 + x^2 + 1.
// ---------------------------------------------------------------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i += 1) {
  GF_EXP[i] = x;
  GF_LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];

/** Multiply in GF(256). Zero is not in the log table, hence the special case. */
const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

/** The divisor polynomial for `degree` ECC codewords: (x - a^0)...(x - a^(d-1)). */
const rsGenerator = (degree) => {
  // Coefficients in descending order of power; the leading 1 is implicit at the
  // start and stays 1 throughout, so it is dropped from the returned array.
  let poly = [1];

  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }

  return poly;
};

/** The ECC codewords for one block: the remainder of data / generator. */
const rsRemainder = (data, degree) => {
  const generator = rsGenerator(degree);
  const result = new Uint8Array(degree);

  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[degree - 1] = 0;
    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMul(generator[i + 1], factor);
    }
  }

  return [...result];
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Modules per side. */
const sizeOf = (version) => version * 4 + 17;

/**
 * Total codewords (data + ECC) a version holds — the module count minus every
 * function pattern, over eight. The spec gives this as a table; it is a formula.
 */
const rawCodewords = (version) => {
  let modules = (16 * version + 128) * version + 64;

  if (version >= 2) {
    const alignments = Math.floor(version / 7) + 2;
    modules -= (25 * alignments - 10) * alignments - 55;
    if (version >= 7) modules -= 36;
  }

  return Math.floor(modules / 8);
};

const eccPerBlock = (version) => ECC_CODEWORDS_PER_BLOCK[version - 1];
const blockCount = (version) => ECC_BLOCKS[version - 1];

const dataCodewords = (version) =>
  rawCodewords(version) - eccPerBlock(version) * blockCount(version);

/**
 * Centre coordinates of the alignment patterns. Always the first at 6 and the
 * last at size - 7, with the rest evenly spaced by an even step.
 */
const alignmentPositions = (version) => {
  if (version === 1) return [];

  const count = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];

  for (let pos = sizeOf(version) - 7; positions.length < count; pos -= step) {
    positions.splice(1, 0, pos);
  }

  return positions;
};

/** The character count indicator widens at version 10 for byte mode. */
const charCountBits = (version) => (version < 10 ? 8 : 16);

const getBit = (value, index) => ((value >>> index) & 1) !== 0;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Mode indicator, length, payload, terminator and padding — one bit array. */
const buildDataCodewords = (bytes, version) => {
  const capacity = dataCodewords(version) * 8;
  const bits = [];

  const push = (value, width) => {
    for (let i = width - 1; i >= 0; i -= 1) bits.push(getBit(value, i) ? 1 : 0);
  };

  push(MODE_BYTE, 4);
  push(bytes.length, charCountBits(version));
  for (const byte of bytes) push(byte, 8);

  // Terminator: up to four zeroes, then zeroes to the next byte boundary.
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  // The spec's pad bytes, alternating, until the block is full.
  for (let pad = 0xec; codewords.length < capacity / 8; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }

  return codewords;
};

/**
 * Split into blocks, append each block's ECC, and interleave.
 *
 * Interleaving is what makes the error correction worth having: a coffee ring
 * over one corner of the symbol damages a few codewords of every block rather
 * than destroying one block outright.
 */
const addEccAndInterleave = (data, version) => {
  const blocks = blockCount(version);
  const eccLen = eccPerBlock(version);
  const total = rawCodewords(version);

  const shortBlocks = blocks - (total % blocks);
  const shortLength = Math.floor(total / blocks);

  const built = [];
  for (let i = 0, offset = 0; i < blocks; i += 1) {
    const length = shortLength - eccLen + (i < shortBlocks ? 0 : 1);
    const block = data.slice(offset, offset + length);
    offset += length;

    const ecc = rsRemainder(block, eccLen);
    // A placeholder so every block is the same length while interleaving; the
    // loop below skips exactly these positions.
    if (i < shortBlocks) block.push(0);
    built.push([...block, ...ecc]);
  }

  const result = [];
  for (let i = 0; i < built[0].length; i += 1) {
    for (let j = 0; j < built.length; j += 1) {
      if (i !== shortLength - eccLen || j >= shortBlocks) result.push(built[j][i]);
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// The symbol
// ---------------------------------------------------------------------------

class Symbol_ {
  constructor(version) {
    this.version = version;
    this.size = sizeOf(version);
    this.modules = Array.from({ length: this.size }, () =>
      new Array(this.size).fill(false)
    );
    // Function patterns are never masked and never carry data.
    this.reserved = Array.from({ length: this.size }, () =>
      new Array(this.size).fill(false)
    );
  }

  set(x, y, dark) {
    this.modules[y][x] = dark;
    this.reserved[y][x] = true;
  }

  drawFinder(x, y) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          // Rings at distance 0-1 and 3 are dark; 2 is the white ring and 4 is
          // the separator.
          this.set(xx, yy, distance !== 2 && distance !== 4);
        }
      }
    }
  }

  drawAlignment(x, y) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  /** BCH(15, 5) format information, written twice, plus the dark module. */
  drawFormat(mask) {
    const data = (ECL_FORMAT_BITS << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i += 1) {
      remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    }
    const bits = ((data << 10) | remainder) ^ 0x5412;

    for (let i = 0; i <= 5; i += 1) this.set(8, i, getBit(bits, i));
    this.set(8, 7, getBit(bits, 6));
    this.set(8, 8, getBit(bits, 7));
    this.set(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i += 1) this.set(14 - i, 8, getBit(bits, i));

    for (let i = 0; i < 8; i += 1) {
      this.set(this.size - 1 - i, 8, getBit(bits, i));
    }
    for (let i = 8; i < 15; i += 1) {
      this.set(8, this.size - 15 + i, getBit(bits, i));
    }

    // Always dark, in every symbol ever made.
    this.set(8, this.size - 8, true);
  }

  /** BCH(18, 6) version information — only versions 7 and up carry it. */
  drawVersion() {
    if (this.version < 7) return;

    let remainder = this.version;
    for (let i = 0; i < 12; i += 1) {
      remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    }
    const bits = (this.version << 12) | remainder;

    for (let i = 0; i < 18; i += 1) {
      const dark = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  drawFunctionPatterns() {
    // Timing patterns first: the finders overwrite their ends, which is what the
    // spec wants.
    for (let i = 0; i < this.size; i += 1) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }

    this.drawFinder(3, 3);
    this.drawFinder(this.size - 4, 3);
    this.drawFinder(3, this.size - 4);

    const positions = alignmentPositions(this.version);
    const last = positions.length - 1;
    for (let i = 0; i <= last; i += 1) {
      for (let j = 0; j <= last; j += 1) {
        // The three corners belong to the finder patterns.
        const corner =
          (i === 0 && j === 0) ||
          (i === 0 && j === last) ||
          (i === last && j === 0);
        if (!corner) this.drawAlignment(positions[i], positions[j]);
      }
    }

    // Reserve the format area now; the real bits go in once a mask is chosen.
    this.drawFormat(0);
    this.drawVersion();
  }

  /**
   * The zigzag. Two-module columns walked right to left, alternating up and
   * down, skipping every function module — and skipping column 6 entirely,
   * which is the vertical timing pattern.
   */
  drawCodewords(codewords) {
    let i = 0;

    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;

      for (let vert = 0; vert < this.size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;

          if (!this.reserved[y][x] && i < codewords.length * 8) {
            this.modules[y][x] = getBit(codewords[i >>> 3], 7 - (i & 7));
            i += 1;
          }
        }
      }
    }
  }

  /** XOR the data region with one of the eight masks. Self-inverse. */
  applyMask(mask) {
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (this.reserved[y][x]) continue;

        let invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }

        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  /**
   * How ugly a masked symbol is, by the spec's four rules. Lower is better; the
   * only thing this affects is which of the eight masks gets used, so it is the
   * one part of the file where being a little off costs nothing but contrast.
   */
  penalty() {
    let score = 0;
    const { size, modules } = this;

    const addHistory = (run, history) => {
      // The quiet zone counts as light modules for the finder-lookalike rule.
      const length = history[0] === 0 ? run + size : run;
      history.pop();
      history.unshift(length);
    };

    const countPatterns = (history) => {
      const n = history[1];
      const core =
        n > 0 &&
        history[2] === n &&
        history[3] === n * 3 &&
        history[4] === n &&
        history[5] === n;

      return (
        (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
        (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
      );
    };

    const terminate = (color, run, history) => {
      let length = run;
      if (color) {
        addHistory(length, history);
        length = 0;
      }
      addHistory(length + size, history);
      return countPatterns(history);
    };

    // Rule 1 (runs) and rule 3 (finder lookalikes), by row then by column.
    for (const horizontal of [true, false]) {
      for (let a = 0; a < size; a += 1) {
        let color = false;
        let run = 0;
        const history = [0, 0, 0, 0, 0, 0, 0];

        for (let b = 0; b < size; b += 1) {
          const dark = horizontal ? modules[a][b] : modules[b][a];

          if (dark === color) {
            run += 1;
            if (run === 5) score += PENALTY_N1;
            else if (run > 5) score += 1;
          } else {
            addHistory(run, history);
            if (!color) score += countPatterns(history) * PENALTY_N3;
            color = dark;
            run = 1;
          }
        }

        score += terminate(color, run, history) * PENALTY_N3;
      }
    }

    // Rule 2: solid 2x2 blocks.
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const color = modules[y][x];
        if (
          color === modules[y][x + 1] &&
          color === modules[y + 1][x] &&
          color === modules[y + 1][x + 1]
        ) {
          score += PENALTY_N2;
        }
      }
    }

    // Rule 4: how far the dark/light balance strays from even.
    let dark = 0;
    for (const row of modules) for (const cell of row) if (cell) dark += 1;

    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += k * PENALTY_N4;

    return score;
  }
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** UTF-8, so a name or a URL with anything non-ASCII in it still encodes. */
const toBytes = (text) => [...new TextEncoder().encode(text)];

/**
 * Encode text as a QR code.
 *
 * @param {String} text - The payload. A URL, in practice.
 * @returns {{modules: Boolean[][], size: Number, version: Number, mask: Number}}
 *   `modules[y][x]` is true where the module is dark.
 * @throws If the text does not fit in version 10 at error correction level M.
 */
export const encodeQr = (text) => {
  const bytes = toBytes(String(text ?? ""));

  let version = MIN_VERSION;
  while (
    version <= MAX_VERSION &&
    dataCodewords(version) * 8 < 4 + charCountBits(version) + bytes.length * 8
  ) {
    version += 1;
  }

  if (version > MAX_VERSION) {
    throw new Error(
      `qr: ${bytes.length} bytes is more than version ${MAX_VERSION} holds at error correction level M`
    );
  }

  const codewords = addEccAndInterleave(
    buildDataCodewords(bytes, version),
    version
  );

  const symbol = new Symbol_(version);
  symbol.drawFunctionPatterns();
  symbol.drawCodewords(codewords);

  // All eight masks, and the least ugly one wins. The mask is XORed in and out,
  // so the same symbol is reused rather than rebuilt eight times.
  let bestMask = 0;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask += 1) {
    symbol.applyMask(mask);
    symbol.drawFormat(mask);
    const score = symbol.penalty();
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    symbol.applyMask(mask);
  }

  symbol.applyMask(bestMask);
  symbol.drawFormat(bestMask);

  return {
    modules: symbol.modules,
    size: symbol.size,
    version,
    mask: bestMask,
  };
};

/**
 * One SVG path covering every dark module, in module units.
 *
 * One path rather than a rect per module: a version 4 symbol is 33x33, and
 * several hundred elements is a lot of DOM for something that never changes.
 *
 * @param {Boolean[][]} modules - From `encodeQr`
 * @returns {String} A `d` attribute
 */
export const qrPath = (modules) => {
  const parts = [];

  modules.forEach((row, y) => {
    let run = 0;
    row.forEach((dark, x) => {
      if (dark) {
        run += 1;
        return;
      }
      if (run > 0) parts.push(`M${x - run} ${y}h${run}v1h-${run}z`);
      run = 0;
    });
    if (run > 0) parts.push(`M${row.length - run} ${y}h${run}v1h-${run}z`);
  });

  return parts.join("");
};

export default encodeQr;
