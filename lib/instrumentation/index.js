import Bluebird from 'bluebird';
import { Config, Transaction } from 'bitclock';
import once from 'lodash.once';

import { get, flatten, mapRecursive, unflatten } from '../helpers';
import core from './core';

const { instrument, reportingInterval } = Config();
const registry = {};

export function runIntervalReporting(ctx) {
	return Bluebird.props(
		mapRecursive(registry, fn => fn(ctx))
	)
	.then(unflatten)
	.then(stats => (
		(typeof instrument === 'boolean')
			? (instrument === true ? stats : {})
			: mapRecursive(instrument, (include, nodePath) => (
				include ? get(stats, nodePath) : undefined
			))
	))
	.then(flatten)
	.tap((stats) => {
		const transaction = Transaction();
		transaction.metrics(stats);
	});
}

export const registerIntervalReporting = once((ctx, cb = (() => true)) => (
	instrument && (function internalRegister() {
		return runIntervalReporting(ctx)
			.delay(reportingInterval)
			.then(() => cb() && internalRegister());
	}())
));

export function registerPlugin(plugin) {
	Object.assign(registry, flatten(plugin));
}

registerPlugin({ core });
