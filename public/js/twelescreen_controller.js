var twelescreen = {
  controller: {},
  models: {}
};

twelescreen.controller = {

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
   * Fresh tweet objects (not slides) get put in here when they arrive.
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
   * Which tweets from tweet_store are we currently viewing.
   * So we can cycle through them in order.
   */
  current_store_index: 0,

  /**
   * Will be an array of tweet_slide objects, in the same order as tweet_store.
   */
  tweet_slides: [],

  /**
   * Will be a burn_title_slide object.
   */
  burn_slide: null,

  /**
   * Will be a greeting_title_slide object.
   */
  greeting_slide: null,

  /**
   * Will be a slogan_title_slide object (if we have any slogans).
   */
  slogan_slide: null,

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
   * The CSS ID of the currently-displayed tweet_slide.
   */
  current_tweet_id: '',

  /**
   * Call this to initialise everything.
   * page is either 'menu' or 'screen', depending on the type of page.
   * spec is an object of items that can override this.config settings.
   */
  init: function(page, spec) {
    $.extend(this.config, spec);

    var init_callback,
        that = this;

    if (page == 'screen') {
      init_callback = function(){
        that.prepare_screen();
        that.prepare_connection();
        var tweets_loaded_callback = function(){
          that.next_tick();
        }; 
        that.listen_for_tweets(tweets_loaded_callback);
      };
    } else {
      init_callback = function(){
        that.prepare_menu();
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
        active: function() { fonts.resolve(); },
        inactive: function() {
          console.log("WebFonts failed to load.");
          fonts.resolve();
        },
        timeout: 3000
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

  /**
   * Prepares the 'screen' - the page showing tweets.
   */
  prepare_screen: function() {

    if (this.config.burn_in_text) {
      this.burn_slide = twelescreen.models.burn_title_slide({
        id: 'burn',
        text: this.config.burn_in_text
      });
      this.burn_slide.create_element();
    };

    this.greeting_slide = twelescreen.models.greeting_title_slide({
      id: 'greeting',
      text: '',
      duration: this.config.greeting_time
    });
    this.greeting_slide.create_element();

    if (this.config.slogans.length > 0) {
      this.slogan_slide = twelescreen.models.slogan_title_slide({
        id: 'slogan',
        text: '',
        duration: this.config.time_per_slide
      });
      this.slogan_slide.create_element();
    };

    // We use this, below, to ensure that we only call the sizing methods after
    // the window has finished resizing, not multiple times during the process.
    // From http://stackoverflow.com/a/4298672/250962
    var debouncer = function debouncer(func , timeout) {
      var timeoutID, timeout = timeout || 200;
      return function () {
        var scope = this, args = arguments;
        clearTimeout(timeoutID);
        timeoutID = setTimeout(function() {
          func.apply( scope, Array.prototype.slice.call(args) );
        }, timeout);
      };
    };

    // See, here:
    var that = this;
    $(window).resize(
      debouncer(function(e) {
        that.size_screen();
      })
    );
  },

  /**
   * Prepares the 'menu' - the front page of categories.
   */
  prepare_menu: function() {
    this.size_menu();
    var that = this;
    $(window).resize(function(){
      that.size_menu()
    });
  },

  /**
   * A few things needed for sizing on the menu screen.
   */
  size_menu: function() {
    if ($('.menu').exists()) {
      if ($('.menu').height() <= $(window).height()) {
        $('.menu').height($(window).height());
      } else {
        $('.menu').height('auto');
      };
    };
  },

  /**
   * Prepare the socket connection to the back-end.
   */
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

  /**
   * Start listening for tweets coming in.
   * The first packet should have a type of 'cached'.
   * When that appears we call whatever function is passed in as
   * tweets_loaded_callback. ie, we're assuming we now have the initial bunch
   * of cached tweets, and can start the whole rotation going.
   */
  listen_for_tweets: function(tweets_loaded_callback) {
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
      if (messages_packet.type == 'cached') {
        tweets_loaded_callback();
      };
    });
  },

  /**
   * Return's whatever random greeting is next to be shown.
   */
  new_greeting_text: function() {
    var idx = Math.floor(Math.random() * this.config.greetings.length);
    return this.config.greetings[idx];
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
   * If auto_advance is false, calling this from the console will display
   * whatever's next.
   */
  show_next_item: function() {
    // No slides are showing (except maybe #burn), so must be our first time here.
    if ( ! this.current_slide) {
      console.log('A first');
      var that = this;
      this.greeting_slide.update_text(this.new_greeting_text());
      this.greeting_slide.transition().done(function(){
        that.next_tick();
      });

    // We have a NEW tweet waiting to be shown:
    } else if (this.tweet_queue.length > 0) {
      // Show the greeting first...
      console.log('B new tweet');
      var that = this;
      this.greeting_slide.update_text(this.new_greeting_text());
      this.greeting_slide.transition().done(function(){
        // ...then make and show the new tweet slide.
        that.add_to_tweet_store(that.tweet_queue.shift());
        var tweet_slide = that.tweet_slides[that.current_store_index];
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
      console.log('C slogan');
      var that = this;
      this.slogan_slide.update_text(this.new_slogan_text());
      this.slogan_slide.transition().done(function(){
        that.next_tick();
      });

    // Show the next tweet in our store:
    } else if (this.tweet_store.length > 0) {
      this.hide_alert('tweets-alert');
      if (this.current_store_index == (this.tweet_store.length - 1)) {
        this.current_store_index = 0;
      } else {
        this.current_store_index++;
      };
      console.log('D stored tweet');
      var tweet_slide = this.tweet_slides[this.current_store_index];
      // If this tweet has an image, and has been seen before, the text panel
      // will currently have 0 opacity. So reset it before showing.
      // TODO: Can we put this in the tweet_slide somewhere? At start of
      // transition?
      $(tweet_slide.get_id()+' .tweet_message_panel-text').css('opacity', 1);
      var that = this;
      tweet_slide.transition().done(function(){
        that.next_tick();
      });

    // No tweets to display!
    } else {
      console.log('E No tweets');
      this.show_alert('tweets-alert', 'No tweets found');
      var that = this;
      setTimeout(function(){
        that.next_tick();
      }, that.config.time_per_slide);
    };
  },

  size_screen: function() {
    if (this.burn_slide) {
      this.burn_slide.resize();
    };
    if (this.greeting_slide) {
      this.greeting_slide.resize();
    };
    if (this.slogan_slide) {
      this.slogan_slide.resize();
    };
    $.each(this.tweet_slides, function(idx, tweet_slide) {
      tweet_slide.resize();
    });
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

  // The store of existing tweets that we rotate through.
  add_to_tweet_store: function(tweet) {
    // TODO: Get rid of tweet_store and just use tweet_slides ?
    // Make the new slide:
    var new_tweet_slide = twelescreen.models.tweet_slide({
      id: 'tweet-'+tweet.id,
      tweet: tweet,
      duration: this.config.time_per_slide,
      transition_time: this.config.slide_transition_time
    });
    new_tweet_slide.create_element();
    this.tweet_slides.push(new_tweet_slide);

    this.tweet_store.push(tweet);
    if (this.tweet_store.length > this.config.number_of_tweets) {
      this.tweet_store.shift();
      var old_tweet_slide = this.tweet_slides.shift();
      old_tweet_slide.remove();
    };
    // This means that we'll loop back round and show tweet index 0 next.
    this.current_store_index = this.tweet_store.length - 1;
  },

  // The queue of new tweets to show.
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
