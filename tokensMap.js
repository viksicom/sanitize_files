"use strict";
exports.TokensMap = TokensMap

const dir_path = require('./dir_path.js')
const createTokensFile=dir_path.createTokensFile
const isOnFileSystem=dir_path.isOnFileSystem
const getTokensFilename=dir_path.getTokensFilename
const copyFile=dir_path.copyFile

const fs = require('fs');
const HashMap = require('hashmap');
const locks = require('locks');

function TokensMap(filename, options, hashMap) {
	if ( !hashMap ) {
		this.hashMap = new HashMap();
	} else {
		this.hashMap = hashMap;
	}
	this.tokensFileName = getTokensFilename(filename, options);
	this.opts = options;
	this.logger = options.logger.instance;
	this.importedTokens = 0;
	this.addedTokens = 0;
	this.rwlock = locks.createReadWriteLock();

	this.prepareTokens();
}

TokensMap.prototype.createToken = function (pattern, tokenName) {
	return this.addToken({token: tokenName, pattern: pattern});
}
	
TokensMap.prototype.addToken = function (token) {
	if (!this.isMapped(token.pattern)) {
		this.rwlock.writeLock( () => {
			token.token = token.token+"_"+this.hashMap.size;
			if ( this.addToMap(token) ) {
				var tokenTxt = JSON.stringify(token);
				this.tokensFile.write(tokenTxt+"\r");
				this.logger.debug("Added token: "+tokenTxt);
				this.addedTokens++;
			} 
			this.rwlock.unlock();
		});
	}	
	return this.getTokenName(token.pattern);
}

TokensMap.prototype.isMapped = function(pattern) {
	if (!this.hashMap.get(pattern)) {
		return false;
	} else {
		return true;
	}
}

TokensMap.prototype.getTokenName = function(pattern) {
	return this.hashMap.get(pattern);
}

TokensMap.prototype.prepareTokens = function () {
	if ( isOnFileSystem(this.tokensFileName) ) {
		// do we need a backup? Should it be an option?
		// copyFile(this.tokensFileName, this.tokensFileName+".bak");
		if ( this.opts && this.opts.reuseTokenFile ) {
			var goodFile = this.loadTokens();
			if ( !goodFile ) {
				this.logger.info("Found no tokens in "+this.tokensFileName+" and it is not empty, will not use this file.");
				this.opts.reuseTokenFile = false;
				this.tokensFileName = getTokensFilename(this.tokensFileName, this.opts);
				this.logger.info("Will store new tokens in "+this.tokensFileName+" instead.");
			} else {
				this.logger.info("Reusing tokens file "+this.tokensFileName+" with "+this.importedTokens+" imported tokens.");
			}
		}
	} 
	this.tokensFile = createTokensFile(this.tokensFileName, this.opts); 
}

TokensMap.prototype.addToMap = function(token) {
	if (!this.isMapped(token.pattern)) {
		this.hashMap.set(token.pattern, token.token);
		return true;
	} else {
		return false;
	}
}
	
TokensMap.prototype.loadTokens = function() {
	var line_number = 0;
	var lineCount = 0;
	var tokenCount = 0;
	var array = fs.readFileSync(this.tokensFileName).toString().split("\r");
	for(line_number in array) {
		var line = array[line_number];
		if ( line.trim() ) { // If line is not empty
			lineCount++;
			try {
				var lineToken = JSON.parse(line);
				if( this.addToMap(lineToken) ) {
					this.logger.debug("Importing from line "+line_number+": token="+lineToken.token+", pattern="+lineToken.pattern);
					tokenCount++;
				}
			} catch (Err) {
				this.logger.debug("Line "+line_number+" is not properly formatted. Skipped.");
			}
		}
	}
	this.importedTokens += tokenCount;
	if ( lineCount == 0 || tokenCount > 0 ) {
		return true; // file either empty, or has tokens. In any case, it could be used.
	} else {
		return false; // file is not empty and has no tokens
	}
}
