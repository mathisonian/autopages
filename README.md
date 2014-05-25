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

This looks like a static client side website. In gereral it should follow this folder structure

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

#### <username>.github.io repos

For repos in the `<username>.github.io` style, the following branch name conventions are enforced:

* input branch: `ap-content`
* transformation branch: `autopages`
* output branch: `master`

### all other repos

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

autopages.registerRepo('username/repo');

```

Thats it. Then, deploy it to heroku, and on heroku set the environmental variable `URL` so that
it knows where to tell github to point a new webhook to.

## Documentation

More documentation coming soon. In the meantime feel free to contact the author. _(Coming soon)_



## License
Copyright (c) 2014 Matthew Conlen. Licensed under the MIT license.
