/**
 * Everything to do with fetching tweets from Twitter, doing things to the
 * tweets, and sending them to the front end.
 *
 * Get it going with:
 *  var streamer = require('./app/streamer')(settings, twitter, io, _);
 *  streamer.start();
 */
module.exports = function(settings, twitter, io, _) {

  var streamer = this;

  /**
   * For each category, its most recent tweets, newest last.
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

    // These methods are kind of dependent on each other, so we only run them
    // serially.
    streamer.queue = [
                      streamer.get_user_ids,
                      streamer.cache_previous_tweets,
                      streamer.start_streaming
                    ];

    // Let's start...
    streamer.next_in_queue();
  };


  // Call this to call the next method in the queue.
  streamer.next_in_queue = function() {
    if (streamer.queue.length > 0) {
      (streamer.queue.shift())();
    };
  };

      
  /**
   * Get all the Twitter user IDs from the screen_names we have in config.
   * We need the user IDs, not screen_names, for streaming.
   */
  streamer.get_user_ids = function() {
    console.log('Streamer (1/3 start):  Fetching Twitter user IDs');
    streamer.twitter.lookupUser(settings.watched_screen_names, function(err, users) {
      if (err) {
        console.log("Streamer: Error fetching user IDs: "+err);
      } else {
        users.forEach(function(user){
          settings.watched_ids.push(user.id); 
        });
        // On to the next method...
        console.log('Streamer (1/3 finish): Fetching Twitter user IDs');
        streamer.next_in_queue();
      }; 
    });
  };


  /**
   * Get some recent tweets for each user account, so that we have some tweets
   * to display from the start.
   */
  streamer.cache_previous_tweets = function() {
    console.log('Streamer (2/3 start):  Caching existing Tweets');

    var id_count = 1;
    settings.watched_ids.forEach(function(id) {
      // Note: The 'count' doesn't include retweets and replies, so we'll
      // probably get less than that many tweets returned.
      streamer.twitter.getUserTimeline({
        user_id: id, 
        trim_user: false, exclude_replies: true,
        contributor_details: true, include_rts: false, count: 200
      }, function(err, tweets) {
        if (err) {
          console.log("Streamer: Error fetching tweets for user id '"+id+"': "+err); 
        } else {
          tweets.forEach(function(tweet){
            streamer.add_tweet_to_cache(tweet);
          });
          // On to the next method...
          if (id_count == settings.watched_ids.length) {
            console.log('Streamer (2/3 finish): Caching existing Tweets');
            streamer.next_in_queue();
          } else {
            id_count++;
          };
        };
      })
    });
  };


  /**
   * Starts listening for new tweets coming from Twitter.
   * When one comes in, sends it to the front end.
   */
  streamer.start_streaming = function() {
    console.log('Streamer (3/3 start):      Listening for new Tweets');
    streamer.prepare_for_clients();

    // Tell the twitter API to filter on the watched_ids. 
    streamer.twitter.stream(
      'statuses/filter', {follow: settings.watched_ids}, function(stream) {

      // We have a connection. Now watch the 'tweets' event for incoming tweets.
      stream.on('data', function(tweet) {

        // Make sure it was a valid tweet, and also not a reply, and also
        // not a retweet.
        if (tweet.text !== undefined && tweet.in_reply_to_user_id === null && tweet.retweeted_status === undefined) {
          streamer.add_tweet_to_cache(tweet);
          // Get all the categories this Tweet's account is in
          // and send the tweet to all clients in that category's sockets 'room'.
          settings.screen_name_to_category[tweet.user.screen_name.toLowerCase()].forEach(
          function(category) {
            io.sockets.in(category).emit('messages',
              {type: 'fresh', tweets: [streamer.shrink_tweet(tweet)] }
            );
          });
        }
      });
      console.log('Streamer (3/3 continuing): Listening for new Tweets');
    });
  };


  /**
   * When a client connects, give them initial data.
   * We only send them the most recent tweets for their category/room.
   */
  streamer.prepare_for_clients = function() {
    io.sockets.on('connection', function(client) { 
      console.log('Connected client:', client.id);
      client.on('subscribe', function(room) {
        if (_.indexOf(settings.valid_categories, room) >= 0) {
          client.join(room);
          client.emit('messages',
            {type: 'cached', tweets: streamer.cache_for_category(room, settings.categories[room].number_of_tweets) }
          );
        } else {
          console.log("INVALID ROOM: "+room);
        };
      });
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


  streamer.cache_sorter = function(a,b) {
    return a.time - b.time;
  };


  /**
   * Returns all the tweets in the cache for a particular category.
   * If limit is set to a number, that number of most recent tweets is returned.
   * Otherwise, the whole cache for that category is sent.
   */
  streamer.cache_for_category = function(category, limit) {
    if (limit) {
      return streamer.cache[category].slice(-limit);
    } else {
      return streamer.cache[category];
    };
  };


  /**
   * Most recent tweets will be at the start of each category's tweets array.
   * `tweet` is a full array of data about a tweet.
   */
  streamer.add_tweet_to_cache = function(tweet) {
    var shrunk_tweet = streamer.shrink_tweet(tweet);  
    // We want to ignore any retweets of the the accounts we follow:
    if (tweet.retweeted_status === undefined) {
      // For each category this twitter account is associated with, add to its
      // cache.
      settings.screen_name_to_category[tweet.user.screen_name.toLowerCase()].forEach(
        function(category){
          if (category in streamer.cache) {
            streamer.cache[category].push(shrunk_tweet); 
          } else {
            streamer.cache[category] = [shrunk_tweet];
          };
          // Sort, in case things have got out of sync.
          streamer.cache[category].sort(streamer.cache_sorter);
          // Remove any superfluous items from start.
          streamer.cache[category].splice(0,
            (streamer.cache[category] - settings.categories[category].number_of_tweets));
        }
      );
    };
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
