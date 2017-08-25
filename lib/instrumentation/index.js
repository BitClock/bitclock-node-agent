import bitclock from 'bitclock';
import once from 'lodash.once';

import osStats from './os';

const config = bitclock.config();
const defaultCb = () => true;

function sendIntervalReport(pid) {
	return osStats(pid).then((stats) => {
		const transaction = bitclock.Transaction();
		transaction.metrics(stats);
	});
}

export const registerIntervalReporting = once((pid, cb = defaultCb) => (
	config.instrument && (function internalRegister() {
		return sendIntervalReport(pid)
			.delay(config.reportingInterval)
			.then(() => cb() && internalRegister());
	}())
));
