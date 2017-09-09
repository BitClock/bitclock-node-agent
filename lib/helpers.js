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
	return (!target || typeof target !== 'object' || Object.keys(target).length === 0)
		? (ref ? { [ref]: target } : target)
		: Object.keys(target).reduce((accumulator, key) => {
			const nodeRef = [ref, key].filter(Boolean).join(delimiter);
			return { ...accumulator, ...flatten(target[key], delimiter, nodeRef) };
		}, {});
}

/**
 * Nests a flattened object and splits keys by delimiter
 */
export function unflatten(target, delimiter = '.') {
	if (Object(target) !== target || Array.isArray(target)) {
		return target;
	}
	const result = {};
	for (const k in target) {
		let value = result;
		let key = '';
		let last = 0;
		let idx = 0;
		while (idx >= 0) {
			idx = k.indexOf(delimiter, last);
			let tmp = k.substring(last, idx !== -1 ? idx : undefined);
			value = value[key] || (value[key] = (/^\d+$/i.test(tmp) ? [] : {}));
			key = tmp;
			last = idx + 1;
		}
		value[key] = target[k];
	}
	return result[''];
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

export function mapRecursive(target, fn, path = []) {
	const node = (Array.isArray(target) ? [] : {});
	Object.entries(target).forEach(([key, value]) => {
		const nodePath = [...path, key];
		node[key] = (value && typeof value === 'object')
			? mapRecursive(value, fn, nodePath)
			: fn(value, nodePath);
	});
	return node;
}

export function get(target, path) {
  return path.reduce((value, key) => (
    (value !== null && value !== undefined) ? value[key] : undefined
  ), target);
}
