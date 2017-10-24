import yargs from 'yargs';

const argv = yargs.parse(process.argv);

function run(cb) {
	setTimeout(cb, argv.timeout);
}

switch (argv.action) {
	case 'exit':
		run(() => process.exit(argv.code));
		break;

	case 'token':
		run(() => {
			const { token } = require('bitclock').Config();
			// eslint-disable-next-line no-console
			console.log(JSON.stringify({ token }));
		});
		break;

	case 'register':
		require('../../lib/register');
		run(() => {
			// eslint-disable-next-line no-console
			console.log(JSON.stringify(require('bitclock').Config()));
		});
		break;

	case 'register/token':
		require('../../lib/register');
		run(() => {
			const { token } = require('bitclock').Config();
			// eslint-disable-next-line no-console
			console.log(JSON.stringify({ token }));
		});
		break;

	case 'register/orphan':
		// eslint-disable-next-line no-console
		console.log(JSON.stringify({ pid: process.pid }));
		process.once('beforeExit', () => {
			require('../../lib/register');
			process.removeAllListeners('exit');
			process.removeAllListeners('close');
		});
		break;

	default:
		run(() => (
			// eslint-disable-next-line no-console
			console.log(JSON.stringify(argv))
		));
		break;
}
