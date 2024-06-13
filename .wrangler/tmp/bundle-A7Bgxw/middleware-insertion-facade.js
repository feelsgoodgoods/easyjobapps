				import worker, * as OTHER_EXPORTS from "/home/carlos/Documents/GitHub/autoapply/.wrangler/tmp/pages-1CD9fD/bundledWorker-0.9901375700771808.mjs";
				import * as __MIDDLEWARE_0__ from "/home/carlos/Documents/GitHub/autoapply/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "/home/carlos/Documents/GitHub/autoapply/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";
				
				worker.middleware = [
					__MIDDLEWARE_0__.default,__MIDDLEWARE_1__.default,
					...(worker.middleware ?? []),
				].filter(Boolean);
				
				export * from "/home/carlos/Documents/GitHub/autoapply/.wrangler/tmp/pages-1CD9fD/bundledWorker-0.9901375700771808.mjs";
				export default worker;