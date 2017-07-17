import Bluebird from 'bluebird';

import { flatten } from '../helpers';
import * as os from './os';

export function osStats() {
	return Bluebird
		.reduce(['cpu', 'memory'], (accumulator, method) => (
			Bluebird.props({
				...accumulator,
				[method]: os[method]() // eslint-disable-line import/namespace
			})
		), {})
		.then(flatten);
}
