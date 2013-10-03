module.exports = function(app, settings, fs, path, _) {

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
        var config = {
          categories_list: settings.categories_list
        };
        config.theme = settings.category_defaults.theme;
        if (settings.category_defaults.font) {
          config.font = settings.category_defaults.font;
        };

        // Work out which template to use.
        // A custom theme might not have its own template, in which case
        // we use the default.
        var menu_template = path.join('themes','default','index');
        if (config.theme != 'default') {
          fs.exists(path.resolve('views','themes',config.theme,'index.dust'), function(exists){
            if (exists) {
              menu_template = path.join('themes',config.theme,'index');
            }
          });
        };

        res.render(menu_template, {
          page: 'menu',
          config: config
        });
      };
    };
  });

  /**
   * A request for a screen for a particular category.
   */
  app.get(/^\/([\w-]+)\/$/, function(req, res) {
    if (settings.valid_categories.indexOf(req.params[0]) > -1) {
      var category_key = req.params[0];
      var config = settings.categories[category_key];
      config['category_key'] = category_key;
      res.render('screen', {
        page: 'screen',
        config: config
      });
    } else {
      res.send(404, "'/" + req.params[0] + "/' is not a valid address.");	
    };
  });

  return routes;
};
