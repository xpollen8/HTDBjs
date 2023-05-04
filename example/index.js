(async () => {
	const HTDBjs = require('../index');
	const htdb = new HTDBjs(process.cwd(), 0);
	const out = await htdb.export('site');
	//console.log("DEFS", JSON.stringify(out, null, 4));
	console.log(out['index.html']?.body);
})();
