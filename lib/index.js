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

module.exports = { parseDbPage };
