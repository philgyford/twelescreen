/**
 * Everything to do with fetching tweets from Twitter, doing things to the
 * tweets, and sending them to the front end.
 *
 * Get it going with:
 *  var streamer = require('./app/streamer')(settings, twitter, sockets);
 *  streamer.start();
 */
module.exports = function(settings, twitter, sockets) {

  var streamer = this;

  /**
   * For each Twitter account, its most recent tweets.
   */
  streamer.tweet_cache = {};


  /**
   * Set everything going.
   * First get existing tweets, then start listening for new ones.
   */
  streamer.start = function() {
    streamer.twitter = new twitter({
      consumer_key: settings.twitter.consumer_key,
      consumer_secret: settings.twitter.consumer_secret,
      access_token_key: settings.twitter.access_token_key,
      access_token_secret: settings.twitter.access_token_secret 
    });

    // It'd probably be best to wait for all the previous tweets to be cached
    // before starting to stream. But I couldn't work out how to do that, using
    // the async module. So for now, we'll hope it won't be an issue.
    streamer.cache_previous_tweets();
    streamer.start_streaming();
  };


  streamer.cache_previous_tweets = function(callback) {
    console.log('Caching previous tweets starting');

    settings.watched_accounts.forEach(function(id) {
      console.log('fetching tweets for '+id);
      streamer.twitter.getUserTimeline({
        user_id: id, count: 3, trim_user: false, exclude_replies: false,
        contributor_details: true, include_rts: false
      }, function(err, tweets) {
        if (err) {
          console.log("Error fetching tweets: "+err); 
        } else {
          tweets.forEach(function(tweet){
            streamer.add_tweet_to_cache(tweet);
          });
        };
      })
    });
  };


  /**
   * Starts listening for new tweets coming from Twitter.
   * When one comes in, sends it to the front end.
   */
  streamer.start_streaming = function(callback) {
    console.log('Streaming from Twitter starting');

    // Tell the twitter API to filter on the watched_accounts. 
    streamer.twitter.stream(
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


  streamer.add_tweet_to_cache = function(tweet) {
    var shrunk_tweet = streamer.shrink_tweet(tweet);  
    if (tweet.user.id_str in streamer.tweet_cache) {
      streamer.tweet_cache[tweet.user.id_str].push(shrunk_tweet); 
    } else {
      streamer.tweet_cache[tweet.user.id_str] = [shrunk_tweet];
    };
  };


  /**
   * So that we only send the required info to the front-end.
   * tweet is the full array of Tweet data fetched from Twitter.
   */
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
