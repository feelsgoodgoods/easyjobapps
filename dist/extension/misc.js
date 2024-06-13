// console.log("misc.js: Loaded");

import { SQLDatabase } from "./table.js";

const db = new SQLDatabase();

function queryDb(sql, params = []) { 
  return db.parseQuery(sql, params);
}

export { queryDb };
