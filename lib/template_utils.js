'use strict';

var fs = require('fs-extra');
var marked = require('marked');
var ext = require('gulp-util').replaceExtension;


module.exports = function(path) {
    
    return {
        readDirectory: function(directoryName) {
            var files;
            try {
                files = fs.readdirSync(path + '/' + directoryName);
            } catch(err) {
                files = [];
            }
            return files;
        },

        getAsJSON: function(filename) {
            return JSON.parse(fs.readFileSync(path + '/' + filename));
        },

        stripExtension: function(filename) {
            return ext(filename, '');
        },

        parseMarkdown: function(filename) {
            var markdown = fs.readFileSync(path + '/' + filename, 'utf8');
            return marked(markdown);
        }
    };

};

