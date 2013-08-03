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
  _.each(['env', 'countries', 'twitter'], function(key) {
    settings[key] = config[key];
  });


  /**
   * Will be an array of all the Twitter account numbers for all of the countries.
   * Like: [30313925, 138037459]
   */
  settings.watched_accounts = _.uniq(
      _.flatten(
        _.map(settings.countries, function(v, k, l) { return v.accounts; })
      )
  );


  /**
   * Will map Twitter account numbers (as strings) to all the countries they're in.
   * Like: {'138037459': ['uk'], '30313925': ['us']}
   */
  settings.account_to_country = {};
  _.each(settings.countries, function(country_data, country, l) {
    _.each(country_data.accounts, function(account) {
      account = account.toString();
      if (account in account_to_country) {
        account_to_country[account.toString()].push(country);
      } else {
        account_to_country[account] = [country];  
      }
    })
  });


  /**
   * Will be an array of valid country acronyms, like: ['uk', 'us'].
   */
  settings.valid_countries = _.map(settings.countries,
                            function(country_data, country, l) { return country; })

  return settings;
};
