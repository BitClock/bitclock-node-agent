import fs from 'fs';
import path from 'path';
import glob from 'glob';
import yaml from 'js-yaml';

import logger from './logger';

export default function getConfig(rcpath) {
	try {
		let fpath;
		let config;

		if (rcpath) {
			fpath = path.resolve(rcpath);
		} else {
			const [fname] = glob.sync('.bitclockrc{,.@(js|json|yaml|yml)}', { dot: true });
			fpath = path.resolve(process.cwd(), fname);
		}

		logger.verbose(`Loading bitclock config from ${fpath}`);

		switch (path.extname(fpath)) {
			case '.js':
			case '.json':
				config = require(fpath);
				break;
			case '.yml':
			case '.yaml':
				config = yaml.safeLoad(fs.readFileSync(fpath, 'utf-8'));
				break;
			default:
				config = JSON.parse(fs.readFileSync(fpath, 'utf-8'));
				break;
		}

		return { instrument: true, ...config };
	} catch (err) {
		logger.verbose(err);
		logger.warn('Unable to find bitclockrc file. Starting without instrumentation.');
		return { instrument: false };
	}
}
