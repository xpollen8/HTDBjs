(async () => {
	const HTDBjs = require('../index');
	const htdb = new HTDBjs(process.cwd(), 0);
	console.log(await htdb.render());
})();
