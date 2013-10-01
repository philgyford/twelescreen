/**
 * The main script for Twelescreen server.
 * Run with `node app.js`.
 */

var express = require('express'),
		consolidate = require('consolidate'),
		socket = require('socket.io'),
		http = require('http'),
		twitter = require('ntwitter'),
		cronJob = require('cron').CronJob,
		_ = require('underscore'),
		dust = require('dustjs-linkedin'),
		path = require('path');

var settings = require('./app/settings')(_);

var app = express();
var server = http.createServer(app);
app.set('port', process.env.PORT || 3000);
app.engine('dust', consolidate.dust);
app.set('view engine', 'dust');
app.set('views', path.join(__dirname, '/views'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));


// We're using bower components so add it to the path to make things easier.
app.use('/components', express.static(path.join(__dirname, 'bower_components')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
//handlebars.registerHelper('ifequal', function (val1, val2, fn, elseFn) {
  //if (val1 === val2) {
    //return fn();
  //} else if (elseFn) {
    //return elseFn();
  //}
//});

require('./app/routes')(app, settings, _);

var io = socket.listen(server);

// Set the sockets.io configuration.
if (settings.env.heroku == true) {
	io.configure(function() {
		io.set('transports', ['xhr-polling']);
		io.set('polling duration', 10);
	});
};

// Start fetching Tweets from Twitter.
var streamer = require('./app/streamer')(settings, twitter, io, _);
streamer.start();

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


/**
 * So we can do this in templates:
 * {{#ifequal var compare='bibble'}}
 * {{/ifequal}}
 */
//handlebars.registerHelper('ifequal', function(context, options) {
  //if (context == options.hash.compare) {
    //return options.fn(this);
  //};
  //return options.inverse(this);
//});

