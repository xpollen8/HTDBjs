const DB = require('mywrap');

let db;

/*
#define confDatabase[1]->name   master
#define confDatabase[1]->driver   mysql
#define confDatabase[1]->database htdb
#define confDatabase[1]->username htdb
#define confDatabase[1]->password HTDBr0x!
#define confDatabase[1]->host   localhost
#define confDatabase[1]->port   3306
*/
/*
	functions here can only be run server-side
 */
const sql = async (getval, setval, args) => {
	if (!db) {
		console.log("DB", getval('confDatabase[1]->name'));
		const config = {
			host: getval('confDatabase[1]->host'),
			username: getval('confDatabase[1]->username'),
			user: getval('confDatabase[1]->username'),
			database: getval('confDatabase[1]->database'),
			password: getval('confDatabase[1]->password'),
			waitForConnection: true,
			connectionLimit: 100,
			queueLimit: 0,
		}
		db = new DB(config);
		await db.start();
	}
	let [ prefix, query = args ] = args.split(':');
	if (prefix === args) {
		prefix = 'sql';
	}
	// clear any old values
	/*
	const numOld = parseInt(getval(`${prefix}->numResults`)) || 0;
	for (var i = 0 ; i < numOld ; i++) {
			if (i === 0) {
				setval(`${prefix}->${k}`, obj[k]);
			}
			setval(`${prefix}[${i}]->${k}`, obj[k]);
	}
	*/
	console.log("SQL", { prefix, query });
	const rows = await db.db.query(query);
	setval(prefix, rows.map(r => JSON.parse(JSON.stringify(r))));
	/*
	rows.forEach((r, i) => {
		const obj = JSON.parse(JSON.stringify(r));
		Object.keys(obj).forEach(k => {
			if (i === 0) {
				setval(`${prefix}->${k}`, obj[k]);
			}
			setval(`${prefix}[${i}]->${k}`, obj[k]);
		});
	});
	*/
	setval(`${prefix}->numResults`, rows.length);

	return '';
};

module.exports = { sql };
