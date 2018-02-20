"use strict";

exports.createOutputFile = createOutputFile
exports.createTokensFile = createTokensFile
exports.getTokensFilename = getTokensFilename
exports.createDirectory = createDirectory
exports.isOnFileSystem = isOnFileSystem
exports.copyFile = copyFile

const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
/*
const clf = require('command_line_files');
var options = {
	patterns: [
	{ 	regex: "((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",
		token_name: "ipaddress"
	},
	{	regex: "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])\\.test\\.com",
		token_name: "dnsaddress"
	}],
	verbose: true,
	outdir: "test_data/output_files_3",
	flatten: true,
	overwrite: false
}

createDirectory(options.outdir, options);

clf.processEachFile( (filename) => {
	processFile(filename, options);
});

function processFile(filename, opts) {
	var outFile = createOutputFile(filename, opts);
	var patterns = opts.patterns;

	patterns.forEach( (pattern) => {
		var text_out="Applying regex: "+pattern.regex+" with token_name '"+pattern.token_name+"' to file "+filename;
		//console.log(text_out);
		outFile.write(text_out+"\r");
	});
	outFile.close();
}
*/
function createOutputFile(filename, opts) {
	var dirname=path.dirname(filename);
	var basename=path.basename(filename);
	var extention=path.extname(basename);
	var name=path.basename(basename,extention);

	var directory = dirname;
	if(opts && opts.outdir) {
		var outdir = opts.outdir;
		directory = outdir;
		
		if ( opts && !opts.flatten ) {
			while(dirname && dirname.startsWith("../")) {
				dirname=dirname.slice(3);
			}
			//case of windows. Something like c:\...
			dirname=dirname.replace(/[':']/gi, '')
			directory=path.normalize(outdir+"/"+dirname);
			createDirectory(directory, opts);
		}
	} else { // sanitized file placed into the same directory with original
		extention = ".sanitized"+extention;
	}
	var outfilename = getValidFileName(directory, name, extention, opts.overwrite, opts);
	
	opts.logger.instance.info("Creating output file: "+outfilename);
	return createFile(outfilename,'w');
}

function getTokensFilename(filename, opts) {
	var directory=path.dirname(filename);
	var basename=path.basename(filename);
	var extention=path.extname(basename);
	var name=path.basename(basename,extention);
	
	if (!directory) {
		directory=opts.outdir;
	}
	
	var tokensFilename = getValidFileName(directory, name, extention, opts.reuseTokenFile, opts);
	return tokensFilename;
}

function createTokensFile(filename, opts) {
	var directory=path.dirname(filename);
	
	if (!directory) {
		directory=opts.outdir;
	} else {
		createDirectory(directory, opts);
	}
	var flags = 'w';
	if(opts.reuseTokenFile) {
		flags = 'a';
		opts.logger.instance.debug("Opening tokens map file: "+filename);
	} else {
		opts.logger.instance.debug("Creating tokens map file: "+filename);
	}
	return createFile(filename,flags);
}

function getValidFileName(directory, name, extention, overwriteFlag, opts) {
	var outfilename = directory+path.sep+name+extention;
	opts.logger.instance.debug("getValidFileName overwriteFlag="+overwriteFlag+"; checking filename: "+outfilename);
	if ( !overwriteFlag ) {
		var count=0;
		while ( isOnFileSystem(outfilename) ) {
			count++;
			outfilename = directory+path.sep+name+"("+count+")"+extention;
		}
	}
	opts.logger.instance.debug("getValidFileName file to use: "+outfilename);
	return outfilename;
}

function createFile(filename, flags) {
	var outFile = fs.createWriteStream(filename, {
		flags: flags // 'a' means appending (old data will be preserved)
	})

	return outFile;
}

function copyFile(oldPath, newPath) {
    fs.createReadStream(oldPath).pipe(fs.createWriteStream(newPath));
}	

function isOnFileSystem(filename) {
	var exists = true;
	try {
		fs.statSync(filename);
	} catch (statEx) {
		exists = false;
	}
	return exists;
}

function createDirectory(dir, opts) {
	if( dir && !fs.existsSync(dir) ) {
		mkdirp.sync(dir);
		if(fs.existsSync(dir)) {
			opts.logger.instance.info("Successfully created directory "+dir);
		} else {
			// !! some kind of error
		}
	}
}
