// TODO - figure out 'static' and 'macros' persistence
// perhaps add a '!{}' to not evaluate
// now that classes are callable in script, should probably
module.exports = class HTDB {
	constructor(file = 'site.htdb', debug = 0) {
		this.file = `./htdb/${file}`;
		this.debug = debug;
		this.loaded = false;
		this.funcs = {};
		this.defines = {};
	}

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
		this.log("EVAL!", args);
		return args;
	}

	morse = (args) => {
		return `MORSE ${args}`;
	}

	random = (args) => parseInt(Math.random() * parseInt(args));

	getval = (name) => (this.defines[name] || {}).body;

	callables = [
		'log',
		'define',
		'eval',
		'morse',
		'random',
		'getval',
	];

	include = (file = '') => {
		if (file.length) {
			this.log("INCLUDE", { file: this.eval(file) });
			//this.defines[name] = { name, body };
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
			this.error("SYNTAX ERROR", { str });
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

	read = async (file) => {
		try {
			const fs = require('fs');
			return fs.readFileSync(file, 'utf-8');
		} catch(e) {
			this.error("HTDB.render", e.message);
		}
	}

	load = async () => {
		if (!this.loaded) {
			this.parse(await this.read(this.file));
			this.loaded = true;
		}
	}

	render = async (page = 'index.html') => {
		if (!Object.keys(this.defines).length) {
			this.log("Render is doing load..");
			await this.load();
		}
		this.log("RENDER", page, this.defines[page] );
		return this.substitute((this.defines[page] || {}).body || page);
	}

	substitute = (body = '') => {
		const substitute_str = (s, i=0) => {
			let result = '';
			while (i < s.length)  {
				if (s[i] === '$' && s[i + 1] === '{') {
					const [ j, r ] = substitute_str(s, i+2)
					i = j;
					result += r;
				} else if ( s[i] === '}' && s[i + 1] !== '\\') {
					const isFunc = result.trim().match(/^(.+)\(.*\)$/);	// func()|func(...)
					let lookup;
					if (isFunc && (lookup = this.funcs[isFunc[1]])) {
						// TODO - handle argument substitution
						this.log("FUNC", result);
						const [ j, r ] = substitute_str(lookup.body)
						return [ i+1, r ];
					} else if ((lookup = this.defines[result])) {
						this.log("DEF1", result);
						const [ j, r ] = substitute_str(lookup.body)
						return [ i+1, r ];
					} else {
						const [ func ] = result.split('(');
						if (func.length) {
							if (this.callables.includes(func)) {
								const args = result.substr(func.length);
								//console.log("CALL", { func, args });
								return [ i+1, this[func](args.substr(1, args.length - 2)) ];
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
			return substitute_str(body)[1];
		} else {
			return body;
		}
	}
}
