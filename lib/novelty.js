/*
braille
rtoi
imagify
rot13
igpayatinlay
demorse
*/

const morse = (args = '') => {
	const mapping = { 'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.',
		'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
		'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--',
		'X': '-..-', 'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
		'5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
		'.': '.-.-.-', ',': '--..--', '?': '..--..',
	}
	return args.split('').map(c => mapping[c.toUpperCase()]).filter(f => f).join(' ');
}

const itor = (val = '') => {
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

module.exports = { morse, itor };
