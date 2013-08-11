var twelescreen_client = {

  config: {
    category: {},
    // May be overridden by passed-in config settings.
    number_of_tweets_to_display: 3,
    seconds_per_slide: 10
  },

  socket: null,

  /**
   * Fresh tweets get put in here when they arrive.
   * Newest at end.
   */
  tweet_queue: [],

  /**
   * The tweets that we have in hand to rotate through if we receive no new
   * ones. There should be config.number_of_tweets_to_display in here.
   * Newest at end.
   */
  tweet_store: [],

  /**
   * Which tweet from tweet_store are we currently viewing.
   * So we can cycle through them in order.
   */
  current_store_index: 0,

  /**
   * Should generally always be set to true.
   * Useful to be able to turn this off for debugging.
   */
  auto_advance: true,

  /**
   * The ID of the currently-displayed tweet.
   */
  current_tweet_id: '',

  init: function(spec) {
    $.extend(this.config, spec);

    this.prepare_display();

    this.prepare_connection();

    this.listen_for_tweets();

    this.start_carousel();
  },

  prepare_display: function() {
    var that = this;
    that.size_screen();
    $(window).resize(function() {
      that.size_screen();
    });

    $('#burn').html(this.config.category.burn_in_text);
  },

  prepare_connection: function() {
    var that = this;
    that.socket = io.connect(window.location.hostname);
    that.socket.on('connect', function(){
      that.hide_alert('connection');
    });
    that.socket.on('disconnect', function(){
      that.show_alert('connection', that.config.category.disconnect_warning);
    });
  },

  listen_for_tweets: function() {
    var that = this;
    // Tweets arrive as an array, with the newest last.
    that.socket.on('messages', function(messages_packet) {
      $.each(messages_packet.tweets, function(idx, tweet) {
        if (that.tweet_is_in_this_category(tweet)) {
          if (messages_packet.type == 'cached') {
            that.add_to_tweet_store(tweet);
          } else {
            that.add_to_tweet_queue(tweet);
          };
        };
      });
    });
  },

  start_carousel: function() {
    if (this.auto_advance) {
      this.show_greeting();
    };
  },

  /**
   * Decides what to show next; a new, queued tweet, or something from the
   * store.
   */
  show_next_item: function() {
    if (this.auto_advance) {
      if (this.tweet_queue.length > 0) {
        this.show_new_tweet();
      } else {
        this.show_stored_tweet();
      };
    };
  },


  /**
   * Displays the ATTENTION CITIZENS type greeting.
   * If `next_tweet` is set (to a tweet object), then that will be shown next.
   * Otherwise, this is followed by whatever show_next_item() decides.
   */
  show_greeting: function(next_tweet) {
    var that = this;
    $('#greeting').html(that.config.category.greeting);
    that.show_slide('greeting');
    $('#greeting')
      .delay(1000).queueFn(function(){$(this).addClass('invert')})
      .delay(1000).queueFn(function(){$(this).removeClass('invert')})
      .delay(1000).queueFn(function(){$(this).addClass('invert')})
      .delay(1000).queueFn(function(){$(this).removeClass('invert')})
      .delay(1000).queueFn(function(){
        if (next_tweet) {
          that.display_tweet(next_tweet); 
        } else {
          that.show_next_item();
        };
      });
  },

  /**
   * Show a random tweet from the carousel (but not the one already displayed).
   */
  show_stored_tweet: function() {
    if (this.current_store_index == 0) {
      this.current_store_index = this.tweet_store.length - 1;
    } else {
      this.current_store_index--;
    };
    this.display_tweet(this.tweet_store[this.current_store_index]);
  },

  /**
   * Take a tweet from the queue, add it to the store, show the greeting, then
   * display the tweet.
   */
  show_new_tweet: function() {
    var tweet = this.tweet_queue.shift();
    this.add_to_tweet_store(tweet);
    this.show_greeting(tweet);
  },

  /**
   * Do the actual displaying of a tweet.
   */
  display_tweet: function(tweet) {
    if (typeof tweet === 'undefined') {
      this.show_alert('tweets', 'No tweets found');
    } else {
      this.hide_alert('tweets');
      if ( ! $('#tweet-'+tweet.id).exists()) {
        this.make_tweet_slide(tweet);
      };
      this.show_slide('tweet-'+tweet.id);
      this.current_tweet_id = tweet.id;
    };
    var that = this;
    setTimeout(function(){
      that.show_next_item();
    }, that.config.seconds_per_slide * 1000);
  },

  make_tweet_slide: function(tweet) {
    var id = 'tweet-'+tweet.id;
    $('body').append(
      $('<div/>').attr('id', id).addClass('tweet').append(
        $('<div/>').addClass('tweet-account').html(
          '<img src="' + tweet.user.profile_image_url + '" alt="" class="tweet-account-avatar" /><div class="tweet-account-name">' + tweet.user.name + "</div>"
        )
      ).append(
        $('<div/>').addClass('tweet-message vbox center').html(
          '<div class="tweet-message-inner">' + tweet.text + '</div>'
        )
      ).addClass('slide')
    );
    this.size_slide('#tweet-'+tweet.id);
    $('#' + id + ' .tweet-account').fitText(1.5);
    // The minFontSize stops things going too small when the browser is small,
    // and very portrait. Might need to adjust for, say phone screens.
    $('#' + id + ' .tweet-message-inner').fitText(1.1, {minFontSize: 45});
  },

  size_screen: function() {
    this.size_slide('.slide');
    this.size_slidetitle();
  },

  size_slide: function(selector) {
    $(selector).width($(window).width()).height($(window).height());
    // Leave space for the account stripe.
    var margin = $(selector + ' .tweet-account').height();
    $(selector + ' .tweet-message')
      .css({'margin-top': margin}) 
      .height($(window).height() - margin - (margin / 3));
  },

  /**
   * In addition to what's done by size_slide().
   * The #greeting and #burn slides.
   */
  size_slidetitle: function() {
    // To move the vertically-centered text up a bit.
    var padding_bottom = Math.round($('.slidetitle').height() / 10);
    $('.slidetitle')
      .css('paddingBottom', padding_bottom)
      .height($('.slidetitle').height() - padding_bottom)
      .fitText(0.7);
  },

  show_slide: function(to_id) {
    var from_id = $('.slide-on').attr('id');
    var $from = $('#'+from_id);
    var $to = $('#'+to_id);

    // We have different types of transition for different combinations:
    if (typeof from_id === 'undefined' && to_id == 'greeting') {
      this.transition_nothing_to_greeting($to); 

    } else if (typeof from_id === 'undefined' && $to.hasClass('tweet')) {
      this.transition_nothing_to_tweet($to); 

    } else if (from_id == 'greeting' && $to.hasClass('tweet')) {
      this.transition_greeting_to_tweet($from, $to); 

    } else if ($from.hasClass('tweet') && to_id == 'greeting') {
      this.transition_tweet_to_greeting($from, $to); 

    } else if ($from.hasClass('tweet') && $to.hasClass('tweet')) {
      this.transition_tweet_to_tweet($from, $to); 

    } else {
      console.log('UNDEFINED TRANSITION: ', from_id, to_id);
    };
  },

  /**
   * Probably the first display of the greeting.
   */
  transition_nothing_to_greeting: function($to) {
    $to.addClass('slide-on');
  },

  /**
   * Currently only happens when testing, manually advancing direct to a tweet.
   */
  transition_nothing_to_tweet: function($to) {
    $to.addClass('slide-on').css({zIndex: 200});
  },

  /**
   * Probably the brand new tweet.
   */
  transition_greeting_to_tweet: function($from, $to) {
    $to.addClass('slide-on').css({zIndex: 200});
    $from.removeClass('slide-on');
  },

  /**
   * Probably when there's a new tweet being announced.
   */
  transition_tweet_to_greeting: function($from, $to) {
    $to.addClass('slide-on');
    $from.removeClass('slide-on').css('zIndex', 100);
  },

  /**
   * Standard fade as we cycle through tweets.
   */
  transition_tweet_to_tweet: function($from, $to) {
    // Move on stage, behind current slide:
    $to.addClass('slide-on');
    // Make current (front) slide transparent:
    $from.animate(
      {opacity: 0},
      400,
      function(){
        // Move old current slide off-stage, put z-index back to default.
        $from.removeClass('slide-on').css({zIndex: 100, opacity: 1}); 
        // Move new current slide forward so we can do all this next time.
        $to.css({zIndex: 200});
      }
    );
  },

  show_alert: function(id, message) {
    $('body').append(
      '<div id=' + id + ' class="alert"><div class="alert-inner">' + message + '</div></div>'
    );
    $('#'+id).fitText(1.5);
  },

  hide_alert: function(id) {
    $('#'+id).remove();
  },

  add_to_tweet_store: function(tweet) {
    this.tweet_store.push(tweet);
    if (this.tweet_store.length > this.config.number_of_tweets_to_display) {
      var old_tweet = this.tweet_store.shift();
      $('#tweet-'+old_tweet.id).remove();
    };
    // So that we'll show this tweet next.
    this.current_store_index = this.tweet_store.length - 1;
  },

  add_to_tweet_queue: function(tweet) {
    this.tweet_queue.push(tweet);
  },

  tweet_is_in_this_category: function(tweet) {
    if (this.config.category.screen_names.indexOf(tweet.user.screen_name) > -1) {
      return true;
    } else {
      return false;
    };
  }
};

