// An in-memory stand-in for `@/lib/prisma`'s `gameRoom` delegate, so a
// verification script can run the REAL `src/lib/realtime/rooms.js` without a
// MySQL anywhere. Paired with ./prisma-stub-resolver.mjs, which is what points
// `@/lib/prisma` here; importing this module directly from the script gets the
// same instance, because Node keys modules by resolved URL.
//
// Rows are JSON round-tripped on both write and read. That is not tidiness: it
// is the property of a MySQL JSON column that matters, so nothing a check
// observes can be an object reference the database would never have preserved.
//
// It implements only what the code under test calls. Anything else throws
// rather than quietly returning a shape that would make a check pass.

const rows = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Seed a room row. Returns the stored copy. */
export function seedRoom(row) {
  rows.set(row.code, clone(row));
  return clone(rows.get(row.code));
}

/** Read a row back the way the database would hand it over. */
export function readRoom(code) {
  const row = rows.get(code);
  return row ? clone(row) : null;
}

export function resetRooms() {
  rows.clear();
}

const gameRoom = {
  async findUnique({ where: { code } }) {
    return readRoom(code);
  },

  // The conditional UPDATE the whole compare-and-set scheme rests on.
  async updateMany({ where: { code, revision }, data }) {
    const row = rows.get(code);
    if (!row) return { count: 0 };
    if (revision !== undefined && row.revision !== revision) return { count: 0 };

    rows.set(
      code,
      clone({ ...row, ...data, updatedAt: new Date().toISOString() })
    );
    return { count: 1 };
  },

  async deleteMany() {
    // `maybeSweep` fires this and never awaits it; nothing here expires.
    return { count: 0 };
  },

  async delete({ where: { code } }) {
    rows.delete(code);
    return {};
  },
};

const unsupported = (name) => {
  throw new Error(`prisma-stub: ${name} is not implemented`);
};

const prisma = {
  gameRoom: new Proxy(gameRoom, {
    get: (target, key) =>
      key in target ? target[key] : () => unsupported(`gameRoom.${String(key)}`),
  }),
};

export default prisma;
