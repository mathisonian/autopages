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
var bodyParser = require('body-parser');

function Autopages(github_key, options) {

    if (!(this instanceof Autopages)) {
        return new Autopages(github_key, options);
    }

    var defaults = {};

    this.options = _.defaults(options, defaults);

    this.ghKey = github_key;
    this.ghClient = github.client(github_key);

    this.repos = {};
    this._initializeServer();
    this.customTasks = {};

}

Autopages.VERSION = require('../package.json').version;
module.exports = Autopages;



Autopages.prototype._initializeServer = function() {

    var self = this;
    var app = express();
    app.use(bodyParser());

    app.listen(process.env.PORT || 8000);
    

    app.post('/autopages/:username/:reponame', function(req, res) {

        
        try {
            

            var repository = req.params.username + '/' + req.params.reponame;

            console.log('Recieved push from ' + repository);

            var branch = (req.body.ref || JSON.parse(req.body.payload).ref).split('/')[2];

            if(branch === self.repos[repository].inputBranch || branch === self.repos[repository].buildBranch) {
                self._updateRepo(repository);
            }

        } catch(err) {
            console.log(err);
        }

        return res.json(200);
    });


    this.app = app;
};



/*
 * Sets up github webhook and adds the
 * repo to the in memory map
 */
Autopages.prototype.register = function(repository) {


    var split = repository.split('/');
    var username = split[0];
    var reponame = split[1];

    var self = this;
    var repo = this.ghClient.repo(repository);

    return Q.ninvoke(repo, 'hooks')
        .then(function(data) {


            var hooks = data[0];

            // check if the hook is already registered
            var autopageHooks = _.filter(hooks, function(hook) {
                return hook.config.url.indexOf('autopages') > -1;
            });

            // if it isn't register the new hook
            if(autopageHooks.length === 0) {
                console.log('creating webook');
                return self._createWebHook(repo);
            }

            console.log('webook aleady exists for ' + repository);
        })
        .then(function() {
            // check if this is like username.github.io
            // or the more standard project page

            var repoObj;

            if(reponame === (username + 'github.io') || reponame === (username + 'github.com')) {
                repoObj = {
                    inputBranch: 'ap-content',
                    buildBranch: 'autopages',
                    outputBranch: 'master'
                };
            } else {
                repoObj = {
                    inputBranch: 'ap-content',
                    buildBranch: 'autopages',
                    outputBranch: 'master'
                };
            }

            var processor = new Processor(repository);
            self.repos[repository] = _.extend(repoObj, {processor: processor});

            return processor;
        })
        .fail(function(err) {
            console.log(err);
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
    var processor = self.repos[repository].processor;

    return Q.nfcall(fs.remove, repoPath)
            .then(function() {
                console.log('Cloning repo ' + repository);
                return Q.ninvoke(git, 'clone', self._getCloneUrl(repository), repoPath);
            })
            .then(function(repo) {
                console.log('Preparing repo ' + repository);


                processor.setRepo(repo);
                processor.mixinTasks(self.customTasks);
                return processor.readyRepo();
            })
            .then(function() {
                console.log('Processing repo ' + repository);
                return processor.processRepo();
            })
            .then(function() {
                console.log('Publishing repo ' + repository);
                return processor.publishRepo();
            })
            .fail(function(err) {
                console.log(err);
            });
};


Autopages.prototype.customizeTask = function(taskName, task) {
    this.customTasks.taskName = task;
};


