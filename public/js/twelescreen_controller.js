var twelescreen = {
  controller: {},
  models: {}
};

/**
 * The main driver of the whole thing.
 * Call twelescreen.controller.init() to get things going.
 * It will instantiate either the menu or screen page.
 * Most of the code in here is for fetching and displaying the tweets on the
 * screen page, with the display done in twelescreen.models.screen_page.
 */
twelescreen.controller = {

  /**
   * Default config values.
   * May be overridden by passing values into init().
   */
  config: {
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

  /**
   * Will be one of twelescreen.models.menu_page or
   * twelescreen.models.screen_page.
   */
  page: null,


  // All of the variables below are used on the screen page, not the menu page.

  /**
   * Will be a socket.io connection.
   */
  socket: null,

  /**
   * Fresh tweet objects (not slides) get put in here when they arrive.
   * Newest at end.
   */
  tweet_queue: [],

  /**
   * The tweets that we have in hand to rotate through if we receive no new
   * ones. There should be config.number_of_tweets in here.
   * Newest at end.
   * Should be in sync with the this.page.get_tweet_slides() array.
   */
  tweet_store: [],

  /**
   * Which tweets from tweet_store are we currently viewing.
   * So we can cycle through them in order.
   */
  current_store_index: 0,

  /**
   * We put any greeting texts in here, in random order, and cycle through them.
   * It's then refilled when empty.
   */
  greeting_queue: [],

  /**
   * We put any slogans in here, in random order, and cycle through them.
   * It's then refilled when empty.
   */
  slogan_queue: [],

  /**
   * Will be a twelescreen.models.loading_title_slide object until fonts and/or
   * tweets have loaded.
   */
  loading_slide: null,

  /**
   * Should generally always be set to true.
   * Useful to be able to turn this off for debugging.
   * When set to false you can call twelescreen.controller.show_next_item()
   * in the console to manually advance to whatever slide is next.
   */
  auto_advance: true,

  /**
   * Set to true to output some logging in the console to help see what's
   * going on.
   */
  logging: false,

  /**
   * Call this to initialise everything.
   * page is either 'menu' or 'screen'.
   * spec is an object of items that can override this.config settings.
   */
  init: function(page, spec) {
    $.extend(this.config, spec);

    // Normalise the screen names to lower case for better comparisons.
    this.config.screen_names = this.config.screen_names.map(
                                          function(n){ return n.toLowerCase(); });

    this.make_loading_slide();

    var init_callback,
        that = this;

    $('#loading').width($(window).width()).height($(window).height());
    if (page == 'screen') {
      this.log("Displaying screen page");
      this.page = twelescreen.models.screen_page({
        burn_in_text: this.config.burn_in_text
      });
      init_callback = function(){
        that.log("Initialising page");
        that.page.init();
        that.prepare_connection();
        var tweets_loaded_callback = function(){
          that.destroy_loading_slide();
          that.next_tick();
        }; 
        that.listen_for_tweets(tweets_loaded_callback);
      };
    } else {
      this.log("Displaying menu page");
      this.page = twelescreen.models.menu_page({});
      init_callback = function(){
        that.log("Initialising page");
        that.destroy_loading_slide();
        that.page.init();
      };
    };

    this.prepare_fonts(init_callback);
  },

  /**
   * Shown until we successfully loads fonts and/or tweets.
   */
  make_loading_slide: function() {
    this.loading_slide = twelescreen.models.loading_title_slide({
      id: 'loading',
      text: "Loading Twelescreen",
      // Smaller text size than the default for loading screen:
      fit_text_size: 3
    });
    this.loading_slide.create_element();
    this.loading_slide.transition();
  },

  destroy_loading_slide: function() {
    this.loading_slide.remove();
    this.loading_slide = null;
  },

  /**
   * Load the Google WebFont, if any.
   * When finished, or abandoned, or if we're not loading a font, then
   * callback will be called.
   */
  prepare_fonts: function(callback) {
    var fonts = $.Deferred();
    var that = this;

    // If we have a font set, then load it...
    // Assuming the WebFont JS is also working.
    if (this.config.font && typeof WebFont !== 'undefined') {
      WebFont.load({
        google: {
          families: [this.config.font]
        },
        active: function() {
          that.log("Font loaded");
          fonts.resolve();
        },
        inactive: function() {
          console.log("WebFonts failed to load.");
          fonts.resolve();
        },
        timeout: 3000
      });
    } else {
      // No font to load, so let's move on...
      fonts.resolve();
    };

    // Starts the rest of the page-building process.
    fonts.done(callback);
  },

  /**
   * Prepare the socket connection to the back-end.
   */
  prepare_connection: function() {
    var that = this;
    that.log("Preparing connection");
    that.socket = io.connect(window.location.hostname);
    that.socket.on('connect', function(){
      that.page.hide_alert('connection-alert');
      that.socket.emit('subscribe', that.config.category_key);
    });
    that.socket.on('disconnect', function(){
      that.page.show_alert('connection-alert', that.config.disconnect_warning);
    });
  },

  /**
   * Start listening for tweets coming in.
   * The first packet should have a type of 'cached'.
   * When that appears we call whatever function is passed in as
   * tweets_loaded_callback. ie, we're assuming we now have the initial bunch
   * of cached tweets, and can start the whole rotation going.
   */
  listen_for_tweets: function(tweets_loaded_callback) {
    var that = this;
    that.log("Listening for tweets");
    // Tweets arrive as an array, with the newest last.
    that.socket.on('messages', function(messages_packet) {
      $.each(messages_packet.tweets, function(idx, tweet) {
        if (that.tweet_is_in_this_category(tweet)) {
          if (messages_packet.type == 'cached') {
            that.log("Cached tweet received: "+tweet.text);
            that.add_to_tweet_store(tweet);
          } else {
            // type == 'fresh'
            that.log("New tweet received: "+tweet.text);
            that.add_to_tweet_queue(tweet);
          };
        };
      });
      if (messages_packet.type == 'cached') {
        tweets_loaded_callback();
      };
    });
  },

  /**
   * To move on to the next item, assuming we're auto-advancing.
   */
  next_tick: function() {
    if (this.auto_advance) {
      this.show_next_item();
    };
  },

  /**
   * Show whatever slide's next.
   * This is the main driver of the screen page, showing tweets.
   * If auto_advance is false, calling this from the console will display
   * whatever's next.
   */
  show_next_item: function() {
    // No slides are showing (except maybe #burn), so must be our first time here.
    if ( ! this.current_slide) {
      this.log("First Greeting slide");
      var that = this;
      this.page.get_greeting_slide().update_text(this.new_greeting_text());
      this.page.get_greeting_slide().transition().done(function(){
        that.next_tick();
      });

    // We have a NEW tweet waiting to be shown:
    } else if (this.tweet_queue.length > 0) {
      this.log("Display: Greeting slide for new Tweet");
      // Show the greeting first...
      var that = this;
      this.page.get_greeting_slide().update_text(this.new_greeting_text());
      this.page.get_greeting_slide().transition().done(function(){
        // ...then make and show the new tweet slide.
        that.log("Display: Tweet slide for new Tweet");
        that.add_to_tweet_store(that.tweet_queue.shift());
        var tweet_slide = that.page.get_tweet_slides()[that.current_store_index];
        tweet_slide.transition().done(function(){
          that.next_tick();
        });
      });

    // A small chance of a slogan:
    // If we have some && it's randomly time && the greeting isn't showing
    // (because it feels odd having a slogan after the initial greeting)
    // && we're not already showing a slogan.
    } else if (this.config.slogans.length > 0
          && (Math.random() * 100) < this.config.chance_of_slogan
          && $('#greeting').is(':offscreen')
          && $('#slogan').is(':offscreen')) {
      this.log("Display: Slogan slide");
      var that = this;
      this.page.get_slogan_slide().update_text(this.new_slogan_text());
      this.page.get_slogan_slide().transition().done(function(){
        that.next_tick();
      });

    // Show the next tweet in our store:
    } else if (this.tweet_store.length > 0) {
      this.log("Display: Tweet slide with stored Tweet");
      this.page.hide_alert('tweets-alert');
      if (this.current_store_index == (this.tweet_store.length - 1)) {
        this.current_store_index = 0;
      } else {
        this.current_store_index++;
      };
      var tweet_slide = this.page.get_tweet_slides()[this.current_store_index];
      var that = this;
      tweet_slide.transition().done(function(){
        that.next_tick();
      });

    // No tweets to display!
    } else {
      this.log("Display: No tweets found!");
      this.page.show_alert('tweets-alert', 'No tweets found');
      var that = this;
      setTimeout(function(){
        that.next_tick();
      }, that.config.time_per_slide);
    };
  },

  /**
   * Add this tweet object to the store of existing tweets that we rotate through.
   */
  add_to_tweet_store: function(tweet) {
    // Make the new slide:
    this.page.add_new_tweet_slide({
      id: 'tweet-'+tweet.id,
      tweet: tweet,
      duration: this.config.time_per_slide,
      transition_time: this.config.slide_transition_time
    });

    this.tweet_store.push(tweet);
    if (this.tweet_store.length > this.config.number_of_tweets) {
      this.tweet_store.shift();
      this.page.remove_oldest_tweet_slide();
    };
    // This means that we'll loop back round and show tweet index 0 next.
    this.current_store_index = this.tweet_store.length - 1;
  },

  /**
   * Add this tweet object to the queue of new tweets waiting to be shown.
   */
  add_to_tweet_queue: function(tweet) {
    this.tweet_queue.push(tweet);
  },

  /**
   * Is this tweet in the category that this page is displaying?
   */
  tweet_is_in_this_category: function(tweet) {
    if (this.config.screen_names.indexOf(tweet.user.screen_name.toLowerCase()) > -1) {
      return true;
    } else {
      return false;
    };
  },

  /**
   * Return's whatever random greeting is next to be shown.
   */
  new_greeting_text: function() {
    if (this.greeting_queue.length == 0) {
      // shuffle() is below in this file...
      this.greeting_queue = shuffle(this.config.greetings);
    };
    return this.greeting_queue.shift();
  },

  /**
   * Return's whatever random slogan is next to be shown.
   */
  new_slogan_text: function() {
    if (this.slogan_queue.length == 0) {
      // shuffle() is below in this file...
      this.slogan_queue = shuffle(this.config.slogans);
    };
    return this.slogan_queue.shift();
  },

  log: function(s) {
    if (this.logging) {
      console.log(s);
    };
  }
};


/**********************************************************************
 * THIRD-PARTY PLUGINS AND HANDY CODE FRAGMENTS ETC.
 */


/**
 * Handy exists() function for testing presence of an element.
 */
jQuery.fn.exists = function(){return jQuery(this).length>0;};  

/**
 * Return a randomised version of an array.
 * http://stackoverflow.com/a/6274398/250962
 */
function shuffle(array) {
  var counter = array.length, temp, index;
  // While there are elements in the array
  while (counter--) {
    // Pick a random index
    index = (Math.random() * counter) | 0;

    // And swap the last element with it
    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }
  return array;
}

/*
 * jQuery queueFn - v0.7 - 9/05/2010
 * http://benalman.com/projects/jquery-misc-plugins/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function($){$.fn.queueFn=function(c){var b,d,a=Array.prototype.slice.call(arguments,1);if(typeof c==="boolean"){if(c){d=this;b=this.length}c=a.shift()}c=$.isFunction(c)?c:$.fn[c];return this.queue(function(){!--b&&c.apply(d||this,a);$.dequeue(this)})}})(jQuery);

/**
 * Use like $('.selector').is(':offscreen');
 * From http://stackoverflow.com/a/8897628/250962 
 */
jQuery.expr.filters.offscreen = function(el) {
  return (
    (el.offsetLeft + el.offsetWidth) < 0 
    || (el.offsetTop + el.offsetHeight) < 0
    || (el.offsetLeft > window.innerWidth || el.offsetTop > window.innerHeight)
  );
};

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
        $this.css('font-size', Math.max(Math.min($this.width() / (compressor*10), parseFloat(settings.maxFontSize)), parseFloat(settings.minFontSize)));
      };

      // Call once to set.
      resizer();

      // Call on resize. Opera debounces their resize by default.
      $(window).on('resize.fittext orientationchange.fittext', resizer);
    });

  };

})( jQuery );


/**
 * FitTextBlock.
 *
 * Call .fitTextBlock() on an object that has no fixed height, and this will:
 *  * Set its initial font size to the height of its parent block.
 *  * If its own height is greater than that of its parent (ie, it overlaps)
 *      (or its content is wider than its width, eg withlongunbrokenwords)
 *  * then reduce its font size to 90% and try again.
 *  * Keep trying until the text fits.
 * Not especially elegant, could maybe be better, but its jankiness is only
 * really noticeable when the window is resized, which won't happen too often.
 */
(function( $ ){

  $.fn.fitTextBlock = function() {
  
    return this.each(function() {
      var $this = $(this);

      var resizer = function() {
        // Keep reducing font size until it fits.
        var set_font_size = function($el, font_size) {
          $el.css('font-size', font_size).data('font-size', font_size);

          if ($el.height() > $el.parent().height()
              || $el[0].offsetWidth < $el[0].scrollWidth) {
            set_font_size($el, font_size * 0.9);
          };
        };

        set_font_size($this, $this.parent().height());

      };

      resizer();
    }); 
  };

})( jQuery );
