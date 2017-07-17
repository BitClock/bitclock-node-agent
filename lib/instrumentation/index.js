import bitclock from 'bitclock';
import once from 'lodash.once';

import osStats from './os';

const config = bitclock.config();

function sendIntervalReport() {
	return osStats().then((stats) => {
		const transaction = bitclock.Transaction();
		transaction.metrics(stats);
	});
}

export const registerIntervalReporting = once(() => (
	config.instrument && (function internalRegister() {
		return sendIntervalReport()
			.delay(config.reportingInterval)
			.then(() => internalRegister());
	}())
));
