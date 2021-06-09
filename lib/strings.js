const { splitArgs, deLiteralizeCommas } = require('./util');

/* TODO
mapStr(pattern1, pattern2, string)
nonalnum2underscore
pad([+-]count, [pad_string, ] string)
√ pluralize(x, singular, plural)
prettyWrap([margin, ]string)
replace(source, searchstring, replacestring)
√ replaceText()
replacei(source, searchstring, replacestring)
safetrunc(maxlen | string)
stripWhitespace
ternary((expression), true, false)
literalizeCommas()
literalizeQuotes()
deLiteralizeCommas()
filterProgramArguments()
unfilter()
unfilter_unsafe()
filterProgramArguments()
unfilter()
unfilter_unsafe()
unfilter_noDoubleQuotes()
summarizeText()
trunc(maxlen, string)
√ truncAt(delimiter, string)
√ prettyNumber
*/

const substr = (args = '') => {
	const res = splitArgs(args);
	if (res.length === 3) {
		const [ start = 0, limit, str = '' ] = res;
		return str.substr(start, limit);
	} else {
		const [ start = 0, str = '' ] = res;
		return str.substr(start);
	}
}

const pretty = (args = '') => {
	return deLiteralizeCommas(args).split(/\s/g).map((w = '', i) => {
		const word = w.toLowerCase();
		const doit = (i === 0 ||
			!['the','of','a','an','and','nor','but','or','yet','so','at','around','along','for','from','on','to','without'].includes(word));
		return (doit) ? ((word[0] || '').toUpperCase() + word.slice(1)) : word;
	}).join(' ');
}

const linkExternal = (args = '') => {
  const [ link, text ] = splitArgs(args);
  return `<a target="new" href="${link}">${text || link}</a>`;
};

const index = (args = '') => {
  const [ str1 = '', str2 = '' ] = splitArgs(args);
  return str1.indexOf(str2);
};

const pluralize = (str = '') => {
  const args = splitArgs(str);
	if (args.length === 3) {
		const num = parseInt(args[0]);
		if (num === 1) {
			return `${num} ${args[1]}`;
		} else if (num === 0) {
			return `no ${args[2]}`;
		} else {
			return `${num} ${args[2]}`;
		}
	} else {
		return str;
	}
};

const truncAt = (args = '') => {
  const [ delimiter = '', string = '' ] = splitArgs(args);
	const idx = string.indexOf(delimiter);
  return string.substr(0, (idx != -1) ? idx : string.length);
};

const replaceText = (args = '') => {
  const [ pattern1 = '', pattern2 = '', str = '' ] = splitArgs(args);
	const reg = new RegExp(pattern1, 'g');
	return str.replace(reg, pattern2);
};

module.exports = { substr, pretty, linkExternal, index, pluralize, truncAt, replaceText };
