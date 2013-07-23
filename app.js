/**
 * Module dependencies.
 */
var config = require('config'),
		express = require('express'),
		consolidate = require('consolidate'),
		io = require('socket.io'),
		http = require('http'),
		twitter = require('ntwitter'),
		cronJob = require('cron').CronJob,
		_ = require('underscore'),
		handlebars = require('handlebars')
		path = require('path');

//Create an express app
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

var country = 'uk';

// Will be an array of all the Twitter account numbers for all of the countries.
// Like: [30313925, 138037459]
var watched_accounts = _.uniq(
		_.flatten(
			_.map(config.countries, function(v, k, l) { return v.accounts; })
		)
);

// Will map Twitter account numbers (as strings) to all the countries they're in.
// Like: {'138037459': ['uk'], '30313925': ['us']}
var account_to_country = {};
_.each(config.countries, function(country_data, country, l) {
	_.each(country_data.accounts, function(account) {
		account = account.toString();
		if (account in account_to_country) {
			account_to_country[account.toString()].push(country);
		} else {
			account_to_country[account] = [country];	
		}
	})
});

// Will be an array of valid country acronyms, like: ['uk', 'us'].
var valid_countries = _.map(config.countries,
														function(country_data, country, l) { return country; })


// Express setup
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

//We're using bower components so add it to the path to make things easier
//app.use('/components', express.static(path.join(__dirname, 'components')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
	res.render('index', {countries: valid_countries});
});
app.get(/^\/(\w\w)\/$/, function(req, res) {
	if (valid_countries.indexOf(req.params[0]) > -1) {
		res.render('screen', {static_data: {test: 'hello'}});
	} else {
		res.send(404, "'" + req.params[0] + "' is not a valid country. Go home or face arrest.");	
	};
});


// Start a Socket.IO listen
var sockets = io.listen(server);

// Set the sockets.io configuration.
if (config.env.heroku == true) {
	sockets.configure(function() {
		sockets.set('transports', ['xhr-polling']);
		sockets.set('polling duration', 10);
	});
};

// If the client just connected, give them fresh data!
sockets.sockets.on('connection', function(socket) { 
		socket.emit('tweets', [{text: 'a dummy first tweet'}]);
});

//Instantiate the twitter component
//You will need to get your own key. Don't worry, it's free. But I cannot provide you one
//since it will instantiate a connection on my behalf and will drop all other streaming connections.
//Check out: https://dev.twitter.com/
var t = new twitter({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token_key: config.twitter.access_token_key,
    access_token_secret: config.twitter.access_token_secret 
});

// Tell the twitter API to filter on the watched_accounts. 
t.stream('statuses/filter', { follow: watched_accounts}, function(stream) {

  // We have a connection. Now watch the 'tweets' event for incoming tweets.
  stream.on('data', function(tweet) {

    // Make sure it was a valid tweet
    if (tweet.text !== undefined) {
			console.log("FOUND: "+tweet.text);

			//Send to all the clients
			sockets.sockets.emit('tweets', [{text: tweet.text}]);
    }
  });
});

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
