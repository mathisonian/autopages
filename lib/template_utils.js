'use strict';

var fs = require('fs-extra');


module.exports = function(path) {
    
    return {
        getAsJSON: function(filename) {
            return JSON.parse(fs.readFileSync(path + '/' + filename));
        }
    };

};
