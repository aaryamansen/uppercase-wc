export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","assets/.DS_Store","assets/bags/argentina-2.webp","assets/bags/brazil-2.webp","assets/bags/germany-2.webp","assets/bags/portugal-2.webp","assets/ball.svg","assets/bg2.webp","assets/icon/.DS_Store","assets/keeper-diving.png","assets/keeper-standing.png","assets/logo.svg","assets/pitch.png","assets/whitelogo.png","favicon.svg"]),
	mimeTypes: {".webp":"image/webp",".svg":"image/svg+xml",".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.FyRRWPNp.js",app:"_app/immutable/entry/app.f_I6F823.js",imports:["_app/immutable/entry/start.FyRRWPNp.js","_app/immutable/chunks/1dX-YsKA.js","_app/immutable/chunks/DxDzykZP.js","_app/immutable/entry/app.f_I6F823.js","_app/immutable/chunks/DxDzykZP.js","_app/immutable/chunks/CgSZiwy2.js","_app/immutable/chunks/DSjaFziK.js","_app/immutable/chunks/n0acBTxK.js","_app/immutable/chunks/kx8mKJ09.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/api/tally",
				pattern: /^\/api\/tally\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/tally/_server.ts.js'))
			}
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
