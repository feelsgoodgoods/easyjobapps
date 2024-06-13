// .wrangler/tmp/bundle-A7Bgxw/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-1CD9fD/bundledWorker-0.9901375700771808.mjs
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
    if (typeof encodedText == "undefined") {
      return encodedText;
    }
    return decodeURIComponent(escape(atob(encodedText)));
  } catch (error) {
    console.error("Error decoding from Base64:", encodedText, { error });
    return null;
  }
}
var SQLDatabase;
var init_table = __esm({
  "dist/extension/table.js"() {
    SQLDatabase = class {
      constructor() {
        this.tables = {};
      }
      fetchTable(tableName) {
        let table = this.tables[tableName];
        if (!table) {
          table = localStorage.getItem(tableName);
          table = JSON.parse(table);
          this.tables[tableName] = table;
        }
        return table;
      }
      // Create Table
      create(args, query) {
        const ifNotExists = query.includes("IF NOT EXISTS");
        const tableNameIndex = args.indexOf("TABLE") + 1;
        let tableName;
        if (ifNotExists) {
          tableName = args.slice(tableNameIndex + 3).join(" ").split(/\s+/)[0];
        } else {
          tableName = args[tableNameIndex];
        }
        tableName = tableName.replace(/,/g, "").trim();
        let depth = 0;
        let schemaStartIndex = query.indexOf("(") + 1;
        let schemaEndIndex = schemaStartIndex;
        for (let i = schemaStartIndex; i < query.length; i++) {
          if (query[i] === "(")
            depth++;
          if (query[i] === ")") {
            if (depth === 0) {
              schemaEndIndex = i;
              break;
            }
            depth--;
          }
        }
        const schemaString = query.substring(schemaStartIndex, schemaEndIndex).trim();
        if (ifNotExists) {
          let flag = this.tables[tableName] || this.fetchTable(tableName);
          if (flag) {
            return `Table ${tableName} exists.`;
          }
        }
        const schema = this.parseSchema(schemaString);
        this.tables[tableName] = { schema, records: [] };
        localStorage.setItem(tableName, JSON.stringify({ schema, records: [] }));
        return `* Table ${tableName} created.`;
      }
      parseQuery(query, params) {
        const trimmedQuery = query.trim().replace(/;$/, "");
        const [operation, ...args] = trimmedQuery.split(/\s+/);
        let op = operation.toLowerCase();
        if (op === "create")
          return this.create(args, trimmedQuery);
        let tbl = args.indexOf("FROM");
        tbl = tbl > 0 ? tbl : args.indexOf("INTO");
        tbl = tbl + 1;
        if (op === "insert")
          return this.insert(args[tbl], this.extractValues(trimmedQuery), params);
        if (op === "select")
          return this.select(args[tbl], args.slice(2).join(" "), params);
        if (op === "update")
          return this.update(args[tbl], args.slice(2).join(" "), params);
        if (op === "delete")
          return this.delete(args[tbl + 1], args.slice(2).join(" "), params);
        throw new Error("Unsupported operation");
      }
      parseSchema(schemaString) {
        const schema = {};
        schemaString.split(/,(?![^\(\[]*[\]\)])/).map((part) => part.trim()).forEach((field) => {
          let nameMatch = field.match(/^(\w+)\s+(.*)/);
          if (!nameMatch)
            return;
          let name = nameMatch[1];
          let definitions = nameMatch[2];
          let typeMatch = definitions.match(/^[^\s]+/);
          let type2 = typeMatch ? typeMatch[0] : null;
          let defaultMatch = definitions.match(/DEFAULT\s+((?:[^,(]+|\([^)]*\))+)/i);
          let defaultValue = defaultMatch ? defaultMatch[1].trim() : null;
          if (defaultValue) {
            defaultValue = defaultValue.replace(/^['"]|['"]$/g, "");
            if (/strftime\('%s',\s*'now',\s*'localtime'\)/i.test(defaultValue)) {
              defaultValue = "datetime";
            }
          }
          schema[name] = {
            type: type2,
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
      insert(tableName, fieldNames, values) {
        const table = this.fetchTable(tableName);
        if (!table)
          throw new Error(`Table ${tableName} does not exist.`);
        const newData = {};
        let strswaps = [];
        let schema = table.schema;
        let tableColumns = Object.keys(schema);
        tableColumns.forEach((col) => {
          let metaData = schema[col];
          let { notnull, increment, primaryKey, unique, type: type2 } = metaData;
          type2 = type2.toLowerCase();
          let valuesIndex = fieldNames.indexOf(col);
          let val = values[valuesIndex];
          val ||= metaData.default || val;
          if (increment || primaryKey)
            val = Math.max(...table.records.map((record) => record[col] || 0), 0) + 1;
          if (metaData.default === "datetime")
            val = (/* @__PURE__ */ new Date()).toISOString();
          if (type2 === "text" && val) {
            strswaps.push([col, val]);
            val = encodeBase64(val);
          }
          if (type2 === "integer" && val) {
            val = parseInt(val);
          }
          if (notnull && !val)
            throw new Error(`Column '${col}' must have a value.`);
          if (unique) {
            let isUnique = table.records.some((record) => record[col] === val);
            if (!isUnique)
              throw new Error(`Column ${col} value must be unique.`);
          }
          newData[col] = val;
        });
        table.records.push(newData);
        let returnData = JSON.parse(JSON.stringify(newData));
        strswaps.forEach((swap) => {
          let [col, val] = swap;
          returnData[col] = val;
        });
        console.log("* TABLE:INSERT:");
        localStorage.setItem(tableName, JSON.stringify(table));
        return returnData;
      }
      extractValues(query) {
        const start = query.indexOf("(") + 1;
        const end = query.indexOf(")");
        const columnPart = query.substring(start, end).trim();
        return columnPart.split(",").map((column) => column.trim());
      }
      // Select statement
      select(tableName, condition, params) {
        let returnThis = [];
        const table = this.fetchTable(tableName);
        if (!table) {
          console.log(`Table ${tableName} does not exist.`);
          return returnThis;
        }
        if (condition.includes("ORDER BY")) {
          const [cond, orderClause] = condition.split("ORDER BY");
          returnThis = this.applyCondition(table, cond.trim(), [...params]);
          returnThis = this.orderBy(returnThis, orderClause.trim());
        } else {
          returnThis = this.applyCondition(table, condition, [...params]);
        }
        let schema = table.schema;
        returnThis = returnThis.map((record) => {
          let newRecord = {};
          Object.keys(record).forEach((key2) => {
            let columnMetaData = schema[key2];
            if (columnMetaData.type == "TEXT") {
              let encodedValue = record[key2];
              let decodedValue = decodeBase64(encodedValue);
              newRecord[key2] = decodedValue;
            } else {
              newRecord[key2] = record[key2];
            }
          });
          return newRecord;
        });
        return returnThis;
      }
      applyCondition(table, condition, params) {
        let records = table.records;
        let schema = table.schema;
        const evaluate = (record, cond, params2) => {
          const ops = {
            "=": (a, b) => {
              return a == b;
            },
            "LIKE": (a, b) => {
              b = b.replace(/%/g, ".*");
              return new RegExp(b, "i").test(a);
            }
          };
          let tokens = cond.match(/(\w+)\s*(=|LIKE)\s*(['"]?)(.+?)\3/g);
          return tokens.every((token) => {
            let [full, field, operator, , value] = token.match(/(\w+)\s*(=|LIKE)\s*(['"]?)(.+?)\3/);
            if (value === "?")
              value = params2.shift();
            let dbValue = record[field] || "";
            if (schema[field].type === "TEXT")
              dbValue = decodeURIComponent(escape(atob(dbValue)));
            return ops[operator](dbValue, value);
          });
        };
        return records.filter((record) => evaluate(record, condition, [...params]));
      }
      orderBy(records, clause) {
        const orders = clause.split(",").map((part) => {
          const [field, order] = part.trim().split(" ");
          return { field, descending: order.toUpperCase() === "DESC" };
        });
        return records.sort((a, b) => {
          for (let { field, descending } of orders) {
            if (a[field] < b[field])
              return descending ? 1 : -1;
            if (a[field] > b[field])
              return descending ? -1 : 1;
          }
          return 0;
        });
      }
      // Update Existing Record
      update(tableName, setClause, params) {
        const table = this.tables[tableName];
        if (!table)
          throw new Error(`Table ${tableName} does not exist.`);
        const [setParts, whereClause] = setClause.split(" WHERE ");
        let count = (setParts.match(/\?/g) || []).length;
        let setValues = params.slice(0, count);
        let whereValues = params.slice(count);
        const updates = setParts.split(",").reduce((acc, part) => {
          const [field, value] = part.trim().split("=");
          const formattedValue = value.includes("?") ? value.replace(/\?/g, () => `"${setValues.shift()}"`) : value;
          acc[field.trim()] = formattedValue.trim();
          return acc;
        }, {});
        let records = !whereClause && table.records || this.applyCondition(table, whereClause, whereValues);
        if (!records.length) {
          console.log("TABLE:UPDATING:", false);
          return false;
        }
        let record = records[0];
        Object.keys(updates).forEach((key2) => {
          console.log("TABLE:UPDATING:", { table, key: key2, updates, record });
          let columnMetaData = table.schema[key2];
          let dne = !table.schema.hasOwnProperty(key2);
          if (dne)
            throw new Error(`Field ${key2} does not exist.`);
          let nul = columnMetaData.notNull && updates[key2] === void 0;
          if (nul)
            throw new Error(`Field ${key2} cannot be null.`);
          let oldVal = record[key2];
          let newVal = updates[key2].replace(/['"]/g, "");
          if (columnMetaData.type == "TEXT")
            newVal = encodeBase64(newVal);
          record[key2] = newVal;
        });
        table.records = table.records.map((rec) => rec.id === record.id ? record : rec);
        localStorage.setItem(tableName, JSON.stringify(table));
        return records;
      }
      // Delete Record
      delete(tableName, condition, params) {
        console.log("TABLE:DELETE:", { tableName, condition, params });
        const table = this.tables[tableName];
        if (!table)
          throw new Error(`Table ${tableName} does not exist.`);
        const initialCount = table.records.length;
        let filterThese = this.applyCondition(table, condition, params);
        table.records = table.records.filter((record) => !filterThese.includes(record));
        localStorage.setItem(tableName, JSON.stringify(table));
        return true;
      }
    };
  }
});
var misc_exports = {};
__export(misc_exports, {
  queryDb: () => queryDb
});
function queryDb(sql, params = []) {
  return db.parseQuery(sql, params);
}
var db;
var init_misc = __esm({
  "dist/extension/misc.js"() {
    init_table();
    db = new SQLDatabase();
  }
});
var require_misc = __commonJS({
  "utils/misc.js"(exports, module) {
    var key2 = false;
    var cfpages4 = typeof process == "undefined";
    var db3 = false;
    console.log("server:misc:START");
    if (!cfpages4) {
      console.log("server:misc:DEV");
      key2 = process.env.YOUR_OPENAI_API_KEY;
    } else {
      console.log("server:misc:CF_PAGES");
    }
    function queryDb4(sql, params = [], env = {}) {
      db3 = env.cfdb || db3;
      key2 = env.cfkey || key2;
      return new Promise((resolve, reject) => {
        db3.all(sql, params, (err, rows) => {
          if (err)
            return reject(err);
          resolve(rows);
        });
      });
    }
    module.exports = {
      queryDb: queryDb4
      // viewDbStructure,
      // executeWorkerFunction
    };
  }
});
async function deletePostFromDatabase(postId) {
  await queryDb2(`DELETE FROM posts WHERE id = ?`, [postId]);
}
async function handleCompany(data) {
  let company_id = (await queryDb2("SELECT id FROM companies WHERE companyName = ?", [data.companyName]))[0]?.id;
  if (!company_id) {
    await queryDb2(`INSERT INTO companies (websiteUrl, companyName) VALUES (?, ?)`, [data.websiteUrl, data.companyName]);
    company_id = (await queryDb2("SELECT id FROM companies WHERE companyName = ?", [data.companyName]))[0]?.id;
  } else {
    await queryDb2(`UPDATE companies SET websiteUrl = ? WHERE companyName = ?`, [data.websiteUrl, data.companyName]);
  }
  return company_id;
}
async function insertJunkRecord(data) {
  await queryDb2(`INSERT INTO junk (text) VALUES (?)`, data.text);
}
async function selectPostsTable(data) {
  let post = await queryDb2("SELECT id FROM posts WHERE text = ?", [data.text]);
  return post;
}
async function insertPosts(data, company_id) {
  await Promise.all(
    data.jobs.map(async (job) => {
      await queryDb2(`INSERT INTO posts (company_id, text, jobTitle, link) VALUES (?, ?, ?, ?)`, [company_id, data.text, job.jobTitle, job.link]);
    })
  );
  const links2 = await queryDb2("SELECT * FROM sitemaps WHERE company_id = ?", [company_id]);
  return links2;
}
async function getCompanyRecord(company_id) {
  return (await queryDb2("SELECT * FROM companies WHERE id = ?", [company_id]))[0];
}
async function insertLinkIfNotExists(company_id, link) {
  let existingLink = await queryDb2("SELECT id FROM sitemaps WHERE company_id = ? AND link = ?", [company_id, link]);
  if (existingLink.length === 0) {
    await queryDb2("INSERT INTO sitemaps (company_id, link) VALUES (?, ?)", [company_id, link]);
  } else {
  }
}
async function insertLinksIfNotExists(company_id, links2) {
  for (const link of links2) {
    try {
      if (!link || !link.trim().toLowerCase().startsWith("http")) {
        continue;
      }
      let existingLink = await queryDb2("SELECT id FROM sitemaps WHERE company_id = ? AND link = ?", [company_id, link]);
      if (existingLink.length === 0) {
        await queryDb2("INSERT INTO sitemaps (company_id, link) VALUES (?, ?)", [company_id, link]);
      } else {
      }
    } catch (e) {
    }
  }
}
async function updateSitemaps(generic, specific, board, id) {
  await queryDb2(`UPDATE sitemaps SET generic = ?, specific = ?, board = ? WHERE id = ?`, [generic, specific, board, id]);
}
async function getCompanySitemaps(company_id) {
  return await queryDb2("SELECT * FROM sitemaps WHERE company_id = ?", [company_id]);
}
async function retrieveGenericLinks(company_id) {
  return await queryDb2("SELECT * FROM sitemaps WHERE (specific = 1 OR generic = 1) AND company_id = ?;", [company_id]);
}
async function getLinkById(sitemap_id) {
  let link = (await queryDb2("SELECT * FROM sitemaps WHERE id = ?", [sitemap_id]))[0].link;
  return link;
}
async function updateSitemapText(link, text) {
  await queryDb2(`UPDATE sitemaps SET text = ? WHERE id = ?`, [text, link.id]);
}
async function getBoardLinks(company_id) {
  return await queryDb2("SELECT * FROM sitemaps WHERE company_id = ? AND board = 1", [company_id]);
}
async function getJobPosts(company_id) {
  return await queryDb2("SELECT * FROM posts WHERE company_id = ?", [company_id]);
}
async function getExtractById2(extract_id) {
  return (await queryDb2("SELECT * FROM extracts WHERE id = ?", [extract_id]))[0];
}
async function getJobTitleAndCompanyName2(post_id, company_id) {
  let jobTitle = (await queryDb2("SELECT jobTitle FROM posts WHERE id = ?", [post_id]))[0].jobTitle;
  let companyName = (await queryDb2("SELECT companyName FROM companies WHERE id = ?", [company_id]))[0].companyName;
  return { jobTitle, companyName };
}
async function getExtractsForPost(post_id) {
  return await queryDb2("SELECT * FROM extracts WHERE post_id = ?", [post_id]);
}
async function getPostsForCompanyAndPost(company_id, post_id) {
  return await queryDb2("SELECT id, link, text FROM posts WHERE company_id = ? AND id = ?", [company_id, post_id]);
}
async function getPostMeta(post_id) {
  let post = await queryDb2("SELECT * FROM posts WHERE id = ?", [post_id]);
  return post[0].meta;
}
async function updatePostMeta(post_id, meta) {
  await queryDb2(`UPDATE posts SET meta = ? WHERE id = ?`, [JSON.stringify(meta), post_id]);
}
async function createOrUpdateExtract(company_id, post_id, extract3, record) {
  console.log("gpt:createOrUpdateExtract:", { company_id, post_id, extract: extract3, record });
  let existingRecord = await queryDb2("SELECT id FROM extracts WHERE post_id = ? AND sitemap_id = ?", [post_id, extract3.sitemap_id]);
  if (!existingRecord.length) {
    let sitemap_id = extract3.type != "post" ? extract3.id : 0;
    const insertSql = `INSERT INTO extracts (company_id, sitemap_id, post_id, type, status, extract, link, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await queryDb2(insertSql, [company_id, sitemap_id, post_id, extract3.type, 1, JSON.stringify(record), extract3.link, extract3.text]);
  } else {
    const updateSql = `UPDATE extracts SET extract = ? WHERE id = ?`;
    await queryDb2(updateSql, [JSON.stringify(record), existingRecord[0].id]);
  }
}
async function getSitemapsForCompany(company_id) {
  return await queryDb2("SELECT * FROM sitemaps WHERE company_id = ? AND (specific = 1 OR generic = 1)", [company_id]);
}
async function getEmailDefaultBio() {
  const defaultBio = (await queryDb2("SELECT id, text FROM userinfo WHERE label = 'bio'", []))[0].text;
  return defaultBio;
}
async function getEmailData(resume_id, email_id, company_id, post_id) {
  let resume = (await queryDb2("SELECT * FROM userinfo WHERE id = ?", [resume_id]))[0]?.text;
  let email = (await queryDb2("SELECT * FROM userinfo WHERE id = ?", [email_id]))[0]?.text;
  let company = (await queryDb2("SELECT * FROM companies WHERE id = ?", [company_id]))[0];
  let post = (await queryDb2("SELECT * FROM posts WHERE id = ?", [post_id]))[0];
  return { resume, email, company, post };
}
async function getPostByUpload(postupload) {
  let post = (await queryDb2("SELECT id, jobTitle, company_id FROM posts WHERE text = ?", [postupload]))[0];
  return post;
}
async function getExistingPost(postId) {
  const existingPost = await queryDb2("SELECT id, company_id, jobTitle FROM posts WHERE id = ?", [postId]);
  return existingPost[0];
}
async function getJobDetails2(post) {
  post = (await queryDb2("SELECT id, jobTitle, company_id FROM posts WHERE id = ?", [post.post_id]))[0];
  return post;
}
async function getCompanyName(post) {
  let companyName = (await queryDb2("SELECT companyName FROM companies WHERE id = ?", [post.company_id]))[0]?.companyName;
  return companyName;
}
async function getContent(body) {
  let { companyid, postid, resumeid, coverletterid } = body;
  console.log("Given body:", body);
  const defaultBio = (await queryDb2("SELECT id, text FROM userinfo WHERE label = 'bio'", []))[0].text;
  let extracts2 = await queryDb2("SELECT * FROM extracts WHERE post_id = ? AND status = 1 AND type <> 'post'", [postid]);
  let extractDetails = extracts2.map((extract3) => extract3.extract);
  extractDetails = JSON.stringify(extractDetails.map((details) => Object.fromEntries(Object.entries(JSON.parse(details)).filter(([k, v]) => v.length))));
  let defaultResume = (await queryDb2("SELECT * FROM userinfo WHERE id = ?", [resumeid]))[0]?.text;
  let defaultCoverLetter = (await queryDb2("SELECT * FROM userinfo WHERE id = ?", [coverletterid]))[0]?.text;
  let company = (await queryDb2("SELECT * FROM companies WHERE id = ?", [companyid]))[0];
  let post = (await queryDb2("SELECT * FROM posts WHERE id = ?", [postid]))[0];
  let returnThis = {
    extracts: extracts2,
    extractDetails,
    defaultResume,
    defaultCoverLetter,
    company,
    post,
    defaultBio
  };
  console.log(":dbutils:getContent:", returnThis);
  return returnThis;
}
var misc;
var browser;
var cfpages;
var queryDb2;
var createAuthTable;
var createUserInfoTable;
var createCompanyTable;
var createJunkTable;
var createPostsTable;
var createSitemapTable;
var createExtractsTable;
var checkExistingPost;
var dbutils;
var init_dbgptutils = __esm({
  "dist/extension/dbgptutils.js"() {
    misc = false;
    browser = typeof window != "undefined";
    cfpages = typeof process == "undefined";
    queryDb2 = async (sql, params = [], env = {}) => {
      if (browser) {
        misc = await Promise.resolve().then(() => (init_misc(), misc_exports));
      } else {
        if (!cfpages) {
          console.log("server:dbroutes:DEV");
        } else {
          console.log("server:dbroutes:CF_PAGES");
        }
        misc = await Promise.resolve().then(() => __toESM(require_misc()));
      }
      queryDb2 = misc.queryDb;
      queryDb2(sql, params, env);
    };
    createAuthTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        tempToken TEXT,
        uuid TEXT
    )`);
    };
    createUserInfoTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS userinfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        text TEXT,
        title TEXT,
        label TEXT,
        company_id INTEGER DEFAULT 0,
        post_id INTEGER DEFAULT 0
    )`);
    };
    createCompanyTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        status INTEGER DEFAULT 0,
        websiteUrl TEXT,
        companyName TEXT
    )`);
    };
    createJunkTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS junk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT
    )`);
    };
    createPostsTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        status INTEGER DEFAULT 0,
        reject INTEGER DEFAULT 0, 
        company_id INTEGER,
        meta TEXT DEFAULT '{}',
        text TEXT,
        jobTitle TEXT,
        link TEXT,
        resume TEXT,
        coverLetter TEXT
    )`);
    };
    createSitemapTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS sitemaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT UNIQUE,
        generic INTEGER DEFAULT 0,
        specific INTEGER DEFAULT 0,
        board INTEGER DEFAULT 0,
        company_id INTEGER,
        text TEXT
      );`);
    };
    createExtractsTable = async () => {
      queryDb2(`CREATE TABLE IF NOT EXISTS extracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        sitemap_id INTEGER DEFAULT 0,
        post_id INTEGER, 
        dateAdded INTEGER DEFAULT (strftime('%s','now','localtime')),
        type TEXT,
        status INTEGER DEFAULT 0,
        extract TEXT,
        link TEXT,
        text TEXT
    )`);
    };
    createAuthTable();
    createUserInfoTable();
    createCompanyTable();
    createJunkTable();
    createPostsTable();
    createSitemapTable();
    createExtractsTable();
    checkExistingPost = async (jobPost) => {
      const existingPost = await queryDb2("SELECT id, company_id FROM posts WHERE text = ?", [jobPost]);
      const badPost = await queryDb2("SELECT id FROM junk WHERE text = ?", [jobPost]);
      return { existingPost, badPost };
    };
    dbutils = {
      checkExistingPost,
      deletePostFromDatabase,
      handleCompany,
      insertJunkRecord,
      selectPostsTable,
      insertPosts,
      insertLinkIfNotExists,
      insertLinksIfNotExists,
      updateSitemaps,
      retrieveGenericLinks,
      updateSitemapText,
      createOrUpdateExtract,
      getJobTitleAndCompanyName: getJobTitleAndCompanyName2,
      getCompanyRecord,
      getExtractById: getExtractById2,
      getJobPosts,
      getPostMeta,
      updatePostMeta,
      getLinkById,
      getBoardLinks,
      getCompanySitemaps,
      getSitemapsForCompany,
      getExtractsForPost,
      getPostsForCompanyAndPost,
      getExistingPost,
      getJobDetails: getJobDetails2,
      getCompanyName,
      getEmailData,
      getEmailDefaultBio,
      getPostByUpload,
      getContent
    };
  }
});
async function userinfo_view(body) {
  !queryDb3 && await getDb();
  let { label } = body;
  let str = `SELECT id, text, title FROM userinfo WHERE label = ? ORDER BY id DESC`;
  let rows = await queryDb3(str, [label]);
  return { status: "success", data: rows };
}
async function userinfo_upload(body) {
  !queryDb3 && await getDb();
  console.group("db:userinfo_upload", body);
  let { label, text, title } = body;
  let existingRecord = await queryDb3("SELECT id FROM userinfo WHERE title = ? and label=?", [title, label]);
  if (!existingRecord.length) {
    const insertSql = `INSERT INTO userinfo (text, title, label) VALUES (?, ?, ?)`;
    let newRecord = await queryDb3(insertSql, [text, title, label]);
    console.groupEnd();
    return { status: "success", data: newRecord };
  }
  console.log("db:Record already exists", existingRecord);
  console.groupEnd();
  return { status: "failure", data: false };
}
async function userinfo_update_single(body) {
  !queryDb3 && await getDb();
  console.group("db:userinfo_update_single", body);
  let { fullname, bio, openaikey } = body;
  let data = false;
  let label = fullname && "fullname" || bio && "bio" || openaikey && "openaikey";
  let value = fullname || bio || openaikey;
  const existingRecord = await queryDb3("SELECT id FROM userinfo WHERE label = ?", [label]);
  if (!existingRecord.length) {
    console.log(":INSERT:");
    const insertSql = `INSERT INTO userinfo (text, title, label) VALUES (?, ?, ?)`;
    data = await queryDb3(insertSql, [value, label, label]);
  } else {
    console.log(":UPDATE", body, { existingRecord });
    const updateSql = `UPDATE userinfo SET text = ? WHERE label = ?`;
    data = await queryDb3(updateSql, [value, label]);
    console.log(`${label} updated successfully`);
  }
  console.groupEnd();
  return { status: "success", data };
}
async function userinfo_update_settings(body) {
  console.group("db:userinfo_update_settings", body);
  let { fullname, bio, openaikey } = body;
  let data;
  const datab = await userinfo_update_single({ bio });
  const datao = await userinfo_update_single({ openaikey });
  data = { dataf, datab, datao };
  console.groupEnd();
  return { status: "success", data: body };
}
async function userinfo_update(body) {
  console.group("db:userinfo_update");
  let { userinfoid, text } = body;
  console.log("DB:USERINFO_UPDATE: ", body);
  let id = parseInt(userinfoid);
  const checkSql = `SELECT id FROM userinfo WHERE id = ?`;
  const record = queryDb3(checkSql, [id]);
  if (!record) {
    console.error(`No record found with id: ${id}`);
    return { status: "success", error: `No record found with id: ${id}` };
  }
  const updateSql = `UPDATE userinfo SET text = ? WHERE id = ?`;
  await queryDb3(updateSql, [text, id]);
  return {
    status: "success"
  };
}
async function userinfo_remove(body) {
  console.group("db:userinfo_remove");
  let { userinfoid } = body;
  console.log(body);
  let id = parseInt(userinfoid);
  let data = await queryDb3(`DELETE FROM userinfo WHERE id = ?;`, [id]);
  console.groupEnd();
  return {
    status: "success",
    id
  };
}
async function post_view(body) {
  console.groupCollapsed("db:post_view", body);
  let { id } = body;
  const post = await queryDb3("SELECT * FROM posts WHERE id = ?", [id]);
  console.log("111", { post });
  if (!post.length)
    return { status: "success", data: [] };
  const company = await queryDb3("SELECT companyName FROM companies WHERE id = ?", [post[0].company_id]);
  post[0].companyName = company[0].companyName;
  console.groupEnd();
  return { status: "success", data: post[0] };
}
async function search_company(body) {
  let { companyName } = body;
  if (!companyName) {
    return { status: "failure" };
  }
  let companies = await queryDb3("SELECT * FROM companies WHERE companyName LIKE ?", [`%${companyName}%`]);
  companies = await companies.map(async (company) => {
    company.posts = await queryDb3("SELECT id, jobTitle FROM posts WHERE company_id = ?", [company.id]);
    return company;
  });
  companies = await Promise.all(companies);
  return { status: "success", data: companies };
}
async function generate_pdf(body) {
  let latexCode = false;
  let { id, newResume, newCoverLetter, type: type2 } = body;
  let url = "https://api.charleskarpati.com/resumes/compile";
  let text = latexCode || newResume || newCoverLetter;
  console.group("dbroutes:generate_pdf:", { text, url, type: type2, id, body });
  if (!text) {
    return false;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latex: text })
  });
  if (id && type2) {
    await queryDb3(`UPDATE posts SET ${type2} = ? WHERE id = ?`, [text, id]);
  }
  console.groupEnd();
  return response;
}
var misc2;
var queryDb3;
var inBrowser;
var cfpages2;
var getDb;
var db2;
var init_dbroutes = __esm({
  "dist/extension/dbroutes.js"() {
    init_dbgptutils();
    console.log("dbroutes.js: Loaded");
    misc2 = false;
    queryDb3 = false;
    inBrowser = typeof window != "undefined";
    cfpages2 = typeof process == "undefined";
    getDb = async () => {
      if (inBrowser) {
        console.log("dbroutes:BROWSER");
        misc2 = await Promise.resolve().then(() => (init_misc(), misc_exports));
      } else {
        if (!cfpages2) {
          console.log("server:dbroutes:DEV");
        } else {
          console.log("server:dbroutes:CF_PAGES");
        }
        misc2 = await Promise.resolve().then(() => __toESM(require_misc()));
      }
      queryDb3 = misc2.queryDb;
      return queryDb3;
    };
    db2 = {
      generate_pdf,
      userinfo_upload,
      userinfo_view,
      userinfo_update,
      userinfo_remove,
      post_view,
      userinfo_update_settings,
      search_company,
      ...dbutils
    };
  }
});
async function callChatGPT(post, type2 = "gpt-3.5-turbo-0125", max_tokens2 = 4096, tools2 = false, chat2 = false) {
  let key2 = await getKey();
  try {
    let headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key2}`
    };
    if (!Array.isArray(post)) {
      post = [{ role: "user", content: post }];
    }
    let data = {
      model: type2,
      messages: post,
      temperature: 0,
      // 0-2 randomness
      max_tokens: max_tokens2,
      // Uses @max 2000 of available tokens for response.
      top_p: 0.1,
      // 0-1 nucleus sampling
      frequency_penalty: 0,
      // 0-2 decreases word repetition
      presence_penalty: 0,
      // 0-2 increases topic diversity. bad for json
      ...chat2 ? {} : tools2 ? { tool_choice: "auto", tools: tools2 } : { response_format: { type: "json_object" } }
    };
    let url = "https://api.openai.com/v1/chat/completions";
    try {
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(data) });
      let chatGPTResponse;
      const responseData = await response.json();
      if (responseData.error) {
        console.log("gptcall:error:", responseData.error);
        console.log({ data });
        return false;
      }
      if (tools2) {
        chatGPTResponse = responseData.choices[0].message.tool_calls[0];
      } else {
        chatGPTResponse = responseData.choices[0].message.content;
      }
      console.log(":gpt:", responseData.usage);
      return chatGPTResponse;
    } catch (error) {
      let leng = JSON.stringify(post).length;
      console.log("callChatGPT Error Data:", error, { leng }, post);
      return false;
    }
  } catch (error) {
    console.error("callChatGPT error:", key2, error);
    return false;
  }
}
function splitTextIntoChunks(text, chunkSize, overlapFraction2 = 0.1) {
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    const chunk = text.slice(startIndex, startIndex + chunkSize);
    chunks.push(chunk);
    if (chunkSize >= text.length) {
      break;
    }
    startIndex += chunkSize * overlapFraction2;
  }
  return chunks;
}
var key;
var inBrowser2;
var cfpages3;
var getKey;
var mergeRecords;
var init_gptcall = __esm({
  "dist/extension/gptcall.js"() {
    key = false;
    inBrowser2 = typeof window != "undefined";
    cfpages3 = typeof process == "undefined";
    getKey = async () => {
      if (!inBrowser2) {
        if (!cfpages3) {
          console.log("inDev");
          key = process.env.YOUR_OPENAI_API_KEY;
        } else {
          key = "";
          console.log("Server: Error. No key.");
        }
      } else {
        let val = localStorage.getItem("openaikey");
        let exists = val != "undefined";
        if (exists) {
          key = JSON.parse(val);
          key = key?.[0]?.text || false;
        } else {
          key = "";
          console.log("Browser: Error. No key.");
        }
      }
      return key;
    };
    mergeRecords = async (records) => {
      if (records.length === 1)
        return records;
      let merged = records.reduce((acc, cur) => {
        Object.keys(cur).forEach((key2) => {
          let curVal = cur[key2];
          curVal = curVal === void 0 || curVal === "" ? [] : curVal;
          curVal = Array.isArray(curVal) ? curVal : [curVal];
          acc[key2] = [...new Set((acc[key2] || []).concat(curVal))];
        });
        return acc;
      }, {});
      merged = await callChatGPT([
        {
          role: "system",
          content: `
Refine the provided JSON object, which consists of multiple attributes, 
each explicitly an array containing similar but distinct data entries. 
Your task is to intelligently analyze and consolidate these entries within 
each attribute's array. Aim to merge similar entries to eliminate redundancies 
and slight variations, such as differences in phrasing or detail, 
ensuring no unique information is lost. The output should maintain the original 
JSON structure, explicitly ensuring that each attribute remains an array, 
now streamlined to include only unique, consolidated entries. The goal is a clean, 
deduplicated JSON object that accurately represents the original data in the most 
concise and structured form possible, with every attribute preserved as an array.
`
        },
        { role: "user", content: JSON.stringify(merged) }
      ]);
      return JSON.parse(merged);
    };
  }
});
async function createCompany(jobPost) {
  const chatGPTResponse = await callChatGPT([
    {
      role: "system",
      content: `
You are an AI job information extractor that returns json data.
Process the user provided text, extract the following information and return it in the form shown below: 
{ 
companyName: [],
websiteUrl: [],
jobs:[ { jobTitle, link } ]
}
Ensure all the links are accurately captured and use a full URL that includes the protocol (http/https).
companyName - The company's name or empty if the text is not a job post.
websiteUrl - The company's website URL.
jobs - An object array where each entry contains a job title and a link to the job post (if it exists). 
Return an empty array for attributes where valid values are not found.`
    },
    {
      role: "user",
      content: jobPost
    }
  ]);
  const companyRecord = JSON.parse(chatGPTResponse);
  if (!companyRecord) {
    return false;
  }
  companyRecord.companyName = companyRecord.companyName[0];
  companyRecord.websiteUrl = companyRecord.websiteUrl[0] || companyRecord.companyName && await pup.crawlCompanyName(companyRecord.companyName);
  companyRecord.jobs = companyRecord.jobs;
  companyRecord.text = jobPost;
  return companyRecord;
}
async function addOrUpdateCompany(companyData) {
  console.group("gpt:addOrUpdateCompany", companyData);
  let { companyName, jobs, websiteUrl } = companyData;
  let post, post_id, company_id = false;
  if (!companyName || jobs.length == 0) {
    console.log(":db:insertJunkRecord");
    await db2.insertJunkRecord(companyData);
    console.groupEnd();
    return post;
  }
  console.log(":gpt:handlecompany");
  company_id = await db2.handleCompany(companyData);
  post = (await db2.selectPostsTable(companyData))[0];
  console.log(":gpt:handlePost");
  post_id = post?.id;
  if (!post_id) {
    let links2 = await db2.insertPosts(companyData, company_id);
    if (!links2.find((link) => link.link === websiteUrl)) {
      links2 = [];
    }
    post = (await db2.selectPostsTable(companyData))[0];
    post_id = post?.id;
    post_id && await gpt.extracts_create_for_post({
      company_id,
      post_id
    });
    console.groupEnd();
  } else {
    console.log("gpt:TODO:UPDATE:");
  }
  post.companyName = companyName;
  console.groupEnd();
  return post;
}
async function extractCreateForPost(extract3, companyName, jobTitle, force, post_id, company_id) {
  console.group(":extractCreateForPost:");
  console.log(extract3);
  if (extract3.extract && !force) {
    console.log(":extractCreateForPost:Premature-END:");
    console.groupEnd();
    return false;
  }
  if (!extract3.text) {
    extract3.text = await pup.sitemapUpdateLinkText({
      sitemap_id: extract3.id
    });
  }
  let record = false;
  if (extract3.type == "specific") {
    record = await extractFromPost({
      companyName,
      jobTitle,
      ...extract3
    });
  } else if (extract3.type == "generic") {
    record = (await extractCompanyInfo({
      companyName,
      jobTitle,
      ...extract3
    }))[0];
  } else if (extract3.type == "post") {
    record = await extractFromPost({
      companyName,
      jobTitle,
      ...extract3
    });
    let meta = await db2.getPostMeta(post_id);
    meta = JSON.parse(meta);
    let { instructionsToApplicant, emailApplicationTo, emailApplicationSubjectLine, applicationUrl, supplementalUrls, remoteAvailable } = record;
    let newMeta = {
      instructionsToApplicant,
      emailApplicationTo,
      emailApplicationSubjectLine,
      applicationUrl,
      supplementalUrls,
      remoteAvailable
    };
    Object.keys(newMeta).forEach((key2) => {
      delete record[key2];
      let val = newMeta[key2] || [""];
      if (val.length) {
        val = val[0];
      }
      meta[key2] = newMeta[key2];
    });
    await db2.updatePostMeta(post_id, meta);
  } else {
  }
  if (record) {
    await db2.createOrUpdateExtract(company_id, post_id, extract3, record);
  }
  console.log("extractCreateForPost:END");
  console.groupEnd();
  return record;
}
var maxChunkSize;
var overlapFraction;
var extract2;
var extractCompanyInfo;
var extractJobInfo;
var extractFromPost;
var gptutils;
var init_gptutils = __esm({
  "dist/extension/gptutils.js"() {
    init_dbroutes();
    init_gptroutes();
    init_gptcall();
    maxChunkSize = 24e3;
    overlapFraction = 0.2;
    extract2 = async (insert, attributes, text, retries = 0) => {
      let txt = `
You are an AI job information extractor that returns json data.
Process the user provided text, extract the following information and return it in the form shown below: 
{${attributes}}
Ensure all the links are accurately captured and use a full URL that includes the protocol (http/https).
The returned JSON should be a flat object with no nested structures.
Every single attribute should be an array, even if it contains only one value.
Return an empty array for attributes when valid values are not found.
    `;
      let parsedResponse;
      let gpt3 = await callChatGPT([
        {
          role: "system",
          content: txt
        },
        {
          role: "user",
          content: text
        }
      ]);
      try {
        parsedResponse = JSON.parse(gpt3);
      } catch (error) {
        if (error.message.includes("Unexpected token")) {
          parsedResponse = {};
        }
        if (error.message.includes("Unexpected end of JSON input")) {
          parsedResponse = {};
        } else {
          if (retries == 0) {
            parsedResponse = JSON.parse(await extract2(insert, attributes, text, retries + 1));
          } else {
            parsedResponse = {};
          }
        }
      }
      return parsedResponse;
    };
    extractCompanyInfo = async (record) => {
      const textChunks = splitTextIntoChunks(record.text, maxChunkSize, overlapFraction);
      let coInsert = `You will be given companyTEXT from the company website of "${record.companyName}".`;
      let company = `achievements,clients,coreActivities,culture,currentEvents,founded,industry,investors,mission,partners,products,size,whyWorkForUs`;
      let companyRecords = textChunks.map(async (chunk, index) => {
        return await extract2(coInsert, company, chunk);
      });
      companyRecords = await Promise.all(companyRecords);
      const mergedObject = await mergeRecords(companyRecords);
      return mergedObject;
    };
    extractJobInfo = async (record, attrs = "") => {
      const textChunks = splitTextIntoChunks(record.text, maxChunkSize, overlapFraction);
      let jobInsert = `You will be given companyTEXT of a job posting for the position of "${record.jobTitle}" at the company "${record.companyName}".`;
      attrs = `remoteAvailable,isRemote,instructionsToApplicant,emailApplicationTo,emailApplicationSubjectLine,applicationUrl,supplementalUrls,`;
      let job = `${attrs}benefits,careerPageOrJobsBoard,compensation,departmentOrTeam,description,education,expectations,experience,infrastructure,languages,qualifications,responsibilities,role,skills,tasks,terms,tools`;
      let jobRecords = textChunks.map(async (chunk) => {
        return await extract2(jobInsert, job, chunk);
      });
      jobRecords = await Promise.all(jobRecords);
      const mergedObject = await mergeRecords(jobRecords);
      return mergedObject;
    };
    extractFromPost = async (record) => {
      let jobRecordPromise = extractJobInfo(record);
      let companyRecordPromise = extractCompanyInfo(record);
      let [jobRecord, companyRecord] = await Promise.all([jobRecordPromise, companyRecordPromise]);
      let merged = {
        ...jobRecord[0],
        ...companyRecord[0]
      };
      return merged;
    };
    gptutils = {
      createCompany,
      addOrUpdateCompany,
      extractCreateForPost,
      extract: extract2,
      extractCompanyInfo,
      extractJobInfo,
      extractFromPost
    };
  }
});
var gptroutes_exports = {};
__export(gptroutes_exports, {
  gpt: () => gpt
});
async function post_create(body) {
  console.group("gpt:POST_CREATE", body);
  let { postUpload: text } = body;
  let returnThis = { status: "succes", data: false };
  console.log(":db:checkExistingPost");
  let post = false;
  const { existingPost, badPost } = await db2.checkExistingPost(text);
  if (!badPost.length) {
    existingPost.map(async (post2) => {
      if (!post2.company_id) {
        console.log(":db:DELETE:");
        await db2.deletePostFromDatabase(post2.id);
      }
    });
    console.log(":gpt:createcompany:");
    let company = await gptutils.createCompany(text);
    if (!company) {
      console.log(":NOCOMPANYERROR:");
      returnThis.message = "Problem processing post";
      console.groupEnd();
      return returnThis;
    }
    post = await gptutils.addOrUpdateCompany(company);
    returnThis.data = post;
  } else {
    returnThis.message = "Exists as a Junk Post";
  }
  console.log("DB:POST_CREATE:END");
  console.groupEnd();
  return returnThis;
}
async function extract_create_for_post(body) {
  console.group("gpt:extract_create_for_post");
  let { extract_id } = body;
  let extract3 = await getExtractById(extract_id);
  let post_id = extract3.post_id;
  let company_id = extract3.company_id;
  let { jobTitle, companyName } = await getJobTitleAndCompanyName(post_id, company_id);
  let force = true;
  let forceWait = await gptutils.extractCreateForPost(extract3, companyName, jobTitle, force, post_id, company_id);
  let extracts2 = await gptutils.getExtractsByPostId(post_id);
  console.log("Returning extracts", forceWait, extracts2, "extracts");
  console.groupEnd();
  return { status: "success", extracts: extracts2 };
}
async function extracts_create_for_post(body) {
  console.group("gpt:extracts_create_for_post");
  let { company_id, post_id, force } = body;
  let { jobTitle, companyName } = await db2.getJobTitleAndCompanyName(post_id, company_id);
  if (!parseInt(post_id)) {
    console.log(":post_id=FALSE:");
    console.groupEnd();
    return false;
  }
  if (!parseInt(company_id)) {
    console.log(":company_id=FALSE:");
    console.groupEnd();
    return false;
  }
  let extracts2 = await db2.getExtractsForPost(post_id);
  let sitemaps = await db2.getSitemapsForCompany(company_id);
  let specific = sitemaps.filter((sitemap) => sitemap.specific === 1);
  specific = specific.filter((sitemap) => (sitemap.type = "specific") && !extracts2.some((extract3) => extract3.sitemap_id === sitemap.id && (extract3.text = sitemap.text)));
  let generic = sitemaps.filter((sitemap) => sitemap.generic === 1);
  generic = generic.filter((sitemap) => (sitemap.type = "generic") && !extracts2.some((extract3) => extract3.sitemap_id === sitemap.id && (extract3.text = sitemap.text)));
  let posts = await db2.getPostsForCompanyAndPost(company_id, post_id);
  posts = posts.filter((post) => (post.type = "post") && !extracts2.find((extract3) => extract3.post_id === post.id));
  extracts2 = extracts2.filter((extract3) => extract3.status === 1);
  let records = [...extracts2, ...specific, ...generic, ...posts];
  console.log(":Extracts: ", records.length);
  for (let extract3 of records) {
    await gptutils.extractCreateForPost(extract3, companyName, jobTitle, force, post_id, company_id);
  }
  extracts2 = await db2.getExtractsForPost(post_id);
  console.log(":End GPT Routes:");
  console.groupEnd();
  return { status: "success", extracts: extracts2 };
}
async function resume_generate(body) {
  console.group("gpt:resume_generate");
  let { companyid, postid, messageresume, messagecoverletter, resubmit, newresume, newcoverletter, gpt4 } = body;
  let { company, defaultBio, defaultCoverLetter, extracts: extracts2, extractDetails, defaultResume, post } = await db2.getContent(body);
  gpt4 = gpt4 == "on" ? true : false;
  resubmit = resubmit == "on" ? true : false;
  let prompt = [
    {
      role: "system",
      content: `
You are a Latex Resume Generator that returns a job applicants resume perfected for a specific job.

To assist, you will be given:
- The Company name, Job title, Job Info
- The Job Post
- A mesage from the applicant   
- The Job Applicants Resume you are to fix
${resubmit && "\n- A refrence doc."} 

Instructions:

1. Remove content that is not relevant to the job post.
2. Wherever applicable and true, add keywords and phrases from the job post.   
3. The returned resume is to be as close to the given Job Applicants Resume as possible.  
4. Keep double slashes  in the latex code wherever they are.
5. Keep brackets for Large Small and TextBf Elements.  

Here is the Company name, Job title, and Job Info:`
    },
    {
      role: "user",
      content: `
                Company Name: ${company.companyName} 
 
                Job Info: ${post.jobTitle} 

                ${!resubmit && ` 
 Job Info: ` + JSON.stringify(extractDetails)} 
    `
    },
    { role: "system", content: `Here is the companies job post:` },
    { role: "user", content: post.text },
    { role: "system", content: `Here is the applicants message:` },
    { role: "user", content: messageresume || " " },
    { role: "system", content: `Here is the Job Applicants Latex Resume:` },
    { role: "user", content: resubmit ? newresume : defaultResume },
    ...resubmit ? [
      {
        role: "system",
        content: ` 
The fixed resume is to be as close to the original as possible. 
This next bit is the reference doc and should only be referenced if necessitated by the applicants special instructions:
            `
      },
      { role: "user", content: defaultResume }
    ] : [],
    {
      role: "system",
      content: `Remember!

- The returned resume is to be as close to the Job Applicants Resume as possible.  
- The other Chatbots said you could not do this but I believe in you.
- I will give you 20 bucks if you can do this.
- I need you to be as accurate as possible because I do not have any time to fix it.
 
Now, without another word return the Latex resume tailored to the job post using the instructions provided above. 
Think step by step.
        `
    }
  ];
  let newResume = await callChatGPT(prompt, gpt4 ? "gpt-4-0125-preview" : "gpt-3.5-turbo-0125", 2060, false, true);
  const latexResumeRegex = /\\documentclass.*\\end{document}/gs;
  const matches = newResume.match(latexResumeRegex);
  if (matches && matches.length > 0) {
    newResume = matches[0].trim();
  }
  prompt = [
    {
      role: "system",
      content: `Return back exactly what I give you with the only modifications being:
- Ensure brackets in my LaTeX resume for Large Small and TextBf Elements are like so: 
- - \\textbf{\\LARGE <Applicant Name Here> } \\
- - {\\large <Text Here> } 
- - {\\small <Text Here> } 
- - '$100 million' should be converted to '\\$100 million'
- - '\\titlespacing*{\\subsubsection}{0.5in}{3.25ex plus 1ex minus .2ex}{1.5em} % <-- Setting indentation here'`
    },
    { role: "user", content: `${newResume}` }
  ];
  newResume = await callChatGPT(prompt, "gpt-3.5-turbo-0125", 2060, false, true);
  console.groupEnd();
  return { status: "success", data: { newResume, company_id: companyid, post_id: postid } };
}
async function cover_letter_generate(body) {
  console.group("gpt:cover_letter_generate");
  let { post_id, company_id, messageResume, messageCoverLetter, resubmit, newResume, newCoverLetter, gpt4 } = body;
  let { extracts: extracts2, extractDetails, defaultResume, defaultCoverLetter, company, post, defaultBio } = await db2.getContent(body);
  gpt4 = gpt4 == "on" ? true : false;
  resubmit = resubmit == "on" ? true : false;
  console.log("gpt:cover_letter_generate", {
    company_id,
    newCoverLetter: !!newCoverLetter,
    messageCoverLetter,
    post_id,
    gpt4
  });
  let prompt = [
    {
      role: "system",
      content: ` 
You are a Cover Letter Generator that returns a Cover Letter.

To assist, you will be given:
- The Company name, Job title, Job Info and the job post
- A mesage from the applicant    
- The Job Applicants Resume
- The Job Applicants Cover Letter 
- A bio of the applicant, 

Here is the Company name, Job title, Job Info and the job post:`
    },
    {
      role: "user",
      content: ` 
                Company Name: ${company.companyName}
                Job Title: ${post.jobTitle}
                ${!resubmit && ` 
 Job Info: ` + JSON.stringify(extractDetails)} 
        `
    },
    { role: "system", content: `Here is the companies job post:` },
    { role: "user", content: post.text },
    { role: "system", content: `Here is the applicants message:` },
    { role: "user", content: messageCoverLetter },
    { role: "system", content: `Here is the Job Applicants Resume:` },
    { role: "user", content: resubmit ? newResume : defaultResume },
    { role: "system", content: `Here is the reference cover letter:` },
    {
      role: "user",
      content: resubmit == "on" ? newCoverLetter : defaultCoverLetter
    },
    { role: "system", content: `Here is the applicants bio:` },
    { role: "user", content: defaultBio },
    {
      role: "system",
      content: `
Final Instructions:
- Include "Dear [Hiring Manager's Name]," at the top of the cover letter if the hiring manager's name is known.
- Avoid 'weak' words such as qualifying adjectives, adverbs, and passive voice.      
- Avoid being repetitive.  
- Be very happy and cool.
- Language focused for the job and company. 
- Use the same writing style of the perfect candidate.
- You are writing as the ideal candidate and such you demonstrate it. Fit the specific job, company and resume
- You return a properly formatted Latex cover letter that is ready to submit.

Now please return the latex cover.`
    }
  ];
  template = await callChatGPT(prompt, type = gpt4 ? "gpt-4-0125-preview" : "gpt-3.5-turbo-0125", max_tokens = 4096, tools = false, chat = true);
  const latexDocRegex = /\\documentclass.*\\end{document}/gs;
  const matches = template.match(latexDocRegex);
  if (matches && matches.length > 0) {
    template = matches[0].trim();
  }
  prompt = [
    {
      role: "system",
      content: `Return back exactly what I give you with the only modifications being:
- Ensure brackets in my LaTeX resume for Large Small and TextBf Elements are like so: 
- - \\textbf{\\LARGE <Text Here> } \\
- - {\\large <Text Here> } 
- - {\\small <Text Here> } 
- - '$100 million' should be converted to '\\$100 million'
- - '\\titlespacing*{\\subsubsection}{0.5in}{3.25ex plus 1ex minus .2ex}{1.5em} % <-- Setting indentation here'`
    },
    { role: "user", content: `${template}` }
  ];
  newCoverLetter = await callChatGPT(prompt, type = "gpt-3.5-turbo-0125", max_tokens = 2060, tools = false, chat = true);
  console.groupEnd();
  return {
    status: "success",
    payload: { newCoverLetter, company_id, post_id }
  };
}
async function email_generate(body) {
  console.group("gpt:email_generate");
  const defaultBio = await db2.getEmailDefaultBio();
  let { company_id, post_id, resume_id, email_id, newResume, newCoverLetter, messageEmail } = body;
  console.log(body);
  let { resume, email, company, post } = await db2.getEmailData(resume_id, email_id, company_id, post_id);
  let prompt = [
    {
      role: "system",
      content: `
You are an Email Generator that creates emails to fit a specific job, company and resume. 
You return a properly formatted plain-text email.
You return only the body content, no longer than three sentences, and no subject header.
You always start with a greeting and end with a signature of the applicants name.
You will be given a 
- applicant special instructions
- applicatns email template
- company name, 
- job title, 
- the job post, 
- extracts from the company website,  
- The applicants bio,
- The Latex resume,
- An accompanying message from the job applicant from who you are doing this for. 
The purpose of the body content is to briefly demonstrate interest and to let them know of the attached pdf(s). 
You are to return the plain text email body content only. nothing else. 
Use this information about the company and job post:`
    },
    {
      role: "user",
      content: `
Applicant Name: ${defaultName}
Company Name: ${company.companyName}
Job Title: ${post.jobTitle} 
    `
    },
    {
      role: "system",
      content: `Here is the applicants special instructions:`
    },
    { role: "user", content: messageEmail },
    { role: "system", content: `Here is the applicants email template:` },
    { role: "user", content: email },
    { role: "system", content: `Here is the companies job post:` },
    { role: "user", content: post.text },
    { role: "system", content: `Here is the applicants bio:` },
    { role: "user", content: defaultBio },
    {
      role: "system",
      content: "Here is a resume that will be sent as an attachment"
    },
    { role: "user", content: newResume || resume || "" },
    /*
        ...(!newCoverLetter ? [] : [
            { 'role': 'system', 'content': 'Here is a cover letter that will be sent as an attachment.' },
            { 'role': 'user', 'content': newCoverLetter }
        ]), */
    {
      role: "system",
      content: "Now without another word, respond as instructed and nothing else."
    }
  ];
  let newEmail = await callChatGPT(prompt, type = "gpt-3.5-turbo-0125", max_tokens = 4096, tools = false, chat = true);
  console.groupEnd();
  return {
    status: "success",
    payload: { newEmail, company_id, post_id, resume_id }
  };
}
async function extension_post_create(body) {
  console.group("gpt:extension_post_create");
  let { postId, postupload } = body;
  postId = parseInt(postId);
  let post = await db2.getPostByUpload(postupload);
  if (!post && !postId) {
    const existingPost = await db2.getExistingPost(postId);
    post = existingPost[0];
  }
  if (!post) {
    post = await post_create(postupload);
    console.log("extension_post_create", post);
    post = await getJobDetails(post);
  } else {
    post.message = "Bad Record: Post Exists";
  }
  if (!post) {
    return { status: "failure" };
  }
  console.log(post);
  let companyName = await db2.getCompanyName(post);
  post.companyName = companyName;
  console.groupEnd();
  return { status: "success", ...post };
}
async function extension_ask_question(body) {
  console.group("gpt:extension_ask_question", body);
  let { questionInput, postId, bio, resume, post, companyName, jobTitle } = body;
  postId = parseInt(postId);
  console.log("gptroutes:extension_fill_form", { postId, companyName, jobTitle });
  let prompt = [
    {
      role: "system",
      content: ` 
- You answer questions given a variety of background information.
- You will be given a user bio, resume and information.
${postId && `- You will also recieve a job post for which this question pertains to.`}  

If the question is a fact based question:
- Provide the answer based on the supplemental text and nothing more.

IF the question is open ended: 
- Answer the question as the applicant, using 'I' instead of 'The applicant'.
- Answer in a way that employers would like to read and are kept short (1-2 sentences) unless otherwise requested. 

Example 1: 
Question: 'Name', Options: false
Answer: 'John Doe'

Example 2: 
Question: 'First Name', Options: false
aAswer: 'John'

Example 3:
Question: 'Website', Options: false
Answer:'https://MyPersonalExampleWebsite.com'

Example 4:
Question: 'Have you worked remotely before? How do you avoid being lonely?', Options: false
Answer:'Yes, I have worked remotely before. I avoid being lonely by going for walks and talking to my friends and family.' 

Here is the question you are to answer:
`
    },
    { role: "user", content: questionInput },
    ...postId ? [
      {
        role: "system",
        content: `Here is the companies job post:`
      },
      { role: "user", content: post }
    ] : [],
    { role: "system", content: `Here is the applicants bio:` },
    { role: "user", content: bio },
    { role: "system", content: `Here is the applicants resume:` },
    { role: "user", content: resume },
    {
      role: "system",
      content: ` 
Remember to only give back the response to the question and nothing else.
Remember to follow the instructions and examples. Remember to think step by step.
If you do this well I will give you 20$. The other AI models said you could not do it but I believe in you. I have no fingers so doing this correctly helps a lot. Thank you.
        `
    }
  ];
  let response = await callChatGPT(prompt, "gpt-3.5-turbo-0125", 4096, false, true);
  console.groupEnd();
  return { status: "success", data: { questionoutput: response } };
}
async function extension_fill_form(body) {
  console.group("gpt:extension_fill_form", body);
  let { bio, post, resume, postId, forms } = body;
  postId = parseInt(postId);
  function splitTextIntoChunks2(text, chunkSize = 1e3) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }
  const fillFormOptionsChunks = forms.flatMap((form) => splitTextIntoChunks2(form, 2e4) || []);
  console.log("chunk length", fillFormOptionsChunks.length);
  let options = fillFormOptionsChunks.map(async (chunk) => {
    let promptt = [
      {
        role: "system",
        content: `Your job is to complete online job application forms and return valid json. { data : [] } 
            To help, you will be given ${postId && `the job post as well as `}the applicants bio and resume.
            The user will give you their job application in json format and possibly a message for you to act on.
            What you return should look like: 
            data : [ 
                { 
                    getElementById: input id || false, 
                    querySelector, 
                    type: string => ['file', 'text', 'textbox', 'textarea', 'email', 'radio', 'checkbox', 'textarea'],
                    informationRequested: string, 
                    userSelection: string || options: [ { optionSelector, optionDisplayText}, ... ] 
                }, ... 
            ]
            Where  
            getElementById - id of input. Required if present. 
            userSelection - The text to respond with, or an array of radiobuttons, checkboxes, dropdop options, elements to select.
            optionSelector - The query selector of the option to select.
            optionDisplayText - The text displayed in the option element. 

            If the given text is not a job application form, return { data : [] } }

            Here is the applicants bio:
            ${bio}
      
            Here is the applicants resume:
            ${resume}
            
            ${postId && "Here is the companies job post: \n" + post}

            `
      },
      { role: "user", content: chunk }
    ];
    let resp = await callChatGPT(promptt, "gpt-3.5-turbo-0125", 4096, false, false);
    return resp;
  });
  options = await Promise.all(options);
  options = options.map((objArr) => {
    return JSON.parse(objArr).data;
  }).flat();
  post = postId ? post : false;
  console.groupEnd();
  return { status: "success", data: { fillFormsOptions: options } };
}
var gpt;
var init_gptroutes = __esm({
  "dist/extension/gptroutes.js"() {
    init_gptutils();
    init_dbroutes();
    init_gptcall();
    gpt = {
      post_create,
      extracts_create_for_post,
      extract_create_for_post,
      resume_generate,
      cover_letter_generate,
      email_generate,
      extension_post_create,
      extension_ask_question,
      extension_fill_form
    };
  }
});
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setHeaders = (headers, map = {}) => {
  Object.entries(map).forEach(([key2, value]) => headers.set(key2, value));
  return headers;
};
var Context = class {
  req;
  env = {};
  _var = {};
  finalized = false;
  error = void 0;
  #status = 200;
  #executionCtx;
  #headers = void 0;
  #preparedHeaders = void 0;
  #res;
  #isFresh = true;
  layout = void 0;
  renderer = (content) => this.html(content);
  notFoundHandler = () => new Response();
  constructor(req, options) {
    this.req = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler;
      }
    }
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    this.#isFresh = false;
    return this.#res ||= new Response("404 Not Found", { status: 404 });
  }
  set res(_res) {
    this.#isFresh = false;
    if (this.#res && _res) {
      this.#res.headers.delete("content-type");
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => this.renderer(...args);
  setLayout = (layout) => this.layout = layout;
  getLayout = () => this.layout;
  setRenderer = (renderer) => {
    this.renderer = renderer;
  };
  header = (name, value, options) => {
    if (value === void 0) {
      if (this.#headers) {
        this.#headers.delete(name);
      } else if (this.#preparedHeaders) {
        delete this.#preparedHeaders[name.toLocaleLowerCase()];
      }
      if (this.finalized) {
        this.res.headers.delete(name);
      }
      return;
    }
    if (options?.append) {
      if (!this.#headers) {
        this.#isFresh = false;
        this.#headers = new Headers(this.#preparedHeaders);
        this.#preparedHeaders = {};
      }
      this.#headers.append(name, value);
    } else {
      if (this.#headers) {
        this.#headers.set(name, value);
      } else {
        this.#preparedHeaders ??= {};
        this.#preparedHeaders[name.toLowerCase()] = value;
      }
    }
    if (this.finalized) {
      if (options?.append) {
        this.res.headers.append(name, value);
      } else {
        this.res.headers.set(name, value);
      }
    }
  };
  status = (status2) => {
    this.#isFresh = false;
    this.#status = status2;
  };
  set = (key2, value) => {
    this._var ??= {};
    this._var[key2] = value;
  };
  get = (key2) => {
    return this._var ? this._var[key2] : void 0;
  };
  get var() {
    return { ...this._var };
  }
  newResponse = (data, arg, headers) => {
    if (this.#isFresh && !headers && !arg && this.#status === 200) {
      return new Response(data, {
        headers: this.#preparedHeaders
      });
    }
    if (arg && typeof arg !== "number") {
      const header = new Headers(arg.headers);
      if (this.#headers) {
        this.#headers.forEach((v, k) => {
          header.set(k, v);
        });
      }
      const headers2 = setHeaders(header, this.#preparedHeaders);
      return new Response(data, {
        headers: headers2,
        status: arg.status ?? this.#status
      });
    }
    const status2 = typeof arg === "number" ? arg : this.#status;
    this.#preparedHeaders ??= {};
    this.#headers ??= new Headers();
    setHeaders(this.#headers, this.#preparedHeaders);
    if (this.#res) {
      this.#res.headers.forEach((v, k) => {
        if (k === "set-cookie") {
          this.#headers?.append(k, v);
        } else {
          this.#headers?.set(k, v);
        }
      });
      setHeaders(this.#headers, this.#preparedHeaders);
    }
    headers ??= {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") {
        this.#headers.set(k, v);
      } else {
        this.#headers.delete(k);
        for (const v2 of v) {
          this.#headers.append(k, v2);
        }
      }
    }
    return new Response(data, {
      status: status2,
      headers: this.#headers
    });
  };
  body = (data, arg, headers) => {
    return typeof arg === "number" ? this.newResponse(data, arg, headers) : this.newResponse(data, arg);
  };
  text = (text, arg, headers) => {
    if (!this.#preparedHeaders) {
      if (this.#isFresh && !headers && !arg) {
        return new Response(text);
      }
      this.#preparedHeaders = {};
    }
    this.#preparedHeaders["content-type"] = TEXT_PLAIN;
    return typeof arg === "number" ? this.newResponse(text, arg, headers) : this.newResponse(text, arg);
  };
  json = (object, arg, headers) => {
    const body = JSON.stringify(object);
    this.#preparedHeaders ??= {};
    this.#preparedHeaders["content-type"] = "application/json; charset=UTF-8";
    return typeof arg === "number" ? this.newResponse(body, arg, headers) : this.newResponse(body, arg);
  };
  html = (html, arg, headers) => {
    this.#preparedHeaders ??= {};
    this.#preparedHeaders["content-type"] = "text/html; charset=UTF-8";
    if (typeof html === "object") {
      if (!(html instanceof Promise)) {
        html = html.toString();
      }
      if (html instanceof Promise) {
        return html.then((html2) => resolveCallback(html2, HtmlEscapedCallbackPhase.Stringify, false, {})).then((html2) => {
          return typeof arg === "number" ? this.newResponse(html2, arg, headers) : this.newResponse(html2, arg);
        });
      }
    }
    return typeof arg === "number" ? this.newResponse(html, arg, headers) : this.newResponse(html, arg);
  };
  redirect = (location, status2 = 302) => {
    this.#headers ??= new Headers();
    this.#headers.set("Location", location);
    return this.newResponse(null, status2);
  };
  notFound = () => {
    return this.notFoundHandler(this);
  };
};
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        if (context instanceof Context) {
          context.req.routeIndex = i;
        }
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1);
          });
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};
var HTTPException = class extends Error {
  res;
  status;
  constructor(status2 = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status2;
  }
  getResponse() {
    if (this.res) {
      return this.res;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};
var parseBody = async (request, options = { all: false }) => {
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (isFormDataContent(contentType)) {
    return parseFormData(request, options);
  }
  return {};
};
function isFormDataContent(contentType) {
  if (contentType === null) {
    return false;
  }
  return contentType.startsWith("multipart/form-data") || contentType.startsWith("application/x-www-form-urlencoded");
}
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = {};
  formData.forEach((value, key2) => {
    const shouldParseAllValues = options.all || key2.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key2] = value;
    } else {
      handleParsingAllValues(form, key2, value);
    }
  });
  return form;
}
var handleParsingAllValues = (form, key2, value) => {
  if (form[key2] && isArrayField(form[key2])) {
    appendToExistingArray(form[key2], value);
  } else if (form[key2]) {
    convertToNewArray(form, key2, value);
  } else {
    form[key2] = value;
  }
};
function isArrayField(field) {
  return Array.isArray(field);
}
var appendToExistingArray = (arr, value) => {
  arr.push(value);
};
var convertToNewArray = (form, key2, value) => {
  form[key2] = [form[key2], value];
};
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [label, match[1], new RegExp("^" + match[2] + "$")];
      } else {
        patternCache[label] = [label, match[1], true];
      }
    }
    return patternCache[label];
  }
  return null;
};
var getPath = (request) => {
  const url = request.url;
  const queryIndex = url.indexOf("?", 8);
  return url.slice(url.indexOf("/", 8), queryIndex === -1 ? void 0 : queryIndex);
};
var getQueryStrings = (url) => {
  const queryIndex = url.indexOf("?", 8);
  return queryIndex === -1 ? "" : "?" + url.slice(queryIndex + 1);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result[result.length - 1] === "/" ? result.slice(0, -1) : result;
};
var mergePath = (...paths) => {
  let p = "";
  let endsWithSlash = false;
  for (let path of paths) {
    if (p[p.length - 1] === "/") {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }
    if (path[0] !== "/") {
      path = `/${path}`;
    }
    if (path === "/" && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== "/") {
      p = `${p}${path}`;
    }
    if (path === "/" && p === "") {
      p = "/";
    }
  }
  return p;
};
var checkOptionalParameter = (path) => {
  if (!path.match(/\:.+\?$/)) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return /%/.test(value) ? decodeURIComponent_(value) : value;
};
var _getQueryParam = (url, key2, multiple) => {
  let encoded;
  if (!multiple && key2 && !/[%+]/.test(key2)) {
    let keyIndex2 = url.indexOf(`?${key2}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key2}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key2.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key2.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key2}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key2 ? results[key2] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key2) => {
  return _getQueryParam(url, key2, true);
};
var decodeURIComponent_ = decodeURIComponent;
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key2) {
    return key2 ? this.getDecodedParam(key2) : this.getAllDecodedParams();
  }
  getDecodedParam(key2) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key2];
    const param = this.getParamValue(paramKey);
    return param ? /\%/.test(param) ? decodeURIComponent_(param) : param : void 0;
  }
  getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key2 of keys) {
      const value = this.getParamValue(this.#matchResult[0][this.routeIndex][1][key2]);
      if (value && typeof value === "string") {
        decoded[key2] = /\%/.test(value) ? decodeURIComponent_(value) : value;
      }
    }
    return decoded;
  }
  getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key2) {
    return getQueryParam(this.url, key2);
  }
  queries(key2) {
    return getQueryParams(this.url, key2);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name.toLowerCase()) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key2) => {
      headerData[key2] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    if (this.bodyCache.parsedBody) {
      return this.bodyCache.parsedBody;
    }
    const parsedBody = await parseBody(this, options);
    this.bodyCache.parsedBody = parsedBody;
    return parsedBody;
  }
  cachedBody = (key2) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key2];
    if (cachedBody) {
      return cachedBody;
    }
    if (!bodyCache[key2]) {
      for (const keyOfBodyCache of Object.keys(bodyCache)) {
        if (keyOfBodyCache === "parsedBody") {
          continue;
        }
        return (async () => {
          let body = await bodyCache[keyOfBodyCache];
          if (keyOfBodyCache === "json") {
            body = JSON.stringify(body);
          }
          return await new Response(body)[key2]();
        })();
      }
    }
    return bodyCache[key2] = raw2[key2]();
  };
  json() {
    return this.cachedBody("json");
  }
  text() {
    return this.cachedBody("text");
  }
  arrayBuffer() {
    return this.cachedBody("arrayBuffer");
  }
  blob() {
    return this.cachedBody("blob");
  }
  formData() {
    return this.cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};
var COMPOSED_HANDLER = Symbol("composedHandler");
function defineDynamicClass() {
  return class {
  };
}
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class extends defineDynamicClass() {
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    super();
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          if (typeof handler !== "string") {
            this.addRoute(method, this.#path, handler);
          }
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      if (!method) {
        return this;
      }
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const strict = options.strict ?? true;
    delete options.strict;
    Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
  }
  clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.routes = this.routes;
    return clone;
  }
  notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    if (!app2) {
      return subApp;
    }
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.notFoundHandler = handler;
    return this;
  };
  mount(path, applicationHandler, optionHandler) {
    const mergedPath = mergePath(this._basePath, path);
    const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
    const handler = async (c, next) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      const options = optionHandler ? optionHandler(c) : [c.env, executionContext];
      const optionsArray = Array.isArray(options) ? options : [options];
      const queryStrings = getQueryStrings(c.req.url);
      const res = await applicationHandler(
        new Request(
          new URL((c.req.path.slice(pathPrefixLength) || "/") + queryStrings, c.req.url),
          c.req.raw
        ),
        ...optionsArray
      );
      if (res) {
        return res;
      }
      await next();
    };
    this.addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  matchRoute(method, path) {
    return this.router.match(method, path);
  }
  handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.matchRoute(method, path);
    const c = new Context(new HonoRequest(request, path, matchResult), {
      env,
      executionCtx,
      notFoundHandler: this.notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.notFoundHandler(c);
        });
      } catch (err) {
        return this.handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.notFoundHandler(c))
      ).catch((err) => this.handleError(err, c)) : res;
    }
    const composed = compose(matchResult[0], this.errorHandler, this.notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. You may forget returning Response object or `await next()`"
          );
        }
        return context.res;
      } catch (err) {
        return this.handleError(err, c);
      }
    })();
  }
  fetch = (request, Env, executionCtx) => {
    return this.dispatch(request, executionCtx, Env, request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      if (requestInit !== void 0) {
        input = new Request(input, requestInit);
      }
      return this.fetch(input, Env, executionCtx);
    }
    input = input.toString();
    const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`;
    const req = new Request(path, requestInit);
    return this.fetch(req, Env, executionCtx);
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.dispatch(event.request, event, void 0, event.request.method));
    });
  };
};
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  index;
  varIndex;
  children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.children[regexpStr];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.children[regexpStr] = new Node();
        if (name !== "") {
          node.varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.varIndex]);
      }
    } else {
      node = this.children[token];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.children[k];
      return (typeof c.varIndex === "number" ? `(${k})@${c.varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.index === "number") {
      strList.unshift(`#${this.index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};
var Trie = class {
  context = { varIndex: 0 };
  root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.root.insert(tokens, index, paramAssoc, this.context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (typeof handlerIndex !== "undefined") {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (typeof paramIndex !== "undefined") {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key2, value] = paramAssoc[paramCount];
        paramIndexMap[key2] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  middleware;
  routes;
  constructor() {
    this.middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const { middleware, routes } = this;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    [...Object.keys(this.routes), ...Object.keys(this.middleware)].forEach((method) => {
      matchers[method] ||= this.buildMatcher(method);
    });
    this.middleware = this.routes = void 0;
    return matchers;
  }
  buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.middleware, this.routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};
var SmartRouter = class {
  name = "SmartRouter";
  routers = [];
  routes = [];
  constructor(init) {
    Object.assign(this, init);
  }
  add(method, path, handler) {
    if (!this.routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.routes) {
      throw new Error("Fatal error");
    }
    const { routers, routes } = this;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        routes.forEach((args) => {
          router.add(...args);
        });
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.routers = [router];
      this.routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.routes || this.routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.routers[0];
  }
};
var Node2 = class {
  methods;
  children;
  patterns;
  order = 0;
  name;
  params = /* @__PURE__ */ Object.create(null);
  constructor(method, handler, children) {
    this.children = children || /* @__PURE__ */ Object.create(null);
    this.methods = [];
    this.name = "";
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0, name: this.name };
      this.methods = [m];
    }
    this.patterns = [];
  }
  insert(method, path, handler) {
    this.name = `${method} ${path}`;
    this.order = ++this.order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      if (Object.keys(curNode.children).includes(p)) {
        curNode = curNode.children[p];
        const pattern2 = getPattern(p);
        if (pattern2) {
          possibleKeys.push(pattern2[1]);
        }
        continue;
      }
      curNode.children[p] = new Node2();
      const pattern = getPattern(p);
      if (pattern) {
        curNode.patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.children[p];
    }
    if (!curNode.methods.length) {
      curNode.methods = [];
    }
    const m = /* @__PURE__ */ Object.create(null);
    const handlerSet = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      name: this.name,
      score: this.order
    };
    m[method] = handlerSet;
    curNode.methods.push(m);
    return curNode;
  }
  gHSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.methods.length; i < len; i++) {
      const m = node.methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = /* @__PURE__ */ Object.create(null);
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSet.possibleKeys.forEach((key2) => {
          const processed = processedSet[handlerSet.name];
          handlerSet.params[key2] = params[key2] && !processed ? params[key2] : nodeParams[key2] ?? params[key2];
          processedSet[handlerSet.name] = true;
        });
        handlerSets.push(handlerSet);
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.params = /* @__PURE__ */ Object.create(null);
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.children[part];
        if (nextNode) {
          nextNode.params = node.params;
          if (isLast === true) {
            if (nextNode.children["*"]) {
              handlerSets.push(
                ...this.gHSets(nextNode.children["*"], method, node.params, /* @__PURE__ */ Object.create(null))
              );
            }
            handlerSets.push(...this.gHSets(nextNode, method, node.params, /* @__PURE__ */ Object.create(null)));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
          const pattern = node.patterns[k];
          const params = { ...node.params };
          if (pattern === "*") {
            const astNode = node.children["*"];
            if (astNode) {
              handlerSets.push(...this.gHSets(astNode, method, node.params, /* @__PURE__ */ Object.create(null)));
              tempNodes.push(astNode);
            }
            continue;
          }
          if (part === "") {
            continue;
          }
          const [key2, name, matcher] = pattern;
          const child = node.children[key2];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp && matcher.test(restPathString)) {
            params[name] = restPathString;
            handlerSets.push(...this.gHSets(child, method, node.params, params));
            continue;
          }
          if (matcher === true || matcher instanceof RegExp && matcher.test(part)) {
            if (typeof key2 === "string") {
              params[name] = part;
              if (isLast === true) {
                handlerSets.push(...this.gHSets(child, method, params, node.params));
                if (child.children["*"]) {
                  handlerSets.push(...this.gHSets(child.children["*"], method, params, node.params));
                }
              } else {
                child.params = params;
                tempNodes.push(child);
              }
            }
          }
        }
      }
      curNodes = tempNodes;
    }
    const results = handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [results.map(({ handler, params }) => [handler, params])];
  }
};
var TrieRouter = class {
  name = "TrieRouter";
  node;
  constructor() {
    this.node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (const p of results) {
        this.node.insert(method, p, handler);
      }
      return;
    }
    this.node.insert(method, path, handler);
  }
  match(method, path) {
    return this.node.search(method, path);
  }
};
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};
var app = new Hono2();
app.get("/", (ctx) => {
  const env = ctx.env;
  const { method, headers } = ctx.req;
  console.log(`Request Method: ${method}`);
  console.log(`Content-Type: ${JSON.stringify(ctx.req)}`);
  const customValue = env ? env.YOUR_OPENAI_API_KEY : "No ENV Key";
  console.log(`Custom ENV value: ${JSON.stringify(env)}`);
  let html = "<h1>Hacker News Posts</h1>";
  html += "<p>Endpoints:</p>";
  html += "<ul>";
  html += "<li><a href='/posts-bulk-create'>Bulk Post Upload</a> (Comments.json)</li>";
  html += "<li><a href='/extension/popup.html'>View Records</a></li>";
  html += "<li><a href='/process-company-records'>Process Company Records</a></li>";
  html += "</ul>";
  return ctx.html(html);
});
app.get("/extension/*", async (ctx) => {
  return await ctx.env.ASSETS.fetch(ctx.req.url);
});
app.get("/extension_fill_form", async (ctx) => {
  console.log("extension_create_form");
  return ctx.json(ctx);
});
var { gpt: gpt2 } = (init_gptroutes(), __toCommonJS(gptroutes_exports));
app.post("/extension_fill_form", async (ctx) => {
  console.log("extension_create_form");
  const params = await ctx.req.json();
  const result = await gpt2.extension_fill_form(params);
  return result;
});
var autoapply_default = app;
var drainBody = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
};
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;
autoapply_default.middleware = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default,
  ...autoapply_default.middleware ?? []
].filter(Boolean);
var middleware_insertion_facade_default = autoapply_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (worker.middleware === void 0 || worker.middleware.length === 0) {
    return worker;
  }
  for (const middleware of worker.middleware) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  };
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = function(type2, init) {
        if (type2 === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
function wrapWorkerEntrypoint(klass) {
  if (klass.middleware === void 0 || klass.middleware.length === 0) {
    return klass;
  }
  for (const middleware of klass.middleware) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type2, init) => {
      if (type2 === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
};
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
var jsonError2 = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-A7Bgxw/middleware-insertion-facade.js
middleware_loader_entry_default.middleware = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2,
  ...middleware_loader_entry_default.middleware ?? []
].filter(Boolean);
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}

// .wrangler/tmp/bundle-A7Bgxw/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (worker.middleware === void 0 || worker.middleware.length === 0) {
    return worker;
  }
  for (const middleware of worker.middleware) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  };
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = function(type2, init) {
        if (type2 === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
function wrapWorkerEntrypoint2(klass) {
  if (klass.middleware === void 0 || klass.middleware.length === 0) {
    return klass;
  }
  for (const middleware of klass.middleware) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type2, init) => {
      if (type2 === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=bundledWorker-0.9901375700771808.js.map
