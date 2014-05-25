
'use strict';

var fs = require('fs-extra');
var path = require('path');
var Q = require('q');
var gulp = require('gulp');
var gutil = require('gulp-util');
var jade = require('jade');
var sass = require('gulp-sass');
var csso = require('gulp-csso');
var uglify = require('gulp-uglify');
var tap = require('gulp-tap');
var browserify = require('gulp-browserify');
var _ = require('lodash');
var templateUtils = require('./template_utils');


function Processor(repo, branches) {

    if (!(this instanceof Processor)) {
        return new Processor(repo, branches);
    }


    this.branches = branches;
    this.repo = repo;

    var split = repo.path.split('/');
    this.reponame = split[split.length-1];
    this.username = split[split.length-2];

    this.inputPath = path.resolve('./.tmp/input/' + this.username + '/' + this.reponame + '/' + (new Date().getTime()));
    this.outputPath = path.resolve('./.tmp/output/' + this.username + '/' + this.reponame + '/' + (new Date().getTime()));

    this.customTasks = {};

}

module.exports = Processor;


/*
 * Create temp input and output folders
 */
Processor.prototype.readyRepo = function() {

    var self = this;

    // default tasks
    this._registerGulpTasks();

    // user generated tasks
    _.each(this.customTasks, function(val, key) {
        gulp.task(key, val(self.repo.path, self.outputPath));
    });

    return Q.ninvoke(self.repo, 'checkout', this.branches.inputBranch)
            .then(function() {
                return Q.nfcall(fs.mkdirs, self.inputPath);
            })
            .then(function() {
                return Q.nfcall(fs.copy, self.repo.path, self.inputPath);
            })
            .then(function() {
                return Q.nfcall(fs.mkdirs, self.outputPath);
            });
};




Processor.prototype.processRepo = function() {

    return Q.ninvoke(this.repo, 'checkout', this.branches.buildBranch)
            .then(function() {
                return Q.ninvoke(gulp, 'start', 'static');
            }).then(function() {
                return Q.ninvoke(gulp, 'start', 'templates');
            }).then(function() {
                return Q.ninvoke(gulp, 'start', 'js');
            });
};

Processor.prototype.publishRepo = function() {

    var self = this;

    return Q.ninvoke(this.repo, 'checkout', this.branches.outputBranch)
            .then(function() {
                return Q.ninvoke(self.repo, 'remove', self.repo.path + '/*', {
                    r: true
                });
            })
            .then(function() {
                return Q.nfcall(fs.copy, self.outputPath, self.repo.path);
            })
            .then(function() {
                return Q.ninvoke(self.repo, 'add', self.repo.path + '/*');
            })
            .then(function() {
                return Q.ninvoke(self.repo, 'commit', '[Autopages] auto-creating new github pages.');
            })
            .then(function() {
                return Q.ninvoke(self.repo, 'remote_push', 'origin');
            });

};

Processor.prototype._getInputPath = function(path) {
    var inputPath = path.replace(this.repo.path, this.inputPath).replace('/templates', '');
    return inputPath.substr(0, inputPath.lastIndexOf('/'));
}


Processor.prototype._getInputFilenames = function(path) {

    var inputPath = this._getInputPath(path);

    var files;
    try {
        files = fs.readdirSync(inputPath);
    } catch(err) {
        files = [];
    }

    return files;
};

Processor.prototype._registerGulpTasks = function() {

    var self = this;

    gulp.task('css', function() {
        return gulp
                .src(self.repo.path + '/stylesheets/app.scss')
                .pipe(
                    sass({
                        includePaths: [self.repo.path + '/stylesheets'],
                        errLogToConsole: true
                    }))
                .pipe( csso() )
                .pipe( gulp.dest(self.outputPath + '/css/') );
    });


    gulp.task('images', function() {
        return gulp
                .src('src/images/**/*')
                .pipe( gulp.dest(self.outputPath + '/images/') );
    });


    gulp.task('fonts', function() {
        return gulp
                .src(self.repo.path + '/fonts/**/*.{otf,svg,ttf,woff,eot}')
                .pipe( gulp.dest(self.outputPath + '/fonts/') );
    });

    gulp.task('js', function() {

        // Single entry point to browserify
        return gulp.src(self.repo.path + '/js/app.js')
            .pipe(browserify({
                debug : false
            }))
            .on('error', gutil.log)
            .pipe(uglify())
            .pipe(gulp.dest(self.outputPath + '/js/'));

    });

    gulp.task('static', ['images', 'fonts', 'css']);

    gulp.task('templates', function() {
        return gulp
                .src(self.repo.path + '/templates/**/index*.jade')
                .pipe(tap(function(file) {

                    var compile = jade.compile(String(file.contents), {
                        filename: file.path,
                        pretty: false
                    });

                    var compiled = compile({
                        _: _,
                        files: self._getInputFilenames(file.path),
                        autopages: templateUtils(self._getInputPath(file.path))
                    });

                    file.contents = new Buffer(compiled);

                }))
                .on('error', gutil.log)
                .pipe(gulp.dest(self.outputPath + '/'));
    });

};

Processor.prototype.mixinTasks = function(tasks) {
    this.customTasks = tasks;
};
