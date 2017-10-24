import colors from 'colors/safe';
import winston from 'winston';
import padStart from 'lodash.padstart';

/* istanbul ignore next */
function timestamp() {
	const date = new Date();
	const h = padStart(String(date.getHours()), 2, '0');
	const m = padStart(String(date.getMinutes()), 2, '0');
	const s = padStart(String(date.getSeconds()), 2, '0');
	return colors.gray(`[${h}:${m}:${s}]`);
}

/* istanbul ignore next */
export function Logger(config) {
	const logger = new winston.Logger();
	return logger.add(winston.transports.Console, {
		level: 'warn',
		colorize: true,
		prettyPrint: true,
		depth: 2,
		timestamp,
		...config
	});
}

export default Logger({
	label: 'bitclock-agent',
	level: process.env.BITCLOCK_LOG_LEVEL
});
