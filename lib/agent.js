import 'core-js';

import bitclock from 'bitclock';

import getConfig from './config';
import { spawnChildProcess, spawnReportingProcess } from './spawn';

export default function agent(args = {}) {
	const config = bitclock.config(
		getConfig(args.c || args.config)
	);
	if (args._) {
		spawnChildProcess(args, config);
	} else {
		// expose bitclock config to the main process
		process.env.__SECRET_BITCLOCK_CONFIG_JSON = JSON.stringify(config);
		spawnReportingProcess(config);
	}
}
