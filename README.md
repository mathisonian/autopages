# autopages 

Automated compilation and deployment to gh-pages

## About

This project is meant to be self hosted on Heroku or similar, so that you maintain control over
who has push access to your repositories.

In general it assumes convention over configuration to make the setup process as painless as possible.

There are two types of github pages repositories. For each of them it assumes that three branches exist:

* input branch
* tranformation branch
* output branch

### input branch

This is dynamic content that is going to be displayed on your github pages. For example,
if your project is a blog, it would include blog posts. If it is a software library, it
would be the code and readme (you can choose to display -- perhaps just the readme -- in the tranformation branch).

### transformation branch

This looks like a static client side website. It should follow this folder structure

```
$ tree
.
├── images
│   └── logo.png
├── js
│   └── app.js
├── stylesheets
│   └── app.scss
└── templates
    └── index.jade
        
```

although can be significantly more complex than this. This is discussed later.

### output branch

This is where the compiled static site go. Autopages will automatically commit and push this branch back to github 
every time there is a new commit on the input branch or the transformation branch.

#### \<username\>.github.io repos

For repos in the `<username>.github.io` style, the following branch name conventions are enforced:

* input branch: `ap-content`
* transformation branch: `autopages`
* output branch: `master`

#### all other repos

Any other repos will follow the convention of

* input branch: `master`
* transformation branch: `autopages`
* output branch: `gh-pages`

## Usage

Install the module with: `npm install autopages`. You can create a new repo for this and in the main file write


```javascript

var Autopages = require('autopages');

// be sure to replace this with your own api key. 
// it must have access to repos and webhooks
var autopages = new Autopages('GITHUB_API_KEY'); 

autopages
    .register('username/repo') // adds a webhook to the repo and listens for commit events
    .then(function(processor) {
        processor.use(/* use autopages plugins here */);
    });

```

Thats it. Then, deploy it to heroku, and on heroku set the environmental variable `URL` so that
it knows where to tell github to point a new webhook to.


## Support

Out of the box autopages works with the following stack

* jade templates
* scss stylesheets
* vanilla javascript

and will handle deploying custom fonts and images as well. If you want to use
different software, this can be acheived through plugins.

### Plugins

Anyone can write a plugin for autopages. For example, see [https://github.com/mathisonian/autopages-browserify](https://github.com/mathisonian/autopages-browserify).

Plugins are based on gulp tasks, and are expected to be in the format like this:


```

processor.use({
    GULP_TASK_NAME: function(inputPath, outputPath) {

        return /* return the gulp task here.*/

    }
});

```

autopages will handle passing in the correct input and output paths to your function.

#### Available Plugins

Please submit a PR if you publish a plugin

* [autopages-browserify](https://github.com/mathisonian/autopages-browserify)


## Examples

Here are examples of github repositories that take advantage of autopages, and the servers that power them.

* White Film [website](https://github.com/white-film/white-film.github.io)
    * powered by [this autopages implementation](https://github.com/white-film/wf-autopages)


## Documentation

More documentation coming soon. In the meantime feel free to contact the author.



## License
Copyright (c) 2014 Matthew Conlen. Licensed under the MIT license.
