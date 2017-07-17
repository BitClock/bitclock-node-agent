export function round(number, precision = 0) {
	const factor = Math.pow(10, precision);
	return Math.round(number * factor) / factor;
}

export function flatten(target, delimiter = '.', refPath = '') {
	return (!target || typeof target !== 'object')
		? { [refPath]: target }
		: Object.keys(target).reduce((accumulator, key) => {
			const nodePath = [refPath, key].filter(Boolean).join(delimiter);
			return { ...accumulator, ...flatten(target[key], delimiter, nodePath) };
		}, {});
}
