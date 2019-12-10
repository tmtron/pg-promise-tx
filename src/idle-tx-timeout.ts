import {initDb} from "./db";

/**
 * test code for https://stackoverflow.com/questions/59193427/how-to-handle-idle-in-transaction-session-timeout
 */

const cll = "pg";

export async function idleTxTimeout() {
  console.time(cll);

  const {db, pgp} = initDb(1);

  /**
   * @param timeoutMs 0 is no timeout
   */
  async function setDbIdleInTxTimeout(timeoutMs: number = 0) {
    await db.any("SET idle_in_transaction_session_timeout TO $1;", timeoutMs);
  }

  async function dbIdle(sleepTimeSec: number) {
    console.timeLog(cll, `starting db idle ${sleepTimeSec}`);
    const result = await db.tx(async t => {
      await new Promise(resolve => setTimeout(resolve, sleepTimeSec * 1000));
      return t.one("Select $1 as sleep_sec", sleepTimeSec);
    });
    console.timeLog(cll, result);
  }

  await setDbIdleInTxTimeout(2500);
  try {
    await dbIdle(5);
  } catch (e) {
    console.timeLog(cll, "dbIdle failed", e);
  }
  try {
    await db.one("Select 1+1 as res");
  } catch (e) {
    console.timeLog(cll, "dbCall failed", e);
  }
}
