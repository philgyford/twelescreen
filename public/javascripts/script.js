$(function() {
    var socket = io.connect(window.location.hostname);
    socket.on('tweets', function(tweets) {
			$.each(tweets, function(idx, tweet) {
				$('#tweets').append('<li>' + tweet.text + '</li>');
			});
    });
})
