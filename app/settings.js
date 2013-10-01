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

  _.each(['env', 'categories', 'twitter'], function(key) {
    // Mirror all of our settings from config for slightly easier access.
    if (_.has(config, key) && config[key] != null) {
      settings[key] = config[key];
    } else {
      settings[key] = {};
    };

    // Add any default category values to each of the category settings, where
    // the category doesn't have a matching setting.
    if (key == 'categories' && '_defaults' in settings.categories) {
      _.each(settings.categories, function(cat_settings, cat_key) {
        if (cat_key != '_defaults') {
          _.defaults(settings.categories[cat_key], settings.categories._defaults);
        };
      });
    };
  });

  // We don't need the defaults now they're copied to all the real categories.
  // But we keep a record of them, for use on the index page.
  if (_.has(settings.categories, '_defaults')) {
    settings.category_defaults = settings.categories._defaults;
    delete settings.categories._defaults;
  } else {
    settings.category_defaults = {theme: 'default'}; 
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
   * categories. like: ['ukhomeoffice', 'dhsgov']
   */
  settings.watched_screen_names = _.uniq(
        _.map(settings.categories, function(v, k, l) { return v.screen_names; })
  );

  /**
   * Will map Twitter screen_names to all the categories they're in.
   * Like: {'ukhomeoffice': ['uk'], 'dhsgov': ['us']}
   */
  settings.screen_name_to_category = {};
  _.each(settings.categories, function(category_data, category, l) {
    _.each(category_data.screen_names, function(screen_name) {
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

  settings.max_number_of_tweets = _.max(settings.categories,
      function(category){ return category.number_of_tweets; })['number_of_tweets']


  return settings;
};
