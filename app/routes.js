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
      res.render('screen',
                  {
                    static_data: {
                        category: {
                          key: category_key,
                          name: category_data['name'],
                          accounts: category_data['accounts']
                        }
                     }
                  }
                );
    } else {
      res.send(404, "'" + req.params[0] + "' is not a valid country. Go home or face arrest.");	
    };
  });

  return routes;
};
