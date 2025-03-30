"use strict";
self["webpackHotUpdateeasyjobapps_chrome_extension"]("popup",{

/***/ "./shared/gpt_all_shared.js":
/*!**********************************!*\
  !*** ./shared/gpt_all_shared.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
console.log('gpt all shared.js');
function refine_yaml(_x) {
  return _refine_yaml.apply(this, arguments);
}
function _refine_yaml() {
  _refine_yaml = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(body) {
    var type, companyid, postid, user_id, editorData, oaikey, _body$error, error, _body$invalidYAML, invalidYAML, resObj, covObj, docObj, fromdb, post, defaultBio, domain, cl, useCompressed, useExpanded, useAdvanced, instructions, templateContent, applicantText, resumeText, jobDescription, bio, system_message, user_messageOne, assistant_messageOne, prompt, assistant_messageResume, user_messageResume, assistant_messageTwo, user_messageTwo, assistant_messageThree, user_messageThree, assistant_messageFour, user_messageFour, assistant_messageFive, user_messageFive, message, yamlHeader, prefix, suffix;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          type = body.type, companyid = body.companyid, postid = body.postid, user_id = body.user_id, editorData = body.editorData, oaikey = body.oaikey, _body$error = body.error, error = _body$error === void 0 ? false : _body$error, _body$invalidYAML = body.invalidYAML, invalidYAML = _body$invalidYAML === void 0 ? '' : _body$invalidYAML;
          console.group('shared:gpt:refine_yaml:', type);

          // Retrieve content from the params
          resObj = editorData.resume;
          covObj = editorData.coverletter;
          docObj = type === 'resume' ? resObj : covObj; // console.log('REFINE YAML GIVEN', {docObj, resObj, covObj})
          // Retrieve content from the database
          _context.next = 7;
          return db.getContent(body);
        case 7:
          fromdb = _context.sent;
          post = fromdb.post, defaultBio = fromdb.defaultBio; // console.log('refine_yam RETRIEVED FROM DB', {fromdb});
          // Retrieve the template
          domain = r_endpoint();
          cl = type === 'coverletter' ? '_cl' : '';
          console.log('DOMAIN GOT:', domain);
          _context.t0 = docObj.template === 'None' || docObj.template === 'Compressed';
          if (!_context.t0) {
            _context.next = 17;
            break;
          }
          _context.next = 16;
          return fetch("".concat(domain, "/compressed").concat(cl, ".txt")).then(function (response) {
            return response.text();
          });
        case 16:
          _context.t0 = _context.sent;
        case 17:
          useCompressed = _context.t0;
          _context.t1 = docObj.template === 'Expanded';
          if (!_context.t1) {
            _context.next = 23;
            break;
          }
          _context.next = 22;
          return fetch("".concat(domain, "/expanded").concat(cl, ".txt")).then(function (response) {
            return response.text();
          });
        case 22:
          _context.t1 = _context.sent;
        case 23:
          useExpanded = _context.t1;
          useAdvanced = docObj.template == 'Advanced' && docObj.latexText;
          instructions = docObj.tailorText || '';
          templateContent = useCompressed || useExpanded || useAdvanced;
          applicantText = docObj.text;
          resumeText = type != 'coverletter' ? false : resObj.text;
          jobDescription = post === null || post === void 0 ? void 0 : post.text;
          bio = defaultBio || ''; // Set up system and user messages for ChatGPT
          // Set up system and user messages for ChatGPT
          system_message = {
            role: 'system',
            content: "\n      You convert <ApplicantText> into YAML ".concat(type, "s using a Pandoc <LatexTemplate> to help inform you of the YAML structure.\n      <ProcessingInstructions>\n        The YAML must be valid and structured so that it may be used in a Pandoc YAML metadata block within an otherwise empty markdown (.md) file which will then be used to populate the <LatexTemplate>.\n        1. The YAML must start and end with \"---\".\n        2. It should be indented and formatted for direct use by Pandoc as metadata.\n        3. Only return valid YAML frontmatter \u2014 no additional text or markdown. \n  \n        Your output will be inserted into a markdown file and used in the following Pandoc command for PDF generation:\n        cmd = ['pandoc', md_filename, '--template', <LatexTemplate>]\n  \n        Strictly return valid YAML format that Pandoc can process.\n      </ProcessingInstructions>\n      You begin once the user gives you their <FinalInstructions>.\n      ")
          };
          user_messageOne = {
            role: 'user',
            content: "Here is my ".concat(type, ": <ApplicantText>").concat(applicantText, "</ApplicantText>")
          };
          assistant_messageOne = {
            role: 'assistant',
            content: "Thank you for providing the ".concat(type, " applicant text.")
          }; // Send to ChatGPT for YAML generation
          prompt = [system_message, user_messageOne, assistant_messageOne];
          if (!!resumeText) {
            assistant_messageResume = {
              role: 'assistant',
              content: "Please provide the resume text."
            };
            user_messageResume = {
              role: 'user',
              content: "<ResumeContent>".concat(resumeText, "</ResumeContent>")
            };
            prompt.push(assistant_messageResume, user_messageResume);
          }
          assistant_messageTwo = {
            role: 'assistant',
            content: "Please provide the job description."
          };
          user_messageTwo = {
            role: 'user',
            content: "<JobDescription>".concat("</JobDescription>")
          };
          assistant_messageThree = {
            role: 'assistant',
            content: "Got it. Now, please provide the applicant's bio."
          };
          user_messageThree = {
            role: 'user',
            content: "<ApplicantsBio>".concat(bio, "</ApplicantsBio>")
          };
          assistant_messageFour = {
            role: 'assistant',
            content: "Thank you! Finally, please provide the Pandoc template."
          };
          user_messageFour = {
            role: 'user',
            content: "<LatexTemplate>".concat(templateContent, "</LatexTemplate>")
          };
          assistant_messageFive = {
            role: 'assistant',
            content: "Fantastic, please provide the <FinalInstructions> for the YAML conversion to begin."
          };
          user_messageFive = {
            role: 'user',
            content: "<FinalInstructions>\n        - Do not confuse the job description as a part of the resume.\n        - Use the job applicants <ResumeText> as a reference, customizing it for the <JobDescription>.\n        - Retain the tone and writing style of the original <ResumeText>, and text where possible.\n        ".concat(instructions, "</FinalInstructions>")
          }; // If there's an error, augment the prompt with error message and invalid YAML
          if (error) {
            system_message.content += "\n      The previous YAML submission resulted in a Pandoc processing error.\n      Error: ".concat(error, "\n  \n      Invalid YAML that caused the error:\n      ").concat(invalidYAML, "\n  \n      Please review the above invalid YAML and the error message to fix the issue, and provide a corrected version that is valid for Pandoc processing.\n      ");
          }
          prompt.push(assistant_messageTwo, user_messageTwo, assistant_messageThree, user_messageThree, assistant_messageFour, user_messageFour, assistant_messageFive, user_messageFive);
          _context.next = 48;
          return callChatGPT(prompt, 'gpt-4o-mini', 4096, false, true, user_id, oaikey);
        case 48:
          message = _context.sent;
          if (message) {
            _context.next = 51;
            break;
          }
          return _context.abrupt("return", {
            status: 'error',
            message: 'Error Calling ChatGPT',
            data: {
              type: 'noGptKey',
              error: 'This action requires ChatGPT. No credits or keys found. Please Login to buy credits.'
            }
          });
        case 51:
          console.log('refine_yaml:END', {
            message: message
          });
          yamlHeader = message.trim(); //  resumeText, instructions, templateContent, applicantTex, bio, postDescription: post.text,
          // console.log('SHARED: GENERATE RESUME WITH:', { templateContent });
          // let isBrowserContext = typeof window !== 'undefined';
          // if (isBrowserContext) {
          //   console.log('Running in a browser context');
          //   console.log({
          //     type,
          //     resumeText,
          //     resObj
          //   })
          // }
          // Strip any extra formatting around the YAML returned by ChatGPTprefix = '```'
          prefix = false;
          prefix = 'yaml';
          if (yamlHeader.startsWith(prefix)) {
            yamlHeader = yamlHeader.slice(prefix.length).trim();
          }
          prefix = '```';
          if (yamlHeader.startsWith(prefix)) {
            yamlHeader = yamlHeader.slice(prefix.length).trim();
          }
          prefix = 'yaml';
          if (yamlHeader.startsWith(prefix)) {
            yamlHeader = yamlHeader.slice(prefix.length).trim();
          }
          suffix = '```';
          if (yamlHeader.endsWith(suffix)) {
            yamlHeader = yamlHeader.slice(0, -suffix.length).trim();
          }

          // console.log('Generated YAML:', yamlHeader);
          console.groupEnd();
          return _context.abrupt("return", {
            status: 'success',
            data: {
              type: type,
              company_id: companyid,
              post_id: postid,
              yamlContent: yamlHeader
            }
          });
        case 64:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _refine_yaml.apply(this, arguments);
}
console.log('gpt all shared.js:refine_yaml');

// This protects node.js modules from breaking when loading this
var isContentScript = typeof window != 'undefined';
if (isContentScript) {
  window.refine_yaml = refine_yaml;
} else {
  console.log('use refine_yaml as a module');
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      refine_yaml: refine_yaml
    };
  }
}

// this will break content.js scripts as they are not modules
// export { refine_yaml }

/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("2ac0e04ffe0effb21d7e")
/******/ })();
/******/ 
/******/ }
);
//# sourceMappingURL=popup.05b0d7ab2eebe18ab706.hot-update.js.map