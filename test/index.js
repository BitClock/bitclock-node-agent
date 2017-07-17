import fs from 'fs';
import { spawnSync } from 'child_process';
import glob from 'glob';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import yaml from 'js-yaml';
import Bluebird from 'bluebird';
import bitclock from 'bitclock';
import { expect } from 'chai';
import spawnRequire from 'spawn-require';
import uuid from 'uuid';

import getConfig from '../lib/config';
import agent from '../lib/agent';
import * as helpers from '../lib/helpers';
import * as os from '../lib/instrumentation/os';

Bluebird.promisifyAll(fs);

const noop = () => undefined;
const configFile = '.bitclockrc';
const testProcessPath = 'test/bitclock-agent-test-process';
const testConfig = Object.freeze({
	...bitclock.config(),
	reportingEndpoint: 'http://localhost:3000',
	reportingInterval: 1,
	bucket: uuid.v4(),
	token: Math.random().toString(16),
	instrument: true,
	silent: true
});

process.env.BITCLOCK_TEST_CONFIG = JSON.stringify(testConfig);

function spawnSyncProcess(cmd, args, cb = noop) {
	const unwrap = spawnRequire(['babel-register']);
	const filteredArgs = args.filter((value, i) => (
		// check lastIndexOf to allow entrypoint to be overridden
		args.lastIndexOf(value) === i
	));
	const result = spawnSync(cmd, filteredArgs);
	unwrap();
	if (result.stderr.length) {
		throw new Error(result.stderr.toString());
	}
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
		'--require',
		'./test/mock-server',
		'lib',
		`--config=${configFile}`,
		testProcessPath,
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

function getReportingCallCount() {
	const output = fs.readFileSync(`.test_output/${testConfig.bucket}`, 'utf-8');
	return output.split('\n').length;
}

before(cb => rimraf('.test_output/*', cb));

before(() => mkdirp('.test_output'));

after(() => cleanConfig());

describe('config', () => {
	['', '.js', '.json', '.yml', '.yaml'].forEach((ext) => {
		it(`should read config from ${configFile}${ext}`, () => (
			writeConfig(undefined, ext)
				.then(() => getConfig())
				.then((config) => {
					expect(config).to.deep.equal(testConfig);
				})
				.then(() => cleanConfig())
		));
	});

	it('should accept a relative path to a non-standard named config file', () => (
		writeConfig(undefined, '.other')
			.then(() => getConfig(`${configFile}.other`))
			.then((config) => {
				expect(config).to.deep.equal(testConfig);
			})
			.then(() => cleanConfig())
	));

	it('should disable the agent if an error occurs', () => (
		cleanConfig()
			.then(() => getConfig())
			.then((config) => {
				expect(config).to.deep.equal({ instrument: false });
			})
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
				expect(utilization).to.be.gte(0);
				expect(utilization).to.be.lte(1);
				expect(load['1m']).to.be.gte(0);
				expect(load['5m']).to.be.gte(0);
				expect(load['15m']).to.be.gte(0);
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

				expect(utilization).to.be.gte(0);
				expect(utilization).to.be.lte(1);
				expect(processMem.utilization).to.be.gte(0);
				expect(processMem.utilization).to.be.lte(1);
				expect(total).to.equal(require('os').totalmem());
				expect(utilization).to.be.above(processMem.utilization);
			});
		});
	});
});

describe('helpers', () => {
	describe('cleanWhitespace', () => {
		it('should replace whitespace sequences with a single space', () => {
			const str = (`
					// tabs
          // spaces
		  	  // mixed
			`);
			expect(helpers.cleanWhitespace(str)).to.equal('// tabs // spaces // mixed');
		});

		it('should gracefully handle nil values', () => {
			expect(helpers.cleanWhitespace(null)).to.equal(null);
			expect(helpers.cleanWhitespace()).to.equal(undefined);
		});
	});

	describe('round', () => {
		it('should round a number to precision', () => {
			[undefined, 1, 2, 3, 4].forEach((i) => {
				const n = 1e6 * Math.PI;
				expect(
					helpers.round(n, i).toString().split('.')[1] || ''
				)
				.to.have.length(i || 0);
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

	afterEach(cb => rimraf('.test_output/*', cb));

	it('should read config from the config file at startup', () => {
		agent({ config: configFile });
		expect(bitclock.config()).to.deep.equal(testConfig);
	});

	it('should spawn a child process with the correct arguments', () => {
		const timeout = 1000;
		spawnTestProcess(['--timeout', timeout], ({ stdout, status }) => {
			const childArgs = JSON.parse(stdout.toString());
			expect(childArgs.timeout).to.equal(timeout);
			expect(status).to.equal(0);
			expect(getReportingCallCount()).to.be.gte(2);
		});
	});

	it('should remove references to the node binary from child args', () => {
		const spawnArgs = ['node', testProcessPath, '--foo=bar'];
		spawnTestProcess(spawnArgs, ({ stdout }) => {
			const childArgs = JSON.parse(stdout.toString());
			expect(childArgs._).to.not.include('node');
		});
	});

	it('should NOT remove references to other binaries from child args', () => {
		const spawnArgs = ['nodemon', testProcessPath];
		expect(() => spawnTestProcess(spawnArgs)).to.throw(/cannot find.+nodemon/i);
	});

	it('should exit with the same code as the child process', () => {
		spawnTestProcess(['--action=exit', '--code=10'], ({ status }) => {
			expect(status).to.equal(10);
		});
	});

	it('should run with the register hook', () => {
		const configValue = Math.random().toString(16);
		return writeConfig({ configValue }).then(() => {
			spawnSyncProcess('node', [
				'--require',
				'./test/mock-server',
				testProcessPath,
				'--action=register',
				'--timeout=4000',
				`--configValue=${configValue}`
			], ({ stdout }) => {
				const finalConfig = JSON.parse(stdout.toString());
				expect(finalConfig.configValue).to.equal(configValue);
				expect(getReportingCallCount()).to.be.gte(2);
			});
		});
	});
});
