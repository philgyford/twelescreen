/**
 * The main script for Twelescreen server.
 * Run with `node app.js`.
 */

console.log('Twelescreen starting, using Node '+ process.version);

var express = require('express'),
		consolidate = require('consolidate'),
		socket = require('socket.io'),
		http = require('http'),
		twitter = require('ntwitter'),
		_ = require('underscore'),
		dust = require('dustjs-linkedin'),
		path = require('path'),
    fs = require('fs');

var settings = require(path.resolve('app','settings'))(_);

var app = express();
var server = http.createServer(app);
app.set('port', process.env.PORT || 3000);
app.engine('html', consolidate.dust);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


// We're using bower components so add it to the path to make things easier.
app.use('/components', express.static(path.join(__dirname, 'bower_components')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

require(path.resolve('app','routes'))(app, settings, fs, path, _);

var io = socket.listen(server);

// Set the sockets.io configuration.
if (settings.env.heroku == true) {
	io.configure(function() {
		io.set('transports', ['xhr-polling']);
		io.set('polling duration', 10);
	});
};

// Start fetching Tweets from Twitter.
var streamer = require(path.resolve('app','streamer'))(settings, twitter, io, _);
streamer.start();

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

