'use strict';

/**
 * Function generates quasi-unique 12-character string, based on current time and pseudorandom numbers
 */
export function uniqueID() {
    const s1 = Math.random().toString(36).slice(2,6);
    const s2 = Date.now().toString(36).slice(2,6);
    const s3 = Math.random().toString(36).slice(-4);
    return s1 + s2 + s3;
}

/**
 * Function converts numbers from 0 to 100 into corresponding colors,
 * using linear gradient from first color to second color, when value is between 0 and 50,
 * and from second color to third color, when value is between 50 and 100
 * Result is a HEX value
 * @param {Number} value 
 */
export function value2color(value) {
    const bound1 = 'ff6347';
    const bound2 = 'ffd700';
    const bound3 = '32cd32';

    const value1 = 0;
    const value2 = 50;
    const value3 = 100;

    if (value >= value1 && value < value2) {

        let dR = getR(bound2) - getR(bound1);
        let dG = getG(bound2) - getG(bound1);
        let dB = getB(bound2) - getB(bound1);

        let r = getR(bound1) + Math.round(dR * (value - value1) / (value2 - value1));
        let g = getG(bound1) + Math.round(dG * (value - value1) / (value2 - value1));
        let b = getB(bound1) + Math.round(dB * (value - value1) / (value2 - value1));

        return format0d(r.toString(16), 2) + format0d(g.toString(16), 2) + format0d(b.toString(16), 2);
    } else if (value >= value2 && value <= value3) {
        let dR = getR(bound3) - getR(bound2);
        let dG = getG(bound3) - getG(bound2);
        let dB = getB(bound3) - getB(bound2);

        let r = getR(bound2) + Math.round(dR * (value - value2) / (value3 - value2));
        let g = getG(bound2) + Math.round(dG * (value - value2) / (value3 - value2));
        let b = getB(bound2) + Math.round(dB * (value - value2) / (value3 - value2));

        return format0d(r.toString(16), 2) + format0d(g.toString(16), 2) + format0d(b.toString(16), 2);
    } else {
        throw new Error('Expected value in interval [0; 100]');
    }
}

function getR(str) {
    if (!str.length == 6) {
        throw new Error('Expected string of length 6');
    }
    return parseInt(str.slice(0, 2), 16);
}

function getG(str) {
    if (!str.length == 6) {
        throw new Error('Expected string of length 6');
    }
    return parseInt(str.slice(2, 4), 16);
}

function getB(str) {
    if (!str.length == 6) {
        throw new Error('Expected string of length 6');
    }
    return parseInt(str.slice(4, 6), 16);
}

/**
 * Function converts given `number` object to String and adds leading zeros if length condition satisfied
 * @param {any} number 
 * @param {Number} size 
 */
export function format0d(number, size) {
	let s = number + '';
	while (s.length < size)
		s = '0' + s;
	return s;
}

/**
 * Function returns content of given file as array of strings
 * @param {File} file 
 */
export function parse(file) {
	// Always return a Promise
	return new Promise((resolve, reject) => {
	    let content = '';
	    const reader = new FileReader();
	    // Wait till complete
	    reader.onloadend = function(e) {
		    content = e.target.result;
		    const result = content.split(/\r\n|\n/);
		    resolve(result);
	    };
	    // Make sure to handle error states
	    reader.onerror = function(e) {
		    reject(e);
	    };
	    reader.readAsText(file);
	});
}

/**
 * Function removes given characters from the begin and from the end of the given string
 * @param {String} str 
 * @param {String} chars 
 */
export function trimCharacters(str, chars) {
    var re = new RegExp("^[" + chars + "]+|[" + chars + "]+$", "g");
    return str.replace(re,"");
}