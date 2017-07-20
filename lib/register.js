/* istanbul ignore else */
if (process.env.NODE_ENV !== 'production') {
	require('source-map-support/register');
}

require('./agent').default();
