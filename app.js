/**
 * Module dependencies.
 */
var express = require('express'),
		consolidate = require('consolidate'),
		io = require('socket.io'),
		http = require('http'),
		twitter = require('ntwitter'),
		cronJob = require('cron').CronJob,
		_ = require('underscore'),
		handlebars = require('handlebars')
		path = require('path');

var settings = require('./app/settings')(_);

// Express setup
var app = express();
var server = http.createServer(app);
app.set('port', process.env.PORT || 3000);
// Assign the handlebars template engine to .html files
app.engine('html', consolidate.handlebars);
// Set .html as the default extension 
app.set('view engine', 'html');
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

require('./app/routes')(app, settings);

var sockets = io.listen(server);

// Set the sockets.io configuration.
if (settings.env.heroku == true) {
	sockets.configure(function() {
		sockets.set('transports', ['xhr-polling']);
		sockets.set('polling duration', 10);
	});
};

// If the client just connected, give them fresh data!
sockets.sockets.on('connection', function(socket) { 
		//socket.emit('tweets', [shrink_tweet(tweet)]);
});


var streamer = require('./app/streamer')(settings, twitter, sockets);

streamer.start_streaming();

//Reset everything on a new day!
//We don't want to keep data around from the previous day so reset everything.
//new cronJob('0 0 0 * * *', function(){
    ////Reset the total
    //watchList.total = 0;

    ////Clear out everything in the map
    //_.each(watchSymbols, function(v) { watchList.symbols[v] = 0; });

    ////Send the update to the clients
    //sockets.sockets.emit('tweets', watchList);
//}, null, true);

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
