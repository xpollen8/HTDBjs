const { parseDbPage, fileToPath } = require('./lib/util');
const { morse, itor } = require('./lib/novelty');
const { substr, pretty, linkExternal, index, pluralize, truncAt, replaceText } = require('./lib/strings');

module.exports = class HTDB {

	constructor(root = '', debug = 0) {
		// need root
		this.root = root;
		this.debug = debug;
		this.loaded = {};
		this.funcs = {};
		this.defines = {};
	}

	callables = [
		// class funcs which map to HTDB funcs
		{ name: 'log', func: this.log },
		{ name: 'define', func: this.define },
		{ name: 'undefine', func: (args = '') => delete this[args] },
		{ name: 'eval', func: this.eval },
		{ name: 'getval', func: this.getval },
		{ name: 'include', func: this.include },
		{ name: 'js', func: (args = '') => eval("(async (getval)=>{"+args.replace(/\\/g, '')+"})(this.getval)") },

		// HTDB string funcs
		{ name: 'substr', func: substr },
		{ name: 'pretty', func: pretty },
		{ name: 'linkExternal', func: linkExternal },
		{ name: 'index', func: index },
		{ name: 'pluralize', func: pluralize },
		{ name: 'truncAt', func: truncAt },
		{ name: 'replaceText', func: replaceText },

		/* HTDB to simple JS funcs */
		{ name: 'random', func: (args = '') => parseInt(Math.random() * parseInt(args)) },
		{ name: 'strlen', func: (args = '') => args.length },
		{ name: 'shh', func: () => '' },
		{ name: 'reverse', func: (args = '') => args.split('').reverse().join('') },
		{ name: 'space2underscore', func: (args = '') => args.replace(/ /g, '_') },
		{ name: 'underscore2space', func: (args = '') => args.replace(/_/g, ' ') },
		{ name: 'newline2br', func: (args = '') => args.replace(/\n/g, '<br/>') },
		{ name: 'br2newline', func: (args = '') => args.replace(/\n/g, '<br/>') },
		{ name: 'cleanString', func: (args = '') => args.trim() },
		{ name: 'eatWhitespace', func: (args = '') => args.trimStart() },
		{ name: 'cleanLines', func: (args = '') => args.replace(/\n/, ' ') },
		{ name: 'stripWhitespace', func: (args = '') => args.trimStart() },
		{ name: 'lower', func: (args = '') => args.toLowerCase() },
		{ name: 'upper', func: (args = '') => args.toUpperCase() },
		{ name: 'makeFileSystemSafe', func: (args = '') => args.replace(/[^a-z\d]/ig, '_') },
		{ name: 'prettyNumber', func: (args = '') => new Intl.NumberFormat().format(args) },

		// HTDB novelty funcs
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
			this.log("READING", { root: this.root, full: join(this.root, path) });
			return readFileSync(join(this.root, path), 'utf-8');
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
		const doFunc = async (result) => {
			const [ funcName ] = result.split('(');
			if (funcName.length) {
				const { func } = this.callables.find(c => c.name === funcName) || [];
				if (func) {
					const args = result.substr(funcName.length);
					return await func(args.substr(1, args.length - 2)) ;
				}
			}
			return '${' + result + '}';
		}
		const substitute_str = async (s = '', i=0) => {
			let result = '';
			while (i < s.length)  {
				if (s[i] === '$' && s[i + 1] === '{') {
					const [ j, r ] = await substitute_str(s, i+2)
					i = j;
					result += r;
				} else if (result.substr(0, 3) === 'js(') {
					/*
						special case: ${js(..........)}
						we need to parse all of '..........' w/o any substitions
						so that we can pass it all to our evaluator.
					 */
					let parens = 1;
					let j = i;
					while (parens && j < s.length) {
						/*
							look for the *matching* rparan.
							YES - this fails if there are mis-matched parens
							IN JS strings, so be sure to ALWAYS LITERALIZE
							those in the JS embedded in HTDB script
						 */
						if (s[j] === '(' && s[j - 1] !== '\\') { parens += 1; }
						else if (s[j] === ')' && s[j - 1] !== '\\') { parens -= 1; }
						result += s[j];	// hump along
						j += 1;
					}
					i = j;
					const [ k, r ] = await substitute_str(await doFunc(result));
					return [ i+1, r ];
				} else if ( s[i] === '}' && s[i - 1] !== '\\') {
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
						return [ i+1, await doFunc(result) ];
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
