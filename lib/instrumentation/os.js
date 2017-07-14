import os from 'os';
import once from 'lodash.once';
import Bluebird from 'bluebird';

import { round } from '../helpers';

const totalMem = once(() => os.totalmem());

export function memory() {
	return Bluebird.try(() => {
		const total = totalMem();
		const free = os.freemem();
		const { rss, ...other } = process.memoryUsage();
		return Bluebird.props({
			total,
			free,
			utilization: round(1 - free / total, 4),
			process: {
				utilization: round(rss / (total - free), 4),
				rss,
				...other,
			}
		});
	});
}

const cpuCount = once(() => os.cpus().length);

function cpuLoadavg() {
	const periods = ['1m', '5m', '15m'];
	return os.loadavg().reduce((accumulator, value, i) => (
		{ ...accumulator, [periods[i]]: round(value, 4) }
	), {});
}

function cpuTimes() {
	const cpus = os.cpus();
	let totalIdle = 0;
	let totalTick = 0;
	for (const { times } of cpus) {
		for (const type in times) {
			totalTick += times[type];
		}
		totalIdle += times.idle;
	}
	const idle = totalIdle / cpus.length;
	const total = totalTick / cpus.length;
	return { idle, total };
}

function cpuUtilization() {
	const start = cpuTimes();
	return Bluebird.delay(100).then(() => {
		const end = cpuTimes();
		const idleDifference = end.idle - start.idle;
		const totalDifference = end.total - start.total;
		return round(1 - idleDifference / totalDifference, 4);
	});
}

export function cpu() {
	return Bluebird.try(() => (
		Bluebird.props({
			count: cpuCount(),
			load: cpuLoadavg(),
			utilization: cpuUtilization()
		})
	));
}
