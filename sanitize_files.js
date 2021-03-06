// Log sanitizing script
//
// This script will find all IP addresses in the log files and replace them with tokens.
// Script uses a HashMap to make sure the same IP addresses are getting the same tokens.
//
"use strict";
module.exports = {
    sanitize: sanitize
};

const dir_path = require('./dir_path.js')
const createOutputFile = dir_path.createOutputFile
const createDirectory = dir_path.createDirectory
const conOut = dir_path.conOut

const tMap = require('./tokensMap.js')
const TokensMap = tMap.TokensMap

const wl = require('./whiteList.js')
const WhiteList = wl.WhiteList

const fs = require('fs');
const os = require("os");
const readline = require('readline');
const clf = require('command_line_files');
const plr = require('primitive_logger');

var default_options = {
	patterns: [
	{ 	regex: "(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])",
		token_name: "ipaddress"
	}],
	tokenFile: "replacement_tokens.map",
	outdir: "sanitized_files",
	flatten: true,
	overwrite: false,
	logger: {
		format: {date:{show: false},type:{show: true}},
		outputs: [{file: "stdout",types: ["error","stats"]}]
	}
}

function sanitize(opts) {
	opts = prepareOptions( opts );

	opts.tokensMapInst = new TokensMap(opts.tokenFile, opts);
	opts.whiteListInst = new WhiteList(opts);
	
	if (process.stdin.isTTY) {	
		opts.logger.instance.debug("non-Piped Path...");

		if (opts.outdir) {
			createDirectory(opts.outdir, opts);
		}

		var clf_options = {logger: opts.logger};
		if ( opts.filesList ) {
			clf_options.filesList = opts.filesList;
		}
		
		clf.processEachFile( clf_options, (filename) => {
			opts.logger.instance.info("Sanitizing file: "+filename);

			const rl = readline.createInterface({
				input: fs.createReadStream(filename),
				crlfDelay: Infinity
			});
			var outStream = createOutputFile(filename, opts)

			sanitizeStream(filename, rl, outStream, opts);
		});
	} else {
		opts.logger.instance.debug("Pipe detected. Output redirected to stdout...");
		const rl = readline.createInterface({
			input: process.stdin,
			crlfDelay: Infinity
		});
		sanitizeStream("stdin", rl, process.stdout, opts)
	}
}

function sanitizeStream(streamId, inStream, outStream, opts) {
	var line_number=0;
	var fileStats = {file: streamId, newTokens: 0, replacedPatterns: 0, whitelistMatches: 0};
	opts.stats.push(fileStats);

	inStream.on('error', function (err) {
		opts.logger.instance.error(streamId +" sanitizeStream failed with error: "+err);
		inStream.close();
		if (!process.stdout.isTTY) {
			outStream.close();
		}
	});

	inStream.on('line', (line) => {
		line_number++;

		opts.patterns.forEach( (pattern) => {
			var pattern_match = line.match(pattern.regex_pattern);
			line=applyLineFilter(line, line_number, pattern_match, pattern.token_name, fileStats, opts);
		});

		outStream.write(line+os.EOL);
	});

	inStream.on('close', () => {
		opts.logger.instance.stats("Completed sanitizing "+line_number +" lines from file "+streamId);
		opts.logger.instance.stats("   "+fileStats.newTokens+" new tokens; "+fileStats.replacedPatterns+" replaced patterns; "+fileStats.whitelistMatches+" whitelist matches");
		inStream.close();
		if( streamId != 'stdin' ) {
			try {
				outStream.close();
			} catch (Err) {
				opts.logger.instance.error("Failed to close outStream for "+streamId+"; "+String(Err));
			}
		}
	});
}

function applyLineFilter(line, line_number, pattern_results, token_prefix, fileStats, opts) {
	if (pattern_results) {
		fileStats.replacedPatterns += pattern_results.length;
		for (var pi=0; pi<pattern_results.length; pi++) {
			var matched_value=pattern_results[pi];
			if ( !opts.whiteListInst.isWhiteListed(matched_value) ) {
				var replace_token = opts.tokensMapInst.getTokenName(matched_value);
				if (! replace_token) {
					//This pattern have not been seen in the file(s) yet.
					fileStats.newTokens++;
					replace_token = opts.tokensMapInst.createToken( matched_value, token_prefix+"_"+line_number );
				}
				//opts.logger.instance.debug("Found on line "+line_number+": "+matched_value+"\t replaced it with token: "+replace_token);
				line = line.replace(matched_value, replace_token);
			} else {
				fileStats.whitelistMatches++;
			}
		}
	}
	return line;
}

function prepareOptions( options ) {
	var opts = options;
	if (!options) {
		opts = JSON.parse(JSON.stringify(default_options));
	} 
	
	opts.stats = [];
	
	if (!opts.patterns) {
		opts.patterns = JSON.parse(JSON.stringify(default_options.patterns));
	}
	
	opts.patterns.forEach( (pattern) => {
		pattern.regex_pattern = new RegExp(pattern.regex, 'g');
		if ( !pattern.token_name ) {
			pattern.token_name = 'token';
		}
	});

	if (!typeof opts.flatten === "boolean" ) {
		opts.flatten = default_options.flatten;
	}

	if (!typeof opts.overwrite === "boolean" ) {
		opts.overwrite = default_options.overwrite;
	} 

	if (!opts.tokenFile) {
		opts.tokenFile = default_options.tokenFile;
	}

	if(!options.logger) {
		opts.logger = {};
	} else {
		opts.logger = options.logger;
	}
	if (!opts.logger.instance) {
		opts.logger.instance = new plr.Logger(opts);
	}
	return opts;
}
