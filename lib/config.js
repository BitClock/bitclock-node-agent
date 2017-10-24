import fs from 'fs';
import path from 'path';
import glob from 'glob';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import merge from 'deepmerge';
import colors from 'colors/safe';

import logger from './logger';
import { toPrimitive, unflatten } from './helpers';

function resolveConfigFile(rcpath) {
	let fpath;
	if (rcpath) {
		fpath = path.resolve(rcpath);
	} else {
		const [fname] = glob.sync('.bitclockrc{,.@(js|json|yaml|yml)}', { dot: true });
		fpath = path.resolve(process.cwd(), fname);
	}
	return fpath;
}

function readConfigFile(fpath) {
	let config;

	logger.verbose(`Loading bitclock config from ${fpath}`);

	switch (path.extname(fpath)) {
		case '.js':
		case '.json':
			config = require(fpath);
			break;
		case '.yml':
		case '.yaml':
			config = yaml.safeLoad(
				fs.readFileSync(fpath, 'utf-8')
			);
			break;
		default:
			config = unflatten(
				toPrimitive(
					dotenv.parse(fs.readFileSync(fpath))
				)
			);
			break;
	}

	return config;
}

export const withDefaults = config => (
	merge({
		instrument: {
			core: {
				cpu: {
					process: true,
					system: { load: true }
				},
				memory: {
					process: { bytes: true }
				}
			}
		}
	}, config)
);

export default function getConfig(rcpath, chain = new Set()) {
	try {
		const configFile = resolveConfigFile(rcpath);
		let config = readConfigFile(configFile);
		let extendsFile = config.extends;

		chain.add(configFile);

		if (extendsFile) {
			try {
				try {
					extendsFile = require.resolve(extendsFile);
				} catch (_err) {
					extendsFile = path.resolve(extendsFile);
				}

				if (chain.has(extendsFile)) {
					delete config.extends;
					throw new Error(`Circular config chain:${
						['', ...Array.from(chain), colors.yellow(extendsFile)].reduce((acc, f, i) => (
							[...acc, `${i > 1 ? '  => ' : ''}${i === 1 ? colors.yellow(f) : f}`]
						), [])
						.join('\n    ')
					}`);
				} else {
					config = merge(getConfig(extendsFile, chain), config);
				}
			} catch (err) {
				logger.warn(err);
				logger.warn(`Failed to extend ${extendsFile}`);
			}
		}
		return withDefaults(config);
	} catch (err) {
		logger.warn(err);
		logger.warn('Unable to find bitclockrc file. Starting without instrumentation.');
		return withDefaults({ instrument: false });
	}
}
