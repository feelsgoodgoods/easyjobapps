// console.log("table.js: Loaded");/
/*
// About
It does not support SQL features like JOIN, GROUP BY, HAVING, nested queries etc..
It does not support transactions, so operations are not atomic.
It does not support indexing, so lookup operations may be slow for large tables.
It stores data in local storage, which is limited in size and not persistent across different browsers or sessions.

// Assumptions
It assumes PRIMARY KEY is an auto-incrementing integer. 
It strips out functions and adds dfault === "datetime".

*/

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("EasyJobAppsDB",4); // DbNname and version

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store");
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function setItem(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("store", "readwrite");
    const store = transaction.objectStore("store");
    const request = store.put(value, key);

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function getItem(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("store", "readonly");
    const store = transaction.objectStore("store");
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (event) => reject(event.target.error);
  });
}


function encodeBase64(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (error) {
    console.error("Error encoding to Base64:", error);
    return null;
  }
}

function decodeBase64(encodedText) {
  try {
    if (typeof encodedText === "undefined") {
      return encodedText;
    }
    return decodeURIComponent(escape(atob(encodedText)));
  } catch (error) {
    console.error("Error decoding from Base64:", encodedText, { error });
    return null;
  }
}

class SQLDatabase {
  constructor() {
    this.tables = {};
  }

  async fetchTable(tableName) {
    let table = this.tables[tableName]; 
    if (!table) { 
      table = await getItem(tableName)
      table = JSON.parse(table);
      this.tables[tableName] = table;
    }
    return table
  }

  // Create Table
  async create(args, query) {
    const ifNotExists = query.includes("IF NOT EXISTS");
    const tableNameIndex = args.indexOf("TABLE") + 1;
    let tableName;

    // Consider the 'IF NOT EXISTS' in the position calculation
    if (ifNotExists) {
      tableName = args
        .slice(tableNameIndex + 3)
        .join(" ")
        .split(/\s+/)[0]; // Join parts and split by spaces to get the first valid name
    } else {
      tableName = args[tableNameIndex];
    }
    tableName = tableName.replace(/,/g, "").trim(); // Ensure commas are handled if present

    // Correctly split the query to extract the full schema string considering nested parentheses
    let depth = 0;
    let schemaStartIndex = query.indexOf("(") + 1;
    let schemaEndIndex = schemaStartIndex;
    for (let i = schemaStartIndex; i < query.length; i++) {
      if (query[i] === "(") depth++;
      if (query[i] === ")") {
        if (depth === 0) {
          schemaEndIndex = i;
          break;
        }
        depth--;
      }
    }

    const schemaString = query.substring(schemaStartIndex, schemaEndIndex).trim();
    // console.log("parseSchema1", { query, schemaString });
    if (ifNotExists) {
      let flag = this.tables[tableName] || await this.fetchTable(tableName)
      if (flag) {
        // console.log("Table:", tableName, this.tables[tableName]);
        return `Table ${tableName} exists.`;
      }
    }

    const schema = this.parseSchema(schemaString);

    this.tables[tableName] = { schema: schema, records: [] };
    // console.log("Table Created:", tableName, this.tables[tableName]);
    await setItem(tableName, JSON.stringify({ schema: schema, records: [] }));
    return `* Table ${tableName} created.`;
  }

  parseQuery(query, params) {
    const trimmedQuery = query.trim().replace(/;$/, "");
    const [operation, ...args] = trimmedQuery.split(/\s+/);
    let op = operation.toLowerCase();
    if (op === "create") return this.create(args, trimmedQuery);
    let tbl = args.indexOf("FROM");
    tbl = tbl > 0 ? tbl : args.indexOf("INTO");
    tbl = tbl + 1;
    if (op === "insert") return this.insert(args[tbl], this.extractValues(trimmedQuery), params);
    if (op === "select") return this.select(args[tbl], args.slice(2).join(" "), params);
    if (op === "update") return this.update(args[tbl], args.slice(2).join(" "), params);
    if (op === "delete") return this.delete(args[tbl + 1], args.slice(2).join(" "), params);
    throw new Error("Unsupported operation");
  }

