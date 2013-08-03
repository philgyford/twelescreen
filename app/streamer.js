module.exports = function(settings, twitter, sockets) {

  var streamer = this;

  streamer.connect = function() {
    streamer.connection = new twitter({
      consumer_key: settings.twitter.consumer_key,
      consumer_secret: settings.twitter.consumer_secret,
      access_token_key: settings.twitter.access_token_key,
      access_token_secret: settings.twitter.access_token_secret 
    }); 
  };

  streamer.start_streaming = function() {
    streamer.connect();

    // Tell the twitter API to filter on the watched_accounts. 
    streamer.connection.stream(
      'statuses/filter', {follow: settings.watched_accounts}, function(stream) {

      // We have a connection. Now watch the 'tweets' event for incoming tweets.
      stream.on('data', function(tweet) {

        // Make sure it was a valid tweet
        if (tweet.text !== undefined) {
          // Send to all the clients
          sockets.sockets.emit('tweets', [streamer.shrink_tweet(tweet)]);
        }
      });
    });
  };

  // So that we only send the required info to the front-end.
  // tweet is the full array of Tweet data fetched from Twitter.
  streamer.shrink_tweet = function(tweet) {
    var shrunk = {
      text: tweet.text,
      user: {
        id: tweet.user.id,
        profile_image_url: tweet.user.profile_image_url 
      }
    };
    return shrunk;
  };

  return streamer;
};
