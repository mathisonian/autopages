
'use strict';

var fs = require('fs-extra');
var path = require('path');
var Q = require('q');
var gulp = require('gulp');
var gutil = require('gulp-util');
var jade = require('jade');
var sass = require('gulp-sass');
var csso = require('gulp-csso');
var tap = require('gulp-tap');
var _ = require('lodash');
var templateUtils = require('./template_utils');
var ext = require('gulp-util').replaceExtension;
var vinylFS = require('vinyl-fs');


function Processor(branches) {

    if (!(this instanceof Processor)) {
        return new Processor(branches);
    }

    this.branches = branches;
    this.customTasks = {};
}

module.exports = Processor;


Processor.prototype.setRepo = function(repo) {

    this.repo = repo;

    var split = repo.path.split('/');
    this.reponame = split[split.length-1];
    this.username = split[split.length-2];

    this.inputPath = path.resolve('./.tmp/input/' + this.username + '/' + this.reponame + '/' + (new Date().getTime()));
    this.outputPath = path.resolve('./.tmp/output/' + this.username + '/' + this.reponame + '/' + (new Date().getTime()));
};


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
};


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
                .src(self.repo.path + '/images/**/*')
                .pipe( gulp.dest(self.outputPath + '/images/') );
    });


    gulp.task('fonts', function() {
        return gulp
                .src(self.repo.path + '/fonts/**/*.{otf,svg,ttf,woff,eot}')
                .pipe( gulp.dest(self.outputPath + '/fonts/') );
    });

    gulp.task('js', function() {

        return gulp
                .src(self.repo.path + '/js/**/*')
                .pipe(gulp.dest(self.outputPath + '/js/'));
    });

    gulp.task('copy', function() {
        return gulp
                .src(self.repo.path + '/copy/**/*')
                .pipe(gulp.dest(self.outputPath + '/'));
    });

    gulp.task('static', ['images', 'fonts', 'css', 'copy']);

    gulp.task('list-templates', function() {
        // this is really ugly so far...
        // takes a file like /posts/_index.jade
        //
        // and creates
        //
        // /posts/my-post-1/index.html
        // /posts/my-post-2/index.html
        // ... 
        // etc
        //
        vinylFS
            .src(self.repo.path + '/templates/**/_index.jade')
            .pipe(tap(function(indexFile) {
                var contentFiles = self._getInputFilenames(indexFile.path);
                _.each(contentFiles, function(contentFile) {
                    gulp.src(indexFile.path)
                        .pipe(tap(function(f) {
                            var compile = jade.compile(String(f.contents), {
                                filename: f.path,
                                pretty: false
                            });

                            var compiled = compile({
                                _: _,
                                inputPath: self._getInputPath(f.path),
                                file: contentFile,
                                autopages: templateUtils(self._getInputPath(f.path))
                            });

                            f.contents = new Buffer(compiled);
                            f.base = indexFile.base;
                            f.path = f.path.replace('_index.jade', '') + ext(contentFile, '') + '/index.html';
                        }))
                        .pipe(gulp.dest(self.outputPath + '/'));
                });
            }));
    });

    gulp.task('static-templates', function() {
        return gulp
                .src(self.repo.path + '/templates/**/index*.jade')
                .pipe(tap(function(file) {

                    var compile = jade.compile(String(file.contents), {
                        filename: file.path,
                        pretty: false
                    });

                    var compiled = compile({
                        _: _,
                        inputPath: self._getInputPath(file.path),
                        files: self._getInputFilenames(file.path),
                        autopages: templateUtils(self._getInputPath(file.path))
                    });

                    file.contents = new Buffer(compiled);
                    file.path = ext(file.path, '.html');
                }))
                .on('error', gutil.log)
                .pipe(gulp.dest(self.outputPath + '/'));
    });

    gulp.task('templates', ['static-templates', 'list-templates']);

};


Processor.prototype.use = function(taskObj) {
    this.customTasks = _.extend(this.customTasks, taskObj);

    return this;
};



