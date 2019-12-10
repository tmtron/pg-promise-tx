import { initDb } from "./db";
import { sleep } from "./util";

export async function taskTx() {
  const { db, pgp } = initDb(2);

  await db.any("truncate table test");

  async function noTask() {
    const result = await db.one("insert into test values(12) returning num");
    console.log(result);
  }
  async function task() {
    const result = await db.task(t =>
      t.one("insert into test values(12) returning num")
    );
    console.log(result);
  }
  async function tx() {
    const result = await db.tx(t =>
      t.one("insert into test values(12) returning num")
    );
    console.log(result);
  }

  async function taskWith() {
    return db.task(async task => {
      const cnt1 = await task.one("select count(*) as cnt from test");
      console.log("cnt1: " + cnt1.cnt);
      await task.txIf(async t => {
        await t.one("insert into test values(12) returning num");
        await t.txIf(t2 => t2.one("insert into test values(13) returning num"));
      });
      const cnt2 = await task.one("select count(*) as cnt from test");
      console.log("cnt2: " + cnt2.cnt);
    });
  }

  async function multi() {
    console.time("multi");
    // note: there is only one request to the server, but the queries will be executed one after the another
    const res = await db.task(t =>
      t.multi("SELECT pg_sleep(2) as a; SELECT pg_sleep(3) as b")
    );
    console.timeLog("multi", res);
  }

  async function batch() {
    console.time("batch");

    // note: there is only one connection and request to the server, so the queries will be executed one after the another
    const res = await db.task(t => {
      return t.batch([
        t.any("SELECT pg_sleep(2) as a"),
        t.any("SELECT pg_sleep(3) as b")
      ]);
    });
    console.timeLog("batch", res);
  }

  async function parallel2() {
    console.time("parallel");
    // note: we open 2 connections to the db and the queries are executed in parallel
    const p1 = db.task(t => t.any("SELECT pg_sleep(2) as a"));
    const p2 = db.task(t => t.any("SELECT pg_sleep(3) as b"));
    const res = await Promise.all([p1, p2]);
    console.timeLog("parallel", res);
  }

  async function parallelTasks3() {
    console.time("parallelTasks3");
    // note: we open 2 connections to the db and the queries are executed in parallel
    const p1 = db.task(t => t.any("SELECT pg_sleep(2) as a"));
    const p2 = db.task(t => t.any("SELECT pg_sleep(3) as b"));
    const p3 = db.task(t => t.any("SELECT pg_sleep(2) as c"));
    /** the total time is 4 sec
     * - we start 2 connections for p1 and p2
     * - after 2 sec, p2 is still in progress, but p1 is already finished and we can start p3
     * - after 3 sec, p2 is finished and p3 is still in progress
     * - after 4 sec also p3 is finished
     */
    const res = await Promise.all([p1, p2, p3]);
    console.timeLog("parallelTasks3", res);
  }

  async function parallelTx3() {
    console.time("parallelTasks3");
    // note: we open 2 connections to the db and the queries are executed in parallel
    const p1 = db.tx(t => t.any("SELECT pg_sleep(2) as a"));
    const p2 = db.tx(t => t.any("SELECT pg_sleep(3) as b"));
    const p3 = db.tx(t => t.any("SELECT pg_sleep(2) as c"));
    /** the total time is 4 sec
     * - we start 2 connections for p1 and p2
     * - after 2 sec, p2 is still in progress, but p1 is already finished and we can start p3
     * - after 3 sec, p2 is finished and p3 is still in progress
     * - after 4 sec also p3 is finished
     */
    const res = await Promise.all([p1, p2, p3]);
    console.timeLog("parallelTasks3", res);
  }

  async function parallelTxPromiseRejection() {
    // note: we open 2 connections to the db and the queries are executed in parallel
    const p1 = db.tx(t => t.any("SELECT pg_sleep(2) as a"));
    const p2 = db.tx(t => t.any("SELECT pg_sleep(3) as b"));
    const pReject = db.tx(t => t.any("xxx invalid sql"));
    const p3 = db.tx(t => t.any("SELECT pg_sleep(4) as c"));
    /** the total time is 4 sec
     * - we start 2 connections for p1 and p2
     * - after 2 sec, p2 is still in progress, but p1 is already finished and we can start p3
     * - after 3 sec, p2 is finished and p3 is still in progress
     * - after 4 sec also p3 is finished
     */
    const res = await Promise.all([p1, p2, pReject, p3]);
    console.log("parallelTxPromiseRejection", res);
  }

  async function rejectBatch() {
    console.time("batch");

    // note: there is only one connection and request to the server, so the queries will be executed one after the another
    const res = await db.task(t => {
      return t.batch([
        t.any("SELECT pg_sleep(2) as a"),
        t.any('this will fail'),
        t.any("SELECT pg_sleep(3) as b")
      ]);
    });
    console.timeLog("batch", res);
  }

  async function rejectPromiseAll() {
    console.time("batch");

    // note: there is only one connection and request to the server, so the queries will be executed one after the another
    const res = await db.task(t => {
      return Promise.all([
        t.any("SELECT pg_sleep(2) as a"),
        t.any('this will fail'),
        t.any("SELECT pg_sleep(3) as b")
      ]);
    });
    console.timeLog("batch", res);
  }

  async function rejectAwait() {
    console.time("await");

    // note: there is only one connection and request to the server, so the queries will be executed one after the another
    const res = await db.task(async t => {
      const queries = [
        "SELECT pg_sleep(2) as a",
        'this will fail',
        "SELECT pg_sleep(3) as b"
      ];
      for (const q of queries) await t.any(q);
    });
    console.timeLog("await", res);
  }

  async function test() {
    for (let i = 0; i < 5; i++) {
      await parallelTxPromiseRejection().catch(_ => _);
    }
    await sleep(10 * 1000);
  }

  rejectAwait()
      .catch(e => console.error('test failed', e))
      .finally(() => {
    pgp.end();
  });
}

