// console.log("misc.js: Loaded");

import { SQLDatabase } from "../client/table.js";

const db = new SQLDatabase();

function queryDb(sql, params = []) { 
  // console.log('~~~~~~', sql, params);
  return db.parseQuery(sql, params);
}

if (typeof window == 'undefined') {  // This condition will be false in the browser environment
  // console.log('routes_db:NOTBROWSER');
  const misc = await import("../server/misc.js");
  queryDb = misc.queryDb;
} else {
  // console.log('routes_db:BROWSER');
  // Browser-specific code
}

export { queryDb };
