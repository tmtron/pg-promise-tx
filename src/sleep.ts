import {initDb} from "./db";

export async function sleepTest(sleepTimeSec: number) {
  const { db, pgp } = initDb(1);

  async function dbSleep() {
    console.log(`starting db sleep ${sleepTimeSec}`);
    const result = await db.one("Select pg_sleep($1)", sleepTimeSec);
    console.log(result);
  }

  console.time("db-sleep");
  const intervalId = setInterval(
    () => console.timeLog("db-sleep", "timer"),
    100
  );

  dbSleep().finally(() => {
    clearInterval(intervalId);
    pgp.end();
  });
}
