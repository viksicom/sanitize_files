// Log sanitizing script
//
// This script will find all IP addresses in the log files and replace them with tokens.
// Script uses a HashMap to make sure the same IP addresses are getting the same tokens.
//
"use strict";
module.exports = {
    sanitize: sanitize
};

/*
if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " list of files fo sanitize");
    process.exit(-1);
}
*/
const dir_path = require('./dir_path.js')
const createOutputFile = dir_path.createOutputFile
const createDirectory = dir_path.createDirectory
const conOut = dir_path.conOut

const tMap = require('./tokensMap.js')
const TokensMap = tMap.TokensMap

const wl = require('./whiteList.js')
const WhiteList = wl.WhiteList

const fs = require('fs');
const readline = require('readline');
const clf = require('command_line_files');

var default_options = {
	patterns: [
	{ 	regex: "(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])",
		token_name: "ipaddress"
	}],
	tokenFile: "replacement_tokens.map",
	verbose: false,
	outdir: "sanitized_files",
	flatten: true,
	overwrite: false
}

function sanitize(opts) {
	opts = prepareOptions( opts );

	if (opts.outdir) {
		createDirectory(opts.outdir, opts);
	}

	opts.tokensMapInst = new TokensMap(opts.tokenFile, opts);
	opts.whiteListInst = new WhiteList(opts);
	
	var clf_options = {"verbose": opts.verbose};
	if ( opts.filesList ) {
		clf_options.filesList = opts.filesList;
	}
	
	clf.processEachFile( clf_options, (filename) => {
		console.log("Sanitizing file: "+filename);
		sanitizeFile(filename, opts);
	});
}

function sanitizeFile(filename, opts) {
	var line_number=0;
	var fileStats = {file: filename, newTokens: 0, replacedPatterns: 0, whitelistMatches: 0};
	opts.stats.push(fileStats);

	var outFile = createOutputFile(filename, opts)
	
	const rl = readline.createInterface({
		input: fs.createReadStream(filename),
		crlfDelay: Infinity
	});

	rl.on('error', function (err) {
		console.log(filename +" sanitizeFile failed with error: "+err);
		rl.close();
		outFile.close();
	});
	
	rl.on('line', (line) => {
		line_number++;

		opts.patterns.forEach( (pattern) => {
			var pattern_match = line.match(pattern.regex_pattern);
			line=applyLineFilter(line, line_number, pattern_match, pattern.token_name, fileStats, opts);
		});

		outFile.write(line+"\r");
	});

	rl.on('close', function () {
		console.log("Completed sanitizing "+line_number +" lines from file "+filename);
		console.log("   "+fileStats.newTokens+" new tokens; "+fileStats.replacedPatterns+" replaced patterns; "+fileStats.whitelistMatches+" whitelist matches");
		rl.close();
		outFile.close();
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
				//console.log("Found on line "+line_number+": "+matched_value+"\t replaced it with token: "+replace_token);
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
		opts = default_options;
	} 
	
	opts.stats = [];
	
	if (!opts.patterns) {
		opts.patterns = default_options.patterns;
	}
	
	opts.patterns.forEach( (pattern) => {
		pattern.regex_pattern = new RegExp(pattern.regex, 'g');
		if ( !pattern.token_name ) {
			pattern.token_name = 'token';
		}
	});

	if (!typeof opts.verbose === "boolean" ) {
		opts.verbose = default_options.verbose;
	} 
	
	if (!typeof opts.flatten === "boolean" ) {
		opts.flatten = default_options.flatten;
	}

	if (!typeof opts.overwrite === "boolean" ) {
		opts.overwrite = default_options.overwrite;
	} 

	if (!opts.tokenFile) {
		opts.tokenFile = default_options.tokenFile;
	}

	return opts;
}
