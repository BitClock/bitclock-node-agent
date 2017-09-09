import os from 'os';
import assert from 'assert';
import Bluebird from 'bluebird';
import usage from 'pidusage';
import memoize from 'lodash.memoize';
import throttle from 'lodash.throttle';
import once from 'lodash.once';

import { round } from '../helpers';

const totalMem = once(() => os.totalmem());

const cpuCount = once(() => os.cpus().length);

const getProcessStatsFn = memoize(pid => (
	throttle(() => (
		Bluebird.fromCallback(cb => (
			usage.stat(pid, cb)
		))
	), 1000)
));

function memoryUtilization(pid) {
	return Bluebird
		.try(getProcessStatsFn(pid))
		.then(({ memory }) => memory);
}

function cpuUtilization(pid) {
	return Bluebird
		.try(getProcessStatsFn(pid))
		.then(({ cpu }) => cpu);
}

function cpuLoadavg() {
	const periods = ['1m', '5m', '15m'];
	return os.loadavg().reduce((accumulator, value, i) => (
		{ ...accumulator, [periods[i]]: round(value, 4) }
	), {});
}

export function memory({ pid }) {
	return Bluebird.try(() => {
		assert(pid, 'Missing pid');
		const total = totalMem();
		const free = os.freemem();
		return memoryUtilization(pid).then(bytes => ({
			system: {
				total,
				free,
				utilization: round(1 - free / total, 4)
			},
			process: {
				bytes,
				utilization: round(bytes / total, 4)
			}
		}));
	});
}

export function cpu({ pid }) {
	return Bluebird.try(() => {
		assert(pid, 'Missing pid');
		return cpuUtilization(pid).then(pct => ({
			system: {
				count: cpuCount(),
				load: cpuLoadavg()
			},
			process: {
				utilization: pct
			}
		}));
	});
}

export default { memory, cpu };
