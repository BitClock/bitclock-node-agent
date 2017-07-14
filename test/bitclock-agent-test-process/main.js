const yargs = require('yargs');

const argv = yargs.parse(process.argv);

switch (argv.action) {
	case 'exit':
		process.exit(argv.code);
		break;

	case 'register':
		require('../../lib/register');
		// eslint-disable-next-line no-console
		console.log(JSON.stringify(require('bitclock').config()));
		break;

	default:
		// eslint-disable-next-line no-console
		console.log(JSON.stringify(argv));
		break;
}
