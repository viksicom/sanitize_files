const sf = require('./sanitize_files.js')
const sanitize = sf.sanitize


var options = {
	patterns: [
	{ 	regex: "((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",
		token_name: "ipaddress"
	},
	{	regex: "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])\\.((test)|(TEST))\\.((com)|(COM))",
		token_name: "dnsaddress"
	}],
	tokenFile: "../../data_files/tokens.map",
	reuseTokenFile: true,
	whiteList: ["127.0.0.1","0.0.0.0"],
	logger: {
		format: {date:{show: false},type:{show: true}},
		outputs: [
			{file: "stdout",types: ["error"]},
			{file: "pipe.log",types: ["error","info","stats","debug"]},
		]
	}
}

sanitize(options);
