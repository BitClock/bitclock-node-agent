import { spawn } from 'child_process';
import once from 'lodash.once';
import { minify } from 'uglify-js';

import logger from './logger';

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

	const child = spawn(process.execPath, childArgs, {
		stdio: 'inherit',
		env: {
			...process.env,
			__SECRET_BITCLOCK_CONFIG_JSON: JSON.stringify(config)
		}
	});

	require('./instrumentation').registerIntervalReporting({
		pid: child.pid
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
	const { code } = minify(`
		if (process.env.BITCLOCK_ENV === 'test') {
			try {
				require('babel-register');
				require(require('path').resolve('${__dirname}', '../test/mock-server'));
			} catch (err) {/* noop */}
		}
		var isRunning = require('is-running');
		var instrumentationPath = '${require.resolve('./instrumentation')}';
		var registerIntervalReporting = require(instrumentationPath).registerIntervalReporting;
		var ctx = { pid: ${process.pid} };
		registerIntervalReporting(ctx, function() {
			return isRunning(ctx.pid);
		});
	`);

	const child = spawn(process.execPath, ['--eval', code], {
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