  parseSchema(schemaString) {
    // console.log("schemaString", schemaString);
    const schema = {};
    schemaString
      .split(/,(?![^\(\[]*[\]\)])/)
      .map(part => part.trim())
      .forEach(field => {
        let nameMatch = field.match(/^(\w+)\s+(.*)/);
        if (!nameMatch) return;

        let name = nameMatch[1];
        let definitions = nameMatch[2];

        // Extract type and remove all modifiers to get a clean type
        let typeMatch = definitions.match(/^[^\s]+/);
        let type = typeMatch ? typeMatch[0] : null;

        // Extract default value more robustly, accounting for nested parentheses and quoted strings
        let defaultMatch = definitions.match(/DEFAULT\s+((?:[^,(]+|\([^)]*\))+)/i);
        let defaultValue = defaultMatch ? defaultMatch[1].trim() : null;
        if (defaultValue) {
          defaultValue = defaultValue.replace(/^['"]|['"]$/g, ""); // Remove wrapping quotes
          // If defaultValue is an SQL function
          if (/strftime\('%s',\s*'now',\s*'localtime'\)/i.test(defaultValue)) {
            defaultValue = "datetime";
          }
        }

        // Set schema properties
        schema[name] = {
          type: type,
          default: defaultValue,
          unique: /UNIQUE/i.test(definitions),
          notNull: /NOT NULL/i.test(definitions),
          primaryKey: /PRIMARY KEY/i.test(definitions),
          autoincrement: /AUTOINCREMENT/i.test(definitions)
        };
      });

    console.log("CREATED", schema);
    return schema;
  }

  // Insert NEW record
  async insert(tableName, fieldNames, values) {
    const table = await this.fetchTable(tableName)
    if (!table) throw new Error(`Table ${tableName} does not exist.`);
    const newData = {};
    let strswaps = [];

    // Loop through each column in the schema
    let schema = table.schema;
    let tableColumns = Object.keys(schema);
    tableColumns.forEach(col => {
      // Get settings
      let metaData = schema[col];
      let { notnull, increment, primaryKey, unique, type } = metaData;
      type = type.toLowerCase();

      // console.log("TABLE:INSERT:col", tableName, { col, metaData });
      let valuesIndex = fieldNames.indexOf(col);
      let val = values[valuesIndex];

      // Handle Column Settings
      val ||= metaData.default || val;
      if (increment || primaryKey) val = Math.max(...table.records.map(record => record[col] || 0), 0) + 1;
      if (metaData.default === "datetime") val = new Date().toISOString();
      if (type === "text" && val) {
        strswaps.push([col, val]);
        // val = encodeBase64(val);
        // newData[col] = val;
      }
      if (type === "integer" && val) {
        val = parseInt(val);
      }
      if (notnull && !val) throw new Error(`Column '${col}' must have a value.`);
      if (unique) {
        let isUnique = table.records.some(record => record[col] === val);
        if (!isUnique) throw new Error(`Column ${col} value must be unique.`);
      }
      // Add column to new record
      newData[col] = val;
    });
    table.records.push(newData);
    let returnData = JSON.parse(JSON.stringify(newData));
    strswaps.forEach(swap => {
      let [col, val] = swap;
      returnData[col] = val;
    });
    console.log("* TABLE:INSERT:");//, newData); //, { tableName, table, fieldNames, values, newData });
    await setItem(tableName, JSON.stringify(table));
    return returnData;
  }

  extractValues(query) {
    const start = query.indexOf("(") + 1;
    const end = query.indexOf(")");
    const columnPart = query.substring(start, end).trim();
    return columnPart.split(",").map(column => column.trim());
  }

  // Select statement
  async select(tableName, condition, params) { 
    let returnThis = [];
    const table = await this.fetchTable(tableName)
    // console.log("TABLE:SELECT:    > :", { tableName, condition, params }); // condition
    if (!table){  
      console.log(`Table ${tableName} does not exist.`)
      return returnThis
      //throw new Error(`Table ${tableName} does not exist.`);
    } 
    if (condition.includes("ORDER BY")) {
      const [cond, orderClause] = condition.split("ORDER BY");
      returnThis = this.applyCondition(table, cond.trim(), [...params]);
      returnThis = this.orderBy(returnThis, orderClause.trim());
    } else { 
      returnThis = this.applyCondition(table, condition, [...params]);
    }
    // console.log("TABLE:SELECT:    > :", { table, condition, params, returnThis });
    // console.log(`TABLE:SELECT:${tableName}:got < `, returnThis);
    // map through the schema, for each text recrod decode the value and return
    let schema = table.schema;
    returnThis = returnThis.map(record => {
      let newRecord = {};
      Object.keys(record).forEach(key => {
        let columnMetaData = schema[key];
        if (columnMetaData.type == "TEXT") {
          // console.log(key, record);
          let encodedValue = record[key];
          // let decodedValue = decodeBase64(encodedValue);
          newRecord[key] = encodedValue // decodedValue;
          // console.log("Decoding:", key, encodedValue, decodedValue);
        } else {
          newRecord[key] = record[key];
        }
      });
      return newRecord;
    });
    return returnThis;
  }

  applyCondition(table, condition, params) {
    let records = table.records;
    let schema = table.schema;
    // console.log("TABLE:APPLYCONDITION:", { condition, params, records });

    // Evaluates a condition against a record using provided comparison operators
    const evaluate = (record, cond, params) => {
        const ops = {
            "=": (a, b) => {
              //â
              // console.log("EQUALS:", a, b, a == b)
              // len 
              // console.log("EQUALS:", a.length, b.length)
              return a == b
            },
            "LIKE": (a, b) => {
                b = b.replace(/%/g, ".*"); // Convert SQL LIKE pattern to RegExp pattern
                return new RegExp(b, "i").test(a); // Case insensitive comparison
            }
        };

        // Extract individual conditions from the SQL-like query
        let tokens = cond.match(/(\w+)\s*(=|LIKE)\s*(['"]?)(.+?)\3/g);
        return tokens.every(token => {
            let [full, field, operator, , value] = token.match(/(\w+)\s*(=|LIKE)\s*(['"]?)(.+?)\3/);
            if (value === '?') value = params.shift(); // Replace placeholders with actual parameters
            let dbValue = record[field] || ''; // <- 👀 Could this be an issue? 
            // console.log('dbValue', field, dbValue)
            // if (schema[field].type === "TEXT") dbValue = decodeBase64(dbValue); // Decode base64 if the field type is TEXT
            return ops[operator](dbValue, value);
        });
    };

    // Filter records by evaluating each against the condition with parameters
    // console.log("TABLE:APPLYCONDITION:", { table, condition, params, records });
    return records.filter(record => evaluate(record, condition, [...params]));
  }

  orderBy(records, clause) {
    const orders = clause.split(",").map(part => {
      const [field, order] = part.trim().split(" ");
      return { field, descending: order.toUpperCase() === "DESC" };
    });

    return records.sort((a, b) => {
      for (let { field, descending } of orders) {
        if (a[field] < b[field]) return descending ? 1 : -1;
        if (a[field] > b[field]) return descending ? -1 : 1;
      }
      return 0; // if all specified fields are equal
    });
  }

  // Update Existing Record
  async update(tableName, setClause, params) { 
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist.`);
  
    const [setParts, whereClause] = setClause.split(" WHERE ");
  
    let setValues = [...params];  // Create a copy of params

    // console.log('setParts', {setValues: typeof setValues[0]})
  
    const updates = setParts.split(",").reduce((acc, part) => {
      const [field, value] = part.trim().split("=");
      let formattedValue;
      if (value.includes("?")) {
        formattedValue = setValues.shift();
        // If it's a string that looks like JSON, parse it
        if (typeof formattedValue === 'string' && formattedValue.startsWith('{') && formattedValue.endsWith('}')) {
          // try {
          //   // formattedValue = JSON.parse(formattedValue);
          // } catch (e) {
          //   // If parsing fails, keep it as a string
          // }
        }
      } else {
        formattedValue = value.trim();
      }
      acc[field.trim()] = formattedValue;
      return acc;
    }, {});
  
    let records = (!whereClause && table.records) || this.applyCondition(table, whereClause, setValues);
  
    if (!records.length) {
      console.log("TABLE:UPDATING:", false);
      return false;
    }
  
    records.forEach(record => {
      Object.keys(updates).forEach(key => {
        let columnMetaData = table.schema[key];
        if (!table.schema.hasOwnProperty(key)) throw new Error(`Field ${key} does not exist.`);
        if (columnMetaData.notNull && updates[key] === undefined) throw new Error(`Field ${key} cannot be null.`);
        record[key] = updates[key];
      });
    });
  
    table.records = table.records.map(rec => records.find(r => r.id === rec.id) || rec);
    await setItem(tableName, JSON.stringify(table));
  
    return records;
  }

  // Delete Record
  async delete(tableName, condition, params) { 
    console.log("TABLE:DELETE:", { tableName, condition, params });
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist.`);
    const initialCount = table.records.length;
    let filterThese = this.applyCondition(table, condition, params);
    table.records = table.records.filter(record => !filterThese.includes(record));
    await setItem(tableName, JSON.stringify(table));
    return true;
  }
}

export { SQLDatabase };
