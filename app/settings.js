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
  });


  /**
   * Will be an array of all the Twitter account numbers for all of the
   * categories. Like: [30313925, 138037459]
   */
  settings.watched_accounts = _.uniq(
      _.flatten(
        _.map(settings.categories, function(v, k, l) { return v.accounts; })
      )
  );


  /**
   * Will map Twitter account numbers (as strings) to all the categoires they're in.
   * Like: {'138037459': ['uk'], '30313925': ['us']}
   */
  settings.account_to_category = {};
  _.each(settings.categories, function(category_data, category, l) {
    _.each(category_data.accounts, function(account) {
      account = account.toString();
      if (account in account_to_category) {
        account_to_category[account.toString()].push(category);
      } else {
        account_to_category[account] = [category];  
      }
    })
  });


  /**
   * Will be an array of valid category keys, like: ['uk', 'us'].
   */
  settings.valid_categories = _.map(settings.categories,
                          function(category_data, category, l) { return category; })

  return settings;
};
