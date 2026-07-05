/**
 * Jest mock for better-sqlite3 using Node.js built-in node:sqlite.
 *
 * better-sqlite3 is compiled against Electron's Node.js ABI and cannot load
 * in the system Node.js test environment. This shim provides the same
 * synchronous API (prepare / run / all / get / exec / pragma / close) backed
 * by node:sqlite so real SQL runs in tests without native-module issues.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { DatabaseSync } = require("node:sqlite");

class MockStatement {
  constructor(stmt) {
    this._stmt = stmt;
  }

  run(...args) {
    const result = this._stmt.run(...args);
    return {
      changes: result.changes,
      lastInsertRowid:
        typeof result.lastInsertRowid === "bigint"
          ? Number(result.lastInsertRowid)
          : result.lastInsertRowid,
    };
  }

  all(...args) {
    return this._stmt.all(...args);
  }

  get(...args) {
    return this._stmt.get(...args);
  }
}

class MockDatabase {
  constructor(pathOrMemory) {
    this._db = new DatabaseSync(
      pathOrMemory === ":memory:" ? ":memory:" : pathOrMemory
    );
  }

  exec(sql) {
    this._db.exec(sql);
    return this;
  }

  prepare(sql) {
    return new MockStatement(this._db.prepare(sql));
  }

  // better-sqlite3 transaction(fn) returns a function that runs fn wrapped in
  // BEGIN/COMMIT (ROLLBACK on throw). Mirror that with node:sqlite exec().
  transaction(fn) {
    return (...args) => {
      this._db.exec("BEGIN");
      try {
        const result = fn(...args);
        this._db.exec("COMMIT");
        return result;
      } catch (err) {
        this._db.exec("ROLLBACK");
        throw err;
      }
    };
  }

  // better-sqlite3 pragma() returns an array for most pragmas; tests don't
  // actually inspect the return value so returning null is safe.
  pragma(_str) {
    return null;
  }

  close() {
    this._db.close();
  }
}

module.exports = MockDatabase;
