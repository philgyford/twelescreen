$(function() {
    var socket = io.connect(window.location.hostname);
    socket.on('tweets', function(tweets) {
      $.each(tweets, function(idx, tweet) {
        // If this tweet is from an account that's for this country:
        if (country_accounts.indexOf(tweet.user.id) > -1) {
          $('#tweets').append('<li><img src="' + tweet.user.profile_image_url + '" /> '+ tweet.text + '</li>');
        };
      });
    });
})
