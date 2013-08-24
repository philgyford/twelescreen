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
    res.render('index', {config: config});
  });

  /**
   * A request for a screen for a particular category.
   */
  app.get(/^\/(\w\w)\/$/, function(req, res) {
    if (settings.valid_categories.indexOf(req.params[0]) > -1) {
      var category_key = req.params[0];
      var config = settings.categories[category_key];
      config['category_key'] = category_key;
      res.render('screen', {config: config});
    } else {
      res.send(404, "'/" + req.params[0] + "/' is not a valid address.");	
    };
  });

  return routes;
};
