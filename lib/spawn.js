import { spawn } from 'child_process';
import once from 'lodash.once';

import logger from './logger';
import { cleanWhitespace } from './helpers';

function getChildArgs({ _ }) {
	const cmd = _[2];
	const index = process.argv.indexOf(cmd);
	return process.argv.slice(index);
}

export const spawnChildProcess = once((args, config) => {
	const childArgs = getChildArgs(args);

	if (/\b(node|iojs)(\.exe)?$/.test(childArgs[0])) {
		childArgs.shift();
	}

	require('./instrumentation').registerIntervalReporting();

	const child = spawn(process.execPath, childArgs, {
		stdio: 'inherit',
		env: {
			...process.env,
			__SECRET_BITCLOCK_CONFIG_JSON: JSON.stringify(config)
		}
	});

	const handleTerminate = once((code, signal) => {
		if (signal) {
			logger.verbose(`child process exited with signal ${signal}`);
		} else {
			logger.verbose(`child process exited with code ${code}`);
		}
		process.exit(code);
	});

	['close', 'exit'].forEach((event) => {
		child.on(event, handleTerminate);
	});
});

export const spawnReportingProcess = once((config) => {
	const args = [
		'--eval',
		cleanWhitespace(`
			if (process.env.BITCLOCK_ENV === 'test') {
				require('babel-register');
				require('${require.resolve('../test/mock-server')}');
			}
			require('${require.resolve('./instrumentation')}').registerIntervalReporting();
		`)
	];

	const child = spawn(process.execPath, args, {
		detached: true,
		stdio: 'ignore',
		env: {
			...process.env,
			__SECRET_BITCLOCK_CONFIG_JSON: JSON.stringify(config)
		}
	});

	const handleTerminate = once(() => child.kill());

	['close', 'exit'].forEach((event) => {
		process.on(event, handleTerminate);
	});

	child.unref();
});
