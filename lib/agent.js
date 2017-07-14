import 'core-js';

import { spawn } from 'child_process';
import bitclock from 'bitclock';
import once from 'lodash.once';

import logger from './logger';
import getConfig from './config';
import { osStats } from './instrumentation';

function sendIntervalReport() {
	return osStats().then((stats) => {
		const transaction = bitclock.Transaction();
		transaction.metrics(stats);
	});
}

export const registerIntervalReporting = once(config => (
	(function internalRegister() {
		return sendIntervalReport()
			.delay(config.reportingInterval)
			.then(() => internalRegister());
	}())
));

function getChildArgs({ _ }) {
	const cmd = _[2];
	const index = process.argv.indexOf(cmd);
	return process.argv.slice(index);
}

export default function agent(args = {}) {
	const config = bitclock.config(
		getConfig(args.c || args.config)
	);

	/* istanbul ignore else */
	if (config.agent) {
		if (args._) {
			const cmd = process.execPath;
			const childArgs = getChildArgs(args);

			if (/(?:^|\/)node$/.test(childArgs[0])) {
				childArgs.shift();
			}

			const childProcess = spawn(cmd, childArgs, {
				stdio: 'inherit',
				env: {
					...process.env,
					__SECRET_BITCLOCK_CONFIG_JSON: JSON.stringify(config)
				}
			});

			childProcess.on('close', (code) => {
				logger.verbose(`child process exited with code ${code}`);
				process.exit(code);
			});

			registerIntervalReporting(config);
		} else {
			process.env.__SECRET_BITCLOCK_CONFIG_JSON = JSON.stringify(config);
		}
	}
}
