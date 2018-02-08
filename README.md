# sanitize_files

This utility sanitizes log and config files before they are sent to third parties such as support engineers. 

Utility finds sensitive information in files and replaces it with tokens. It also generates a token map file, for the future matches of replaced sensitive information with its token.  

By default, sanitize will replace only IP addresses, however, it can use any number of regex patterns provided as an optional patterns array.

The original files are not modified; instead new sanitized files are generated and stored either in the same directory as originals or in a separate folder. The location of sanitized files will depend on whether `outdir` option is specified and on the flags `flatten` and `overwrite` (see more in the `Options` section).

The token map file is common for all sanitized files in the corresponding run, but only relevant for that particular set of sanitized files.  There is an option to reuse the token map, but due to the possibility that the value of the token could be guessed or obtained over time, it is not advised as a permanent setting.


## Usage

Install with npm

```
npm install --save sanitize_files
```

Example: logsSanitize.js
```javascript
const sf = require('sanitize_files')
const sanitize = sf.sanitize

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
	verbose: false,
	outdir: "./sanitized_files",
	flatten: false,
	overwrite: true
}

sanitize(options);
```
Edit options as needed, save the `logsSanitize.js` file and execute it (make sure to use the proper path to the log files)

~~~
node logsSanitize.js ../log_files/*.log ../config_files/*
~~~

Review `./tokens.map`

If you see something that should not have been sanitized, consider adding it to the whiteList. For instance, version numbers are often look like an IP address and you may want to keep them untouched.

Review sanitized files in `./sanitized_files` folder. If you still see something sensitive there, consider adding new regex pattern or improving existing one.

If you modified `options`, delete `tokens.map` and re-run `logsSanitize.js`

## sanitize( options )
Will sanitize information in files, listed as arguments on command line, or from option `filesList`.

* `options` `{JASON based Object}`


## Options

* `options` The options object is optional
   * `patterns` -- is an array of regex expressions, that should be used to sanitize information in the files. Default: IP regex only
		* `regex` -- a valid regular expression - required.
		* `token_name` -- a prefix for replacement token. Default: 'token'
   * `verbose` --  if true, will print to console some extra information. Default: false
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

