(async () => {
	const HTDBjs = require('../index');
	const htdb = new HTDBjs(0);
	console.log(await htdb.render());
})();
