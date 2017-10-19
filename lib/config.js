import fs from 'fs';
import path from 'path';
import glob from 'glob';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import merge from 'deepmerge';

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

export default function getConfig(rcpath) {
	try {
		const configFile = resolveConfigFile(rcpath);
		let config = readConfigFile(configFile);
		let extendsFile = config.extends;
		if (extendsFile) {
			try {
				try {
					extendsFile = require.resolve(extendsFile);
				} catch (_err) {
					extendsFile = path.resolve(extendsFile);
				}

				if (configFile === extendsFile) {
					throw new Error('A config file cannot extend itself');
				} else {
					config = Object.assign(readConfigFile(extendsFile), config);
				}
			} catch (err) {
				logger.verbose(err);
				logger.warn(`Failed to extend ${config.extends}`);
			}
		}
		return withDefaults(config);
	} catch (err) {
		logger.verbose(err);
		logger.warn('Unable to find bitclockrc file. Starting without instrumentation.');
		return withDefaults({ instrument: false });
	}
}
