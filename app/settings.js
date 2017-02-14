/**
 * settings loads the config file (using config) and also preapares other
 * types of arrays etc that are useful based on that configuration.
 * 
 * Any of the variables set in the config file can be accessed as
 * settings.var_name, so long as it's added to the _.each() array in here.
 */
module.exports = function(_) {

  var settings = this;

  var config = require('config');

  var default_config = {
    menu: {
      font: '',
      theme: 'default',
      intro_text: 'Select your Twelescreen',
      outro_text: ''
    },
    categories: {
      _defaults: {
        font: '',
        theme: 'default',
        number_of_tweets: 10,
        disconnect_warning: 'Connection to server lost',
        slide_wait_time: 8000,
        slide_transition_time: 1000,
        greeting_time: 2000,
        chance_of_slogan: 5,
        show_on_menu: true,
        burn_in_text: '',
        greetings: ['Attention'],
        screen_names: [],
        slogans: []
        // title - If not present, we use the category's key.
      }
    },
    google_analytics_id: '',
    twitter: {}
  };

  // We'll replace any missing settings from the user's config with the default.
  _.each(_.keys(default_config), function(key) {
    // All the user's settings will be in config.
    // We first mirror them into settings, for slightly easier access.
    // (Otherwise we'd have to use settings.config everywhere else.)
    if (_.has(config, key) && config[key] != null) {
      settings[key] = config[key];
    };

    if (key == 'categories') {
      if ( ! _.has(settings, 'categories')) {
        settings.categories = {};
      };

      // In case the user didn't set a categories._defaults:
      if ( ! _.has(settings.categories, '_defaults')) {
        settings.categories._defaults = {};
      };

      // If the user's _defaults is missing anything, use the system defaults.
      _.defaults(settings.categories._defaults, default_config.categories._defaults);

      // For each of the user's categories, set any missing properties with the
      // default values.
      _.each(settings.categories, function(cat_settings, cat_key) {
        if (cat_key != '_defaults') {
          _.defaults(settings.categories[cat_key], settings.categories._defaults);

          // If no title is set for this category, use the category's key.
          if ( ! _.has(settings.categories[cat_key], 'title')
              || ! settings.categories[cat_key].title) {
            settings.categories[cat_key].title = cat_key;
          };
        };
      });

      // We don't need the user's category defaults now they're copied to the real
      // categories.
      delete settings.categories._defaults;

    } else {
      // All the other non-category settings are simpler.
      if ( ! _.has(settings, key)) {
        if (typeof default_config[key] == 'object') {
          // 'menu' or 'twitter'.
          settings[key] = {};
        } else {
          // 'google_analytics_id'.
          settings[key] = '';
        };
      };
      // Now copy the defaults in, if needed.
      _.defaults(settings[key], default_config[key]);
    };
  });

  // If the Google Analytics ID is set in ENV variable, use that instead:
  if (process.env.GOOGLE_ANALYTICS_ID) {
    settings.google_analytics_id = process.env.GOOGLE_ANALYTICS_ID;
  };

  // If the Twitter keys are set in ENV variables, use those instead.
  if (process.env.TWITTER_CONSUMER_KEY) {
    settings.twitter.consumer_key = process.env.TWITTER_CONSUMER_KEY;
    settings.twitter.consumer_secret = process.env.TWITTER_CONSUMER_SECRET;
    settings.twitter.access_token_key = process.env.TWITTER_ACCESS_TOKEN_KEY;
    settings.twitter.access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  };

  /**
   * Will be an array of valid category keys, like: ['uk', 'us'].
   */
  settings.valid_categories = _.map(settings.categories,
                          function(category_data, category, l) { return category; });

  /**
   * Will be an array of all the data in settings.categories, but in a list
   * ordered by title. Used for the menu screen.
   */
  settings.categories_list = _.sortBy(
    _.map(settings.categories, function(category_data, category, l) { 
      // Put the keys ('uk') into the category data.
      category_data.key = category;
      return category_data;
    }),
    function(data){
      return data.title;
    }
  );

  /**
   * Will be an array of all the twitter account screen_names for all of the
   * categories. like: ['ukhomeoffice', 'dhsgov'] (All lowercased.)
   */
  settings.watched_screen_names = _.uniq(
    _.map(settings.categories, function(v, k, l) {
      return _.map(v.screen_names, function(name) { return name.toLowerCase(); })
    })
  );

  /**
   * Will map Twitter screen_names to all the categories they're in.
   * Like: {'ukhomeoffice': ['uk'], 'dhsgov': ['us']}
   * All screen_names are lowercased.
   */
  settings.screen_name_to_category = {};
  _.each(settings.categories, function(category_data, category, l) {
    _.each(category_data.screen_names, function(screen_name) {
      screen_name = screen_name.toLowerCase();
      if (screen_name in screen_name_to_category) {
        screen_name_to_category[screen_name].push(category);
      } else {
        screen_name_to_category[screen_name] = [category];
      }
    })
  });

  /**
   * Will be populated by streamer.get_user_ids().
   */
  settings.watched_ids = [];
  // Keys are string IDs, ie: {'822215673812119600': 'WhiteHouse'} :
  settings.watched_id_to_screen_name = {};

  settings.max_number_of_tweets = _.max(settings.categories,
      function(category){ return category.number_of_tweets; })['number_of_tweets']


  return settings;
};
