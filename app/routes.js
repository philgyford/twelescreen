module.exports = function(app, settings, _) {

  var routes = this;

  /**
   * A request for the front page of the site.
   */
  app.get('/', function(req, res) {
    if (settings.valid_categories.length == 1) {
      // There's only one category, so jump straight to it.
      res.redirect('/' + settings.valid_categories[0] + '/'); 
    } else {
      var menu_categories = _.filter(settings.valid_categories,
                                    function(key){
                                      if (settings.categories[key].show_on_menu) {
                                        return key; 
                                      };
                                    });
     if (menu_categories.length == 1) {
        // There's only one category to show in the menu, so jump straight to it.
        res.redirect('/' + menu_categories[0] + '/'); 
      } else {
        // Normal menu page.
        var config = {categories: settings.categories};
        config.theme = settings.category_defaults.theme;
        if (settings.category_defaults.font) {
          config.font = settings.category_defaults.font;
        };
        res.render('index', {config: config});
      };
    };
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
