import fs from 'fs';
import { spawnSync } from 'child_process';
import glob from 'glob';
import yaml from 'js-yaml';
import Bluebird from 'bluebird';
import bitclock from 'bitclock';
import { expect } from 'chai';
import spawnRequire from 'spawn-require';

import getConfig from '../lib/config';
import agent from '../lib/agent';
import * as helpers from '../lib/helpers';
import * as os from '../lib/instrumentation/os';

Bluebird.promisifyAll(fs);

const noop = () => undefined;
const configFile = '.bitclockrc';
const clientDefaults = bitclock.config();
const testConfig = {
	appId: 'test',
	enable: false
};

function agentConfigDefaults(config) {
	return {
		agent: true,
		...config
	};
}

function spawnSyncProcess(cmd, args, cb = noop) {
	const unwrap = spawnRequire(['babel-register']);
	const result = spawnSync(cmd, args);
	unwrap();
	try {
		cb(result);
	} catch (err) {
		/* eslint-disable no-console */
		console.log(result.stdout.toString());
		console.log(result.stderr.toString());
		/* eslint-enable no-console */
		throw err;
	}
	return result;
}

function spawnTestProcess(args = [], cb) {
	return spawnSyncProcess('node', [
		'lib',
		'--config',
		configFile,
		'./test/bitclock-agent-test-process',
		...args
	], cb);
}

function writeConfig(values = {}, ext = '') {
	let data;
	const configObject = { ...testConfig, ...values };
	switch (ext) {
		case '.js':
			data = `module.exports=${JSON.stringify(configObject)};`;
			break;
		case '.yml':
		case '.yaml':
			data = yaml.safeDump(configObject);
			break;
		default:
			data = JSON.stringify(configObject);
			break;
	}
	return fs.writeFileAsync(`${configFile}${ext}`, data);
}

function cleanConfig() {
	return Bluebird
		.fromCallback(cb => glob(`${configFile}{,*}`, { dot: true }, cb))
		.map(fname => fs.unlinkAsync(fname));
}

after(() => cleanConfig());

describe('config', () => {
	['', '.js', '.json', '.yml', '.yaml'].forEach((ext) => {
		it(`should read config from ${configFile}${ext}`, () => (
			writeConfig(undefined, ext)
				.then(() => getConfig())
				.then((config) => {
					expect(config).to.deep.equal(agentConfigDefaults(testConfig));
				})
				.then(() => cleanConfig())
		));
	});

	it('should accept a relative path to a non-standard named config file', () => (
		writeConfig(undefined, '.other')
			.then(() => getConfig(`${configFile}.other`))
			.then((config) => {
				expect(config).to.deep.equal(agentConfigDefaults(testConfig));
			})
			.then(() => cleanConfig())
	));
});

describe('instrumentation', () => {
	describe('os', () => {
		it('should monitor cpu load', () => (
			os.cpu().then(({ count, utilization, load }) => {
				expect(count).to.be.a('number');
				expect(utilization).to.be.a('number');
				expect(load['1m']).to.be.a('number');
				expect(load['5m']).to.be.a('number');
				expect(load['15m']).to.be.a('number');

				expect(count).to.equal(require('os').cpus().length);
				expect(utilization).to.be.above(0);
				expect(utilization).to.be.below(1);
				expect(load['1m']).to.be.above(0);
				expect(load['5m']).to.be.above(0);
				expect(load['15m']).to.be.above(0);
			})
		));

		it('should monitor memory usage', () => {
			return os.memory().then(({ total, free, utilization, process: processMem }) => {
				expect(total).to.be.a('number');
				expect(free).to.be.a('number');
				expect(utilization).to.be.a('number');
				expect(processMem.rss).to.be.a('number');
				expect(processMem.heapTotal).to.be.a('number');
				expect(processMem.heapUsed).to.be.a('number');
				expect(processMem.external).to.be.a('number');
				expect(processMem.utilization).to.be.a('number');

				expect(utilization).to.be.above(0);
				expect(utilization).to.be.below(1);
				expect(processMem.utilization).to.be.above(0);
				expect(processMem.utilization).to.be.below(1);
				expect(total).to.equal(require('os').totalmem());
				expect(utilization).to.be.above(processMem.utilization);
			});
		});
	});
});

describe('helpers', () => {
	describe('round', () => {
		it('should round a number to precision', () => {
			[0, 1, 2, 3, 4].forEach((i) => {
				const n = 1e6 * Math.PI;
				expect(helpers.round(n, i).toString().split('.')[1] || '').to.have.length(i);
			});
		});
	});

	describe('flatten', () => {
		const fn = () => {};
		const sym = Symbol('symbol');

		const testObject = {
			a: {
				b: {
					c: [{
						d: null,
						i: [[[]]],
						j: 'this is a longer string'
					}, fn, sym]
				}
			},
			e: null,
			f: [{ g: ['h', null, 1, []] }]
		};

		const expected = {
			'a.b.c.0.d': null,
			'a.b.c.0.j': 'this is a longer string',
			'a.b.c.1': fn,
			'a.b.c.2': sym,
			'e': null,
			'f.0.g.0': 'h',
			'f.0.g.1': null,
			'f.0.g.2': 1
		};

		it('should flatten a nested object', () => {
			expect(helpers.flatten(testObject)).to.deep.equal(expected);
		});

		it('should gracefully handle non-object values', () => {
			expect(helpers.flatten()).to.deep.equal({ '': undefined });
			expect(helpers.flatten(null)).to.deep.equal({ '': null });
			expect(helpers.flatten(false)).to.deep.equal({ '': false });
			expect(helpers.flatten(100000)).to.deep.equal({ '': 100000 });
			expect(helpers.flatten(Infinity)).to.deep.equal({ '': Infinity });
		});
	});
});

describe('bitclock agent', () => {
	before(() => writeConfig());

	after(() => cleanConfig());

	it('should read config from the config file at startup', () => {
		agent({ config: configFile });
		expect(
			agentConfigDefaults({ ...clientDefaults, ...testConfig })
		)
		.to.deep.equal(bitclock.config());
	});

	it('should spawn a child process with the correct arguments', () => {
		spawnTestProcess(['--foo', 'bar'], ({ stdout, status }) => {
			const childArgs = JSON.parse(stdout.toString());
			expect(childArgs.foo).to.equal('bar');
			expect(status).to.equal(0);
		});
	});

	it('should exit with the same code as the child process', () => {
		spawnTestProcess(['--action', 'exit', '--code', 10], ({ status }) => {
			expect(status).to.equal(10);
		});
	});

	it('should run with the register hook', () => {
		const configValue = Math.random().toString(16);
		return writeConfig({ configValue }).then(() => {
			spawnSyncProcess('node', [
				'./test/bitclock-agent-test-process',
				'--action',
				'register',
				'--configValue',
				configValue
			], ({ stdout }) => {
				const finalConfig = JSON.parse(stdout.toString());
				expect(finalConfig.configValue).to.equal(configValue);
			});
		});
	});
});
