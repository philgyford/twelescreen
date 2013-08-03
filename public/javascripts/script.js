var twelescreen_client = {

  config: {
    country: {}
  },

  socket: null,

  init: function(spec) {
    $.extend(this.config, spec);

    this.listen_for_tweets();
  },

  listen_for_tweets: function() {
    var that = this;
    that.socket = io.connect(window.location.hostname);
    that.socket.on('tweets', function(tweets) {
      $.each(tweets, function(idx, tweet) {
        if (that.tweet_is_from_this_country(tweet)) {
          $('#tweets').append('<li><img src="' + tweet.user.profile_image_url + '" /> '+ tweet.text + '</li>');
        };
      });
    });
  },

  tweet_is_from_this_country: function(tweet) {
    if (this.config.country.accounts.indexOf(tweet.user.id) > -1) {
      return true;
    } else {
      return false;
    };
  }
};

