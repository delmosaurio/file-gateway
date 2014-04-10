/*!
 * file-demand
 *
 * Copyright(c) 2014 Delmo Carrozzo <dcardev@gmail.com>
 * MIT Licensed
 */

var FileDemand = module.exports = function(ops) {
	var self = this

	if(false === (self instanceof FileDemand)) {
    return new FileDemand()
  }

  self.version = require("../package.json").version

  return self
}