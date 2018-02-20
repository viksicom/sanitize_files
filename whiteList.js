"use strict";
exports.WhiteList = WhiteList

const fs = require('fs');

function WhiteList(opts) {
	this.opts = opts;

	if(opts && opts.whiteList) {
		this.whiteList = opts.whiteList;
	} else {
		this.whiteList = [];
	}
	
	if ( opts && opts.whiteListFile ) {
		this.whiteListFile = opts.whiteListFile;
		try {
			var wListFile = JSON.parse(fs.readFileSync(this.whiteListFile, 'utf8'));
			this.whiteList = this.whiteList.concat(wListFile.whiteList);
		} catch (Err) {
			opts.logger.instance.error("Failed to read whiteListFile "+this.whiteListFile+" \n"+Err);
		}
	}
}

WhiteList.prototype.isWhiteListed = function( pattern ) {
	return this.whiteList.indexOf( pattern ) > -1;
}
