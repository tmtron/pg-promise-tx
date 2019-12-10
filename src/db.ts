import pgPromise, { IMain } from "pg-promise";
import { IConnectionParameters } from "pg-promise/typescript/pg-subset";
import * as dbConfig from "../db-config.json";

export function initDb(maxConnections: number = 1) {
  const pgp: IMain = pgPromise({
    query(e) {
      console.log(`> ${e.query}`);
    },
    error(e, ctx) {
      console.error("pgp-error", e);
    }
  });

  const connectParams: IConnectionParameters = {
    ...dbConfig,
    application_name: "pg-test",
    max: maxConnections
  };
  const db = pgp(connectParams);

  return {
    db,
    pgp
  };
}
