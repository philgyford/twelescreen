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

  streamer.number_of_tweets_to_cache = 3;

  /**
   * For each Twitter account, its most recent tweets.
   * eg, '6253282': [{...}, {...}],
   */
  //streamer.user_cache = {};


  streamer.country_cache = {};


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
        user_id: id, count: streamer.number_of_tweets_to_cache,
        trim_user: false, exclude_replies: false,
        contributor_details: true, include_rts: false
      }, function(err, tweets) {
        if (err) {
          console.log("Error fetching tweets: "+err); 
        } else {
          tweets.forEach(function(tweet){
            streamer.add_tweet_to_cache(tweet);
          });
          console.log(streamer.country_cache);
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


  /**
   * Most recent tweets will be at the start of each user's tweets array.
   * tweet is a full array of data about a tweet.
   */
  streamer.add_tweet_to_cache = function(tweet) {
    var shrunk_tweet = streamer.shrink_tweet(tweet);  
    var user_id = tweet.user.id_str;
    //if (user_id in streamer.user_cache) {
      //streamer.user_cache[user_id].push(shrunk_tweet); 
    //} else {
      //streamer.user_cache[user_id] = [shrunk_tweet];
    //};
    //if (streamer.user_cache[user_id].length
    //> streamer.number_of_tweets_to_cache) {
      //streamer.user_cache[user_id].pop();
    //};
    settings.account_to_country[user_id].forEach(function(country){
      if (country in streamer.country_cache) {
        streamer.country_cache[country].push(shrunk_tweet); 
      } else {
        streamer.country_cache[country] = [shrunk_tweet];
      };
      // Sort with newest items first.
      streamer.country_cache[country].sort(function(a,b){
        return b.time - a.time;
      });
      // Truncate cache to length.
      streamer.country_cache[country].length = streamer.number_of_tweets_to_cache;
    });
  };


  /**
   * So that we only send the required info to the front-end.
   * tweet is the full array of Tweet data fetched from Twitter.
   */
  streamer.shrink_tweet = function(tweet) {
    var shrunk = {
      // A subset of the usual data, with the same keys and structure:
      id: tweet.id,
      text: tweet.text,
      user: {
        id: tweet.user.id,
        name: tweet.user.name,
        //profile_background_color: tweet.user.profile_background_color,
        //profile_background_image_url:
        //tweet.user.profile_background_image_url,
        profile_image_url: tweet.user.profile_image_url,
        screen_name: tweet.user.screen_name
      },
      // Custom keys:
      // Unix timestamp for sorting.
      time: (new Date(tweet.created_at).getTime()) / 1000
    };
    // Custom, optional keys.
    if ('media' in tweet.entities && tweet.entities.media[0].type == 'photo') {
      shrunk.image = {
        url: tweet.entities.media[0].media_url + ':large',
        width: tweet.entities.media[0].sizes.large.w,
        height: tweet.entities.media[0].sizes.large.h
      };
    };
    return shrunk;
  };


  return streamer;
};
