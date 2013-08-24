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

  // Mirror all of our settings from config for slightly easier access.
  _.each(['env', 'categories', 'twitter'], function(key) {
    settings[key] = config[key];

    // Add any default category values to each of the category settings, where
    // the category doesn't have a matching setting.
    if (key == 'categories' && '_defaults' in settings['categories']) {
      _.each(settings['categories'], function(cat_settings, cat_key) {
        if (cat_key != '_defaults') {
          _.defaults(settings['categories'][cat_key], settings['categories']['_defaults']);
        };
      });
    };
  });

  // We don't need the defaults now they're copied to all the real categories.
  // But we keep a record of them, for use on the index page.
  settings['category_defaults'] = settings['categories']['_defaults']
  delete settings['categories']['_defaults'];

  /**
   * Will be an array of valid category keys, like: ['uk', 'us'].
   */
  settings.valid_categories = _.map(settings.categories,
                          function(category_data, category, l) { return category; })

  /**
   * Will be an array of all the twitter account screen_names for all of the
   * categories. like: ['ukhomeoffice', 'dhsgov']
   */
  settings.watched_screen_names = _.uniq(
      _.flatten(
        _.map(settings.categories, function(v, k, l) { return v.screen_names; })
      )
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


  return settings;
};
