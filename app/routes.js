module.exports = function(app, settings) {

  var routes = this;

  /**
   * A request for the front page of the site.
   */
  app.get('/', function(req, res) {
    res.render('index', {countries: settings.valid_countries});
  });

  /**
   * A request for a screen for a particular country.
   */
  app.get(/^\/(\w\w)\/$/, function(req, res) {
    if (settings.valid_countries.indexOf(req.params[0]) > -1) {
      var country_code = req.params[0];
      var country_data = settings.countries[country_code];
      res.render('screen',
                  {
                    static_data: {
                        country: {
                          code: country_code,
                          name: country_data['name'],
                          accounts: country_data['accounts']
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
