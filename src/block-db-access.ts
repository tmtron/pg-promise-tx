import { initDb } from "./db";

/**
 * the db-access can be blocked, when we use all available db-connections from the connection pool
 * and an open task waits for another task to finish: but the new task won't get a new connection
 */
export async function blockDbAccess() {
  const { db, pgp } = initDb(2);

  let gCallNo = 0;

  async function dbCall() {
    const callNo = ++gCallNo;
    console.log(`starting db call ${callNo}`);
    const result = await db.one(
      "SELECT pg_sleep($1); Select $1 as res",
      callNo
    );
    console.log(result);
  }

  async function tx() {
    const callNo = ++gCallNo;
    console.log(`starting db call in transaction ${callNo}`);
    const result = await db.tx(t =>
      t.one("SELECT pg_sleep($1); Select $1 as res", callNo)
    );
    console.log(result);
  }

  async function tx2(block: boolean) {
    const callNo = ++gCallNo;
    console.log(`starting db call in transaction ${callNo}`);
    const result = await db.tx(async t1 => {
      // FIXME: when we use db.tx the app will block
      const promise = block
        ? db.tx(t2 => t2.one("Select 2+$1 as res", callNo))
        : t1.one("Select 2+$1 as res", callNo);
      if (block) {
        console.log(`starting new transaction in transaction ${callNo}`);
      }
      const resT2 = await promise;
      console.log(`resT2: ${resT2}`);
      return t1.one("Select $1 as res", callNo);
    });
    console.log(result);
  }

  async function task2(block: boolean) {
    const callNo = ++gCallNo;
    console.log(`starting db call in task ${callNo}`);
    const result = await db.task(async t1 => {
      // FIXME: when we use db.tx the app will block
      const promise = block
          ? db.task(t2 => t2.one("Select 2+$1 as res", callNo))
          : t1.one("Select 2+$1 as res", callNo);
      if (block) {
        console.log(`starting new task in task ${callNo}`);
      }
      const resT2 = await promise;
      console.log(`resT2: ${resT2}`);
      return t1.one("Select $1 as res", callNo);
    });
    console.log(result);
  }

  async function test() {
    // return dbCall();
    return task2(true);
  }

  const intervalId = setInterval(() => console.log("timer "), 250);

  const queryPromises = [test(), test(), test()];
  await Promise.all(queryPromises);
  clearInterval(intervalId);
  pgp.end();
}
