const fs = require('fs');
const nock = require('nock');

const config = JSON.parse(process.env.BITCLOCK_TEST_CONFIG);

function handle(uri, body) {
	fs.appendFileSync(
		`${process.cwd()}/.test_output/${config.bucket}`,
		`${JSON.stringify({ uri, body })}\n`
	);
}

nock(config.reportingEndpoint)
	.persist()
	.post(`/${config.reportingAPIVersion}/bucket/${config.bucket}/index`)
	.reply(200, handle)
	.post(`/${config.reportingAPIVersion}/bucket/${config.bucket}/event`)
	.reply(200, handle);
