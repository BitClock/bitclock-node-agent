const fs = require('fs');
const nock = require('nock');

const config = JSON.parse(process.env.BITCLOCK_TEST_CONFIG);

nock(config.reportingEndpoint)
	.persist()
	.post(`/${config.reportingAPIVersion}/bucket/${config.bucket}/event`)
	.reply(200, (uri) => {
		fs.appendFileSync(`${process.cwd()}/.test_output/${config.bucket}`, `${uri}\n`);
	});
