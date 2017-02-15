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
    if ( ! _.has(settings, 'twitter') || ! _.has(settings.twitter, 'consumer_key')) {
      console.log("ERROR: No Twitter API credentials found.");
      process.exit(1);
    };
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
    console.log(
          'Streamer: 1/3 Fetching Twitter user IDs             [starting]');

    streamer.twitter.lookupUser(settings.watched_screen_names, function(err, users) {
      if (err) {
        console.log("Streamer: Error fetching user IDs: "+err);
      } else {
        users.forEach(function(user){
          // Use id_str because id isn't always accurate in JavaScript:
          settings.watched_ids.push(user.id_str);
          settings.watched_id_to_screen_name[user.id_str] = user.screen_name;
        });
        // On to the next method...
        console.log(
            '                                                    [finished]');
        streamer.next_in_queue();
      };
    });
  };


  /**
   * Get some recent tweets for each user account, so that we have some tweets
   * to display from the start.
   */
  streamer.cache_previous_tweets = function() {
    console.log(
          'Streamer: 2/3 Caching existing Tweets               [starting]');

    var id_count = 0;
    var has_timed_out = false;

    // Sometimes things get stuck; we haven't finished fetching all the
    // twitter timelines, there are no errors, and the final timelines are
    // never returned.
    // So, we set a timer so that we will eventually move on to the next
    // method whether the timelines have all been fetched or not.
    var timer = setTimeout(function() {
      has_timed_out = true; // So we don't call do this again.
      console.log(
            '                                            [stuck, moving on]');
      streamer.next_in_queue();
    }, 40000);  // 40 seconds is usually enough for the twelescreen.com list.

    // The id passed in is a string:
    settings.watched_ids.forEach(function(id) {

      // Note: The 'count' doesn't include retweets and replies, so we'll
      // probably get less than that many tweets returned.
      var options = {
        user_id: id,
        trim_user: false,
        exclude_replies: true,
        contributor_details: true,
        include_rts: false,
        tweet_mode: 'extended',
        count: 200
      }; 

      streamer.twitter.getUserTimeline(options, function(err, tweets) {
        id_count++;

        if (err) {
          var screen_name = settings.watched_id_to_screen_name[id];
          console.log(
            "Streamer: Error fetching tweets for user '"+screen_name+"': "+err);
        } else {
          tweets.forEach(function(tweet){
            streamer.add_tweet_to_cache(tweet);
          });

          if (id_count == settings.watched_ids.length) {
            // We've fetched them all!
            if (! has_timed_out) {
              // Assuming we haven't already given up and done this in the
              // timer setTimeout() above.
              clearTimeout(timer);
              // Move on to the next method:
              console.log('                                                    [finished]');
              streamer.next_in_queue();
            };
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
    console.log(
          'Streamer: 3/3 Listening for new Tweets              [starting]');
    streamer.prepare_for_clients();

    // Tell the twitter API to filter on the watched_ids.
    streamer.twitter.stream(
      'statuses/filter', {follow: settings.watched_ids}, function(stream) {

      // We have a connection. Now watch the 'tweets' event for incoming tweets.
      stream.on('data', function(tweet) {

        // Make sure it was a valid tweet, and not a reply, and not a retweet.
        if (tweet.text !== undefined
            && tweet.in_reply_to_user_id === null
            && tweet.retweeted_status === undefined
        ) {
          // Get all the categories this Tweet's account is in.
          var categories = settings.screen_name_to_category[tweet.user.screen_name.toLowerCase()];
          // categories *should* always be an array. But occasionally Twitter
          // seems to send us a tweet by someone we don't follow. So:
          if (categories) {
            streamer.add_tweet_to_cache(tweet);
            // Send the tweet to all clients in that category's sockets 'room'.
            categories.forEach(function(category) {
              io.sockets.in(category).emit('messages',
                {type: 'fresh', tweets: [streamer.shrink_tweet(tweet)] }
              );
            });
          };
        }
      });
        console.log(
            '                                                    [finished]');
      console.log(
            '==============================================================');
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
      if (category in streamer.cache
        && Object.keys(streamer.cache[category]).length
      ) {
        return streamer.cache[category].slice(-limit);
      } else {
        // On a rare occasion something may have gone wrong and we fetched
        // no tweets for a category. Indeed, the category might not exist.
        // So we should return an empty array.
        return [];
      };
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
      // Get all the categories this Tweet's account is in.
      var categories = settings.screen_name_to_category[tweet.user.screen_name.toLowerCase()];
      // categories *should* always be an array. But occasionally Twitter
      // seems to send us a tweet by someone we don't follow. So:
      if (categories) {
        // For each category this twitter account is associated with, add to cache.
        categories.forEach(function(category){
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
        });
      };
    };
  };


  /**
   * So that we only send the required info to the front-end.
   * tweet is the full array of Tweet data fetched from Twitter.
   */
  streamer.shrink_tweet = function(tweet) {

    // The 48x48px normal size is too small, use the larger original one
    var img = tweet.user.profile_image_url.replace("_normal", "");
    var text = '';

    if ('extended_tweet' in tweet) {
      // A tweet from the Stream API:
      text = tweet.extended_tweet.full_text;
    } else if ('full_text' in tweet) {
      // A tweet from the Rest API (ie, when we cache the initial tweets):
      text = tweet.full_text;
    } else if ('text' in tweet) {
      // Just in case.
      text = tweet.text;
    };

    // Replace t.co URLs with expanded_urls in the tweet text
    var urls = tweet.entities.urls;
    for (var i = 0; i < urls.length; i++) {
      text = text.replace(urls[i]['url'], urls[i]['expanded_url']);
    };

    var media = [];
    if ('extended_tweet' in tweet
      && 'extended_entities' in tweet.extended_tweet
    ) {
      // A tweet from the Stream API:
      media = tweet.extended_tweet.extended_entities.media;
    } else if ('extended_entities' in tweet) {
      // A tweet from the Rest API (ie, when we cache the initial tweets):
      media = tweet.extended_entities.media;
    };
    // Remove any t.co URLs that link to media entities
    for (var i = 0; i < media.length; i++) {
      text = text.replace(media[i]['url'], '');
    };

    var shrunk = {
      // A subset of the usual data, with the same keys and structure:
      id: tweet.id_str,
      text: text.replace(/\n/g, '<br>'),
      user: {
        id: tweet.user.id_str,
        name: tweet.user.name,
        //profile_background_color: tweet.user.profile_background_color,
        //profile_background_image_url:
        //tweet.user.profile_background_image_url,
        profile_image_url: img,
        screen_name: tweet.user.screen_name
      },
      // Custom keys:
      // Unix timestamp for sorting.
      time: (new Date(tweet.created_at).getTime()) / 1000
    };
    // Custom, optional keys.
    if (tweet.extended_entities
        && 'media' in tweet.extended_entities
        && tweet.extended_entities.media[0].type == 'photo'
    ) {
      shrunk.image = {
        url: tweet.extended_entities.media[0].media_url + ':large',
        width: tweet.extended_entities.media[0].sizes.large.w,
        height: tweet.extended_entities.media[0].sizes.large.h
      };
    };
    return shrunk;
  };


  return streamer;
};
