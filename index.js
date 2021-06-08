// TODO - figure out 'static' and 'macros' persistence
// perhaps add a '!{}' to not evaluate

module.exports = class HTDB {

	#fileToPath = (file = 'site.htdb') => {
		const sanitize = require("sanitize-filename");
		const [ clean ] = file.split(/[;&`'"]/g).join('')	// remove chars we don't want
			.split('/').map(f => sanitize(f))	// send remaining through sanitizer
			.filter(f => f && f !== '..').join('/').split(' '); // and take 1st args on split
		return `htdb/${clean}`;
	}

	constructor(debug = 0) {
		this.debug = debug;
		this.loaded = {};
		this.funcs = {};
		this.defines = {};
	}

	log = (...args) => {
		if (this.debug) {
			console.log('log', ...args);
		}
	}

	error = (...args) => console.error(...args);

	// BEGIN SILLY FUNCTIONS

	morse = (args) => {
		return `MORSE ${args}`;
	}

	itor = (val) => {
		/// https://www.w3resource.com/javascript-exercises/javascript-math-exercise-21.php
		const num = parseInt(val);
		if (typeof num !== 'number') { return '0' }

		const digits = String(+num).split("");
		const key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
			"","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
			"","I","II","III","IV","V","VI","VII","VIII","IX"];
		let roman_num = "";
		let i = 3;
		while (i--) {
			roman_num = (key[+digits.pop() + (i * 10)] || "") + roman_num;
		}
		const res = Array(+digits.join("") + 1).join("M") + roman_num;
		//console.log("ROMAN", { val, res });
		return res;
	}
	// END SILLY FUNCTIONS

	define = ({ name = '', body = '' }) => {
		if (name.length) {
			this.log("DEF", { name, body });
			this.defines[name] = { name, body };
		}
	}

	eval = (args) => {
		this.log("EVAL!", { args, res: eval(new String(args).toString()) });
		return eval(new String(args).toString());
	}

	random = (args) => parseInt(Math.random() * parseInt(args));

	getval = (name) => (this.defines[name] || {}).body;

	callables = [
		'itor',
		'log',
		'define',
		'eval',
		'morse',
		'random',
		'getval',
		'include',
	];

	include = async (file = '') => {
		if (file.length) {
			const evalPath = await this.substitute(file);
			this.log("INCLUDE", { evalPath });
			this.parse(await this.#read(evalPath));
		}
	}

	/*
		TODO:
			ignore literalized '\)' in functionarglist
	 */
	parseDefine = ({ type, body = '' }) => {
		const instr = (str, regex) => (str.substr(0).match(regex) || {}).index;
		const whitespace = (str) => instr(str, /[ \t\n]/);
		const lparen = (str) => instr(str, /\(/);
		const rparen = (str) => instr(str, /\)/);

		const str = body.trim();
		const Lparen = lparen(str);
		const Rparen = rparen(str);
		const Whitespace = whitespace(str);
		if (Whitespace) {
			if (Whitespace > Lparen && Lparen && Rparen) {
				if (Lparen < Rparen) {
					const WhiteAfterParen = (str.substr(Rparen).match(/[ \t\n]/) || {}).index;
					if (WhiteAfterParen) {
						// TODO convert body ${name} that are in the args list
						// to a new form: ${func_arg_name}
						// so that global substitutions do not clobber them
						this.log("FUNC", str);
						const name = str.substr(0, Lparen);
						const args = str.substr(Lparen + 1, Rparen - (Lparen + 1));
						const body = str.substr(Rparen + WhiteAfterParen).trim();
						this.funcs[name] = {
							name, args, body
						}
					} else {
						this.error("SYNTAX ERROR: function", { str, Rparen, WhiteAfterParen });
					}
				} else {
					this.error("SYNTAX ERROR: function", { str });
				}
			} else {
				const name = str.substr(0, Whitespace);
				const body = str.substr(Whitespace).trim();
				if (type === '#include') {
					this.include(body);
				} else {
					this.define({ name, body });
				}
			}
		} else {
			this.define({ name: str, body: '' });
		}
	}

	parse = (str = '') => {
		const splitBy = (text, delimiter) => {
			// https://exceptionshub.com/javascript-and-regex-split-string-and-keep-the-separator.html
			const delimiterPATTERN = '(' + delimiter + ')';
			const delimiterRE = new RegExp(delimiterPATTERN, 'g');

			return text.split(delimiterRE).reduce((chunks, item) => {
				if (item.match(delimiterRE)){
					chunks.push(item)
				} else {
					chunks[chunks.length - 1] += item
				};
				return chunks
			}, [])
		}
		const cleanDefine = (str = '') => {
			const clean = str.split('\n').filter(s => {
				const trimmed = s.trim();
				this.log("S", { s });
				const toss = (trimmed.length <= 1) ||						// keep non-empty lines
				(trimmed.substr(0, 1) === '#') ?	// eat comments
					!(['#define', '#include', '#live'].filter(d => trimmed.substr(0, d.length) === d).length) : 0;
				return !toss;
			}).join('\n');
			const trimmed = clean.trim();
			const [ type = '' ] = trimmed.split(/\s+/g, 1);
			const body = trimmed.substr(type.length).trim();
			return { type, body };
		}
		return splitBy(str, "#define|#include").map(cleanDefine).filter(f => f).forEach(this.parseDefine);
	}

	#read = async (file) => {
		const path = this.#fileToPath(file);
		try {
			const fs = require('fs');
			return fs.readFileSync(path, 'utf-8');
		} catch(e) {
			this.error("HTDB.render", e.message);
		}
	}

	#load = async (path = '', cache = true) => {
		if (!cache || !this.loaded[path]) {
			console.log(`Loading ${path}`);
			let data;
			if (!this.loaded[path]) {
				this.log("NOT YET LOADED", path);
				data = await this.#read(path);
			}
			this.parse(data);
			if (cache) {
				this.loaded[path] = {
					ts: new Date(),
					data
				}
			}
		}
	}

	#setup = async (inPath = '') => {
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
		const db = path.substr(0, lastSlash);
		const page = path.substr(lastSlash + 1);
		const firstLoad = (!Object.keys(this.defines).length);
		if (!firstLoad) {
			this.log("RESET DEFINES");
			this.defines = JSON.parse(JSON.stringify(this.static_defines));
		} else {
			await Promise.all(['static.htdb', 'macros.htdb'].map(this.#load));
			this.log("SET STATIC DEFINES");
			this.static_defines = JSON.parse(JSON.stringify(this.defines));
		}
		await this.#load(`${db}.htdb`, false);
		return { page };
	}

	render = async (path = '') => {
		const { page } = await this.#setup(path);
		if (this.prerender) {
			// hack - all injection of defines after the load
			// by defining a function by the caller.
			this.prerender();
		}
		return await this.substitute((this.defines[page] || {}).body || page);
	}

	substitute = async (body = '') => {
		const substitute_str = async (s, i=0) => {
			let result = '';
			while (i < s.length)  {
				if (s[i] === '$' && s[i + 1] === '{') {
					const [ j, r ] = await substitute_str(s, i+2)
					i = j;
					result += r;
				} else if ( s[i] === '}' && s[i + 1] !== '\\') {
					const isFunc = result.trim().match(/^(.+)\(.*\)$/);	// func()|func(...)
					let lookup;
					if (isFunc && (lookup = this.funcs[isFunc[1]])) {
						// TODO - handle argument substitution
						this.log("FUNC", result);
						const [ j, r ] = await substitute_str(lookup.body)
						return [ i+1, r ];
					} else if ((lookup = this.defines[result])) {
						//this.log("DEF1", result);
						const [ j, r ] = await substitute_str(lookup.body)
						//this.log("BACK", r);
						return [ i+1, r ];
					} else {
						const [ func ] = result.split('(');
						if (func.length) {
							if (this.callables.includes(func)) {
								const args = result.substr(func.length);
								//console.log("CALL", { func, args });
								const res = await this[func](args.substr(1, args.length - 2)) ;
								//console.log("BACK", res);
								//return [ i+1, this[func](args.substr(1, args.length - 2)) ];
								return [ i+1, res ];
							}
						}
						return [ i+1, '${' + result + '}' ];
					}
				} else {
					result += s[i];
					i += 1
				}
			}
			return [ i, result ];
		}
		if (body.includes('#live') || body.includes('${')) {
			return (await substitute_str(body))[1];
		} else {
			return body;
		}
	}
}
