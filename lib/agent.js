import bitclock from 'bitclock';

import getConfig from './config';
import { spawnChildProcess, spawnReportingProcess } from './spawn';

export default function agent(args = {}) {
	const config = bitclock.Config(
		getConfig(args.c || args.config)
	);

	const indices = { ...config.indices, default: [] };

	Object.entries(indices).forEach(([name, keys]) => {
		bitclock.ensureIndex(name, keys);
	});

	if (args._) {
		spawnChildProcess(args, config);
	} else {
		// expose bitclock config to the main process
		process.env.__SECRET_BITCLOCK_CONFIG_JSON = JSON.stringify(config);
		spawnReportingProcess(config);
	}
}
