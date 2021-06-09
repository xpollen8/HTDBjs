const { splitArgs } = require('./util');

/* TODO
undefine([name], [value])
resolve([variable], [default])
indexOf(table, field, value)
idOf(table, field, value)
inList()
sort(obj_name, sort_field)
makeArray(target, [separator,] string)
forEach()
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
*/

const linkExternal = (args = '') => {
  const [ link, text ] = splitArgs(args);
  return `<a target="new" href="${link}">${text || link}</a>`;
};

module.exports = { linkExternal };
