var twelescreen_client = {

  config: {
    category: {},
    number_of_tweets_to_display: 3
  },

  socket: null,

  init: function(spec) {
    $.extend(this.config, spec);

    this.listen_for_tweets();
  },

  listen_for_tweets: function() {
    var that = this;
    that.socket = io.connect(window.location.hostname);
    // Tweets arrive as an array, with the newest first.
    that.socket.on('tweets', function(tweets) {
      $.each(tweets.reverse(), function(idx, tweet) {
        if (that.tweet_is_in_this_category(tweet)) {
          $('#tweets').prepend('<li><img src="' + tweet.user.profile_image_url + '" /> '+ tweet.text + '</li>');

          if ($('#tweets li').length > that.config.number_of_tweets_to_display) {
            $('#tweets li:last-child').remove();
          };
        };
      });
    });
  },

  tweet_is_in_this_category: function(tweet) {
    if (this.config.category.accounts.indexOf(tweet.user.id) > -1) {
      return true;
    } else {
      return false;
    };
  }
};

