# Twelescreen

https://github.com/philgyford/twelescreen/

> The voice came from an oblong metal plaque like a dulled mirror which formed part of the surface of the right-hand wall. Winston turned a switch and the voice sank somewhat, though the words were still distinguishable. The instrument (the telescreen, it was called) could be dimmed, but there was no way of shutting it off completely.  
> _1984_, George Orwell

Twelescreen is a self-hosted, one-Tweet-at-a-time, full-screen, Twitter display. Unlike _1984_'s telescreens it doesn't speak or watch your every move, yet.

Twelescreen runs on [Node.js](http://nodejs.org/) and displays a slideshow of the most recent Tweets from your chosen lists of Twitter accounts. It can handle multiple lists of accounts, each with their own URL. Custom themes (HTML/CSS templates) and settings can be applied to all lists or individual ones.

[Twelescreen.com](http://www.twelescreen.com/) shows an example of Twelescreen in action, using the included "Big Brother" theme. [Twelescreen.com/rig/](http://www.twelescreen.com/rig/) is an example of the simpler "Default" theme.

Questions or comments? Either [open an issue on GitHub](https://github.com/philgyford/twelescreen/issues) or [email Phil Gyford](phil@gyford.com).


###################################################################################
## Features:

* Many categories of Twitter accounts can be created. Each category has its own URL.
* Each category can be included on the top-level menu, or omitted.
* New themes can be made with CSS and, optionally, HTML templates.
* Themes can be applied to all, some or individual categories, and the menu.
* Google Web Fonts can be used.
* A Google Analytics ID can be easily added.
* Customisable introductory texts on the menu page.
* Images attached to Tweets using Twitter are displayed in the slideshow.
* A list of "greeting" messages can be set. These are displayed before newly-arrived Tweets.
* A list of "slogan" messages can be set. These are displayed randomly between Tweets.
* Options for each category include:
    * Show on the menu page, or hide it.
    * Number of Tweets rotated through.
    * Duration each Tweet is displayed.
    * Duration of the fade between each Tweet.
    * List of greeting messages.
    * List of slogan messages.
    * Chance of a slogan appearing.


###################################################################################
## Quick start

This might be enough to get Twelescreen up and running, depending on your set-up and knowledge. A more detailed description follows in the next section.

1. Install [Node.js](http://nodejs.org/) on your server (or local machine if that's where you're running it).

2. Get the Twelescreen code [from GitHub](https://github.com/philgyford/twelescreen/).

3. Copy `config/example_basic.yaml` to `config/production.yaml`.

4. [Create a new Twitter app](https://dev.twitter.com/apps/new). Get the four required authorisation tokens and either add them to `config/production.yaml` or set them as environment variables (see the next section for instructions on either method).

5. Run the app with:
   
   ```
   $ NODE_ENV=production node app.js
   ```
   
   or push it to your chosen host. If you're using Heroku, set the `USE_XHR_POLLING` environment variable to `true` (see below for more details).
   
   If you're running it locally, you should see output something like this:

   ```
   ===================================================
   Twelescreen starting, using Node v0.10.12
   info  - socket.io started
   Streamer (1/3 start):  Fetching Twitter user IDs
   Express server listening on port 3000
   Streamer (1/3 finish): Fetching Twitter user IDs
   Streamer (2/3 start):  Caching existing Tweets
   Streamer (2/3 finish): Caching existing Tweets
   Streamer (3/3 start):      Listening for new Tweets
   Streamer (3/3 continuing): Listening for new Tweets
   ===================================================
   ```
    
   From this point the server is ready for requests.

6. If you can view your new Twelescreen, start fiddling with the options, as described below...


###################################################################################
## Installation

If you're unfamiliar with Node, the section at the end of this document, "Local development" may be helpful for some basic pointers. This "Installation" section assumes you have Node up and running, either locally or on a server you can push the code to.

The server is run with:

    $ node app.js

or 

    $ NODE_ENV=[environment] node app.js

if you want to explicitly set the environment (eg `production` or `development`) at runtime.

Before running the code you will need to set up a new Twitter application, make a config file, and possibly set environment variables.

### Twitter application

Sign in to the Twitter developers site an [create a new application](https://dev.twitter.com/apps/new). You only need to set the Name, Description and Website.

On the Details page for your new application, click the "Create my access token" button at the bottom of the page. From this page you can now get your Consumer key, Consumer secret, Access token key and Access token secret.

### Config files

The full list of configuration options is in the next section. You will need to create at least one new file in the `config/` directory. Copy one of the example files to start with and name it `development.yaml` or `production.yaml`.

(Twelescreen uses [node-config](https://github.com/lorenwest/node-config) so it should be able to handle a hierarchy of config files, in a variety of formats, as per [node-config's documentation](http://lorenwest.github.io/node-config/latest/). For this example we're just going to stick with having `development.yaml` or `production.yaml`.)

Twelescreen will use whichever of these config files is named after the current value of the `NODE_ENV` environment variable. Or, this can be specified when running the Twelescreen server, eg:

    $ NODE_ENV=development node app.js

All config options have defaults, but there are some that are required. The bare minimum config file would look something like this:

    twitter:
      consumer_key: yourkeyhere
      consumer_secret: yoursecrethere
      access_token_key: yourkeyhere
      access_token_secret: yoursecrethere
    categories:
      news:
        screen_names:
          - bbcnews
          - cnn
          - ajenglish

The Twitter application credentials are required, but could instead be set as environment variables -- see the next section.

The `categories` section needs at least one category (which is all we've done here). Every category has a key (`news` in this example) which is used as the slug in its URL. If no `title` is set for a category, the key is used.

Each category must have a list of Twitter account screen names; we list three in this example. A slightly expanded version of this example can be seen in the `config/example_basic.yaml` file.

The category key `_defaults`, not used here, is a special category; any of its settings are used by *all* other categories unless they have their own options specified. This can be seen in the `config/example_twelescreendotcom.yaml` file, which is the one used on [Twelescreen.com](http://www.twelescreen.com/).

### Environment variables

The Twitter app credentials can also be set as environment variables, as can the `google_analytics_id` config option. If values are present for an option in both a config file and an environment variable, the latter takes precedence.

The environment variables are:

    TWITTER_CONSUMER_KEY
    TWITTER_CONSUMER_SECRET
    TWITTER_ACCESS_TOKEN_KEY
    TWITTER_ACCESS_TOKEN_SECRET

    GOOGLE_ANALYTICS_ID

As described above, the `NODE_ENV` environment variable can also be set, with our example to either `development` or `production`.

There is one more environment variable which has no config file version, `USE_XHR_POLLING`. This should be set to `true` if running Twelescreen on Heroku, which [has problems with socket.io](https://github.com/joyent/node/wiki/Socket.IO-and-Heroku):

    $ heroku config:add USE_XHR_POLLING=true


###################################################################################
## Configuration options

Twelescreen is extremely configurable, both on a global level and a per-category level. See the example files for, well, examples.

There are four top-level sections:

    twitter:
    google_analytics_id:
    menu:
    categories:

### twitter

We've already seen this described in `Installation`, above. This has four required options:

    twitter:
      consumer_key: yourkeyhere
      consumer_secret: yoursecrethere
      access_token_key: yourkeyhere
      access_token_secret: yoursecrethere

As discussed above, these can alternatively be set as environment variables.

### google_analytics_id

This is optional, and can be the Tracking ID from a Google Analytics property. eg:

    google_analytics_id: UA-12345-1

If present, Google Analytics JavaScript will be included at the end of both the menu and all category pages, using the provided Tracking ID.

As discussed above, this can alternatively be set as an environment variable.

### menu

The menu page is the front page of the site. It only appears if there are two or more categories to appear on it (otherwise the user is redirected to the single listable category URL).

Here's an example of the menu section with all options included:

    menu:
      font: Russo One
      theme: big_brother
      intro_text: Select your Twelescreen
      outro_text: Enjoy your visit!

More details about each option:

* `font`   
  Optional  
  Type: string  
  Default: ''  
  Examples: 'Open Sans', 'Russo One', 'Anton'  
  The name of a [Google Web Font](http://www.google.com/fonts/). If included, that font will be loaded using JavaScript and will be available for use in CSS files.

* `theme`  
  Optional  
  Type: string  
  Default: 'default'  
  Examples: 'big_brother'  
  The name of a Twelescreen theme. See the next section on themes for more information.

* `intro_text`  
  Optional  
  Type: string  
  Default: 'Select your Twelescreen'  
  Examples: 'Choose category', ''  
  On the menu screen in the supplied themes this is text that appears above the list of categories the user can choose from. Can be set as an empty string.

* `outro_text`  
  Optional  
  Type: string  
  Default: ''  
  Examples: 'Thanks for visiting!'  
  On the menu screen in the supplied themes this is text that appears below the list of categories the user can choose from. Can be set as an empty string.

### categories

The categories section is an associative array. Each element has a unique key, which is used as the URL slug for that category. Each category is also an associative array of various configuration options.

Additionally, a category with the special key of `_defaults` specifies default configuration options that will be used for all real categories, unless a category specifies its own setting. For any individual category's option the order of precedence is:

* System default option
* `_defaults` option
* Individual category option

with each subsequent level overriding the previous.

Here's an example showing some `_defaults` and a single category with every possible option:

    categories:
      _defaults:
        font: Russo One
        theme: big_brother
      seinfeld:
        font: Anton
        theme: default
        show_on_menu: false
        disconnect_warning: Can't connect to server
        number_of_tweets: 10
        slide_wait_time: 5000
        slide_transition_time: 500
        greeting_time: 1000
        greetings:
          - Go!
          - Giddyup!
          - Hoochie Mama!
        chance_of_slogan: 10
        slogans:
          - No soup<br>for you!
          - Serenity now!
        burn_in_text: These pretzels are making me thirsty!
        screen_names:
          - seinfeldtoday
          - jerryseinfeld
          - seinfeldstories

This sets default values for `font` and `theme`, which would be used by all categories that don't specify their own. There is a single category, with a key of `seinfeld`, which would be accessible at a URL like http://www.example.org/seinfeld/ (assuming you were running Twelescreen on the domain `www.example.com`). This category specifies its own `font` and `theme`, so it would use these instead of those in `_defaults`.

Here is each of the category options in more detail:

* `font`   
  Optional  
  Type: string  
  Default: ''  
  Examples: 'Open Sans', 'Russo One', 'Anton'  
  The name of a [Google Web Font](http://www.google.com/fonts/). If included, that font will be loaded using JavaScript and will be available for use in CSS files.

* `theme`  
  Optional  
  Type: string  
  Default: 'default'  
  Examples: 'big_brother'  
  The name of a Twelescreen theme. See the next section on themes for more information.

* `show_on_menu`  
  Optional  
  Type: boolean  
  Default: true  
  Examples: true, false  
  Should this category be displayed as a clickable link on the menu screen? If not, its URL can still be accessed directly.

* `disconnect_warning`  
  Optional  
  Type: string  
  Default: 'Connection to server lost'  
  Examples: "Can't connect to server"  
  If something goes wrong, the user's browser may lose connection to the server. It will try to reconnect for a few seconds, but the error may be permanent and require a page reload (assuming the server is still functioning). When connection is lost this error message will be displayed to the user.

* `number_of_tweets`  
  Optional  
  Type: integer  
  Default: 10  
  Examples: 5, 100  
  Twelescreen cycles through the most recent Tweets posted by the category's assigned Twitter accounts. When a new one arrives, the oldest is removed. `number_of_tweets` is the number of Tweets that is cycled through.

* `slide_wait_time`  
  Optional  
  Type: integer  
  Default: 8000  
  Examples: 1000, 20000  
  The number of milliseconds that each Tweet is displayed for. If a Tweet has an image attached then its text is shown for `slide_wait_time` milliseconds and then its image is shown for the same amount of time.

* `slide_transition_time`  
  Optional  
  Type: integer  
  Default: 1000  
  Examples: 500, 3000  
  The number of milliseconds it takes to fade from one Tweet to another. If a Tweet has an image attached, then this is also the time it takes to fade from the Tweet's text to its image.

* `greeting_time`  
  Optional  
  Type: integer  
  Default: 2000  
  Examples: 500, 3000  
  The greeting is shown on two occasions. First, when the user initially visits a category's page. Second, when a new Tweet arrives, a greeting is shown first, in order to catch the user's attention. By default the greeting flashes, although this can be changed using CSS in a custom theme. This setting determines how many milliseconds the greeting is shown for. The greeting flashes the same number of times no matter how long the `greeting_time` option is.

* `greetings`  
  Optional  
  Type: array of strings  
  Default: ['Attention']  
  Examples: ['Hey!', 'Look&lt;br>here!']  
  The text displayed in a greeting (see `greeting_time` description for more info). If more than one text is supplied, a random one is chosen each time a greeting is needed. Each greeting can contain HTML.

* `chance_of_slogan`  
  Optional  
  Type: integer  
  Default: 5  
  Examples: 1, 100  
  A slogan is a slide of large text that can be displayed at random between Tweets. If there are any slogans defined, then after each Tweet there is a percentage chance equal to `chance_of_slogan` that a slogan will be displayed before the next Tweet.

* `slogans`  
  Optional  
  Type: array of strings  
  Default: [] \(empty array)  
  Examples: ["I've made&lt;br>a huge&lt;br>mistake", "Come on!"]  
  If a slogan is due to be shown (see `chance_of_slogan` for more information) then a random slogan is chosen from this array. For slogans to be shown there must be slogans defined *and* `chance_of_slogan` must be greater than 0. Each slogan can contain HTML.

* `burn_in_text`  
  Optional  
  Type: string  
  Default: ''  
  Examples: "Enter your PIN", "HELP"  
  This is a joke and you may never need or want to use it. You know how public screens often have text burnt into them through overuse? If there is a `burn_in_text` string set then it will be displayed constantly on this category's screen. The supplied themes display it very faintly, mimicking burn in.

* `screen_names`  
  Required  
  Type: array of strings  
  Examples: ['greatdismal', 'bruces']  
  This is the only option for categories that must be specified; there is no system default. It should be an array of Twitter screen names -- the short handles, rather than longer full names. "philgyford" rather than "Phil Gyford". Order is irrelevant and case is ignored.

  In theory a total of 5,000 Twitter accounts can be followed across all categories, as per [the Twitter documentation](https://dev.twitter.com/docs/api/1.1/post/statuses/filter) but I've never tried more than a couple of dozen.

  You should be able to see Tweets from protected accounts if the Twitter account you used to create the Twitter app is allowed to see them. Just make sure you're not displaying your Twelescreen in a publicly-visible place!


###################################################################################
## Themes

A theme consists of a CSS file and, optionally, a custom HTML template for the menu page.

The menu page, and each category, has a theme specified in the options (see above). By default this is `default`. The other theme supplied with Twelescreen is `big_brother`.

### Custom CSS files

When Twelescreen renders a page it includes the `public/css/base.css` file, which defines the structure of each page. It then includes the `public/themes/[theme_name]/styles.css` file, which should add colours, fonts, and any other variations from the base.

By default, as seen on [Twelescreen.com/rig/](http://www.twelescreen.com/rig/), it uses `public/themes/default/styles.css`. The [front page of Twelescreen](http://www.twelescreen.com/) uses `public/themes/big_brother/styles.css`.

So, the simplest way to make a new theme is to create a new directory in `public/themes/` with the name of your theme (containing no spaces). Copy one of the other themes' `styles.css` files into your new theme directory and change that for your new theme. Then assign your menu page and/or category page(s) your new theme name in the options (see above).

### Custom menu page template

If you want to create a custom menu page, more complex than can be achieved with CSS alone, you can create a new template for your theme. This should be at `views/themes/[theme_name]/index.html`. Copy the file from `views/themes/default/index.html` and use that as the basis of your new template.

The templates use the [LinkedIn fork of Dust.js](http://linkedin.github.io/dustjs/).

The `index.html` contains the main content of the page, and will be placed inside the layout template found at `views/base.html`.

The `index.html` template has a `config` associative array passed into it, containing these keys:

`config.google_analytics_id`  
Either your chosen Google Analytics ID or an empty string.

`config.menu`  
All the configuration options you specified for your menu page, plus default values for any you didn't specify.

`config.theme`  
The name of your specified theme for this page.

`config.font`  
The name of your specified Google Web Font for this page, if any.

`config.categories_list`  
An array of all the categories from your configuration options, ordered by category title. For example, if the categories section of your configuration options was something like this:

    categories:
      _defaults:
        font: Anton
      news:
        screen_names:
          - reuters
          - cnn
        greetings:
          - NEWS!
      friends:
        title: My friends
        show_on_menu: false
        screen_names:
          - tomtaylor
          - alicebartlett

Then `config.categories_list` would be like:

    [
      {
        'key': 'friends',
        'font': 'Anton',
        'title': 'My friends',
        'show_on_menu': false,
        'screen_names': ['tomtaylor', 'alicebartlett'],
        [...plus all the system default options]
      },
      {
        'key': 'news',
        'font: 'Anton'
        'title': 'News',
        'screen_names': ['reuters', 'cnn'],
        'greetings': ['NEWS!'],
        [...plus all the system default options]
      }
    ]


The template for the screen page (that displays the slideshow of Tweets) is not customisable because all content is generated dynamically.


##################################################################################
## Local development 

This section is as much for the author as anyone else, because he will forget all of this very quickly.

The Twelescreen server runs on [Node.js](http://nodejs.org/) which can be a pain to get up and running from scratch if you're unfamiliar with it. If running this locally you'll need to install Node itself. If you just want to run Twelescreen, and test configurations or write custom themes, that might be enough. ([NVM](https://github.com/creationix/nvm) can be useful if you end up needing different versions of Node for different projects.)

If you're going to do any development on the code you'll also need NPM, Bower and Grunt.

### NPM

[NPM](https://github.com/isaacs/npm) is used to manage Node packages. NPM can install the packages required for Twelescreen from the `package.json` file (although all currently required packages are included in the Twelescreen repository). They get installed in the `node_modules/` directory. You would do this from within the `twelescreen/` directory:

    $ npm install

Installing new packages and having them added to `package.json` is done with:

    $ npm install [package-name] --save

### Bower

[Bower](https://github.com/bower/bower) is used to manage the front-end third-party JavaScript libraries (although, again, those required for Twelescreen are already included in this repository). It reads the requirements from `bower.json` and installs files in the `bower_components/` directory. Install Bower with:

    $ npm install -g bower

Install required packages from within the `twelescreen/` directory using:

    $ bower install

Installing new packages like this will list them in `bower.json`:

    $ bower install [package-name] --save

### Grunt

[Grunt](http://gruntjs.com/) is used to concatenate and minify Twelescreen's front-end JavaScript files. Install Grunt globally:

    $ npm install -g grunt-cli

Run this from within the `twelescreen/` directory to concatenate and minify JavaScript files. It uses the setings in `Gruntfile.js` which currently takes some files from within `public/js/src/` and puts the result in `public/js/dist/`:

    $ grunt

Run this to have Grunt watch the JavaScript files and automatically concatenate and minify them whenever they change:

    $ grunt watch


##################################################################################
## Credits

Phil Gyford, phil@gyford.com

