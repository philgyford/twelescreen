var twelescreen_client = {

  config: {
    // May be overridden by passed-in config settings:
    disconnect_warning: "Connection to server lost",
    category_key: '',
    font: null,
    screen_names: [],
    greetings: ["Hello there"],
    slogans: [],
    number_of_tweets: 5,
    time_per_slide: 5000,
    slide_transition_time: 400, 
    greeting_time: 5000,
    chance_of_slogan: 5
  },

  socket: null,

  /**
   * Fresh tweets get put in here when they arrive.
   * Newest at end.
   */
  tweet_queue: [],

  /**
   * The tweets that we have in hand to rotate through if we receive no new
   * ones. There should be config.number_of_tweets in here.
   * Newest at end.
   */
  tweet_store: [],

  /**
   * Which tweet from tweet_store are we currently viewing.
   * So we can cycle through them in order.
   */
  current_store_index: 0,

  /**
   * We put any slogans in here, in random order, and cycle through them.
   * It's then refilled when empty.
   */
  slogan_queue: [],

  /**
   * Should generally always be set to true.
   * Useful to be able to turn this off for debugging.
   */
  auto_advance: true,

  /**
   * The ID of the currently-displayed tweet.
   */
  current_tweet_id: '',



// Move all the fonts stuff into a separate method.
// Pass the function that's called after fonts.done() into it.
// Call that method from both init_screen and init_method.

  /**
   * Call this to initialise everything.
   * page is either 'menu' or 'screen', depending on the type of page.
   * spec is an object of items that can override this.config settings.
   */
  init: function(page, spec) {
    $.extend(this.config, spec);

    var init_callback = function(){};

    if (page == 'screen') {
      var that = this;
      init_callback = function(){
        that.prepare_screen();
        that.prepare_connection();
        that.listen_for_tweets();
        that.start_rotation();
      };
    };

    this.prepare_fonts(init_callback);
  },

  prepare_fonts: function(init_callback) {
    var fonts = $.Deferred();

    // If we have a font set, then load it...
    // Assuming the WebFont JS is also working.
    if (this.config.font && typeof WebFont !== 'undefined') {
      WebFont.load({
        google: {
          families: [this.config.font]
        },
        active: function() { fonts.resolve(); }
      });
      (function() {
        var wf = document.createElement('script');
        wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
            '://ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js';
        wf.type = 'text/javascript';
        wf.async = 'true';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(wf, s);
      })();
    } else {
      // No font to load, so let's move on...
      fonts.resolve();
    };

    // Starts the rest of the page-building process.
    fonts.done(init_callback);
  },

  prepare_screen: function() {
    var that = this;
    that.size_screen();
    $(window).resize(function() {
      that.size_screen();
    });

    if (this.config.burn_in_text) {
      $('#burn').html(this.config.burn_in_text);
    };
  },

  prepare_connection: function() {
    var that = this;
    that.socket = io.connect(window.location.hostname);
    that.socket.on('connect', function(){
      that.hide_alert('connection-alert');
      that.socket.emit('subscribe', that.config.category_key);
    });
    that.socket.on('disconnect', function(){
      that.show_alert('connection-alert', that.config.disconnect_warning);
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
            // type == 'fresh'
            that.add_to_tweet_queue(tweet);
          };
        };
      });
    });
  },

  start_rotation: function() {
    if (this.auto_advance) {
      this.show_greeting();
    };
  },

  /**
   * Decides what to show next; a new, queued tweet, or something from the
   * store. Or maybe a random slogan.
   */
  show_next_item: function() {
    if (this.auto_advance) {
      if (this.tweet_queue.length > 0) {
        // We have a new tweet waiting to be shown.
        this.show_new_tweet();
      } else {
        if (this.config.slogans.length > 0 && (Math.random() * 100) < this.config.chance_of_slogan && ! $('#slogan').is(':visible')) {
          this.show_slogan();
        } else {
          this.show_stored_tweet();
        };
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
    var idx = _.random(0, that.config.greetings.length - 1);
    $('#greeting').html(that.config.greetings[idx]);
    that.show_slide('greeting');
    var ms = that.config.greeting_time / 5;
    $('#greeting')
      .delay(ms).queueFn(function(){$(this).addClass('is-inverted')})
      .delay(ms).queueFn(function(){$(this).removeClass('is-inverted')})
      .delay(ms).queueFn(function(){$(this).addClass('is-inverted')})
      .delay(ms).queueFn(function(){$(this).removeClass('is-inverted')})
      .delay(ms).queueFn(function(){
        if (next_tweet) {
          that.display_tweet(next_tweet); 
        } else {
          that.show_next_item();
        };
      });
  },

  show_slogan: function() {
    if (this.config.slogans.length == 0) {
      return;
    };

    if (this.slogan_queue.length == 0) {
      this.slogan_queue = _.shuffle(this.config.slogans);
    };
    
    $('#slogan').html(this.slogan_queue.shift());
    this.show_slide('slogan');
    var that = this;
    setTimeout(function(){
      that.show_next_item();
    }, that.config.time_per_slide);
  },

  /**
   * Show a tweet from the store of existing tweets.
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
      this.show_alert('tweets-alert', 'No tweets found');
    } else {
      this.hide_alert('tweets-alert');
      if ( ! $('#tweet-'+tweet.id).exists()) {
        this.make_tweet_slide(tweet);
      };
      // If this tweet has an image, and has been seen before, the text panel
      // will currently have 0 opacity. So reset it before showing.
      $('#tweet-'+tweet.id+' .tweet_message_panel-text').css('opacity', 1);
      this.show_slide('tweet-'+tweet.id);
      this.current_tweet_id = tweet.id;
    };
    var that = this;
    setTimeout(function(){
      if (tweet && $('#tweet-'+tweet.id+' .tweet_message_panel-image').exists()) {
        // Hide text to reveal image, wait, then move on.
        $('#tweet-'+tweet.id+' .tweet_message_panel-text').animate(
          {'opacity': 0},
          that.config.slide_transition_time,
          function(){
            setTimeout(function(){
              that.show_next_item();
            }, that.config.time_per_slide);
          }
        );
      } else {
        // No image on this slide, just move on.
        that.show_next_item();
      };
    }, that.config.time_per_slide);
  },

  make_tweet_slide: function(tweet) {
    var id = 'tweet-'+tweet.id;

    // Make URLs into links.
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var tweet_text = tweet.text.replace(exp, "<a href='$1'>$1</a>");

    $('body').append(
      $('<div/>').attr('id', id).addClass('slide-tweet').append(
        $('<div/>').addClass('tweet_account').html(
          '<img src="' + tweet.user.profile_image_url + '" alt="" class="tweet_account_avatar" /><div class="tweet_account_name">' + tweet.user.name + "</div>"
        )
      ).append(
        $('<div/>').addClass('tweet_message').html(
          '<div class="tweet_message_panel tweet_message_panel-text vbox center"><div class="tweet_message_panel_inner">' + tweet_text + '</div></div>'
        )
      ).addClass('slide')
    );
    if ('image' in tweet) {
      $('#'+id+' .tweet_message').append(
        $('<div/>').addClass('tweet_message_panel tweet_message_panel-image vbox center').append(
          $('<div/>').addClass('tweet_message_panel_inner').append(
            $('<img/>').attr('src', tweet.image.url).data({
              // Width and height as data attributes, for reference when resizing.
              width: tweet.image.width,
              height: tweet.image.height,
              orientation: tweet.image.width >= tweet.image.height ? 'landscape' : 'portrait'
            })
          )
        ).css('z-index', 100)
      );
    };
    this.size_slide('#tweet-'+tweet.id);
    $('#' + id + ' .tweet_account').fitText(1.5);
    // The minFontSize stops things going too small when the browser is small,
    // and very portrait. Might need to adjust for, say phone screens.
    $('#' + id + ' .tweet_message_panel-text .tweet_message_panel_inner').fitText(1.1, {minFontSize: 45});
  },

  size_screen: function() {
    this.size_slide('.slide');
    this.size_slide_title();
  },

  size_slide: function(selector) {
    $slide = $(selector);
    $slide.width($(window).width()).height($(window).height());

    if ($('.tweet_account', $slide).exists()) {
      // It's a .slide-tweet.
      
      // Leave space for the account stripe.
      var margin_top = Math.floor($('.tweet_account', $slide).height());
      var padding_top = Math.floor(margin_top / 8);
      var padding_bottom = Math.floor(margin_top / 3);
      var message_height = $(window).height() - margin_top - padding_top - padding_bottom;
      $('.tweet_message', $slide)
        .css({'margin-top': margin_top,
              'padding-top': padding_top,
              'padding-bottom': padding_bottom})
        .height(message_height);
      $('.tweet_message_panel').height(message_height);

      // Make any image the tweet has stretch to fill space.
      if ($('.tweet_message_panel-image', $slide).exists()) {
        var $img = $('.tweet_message_panel-image img', $slide);
        var max_w = $('.tweet_message_panel-image', $slide).width();
        var max_h = $('.tweet_message_panel-image', $slide).height() - padding_bottom;
        var w, h;
        if ($img.data('orientation') == 'landscape') {
          w = max_w;
          h = Math.floor(($img.data('height') / $img.data('width')) * max_w);
          if (h > max_h) {
            h = max_h;
            w = Math.floor(($img.data('width') / $img.data('height')) * max_h);
          };
        } else {
          h = max_h;
          w = Math.floor(($img.data('width') / $img.data('height')) * max_h);
          if (w > max_w) {
            w = max_w;
            h = Math.floor(($img.data('height') / $img.data('width')) * max_w);
          };
        };
        $img.width(w).height(h); 
      };
    };
  },

  /**
   * In addition to what's done by size_slide().
   * The #greeting and #burn slides.
   */
  size_slide_title: function() {
    // To move the vertically-centered text up a bit.
    var padding_bottom = Math.round($('.slide-title').height() / 10);
    $('.slide-title')
      .css('paddingBottom', padding_bottom)
      .height($('.slide-title').height() - padding_bottom)
      .fitText(0.7);
  },

  show_slide: function(to_id) {
    var from_id = $('.is-slide-on').attr('id');
    var $from = $('#'+from_id);
    var $to = $('#'+to_id);
    var title_ids = ['greeting', 'slogan'];

    // We have different types of transition for different combinations:
    if (typeof from_id === 'undefined' && title_ids.indexOf(to_id) > -1) {
      this.transition_nothing_to_title($to); 

    } else if (typeof from_id === 'undefined' && $to.hasClass('slide-tweet')) {
      this.transition_nothing_to_tweet($to); 

    } else if (title_ids.indexOf(from_id) > -1 && $to.hasClass('slide-tweet')) {
      this.transition_title_to_tweet($from, $to); 

    } else if ($from.hasClass('slide-tweet') && title_ids.indexOf(to_id) > -1) {
      this.transition_tweet_to_title($from, $to); 

    } else if ($from.hasClass('slide-tweet') && $to.hasClass('slide-tweet')) {
      this.transition_tweet_to_tweet($from, $to); 

    } else if (title_ids.indexOf(from_id) > -1 && title_ids.indexOf(to_id) > -1) {
      this.transition_title_to_title($from, $to); 

    } else {
      console.log("UNDEFINED TRANSITION, from '#" + from_id + "' to '#" + to_id + "'");
    };
  },

  /**
   * Probably the first display of the greeting.
   */
  transition_nothing_to_title: function($to) {
    $to.addClass('is-slide-on');
  },

  /**
   * Currently only happens when testing, manually advancing direct to a tweet.
   */
  transition_nothing_to_tweet: function($to) {
    $to.addClass('is-slide-on').css({zIndex: 200});
  },

  /**
   * Probably the brand new tweet.
   */
  transition_title_to_tweet: function($from, $to) {
    $to.addClass('is-slide-on').css({zIndex: 200});
    $from.removeClass('is-slide-on');
  },

  /**
   * eg, from greeting to slogan.
   */
  transition_title_to_title: function($from, $to) {
    $to.addClass('is-slide-on');
    $from.removeClass('is-slide-on');
  },

  /**
   * Probably when there's a new tweet being announced.
   */
  transition_tweet_to_title: function($from, $to) {
    $to.addClass('is-slide-on');
    $from.removeClass('is-slide-on').css('z-index', 100);
  },

  /**
   * Standard fade as we cycle through tweets.
   */
  transition_tweet_to_tweet: function($from, $to) {
    // Move on stage, behind current slide:
    $to.addClass('is-slide-on');
    // Make current (front) slide transparent:
    $from.animate(
      {opacity: 0},
      this.config.slide_transition_time,
      function(){
        // Move old current slide off-stage, put z-index back to default.
        $from.removeClass('is-slide-on').css({zIndex: 100, opacity: 1}); 
        // Move new current slide forward so we can do all this next time.
        $to.css({zIndex: 200});
      }
    );
  },

  show_alert: function(id, message) {
    if ($('#'+id).exists()) {
      $('#'+id+' .alert_inner').text(message); 
    } else {
      $('body').append(
        '<div id=' + id + ' class="alert"><div class="alert_inner">' + message + '</div></div>'
      );
    };
    $('#'+id).fitText(4);
  },

  hide_alert: function(id) {
    $('#'+id).remove();
  },

  add_to_tweet_store: function(tweet) {
    this.tweet_store.push(tweet);
    if (this.tweet_store.length > this.config.number_of_tweets) {
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
    if (this.config.screen_names.indexOf(tweet.user.screen_name) > -1) {
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
        if ($this.hasClass('tweet_message_panel_inner')) {
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
               // To the power of 1/1. Er, 1.
               (1/1)
              )
              // At one point we used 1/1.75 as an adjustment, but we're not
              // needing that now. Keeping this here in case we need to tweak
              // things in future. Rather trial and error...
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

