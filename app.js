/**
 * The main script for Twelescreen server.
 * Run with `node app.js`.
 */

console.log('===================================================');
console.log('Twelescreen starting, using Node '+ process.version);

var express = require('express'),
		consolidate = require('consolidate'),
		socket = require('socket.io'),
		http = require('http'),
		twitter = require('ntwitter'),
		_ = require('underscore'),
		dust = require('dustjs-linkedin'),
		path = require('path'),
    fs = require('fs'),
    morgan = require ('morgan'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    errorhandler = require('errorhandler');

var settings = require(path.resolve('app','settings'))(_);

var app = express();
var server = http.createServer(app);
app.set('port', process.env.PORT || 3000);
app.engine('html', consolidate.dust);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV == 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('common'));
};

app.use(bodyParser.json());
app.use(methodOverride());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));


// We're using bower components so add it to the path to make things easier.
app.use('/components', express.static(path.join(__dirname, 'bower_components')));

if ('development' == app.get('env')) {
  app.use(errorhandler());
}

require(path.resolve('app','routes'))(app, settings, fs, path, _);

var io = socket.listen(server);

// Set the sockets.io configuration.
if (process.env.USE_XHR_POLLING == 'true') {
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

