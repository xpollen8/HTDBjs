const { splitArgs, deLiteralizeCommas } = require('./util');

/* TODO
cleanLines
eatWhitespace
index
mapStr(pattern1, pattern2, string)
nonalnum2underscore
pad([+-]count, [pad_string, ] string)
pluralize(x, singular, plural)
prettyWrap([margin, ]string)
replace(source, searchstring, replacestring)
replaceText()
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
√ strlen
summarizeText()
trunc(maxlen, string)
truncAt(delimiter, string)
√ lower
√ newline2br
√ pretty
√ reverse
√ shh
√ space2underscore
√ substr(start, count, string)
√ upper
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

module.exports = { substr, pretty, linkExternal };
