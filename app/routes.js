module.exports = function(app, settings) {

  var routes = this;

  /**
   * A request for the front page of the site.
   */
  app.get('/', function(req, res) {
    var config = {categories: settings.valid_categories};
    if (settings.categories._defaults.theme) {
      config.theme = settings.categories._defaults.theme;
    };
    if (settings.categories._defaults.font) {
      config.font = settings.categories._defaults.font;
    };
    console.log(config);
    res.render('index', {config: config});
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
                    }
                   };
      // Add all of the category config data.
      for (var key in category_data) {
        config.category[key] = category_data[key];
      };
      // To provide the same generic keys as in index.html:
      config.theme = config.category.theme;
      config.font = config.category.font;
      res.render('screen', {config: config});
    } else {
      res.send(404, "'" + req.params[0] + "' is not a valid country. Go home or face arrest.");	
    };
  });

  return routes;
};
