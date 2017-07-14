#!/usr/bin/env node

/* istanbul ignore else */
if (process.env.NODE_ENV !== 'production') {
	require('source-map-support/register');
}

const yargs = require('yargs');

const { _ } = yargs.parse(process.argv);

const { argv } = yargs
	.usage('Usage: $0 [options]')
	.option('config', {
		alias: 'c',
		describe: 'Optional config file path',
		type: 'string'
	})
	.help();

require('./agent').default({ ...argv, _ });
