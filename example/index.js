(async () => {
	const HTDBjs = require('../index');
	const htdb = new HTDBjs('./site.htdb', 0);
	console.log(await htdb.render());
})();
