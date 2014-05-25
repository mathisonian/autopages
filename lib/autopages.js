'use strict';

/*
 * autopages
 * https://github.com/mathisonian/autopages
 *
 * Copyright (c) 2014 Matthew Conlen
 * Licensed under the MIT license.
 */
var _ = require('lodash');
var express = require('express');
var github = require('octonode');
var Q = require('q');
var Processor = require('./processor');
var git = require('gift');
var path = require('path');
var fs = require('fs-extra');

function Autopages(github_key, options) {

    if (!(this instanceof Autopages)) {
        return new Autopages(github_key, options);
    }

    var defaults = {};

    this.options = _.defaults(options, defaults);


    this.ghKey = github_key;
    this.ghClient = github.client(github_key);

    var repo = 'white-film/white-film.github.io';
    this.repos = {};

    this._initializeServer();

    this._updateRepo(repo);
    this.customTasks = {};

}

Autopages.VERSION = require('../package.json').version;
module.exports = Autopages;



Autopages.prototype._initializeServer = function() {


    var self = this;
    var app = express();
    app.listen(process.env.PORT || 8000);


    app.post('/autopages/:username/:reponame', function(req, res) {

        
        try {
            
            var repository = req.params.username + '/' + req.params.reponame;
            var branch = req.body.req.split('/')[2];

            if(branch === self[repository].inputBranch) {
                self._updateRepo(repository);
            }

        } catch(err) {}

        return res.json(200);
    });

    this.app = app;
};



/*
 * Sets up github webhook and adds the
 * repo to the in memory map
 */
Autopages.prototype.registerRepo = function(repository) {


    var split = repository.split('/');
    var username = split[0];
    var reponame = split[1];

    var self = this;
    var repo = this.ghClient.repo(repository);

    Q.ninvoke(repo, 'hooks')
        .then(function(data) {


            var hooks = data[0];
            console.log(hooks);

            // check if the hook is already registered
            var autopageHooks = _.filter(hooks, function(hook) {
                return hook.config.url.indexOf('autopages') > -1;
            });

            // if it isn't register the new hook
            if(autopageHooks.length === 0) {
                console.log('creating webook');
                return self._createWebHook(repo);
            }

        })
        .then(function() {
            // check if this is like username.github.io
            // or the more standard project page

            if(reponame === (username + 'github.io') || reponame === (username + 'github.com')) {
                this.repos[repository] = {
                    inputBranch: 'ap-content',
                    buildBranch: 'autopages',
                    outputBranch: 'master'
                };
            } else {
                this.repos[repository] = {
                    inputBranch: 'ap-content',
                    buildBranch: 'autopages',
                    outputBranch: 'master'
                };
            }
        });
};


Autopages.prototype._createWebHook = function(repo) {

    return Q.ninvoke(repo, 'hook', {
        name: 'web',
        active: true,
        events: ['push'],
        config: {
            url: this._getUrl() + '/' + repo.name
        }
    });

};


Autopages.prototype._getUrl = function() {
    return process.env.URL + '/autopages';
};

Autopages.prototype._getCloneUrl = function(repository) {
    return 'https://' + this.ghKey + ':x-oauth-basic@github.com/' + repository;
};


Autopages.prototype._updateRepo = function(repository) {

    var repoPath = path.resolve('./.repos/' + repository);
    var self = this;
    var processor;

    return Q.nfcall(fs.remove, repoPath)
            .then(function() {
                return Q.ninvoke(git, 'clone', self._getCloneUrl(repository), repoPath);
            })
            .then(function(repo) {
                processor = new Processor(repo, self.repos[repository]);
                processor.mixinTasks(self.customTasks);
                return processor.readyRepo();
            })
            .then(function() {
                return processor.processRepo();
            })
            .then(function() {
                // return processor.publishRepo();
            })
            .fail(function(err) {
                console.log(err);
            });
};


Autopages.prototype.customizeTask = function(taskName, task) {
    this.customTasks.taskName = task;
};


