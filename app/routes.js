module.exports = function(app, settings) {

  var routes = this;

  /**
   * A request for the front page of the site.
   */
  app.get('/', function(req, res) {
    res.render('index', {categories: settings.valid_categories});
  });

  /**
   * A request for a screen for a particular category.
   */
  app.get(/^\/(\w\w)\/$/, function(req, res) {
    if (settings.valid_categories.indexOf(req.params[0]) > -1) {
      var category_key = req.params[0];
      var category_data = settings.categories[category_key];
      // What we'll pass to the front end.
      var config = {
                    category: {
                      key: category_key
                    },
                    number_of_tweets_to_display: settings.ui.number_of_tweets,
                    seconds_per_slide: settings.ui.seconds_per_slide
                   };
      // Add all of the category config data.
      for (var key in category_data) {
        config.category[key] = category_data[key];
      };
      res.render('screen', {config: config});
    } else {
      res.send(404, "'" + req.params[0] + "' is not a valid country. Go home or face arrest.");	
    };
  });

  return routes;
};