jQuery.fn.exists = function(){return jQuery(this).length>0;};  


/*
 * jQuery queueFn - v0.7 - 9/05/2010
 * http://benalman.com/projects/jquery-misc-plugins/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function($){$.fn.queueFn=function(c){var b,d,a=Array.prototype.slice.call(arguments,1);if(typeof c==="boolean"){if(c){d=this;b=this.length}c=a.shift()}c=$.isFunction(c)?c:$.fn[c];return this.queue(function(){!--b&&c.apply(d||this,a);$.dequeue(this)})}})(jQuery);


/*!
* FitText.js 1.1 (PLUS custom vertical re-sizing for Twelescreen's messages)
*
* Copyright 2011, Dave Rupert http://daverupert.com
* Released under the WTFPL license
* http://sam.zoy.org/wtfpl/
*
* Date: Thu May 05 14:23:00 2011 -0600
*/
(function( $ ){

  $.fn.fitText = function( kompressor, options ) {

    // Setup options
    var compressor = kompressor || 1,
        settings = $.extend({
          'minFontSize' : Number.NEGATIVE_INFINITY,
          'maxFontSize' : Number.POSITIVE_INFINITY
        }, options);

    return this.each(function(){

      // Store the object
      var $this = $(this);

      // Resizer() resizes items based on the object width divided by the compressor * 10
      var resizer = function () {

        var font_size = Math.max(Math.min($this.width() / (compressor*10), parseFloat(settings.maxFontSize)), parseFloat(settings.minFontSize));

        // For Twelescreen, we also save the font size in data-font-size, so that
        // if we change it we have a record of what it was before.
        $this.css('font-size', font_size).data('font-size', font_size);

        // If this is a Twitter message, the content might be too long at the
        // standard size. So we'll shrink it in a way that will hopefully make
        // it fit the space available.
        if ($this.hasClass('tweet-message-inner')) {
          if ($this.height() > $this.parent().height()) {
            var new_font_size = (
              // The original fitText-created size.
              $this.data('font-size')
               *
              Math.pow(
               // The area of the message 'window'
               ($this.parent().height() * $this.parent().width())
                /
               // Divided by the larger area of the actual message
               ($this.height() * $this.width()),
               // To the power of 1/1.75
               (1/1.75)
              )
              // That last figure is just a figure that seems to work in our
              // situation, for different browser dimensions.
            );

            $this.css('font-size', new_font_size);
          };
        };
      };

      // Call once to set.
      resizer();

      // Call on resize. Opera debounces their resize by default.
      $(window).on('resize.fittext orientationchange.fittext', resizer);

    });

  };

})( jQuery );

