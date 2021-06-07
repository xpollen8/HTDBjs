// TODO - figure out 'static' and 'macros' persistence
// perhaps add a '!{}' to not evaluate
module.exports = class HTDB {
	constructor(file = './site.htdb', debug = 0) {
		this.file = file;
		this.debug = debug;
		this.loaded = false;
		this.funcs = {};
		this.defines = {};
	}

	log = (...args) => {
		if (this.debug) {
			console.log(...args);
		}
	}

	error = (...args) => console.error(...args);

	define = ({ name, body }) => {
		this.defines[name] = { name, body };
	}

	parseDefine = (inStr = '') => {
		const instr = (str, regex) => (str.substr(0).match(regex) || {}).index;
		const whitespace = (str) => instr(str, /[ \t\n]/);
		const lparen = (str) => instr(str, /\(/);
		const rparen = (str) => instr(str, /\)/);

		const str = inStr.trim();
		const Lparen = lparen(str);
		const Rparen = rparen(str);	// TODO ignore literalized '\)' in arglist (uncommon)
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
						this.error("SYNTAX ERROR: function", str, { Rparen, WhiteAfterParen });
					}
				} else {
					this.error("SYNTAX ERROR: function", str);
				}
			} else {
				this.log("DEF", str);
				const name = str.substr(0, Whitespace);
				const body = str.substr(Whitespace).trim();
				this.define({ name, body });
			}
		} else {
			this.error("SYNTAX ERROR", str);
		}
	}

	parse = async (all = '') => {
		await Promise.all(all.split(/(^|\n)#define/).filter(s => s.length > 1).map(this.parseDefine));
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
			await this.parse(await this.read(this.file));
			this.loaded = true;
		}
	}

	render = async (page = 'index.html') => {
		await this.load();
		this.log("DEFINES", page, this.defines[page] );
		return this.substitute(this.defines[page] || {});
	}

	substitute = ({ name, args, body = '' } = {}) => {
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
						this.log("DEF", result);
						const [ j, r ] = substitute_str(lookup.body)
						return [ i+1, r ];
					} else {
						return [ i+1, '${' + result + '}' ];
					}
				} else {
					result += s[i];
					i += 1
				}
			}
			return [ i, result ];
		}
		return substitute_str(body)[1];
	}
}
