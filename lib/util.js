const parseDbPage = (inPath = '') => {
	let path = inPath;
	// get into 'dir/dir/dir/doc.html' form
	if (!path.length) { path = `site/index.html`; }
	if (!path.includes('/') && path.endsWith('.html')) {
		path = `site/` + path;
	}
	if (!path.endsWith('.html')) {
		path += `/index.html`;
	}
	const lastSlash = path.lastIndexOf('/');
	return { db: path.substr(0, lastSlash), page: path.substr(lastSlash + 1) };
}

const fileToPath = (file = 'site.htdb') => {
	const sanitize = require("sanitize-filename");
	const [ clean ] = file.split(/[;&`'"]/g).join('')	// remove chars we don't want
		.split('/').map(f => sanitize(f))	// send remaining through sanitizer
		.filter(f => f && f !== '..').join('/').split(' '); // and take 1st args on split
	return `htdb/${clean}`;
}

const deLiteralizeCommas = (str = '', match = '\\,') => {
	const reg = new RegExp(match, 'g');
	return str.replace(reg, ',')
}

const splitArgs = (args = '') => {
	const uncommonString = 'GhwRtqo2h'; 	// ug
	const res = args.replace(/\\,/g, uncommonString).split(',').map(s => deLiteralizeCommas(s, uncommonString));
	return res;
}

module.exports = { parseDbPage, fileToPath, deLiteralizeCommas, splitArgs };
