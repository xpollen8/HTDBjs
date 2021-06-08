const { parseDbPage, fileToPath } = require('./lib');
const { morse, itor } = require('./lib/novelty');

module.exports = class HTDB {

	constructor(debug = 0) {
		this.debug = debug;
		this.loaded = {};
		this.funcs = {};
		this.defines = {};
	}

	callables = [
		{ name: 'log', func: this.log },
		{ name: 'define', func: this.define },
		{ name: 'eval', func: this.eval },
		{ name: 'random', func: this.random },
		{ name: 'getval', func: this.getval },
		{ name: 'include', func: this.include },

		{ name: 'morse', func: morse },
		{ name: 'itor', func: itor },
	];

	log = (...args) => {
		if (this.debug) {
			console.log('log', ...args);
		}
	}

	error = (...args) => console.error(...args);

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
		const path = fileToPath(file);
		try {
			const { readFileSync } = require('fs');
			const { join } = require('path')
			return readFileSync(join(__dirname, path), 'utf-8');
		} catch(e) {
			this.error("HTDB.render", e.message);
		}
	}

	#load = async (path = '', cache = true) => {
		let data;
		if (!this.loaded[path]) {
			console.log(`Loading ${path}`);
			this.log("NOT YET LOADED", path);
			data = await this.#read(path);
			this.loaded[path] = {
				ts: new Date(),
				data
			}
		} else {
			this.log("RE-USE LOADED", path);
			data = this.loaded[path].data;
		}
		this.parse(data);
	}

	#setup = async (inPath = '') => {
		const { db, page } = parseDbPage(inPath);
		const firstLoad = (!Object.keys(this.defines).length);
		if (firstLoad) {
			await Promise.all(['static.htdb', 'macros.htdb'].map(this.#load));
			this.log("SET STATIC DEFINES");
			this.static_defines = JSON.parse(JSON.stringify(this.defines));
		} else {
			this.log("RESET DEFINES");
			this.defines = JSON.parse(JSON.stringify(this.static_defines));
		}
		await this.#load(`${db}.htdb`, true);
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
						const [ funcName ] = result.split('(');
						if (funcName.length) {
							const { func } = this.callables.find(c => c.name === funcName) || [];
							if (func) {
								const useFunc = this[func] || func.apply(func);
								const args = result.substr(funcName.length);
								this.log("CALL", { funcName, args });
								const res = await func(args.substr(1, args.length - 2)) ;
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
