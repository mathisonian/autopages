'use strict';

var fs = require('fs-extra');
var marked = require('marked');


module.exports = function(path) {
    
    return {
        getAsJSON: function(filename) {
            return JSON.parse(fs.readFileSync(path + '/' + filename));
        },

        parseMarkdown: function(filename) {
            var markdown = fs.readFileSync(path + '/' + filename);
            return marked(markdown);
        }
    };

};
