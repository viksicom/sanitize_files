# sanitize_files

This utility sanitizes log and config files before they are sent to third parties such as support engineers. 

Utility finds sensitive information in given files and replaces it with tokens. It also generates a token map file, for the future matches of replaced sensitive information with its token. The token map file is common for all sanitized files in the corresponding run, but only relevant for that particular set of sanitized files.  There is an option to reuse the token map, but due to the possibility that the value of the token could be guessed or obtained over time, it is not advised as a permanent setting.


Without any options, sanitize will replace only IP addresses, however, it can use any number of regex patterns provided as an optional patterns array (see example below).

The original files are not modified; instead new sanitized files are generated and stored either in the same directory as originals or in a separate folder. The location of sanitized files will depend on whether `outdir` option is specified and on the flags `flatten` and `overwrite` (see more in the `Options` section).

## Usage

Install with npm

```
npm install --save sanitize_files
```

Example: logsSanitize.js
```javascript
var options = {
	patterns: [
	{ 	regex: "((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",
		token_name: "ipaddress"
	},
	{	regex: "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])\\.((test)|(TEST))\\.((com)|(COM))",
		token_name: "dnsaddress"
	}],
	tokenFile: "./tokens.map",
	reuseTokenFile: true,
	whiteList: ["127.0.0.1","0.0.0.0","2.1.0.1"],
	outdir: "./sanitized_files",
	flatten: false,
	overwrite: false,
	logger: {
		format: {date:{show: false},type:{show: true}},
		outputs: [{file:"stdout",types:["error","stats"]}]
	}
}

const sf = require('sanitize_files')
sf.sanitize(options);
```
Edit options as needed, save the `logsSanitize.js` file and execute it (make sure to use the proper path to the log files)

~~~
node logsSanitize.js ../log_files/*.log ../config_files/*
~~~

Review `./tokens.map`

If you see something that should not have been sanitized, consider adding it to the whiteList. For instance, version numbers are often look like an IP address and you may want to keep them untouched.

Review sanitized files in `./sanitized_files` folder. If you still see something sensitive there, consider adding new regex pattern or improving existing one.

If you modified `options`, delete `tokens.map` and re-run `logsSanitize.js`

### Using pipes

If piped input is detected, the output is automatically redirected to stdout and output options are ignored. 

To pipe data through `sanitize`, you can use the same logsSanitize.js from the previous example, also you may want to change it a bit to disable regular console outputs. If you still want to have sanitize statistics and information, add a log file as an option for the logger.

Example: pipeSanitize.js
```javascript
var options = {
	patterns: [
	{ 	regex: "((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",
		token_name: "ipaddress"
	},
	{	regex: "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])\\.test\\.com",
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

const sf = require('./sanitize_files.js')
const sanitize = sf.sanitize
sanitize(options);
```
Edit options as needed, save the `pipeSanitize.js` file and execute it

Unix
~~~
cat ../log_files/my_logs.log | node pipeSanitize.js > ../log_files/my_log.log.sanitized
~~~
or Windows
~~~
type ../log_files/my_logs.log | node pipeSanitize.js > ../log_files/my_log.log.sanitized
~~~

## sanitize( options )
Will sanitize information in files, listed as arguments on command line, or from option `filesList`.

* `options` `{JASON based Object}`

## Options

* `options` The options object is optional
   * `patterns` -- is an array of regex expressions, that should be used to sanitize information in the files. Default: IP regex only
		* `regex` -- a valid regular expression - required.
		* `token_name` -- a prefix for replacement token. Default: 'token'
   * `verbose` --  replaced with logger. See below.
   * `logger` - Using `primitive_logger` module. See https://www.npmjs.com/package/primitive_logger for details about its options. 
		* The following message types are in use: `"error"`, `"stats"`, `"info"`, `"debug"`, `"command_line_files"`.
		* Default: `outputs: [{file:"stdout",types:["error","stats"]}]`
		* If options.logger.instance is set before sanitize is called, that instance will be used instead of creating the new Logger. 
		* To turn off all module outputs, set option `outputs` to empty array: `outputs: []`
   * `tokenFile` -- the filename for the token map. If it is given w/o directory path, the file will be created either in the current directory, or in `outdir` directory (when defined). Default: 'replacement_tokens.map'
   * `reuseTokenFile` -- when true, will import existing tokens from the `tokenFile` and append new tokens to it.
   * `outdir` --  folder to store sanitized files. Default: 'sanitized_files'; If `outdir` is not defined, sanitized files are placed into the same folders with originals, or into the local directory, depending on the `flatten' setting.
   * `flatten` 
		* -- if true, and `outdir` is defined, will place all files flat into `outdir` folder, else the local folder will be used. Default: true. If you expect to sanitize the files with the same name from different folders and `flatten`=true, it is a good idea to set `overwrite` to false.
        * -- if false and `outdir` is defined, will use the original directory structure of the file, as given in the list, and recteate it under output directory. Else (`outdir` is not defined), sanitized files are stored in the same folders with originals.
   * `overwrite` -- if false, will check if the same output file already exists and create a new file with different name. Default: false
   * `filesList` -- when provided, utility will use this list instead of looking for command line arguments. Example: `filesList: ["logs/*.log","confs/*"]`
   * `whiteList` -- an optional array of strings that should not be sanitized. Example: `whiteList: ["127.0.0.1","test.com"]`
   * `whiteListFile` -- a file, containing the `whiteList` array of strings. If both `whiteList` and `whiteListFile` are specified, arrays will be combined. 
   
Example of `whiteListFile`
```
{
	"whiteList": [
		"0.0.0.0",
		"ftp.test.com",
		"127.0.0.1",
		"localhost"
	]
}
```

## Command line patterns

See Glob Primer https://www.npmjs.com/package/glob for command line pattern matching rules.

 **for Windows** - please only use forward-slashes in command line expressions.

