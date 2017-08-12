/**
 * Rounds a number to precision
 */
export function round(number, precision = 0) {
	const factor = Math.pow(10, precision);
	return Math.round(number * factor) / factor;
}

/**
 * Flattens a nested object and joins keys by delimiter
 */
export function flatten(target, delimiter = '.', ref = '') {
	return (!target || typeof target !== 'object')
		? { [ref]: target }
		: Object.keys(target).reduce((accumulator, key) => {
			const nodeRef = [ref, key].filter(Boolean).join(delimiter);
			return { ...accumulator, ...flatten(target[key], delimiter, nodeRef) };
		}, {});
}

/**
 * Replaces consecutive whitespace characters with a single space
 */
export function cleanWhitespace(str) {
	return str && str.replace(/(\n|\t|\s{2,})+/gmi, ' ').trim();
}

/**
 * Returns true if target can be coerced to a number, false otherwise
 */
export function isTrueNumber(target) {
	return Boolean(
		(target && typeof target === 'string')
			|| (typeof target === 'number')
	) && !isNaN(Number(target));
}

/**
 * Returns a new object with mapped values
 */
export function mapValues(object, fn) {
	const accumulator = new object.constructor();
	return Object.keys(object).reduce((result, key) => {
		result[key] = fn(object[key], key);
		return result;
	}, accumulator);
}

/**
 * Coerces a string to its true primitive value.
 * If target is an object, it will be deeply
 * cloned, parsed, and returned.
 */
export function toPrimitive(target) {
	switch (true) {
		case (target && typeof target === 'object'):
			return mapValues(target, toPrimitive);

		case ['true', 'false'].indexOf(target) !== -1:
			return (target === 'true');

		case (target === 'null'):
			return null;

		case (target === 'undefined'):
			return undefined;

		case isTrueNumber(target):
			return Number(target);

		default:
			return target;
	}
}
