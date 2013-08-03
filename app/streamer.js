/**
 * Everything to do with fetching tweets from Twitter, doing things to the
 * tweets, and sending them to the front end.
 *
 * Get it going with:
 *  var streamer = require('./app/streamer')(settings, twitter, sockets);
 *  streamer.start();
 */
module.exports = function(settings, twitter, sockets, _) {

  var streamer = this;

  streamer.number_of_tweets_to_cache = 3;

  /**
   * For each category, its most recent tweets, newest first.
   * eg
   * {
   *   'uk': [{...}, {...}, {...}],
   *   'us': ...
   * }
   */
  streamer.cache = {};


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
        };
      })
    });
  };


  /**
   * Returns an array of all the tweets in the cache, not split into categories,
   * no duplicate tweets.
   */
  streamer.complete_cache = function() {
    return _.uniq(_.flatten(streamer.cache), function(item, key, id){
      return item.id;
    }).sort(streamer.cache_sorter);
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
          // Send to all the clients - we don't know which client is in which
          // category, so they filter in the client.
          sockets.sockets.emit('tweets', [streamer.shrink_tweet(tweet)]);
        }
      });
    });

    // When a client connect, give them initial data.
    // Here, we don't know which category they're in, so we send them
    // everything. Not sure how to make that better.
    sockets.sockets.on('connection', function(socket) { 
        socket.emit('tweets', streamer.complete_cache());
    });
  };

  streamer.cache_sorter = function(a,b) {
    return b.time - a.time;
  };

  /**
   * Most recent tweets will be at the start of each category's tweets array.
   * `tweet` is a full array of data about a tweet.
   */
  streamer.add_tweet_to_cache = function(tweet) {
    var shrunk_tweet = streamer.shrink_tweet(tweet);  
    var user_id = tweet.user.id_str;
    // For each category this twitter account is associated with, add to its
    // cache.
    settings.account_to_category[user_id].forEach(function(category){
      if (category in streamer.cache) {
        streamer.cache[category].push(shrunk_tweet); 
      } else {
        streamer.cache[category] = [shrunk_tweet];
      };
      // Sort with newest items first, in case things have got out of sync.
      streamer.cache[category].sort(streamer.cache_sorter);
      // Truncate cache to length.
      streamer.cache[category].length = streamer.number_of_tweets_to_cache;
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
