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

;var twelescreen = {
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
   * There are no default config values set here.
   * We assume the back-end has set all required settings.
   * The config values will be set by the object passed into init().
   */
  config: {},

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
    if ('screen_names' in this.config) {
      this.config.screen_names = this.config.screen_names.map(
                                          function(n){ return n.toLowerCase(); });
    };

    var init_callback,
        that = this;

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
          $('#loading').remove();
          that.next_tick();
        }; 
        that.listen_for_tweets(tweets_loaded_callback);
      };
    } else {
      this.log("Displaying menu page");
      this.page = twelescreen.models.menu_page({});
      init_callback = function(){
        that.log("Initialising page");
        $('#loading').remove();
        that.page.init();
      };
    };

    this.prepare_fonts(init_callback);
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
      }, that.config.slide_wait_time);
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
      duration: this.config.slide_wait_time,
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
      // shuffle() is in plugins.js.
      this.greeting_queue = shuffle(this.config.greetings);
    };
    return this.greeting_queue.shift();
  },

  /**
   * Return's whatever random slogan is next to be shown.
   */
  new_slogan_text: function() {
    if (this.slogan_queue.length == 0) {
      // shuffle() is in plugins.js.
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

/**
 * A base model class. Inherit from this; don't use directly. eg:
 * 
 *   twelescreen.models.slide = function(spec) {
 *     // Add any custom variables to the spec array.
 *     spec.foo = 'bibble';
 *
 *     // Get the parent object.
 *     var obj = twelescreen.models.base(spec);
 *
 *     // List any object variables
 *     obj.object_vars = obj.object_vars.concat(
 *       ['id', 'text', 'foo']
 *     );
 *
 *     obj.construct();
 *
 *     return obj;
 *   };
 *
 * Then, do something like this to get an object, which will have getter/setters:
 *
 *   var slide = twelescreen.models.slide({
 *     id: 'my-css-id', text: 'Hello world'
 *   });
 *   console.log( slide.get_text() );
 *   slide.set_text('Goodbye world');
 */
twelescreen.models.base = function(spec) {
  var obj = {};

  obj.object_vars = [];

  /** 
   * For every string in the object_vars array, provide a get_var_name()
   * method which will enable getting the var's value.
   */
  obj.construct = function() {
    $.each(obj.object_vars, function(idx, var_name) {
      obj['get_'+var_name] = function() {
        return spec[var_name];
      };
      obj['set_'+var_name] = function(value) {
        spec[var_name] = value;
      };
    });
  };

  return obj;
};


/**********************************************************************
 **********************************************************************
 * BASE PAGE CLASS.
 **********************************************************************
 *
 * Don't use directly; inherit for specific types of page.
 */
twelescreen.models.page = function(spec) {
	var obj = twelescreen.models.base(spec)

	obj.object_vars = obj.object_vars.concat( [] );

	obj.construct();

  /**
   * Probably should be called by all child screen's init() methods.
   */
  obj.base_init = function() {
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
    $(window).resize(
      debouncer(function(e) {
        obj.resize();
      })
    );
  };

  /**
   * init() is called when the controller is ready to display the page (ie,
   * when fonts have loaded).
   */
  obj.init = function() {
    obj.base_init();
  };

  obj.resize = function() {};

  obj.show_alert = function(id, message) {
    if ($('#'+id).exists()) {
      $('#'+id+' .alert_inner').text(message); 
    } else {
      $('body').append(
        '<div id=' + id + ' class="alert"><div class="alert_inner">' + message + '</div></div>'
      );
    };
    $('#'+id).fitText(4);
  };

  obj.hide_alert = function(id) {
    $('#'+id).remove();
  };

  return obj;
};


/**********************************************************************
 * MENU PAGE CLASS.
 * The front page of the site, displaying categories to choose from.
 */
twelescreen.models.menu_page = function(spec) {
	var obj = twelescreen.models.page(spec);

	obj.object_vars = obj.object_vars.concat([]);

	obj.construct();

  obj.init = function() {
    obj.base_init();
    obj.resize();
  };

  obj.resize = function() {
    if ($('.menu').exists()) {
      // Set the outer block to the height of the window, so that our
      // %-heighted contents fill the space.
      $('.menu').height($(window).height());
      // But if there's not enough space for the contents of .menu-body,
      // set the outer block to auto height, and expand off the page.
      if ($('.menu_body').height() < $('.menu_body_inner').outerHeight(true)) {
        $('.menu').height('auto');
      };
    };
  };

  return obj;
};


/**********************************************************************
 * SCREEN PAGE CLASS.
 * The page that shows the tweets.
 */
twelescreen.models.screen_page = function(spec) {
	var obj = twelescreen.models.page(spec);

	obj.object_vars = obj.object_vars.concat([
    // Will be a string of text to put in 'burn_slide'. 
    'burn_in_text',
    // Will be a burn_title_slide object.
    'burn_slide',
    // Will be a greeting_title_slide object.
    'greeting_slide',
    // Will be a slogan_title_slide object.
    'slogan_slide',
    // Will be an array of tweet_slide objects, newest at the end.
    // In the same order, and in-sync with, twelescreen.controller.tweet_store.
    'tweet_slides'
  ]);

	obj.construct();

  /**
   * Sets up the burn, greeting and slogan slides.
   */
  obj.init = function() {
    obj.base_init();

    obj.set_tweet_slides([]);

    if (obj.get_burn_in_text()) {
      obj.set_burn_slide(
        twelescreen.models.burn_title_slide({
          id: 'burn',
          text: obj.get_burn_in_text()
        })
      );
      obj.get_burn_slide().create_element();
    };

    obj.set_greeting_slide(
      twelescreen.models.greeting_title_slide({
        id: 'greeting',
        text: '',
        duration: twelescreen.controller.config.greeting_time
      })
    );
    obj.get_greeting_slide().create_element();

    if (twelescreen.controller.config.slogans.length > 0) {
      obj.set_slogan_slide(
        twelescreen.models.slogan_title_slide({
          id: 'slogan',
          text: '',
          duration: twelescreen.controller.config.time_per_slide
        })
      );
      obj.get_slogan_slide().create_element();
    };
  };

  /**
   * Resizes all of the slides on the page, visible or not.
   */
  obj.resize = function() {
    if (obj.get_burn_slide()) {
      obj.get_burn_slide().resize();
    };
    if (obj.get_greeting_slide()) {
      obj.get_greeting_slide().resize();
    };
    if (obj.get_slogan_slide()) {
      obj.get_slogan_slide().resize();
    };
    $.each(obj.get_tweet_slides(), function(idx, tweet_slide) {
      tweet_slide.resize();
    });
  };

  /**
   * Add a new tweet_slide object to this page's list of them.
   * tweet_slide_spec should have id, tweet, duration and transition_time keys.
   */
  obj.add_new_tweet_slide = function(tweet_slide_spec) {
    var new_tweet_slide = twelescreen.models.tweet_slide(tweet_slide_spec);
    new_tweet_slide.create_element();
    var tweet_slides = obj.get_tweet_slides();
    tweet_slides.push(new_tweet_slide);
    obj.set_tweet_slides(tweet_slides);
  };

  obj.remove_oldest_tweet_slide = function() {
    var tweet_slides = obj.get_tweet_slides();
    var old_tweet_slide = tweet_slides.shift();
    old_tweet_slide.remove();
    obj.set_tweet_slides(tweet_slides);
  };

  return obj;
};


/**********************************************************************
 **********************************************************************
 * BASE SLIDE CLASS.
 **********************************************************************
 *
 * Don't use directly; inherit for specific types of slide.
 * They should all be created something like:
 *
 *   var slide = twelescreen.models.slide({
 *     id: 'foo',
 *     text: 'Hello there',
 *     duration: 3000
 *   });
 *
 *   // Make the HTML element for it and insert into DOM:
 *   slide.create_element();
 *   
 *   // To make the slide appear:
 *   slide.transition().done(function(){
 *     // Transition's finished, do something next.
 *   });
 */
twelescreen.models.slide = function(spec) {
	var obj = twelescreen.models.base(spec);

	obj.object_vars = obj.object_vars.concat( ['id', 'type', 'duration'] );

	obj.construct();

  obj.set_type('default');

  obj.create_element = function() {
    $('body').append(
      $('<div/>').attr('id', obj.get_id()).addClass('slide')
    );
    // All child classes' create_element() methods should also do this:
    obj.resize();
  };

  /**
   * Very basic version; probably want to create more useful one for subclasses.
   * This version wouldn't really need promises, but others will.
   */
  obj.transition = function() {
    var deferred = $.Deferred();

    $('#'+obj.get_id()).show();
    var from_slide = twelescreen.controller.current_slide 
    if (from_slide) {
      $('#'+from_slide.get_id()).hide();
    };
    
    obj.play().done(function() {
      twelescreen.controller.current_slide = obj;
      deferred.resolve();
    });

    return deferred.promise();
  };

  /**
   * Whatever the slide should do after being displayed onscreen.
   * Some default behaviour - waits for five seconds before signalling completion.
   */
  obj.play = function() {
    var deferred = $.Deferred();

    var duration = obj.get_duration();
    if (typeof duration === 'undefined') {
      // Set a sensible default, just in case we haven't set one.
      duration = 5000;
    };

    setTimeout(function() {
      deferred.resolve();
    }, duration);

    return deferred.promise();
  };

  obj.resize = function() {
    $('#'+obj.get_id()).width($(window).width()).height($(window).height())
    obj.resize_extra();
  };

  /**
   * So that child classes can do something on top of the standard resize().
   */
  obj.resize_extra = function() {};

  /**
   * Remove the slide's element from the DOM.
   */
  obj.remove = function() {
    $('#'+obj.get_id()).remove();
  };

  return obj;
};


/**********************************************************************
 * TITLE SLIDE.
 * Full-screen, single piece of text.
 * Parent class of greeting_title_slide and slogan_title_slide.
 */
twelescreen.models.title_slide = function(spec) {
	var obj = twelescreen.models.slide(spec);

  // Child classes can set their own fit_text_size to use a different one.
	obj.object_vars = obj.object_vars.concat( ['text', 'fit_text_size'] );

	obj.construct();

  obj.set_type('title');

  obj.create_element = function() {
    $('body').append(
      $('<div/>').attr('id', obj.get_id()).addClass('slide slide-title vbox hbox').append(
        $('<div/>').addClass('slide_inner')
      )
    );
    if (obj.get_text()) {
      obj.update_elements_text();
    };
    obj.resize();
  };

  /**
   * Call this to set the object's text AND the HTML for it on the page.
   */
  obj.update_text = function(text) {
    obj.set_text(text);
    obj.update_elements_text();
    if ( ! $('html').hasClass('flexbox')) {
      // Because browsers without CSS flexbox require some manual positioning
      // that is affected by different amounts of text.
      obj.resize_extra();
    };
  };

  obj.update_elements_text = function() {
    $('#'+obj.get_id()+' .slide_inner').html( obj.get_text() );
  };

  obj.transition = function() {
    var deferred = $.Deferred();

    $('#'+obj.get_id()).addClass('is-slide-on');

    var from_slide = twelescreen.controller.current_slide
    if (from_slide) {
      if (from_slide.get_type() == 'tweet') {
        $('#'+from_slide.get_id()).removeClass('is-slide-on').css('z-index', 100);
      } else {
        // Probably another title slide.
        $('#'+from_slide.get_id()).removeClass('is-slide-on');
      };
    };

    obj.play().done(function() {
      twelescreen.controller.current_slide = obj;
      deferred.resolve();
    });

    return deferred.promise();
  };

  obj.resize_extra = function() {
    var $slide = $('#'+obj.get_id());

    // Use default fitText() ratio of 1 unless the class has set one.
    var fit_text_size = obj.get_fit_text_size() || 1;
    $slide.fitText(fit_text_size);

    if ($('html').hasClass('flexbox')) {
      // All modern browsers.
      // To move the vertically-centered text up a bit.
      var padding_bottom = Math.round($slide.height() / 12);
      $slide
        .css('paddingBottom', padding_bottom)
        .height($slide.height() - padding_bottom);

    } else {
      // Older browsers. Need to manually give .slide_inner a top margin, rather
      // than relying on the CSS flexbox stuff.
      // Also, adding bottom padding to $slide seems to leave a gap at bottom.
      $('.slide_inner', $slide).css('marginTop',
          ($slide.outerHeight() - $('.slide_inner', $slide).height()) / 2.2
        );
    };
  };

  return obj;
};


/**********************************************************************
 * GREETING TITLE SLIDE.
 * The 'greeting' that's shown initially, and before each brand new tweet.
 */
twelescreen.models.greeting_title_slide = function(spec) {
	var obj = twelescreen.models.title_slide(spec);

	obj.object_vars = obj.object_vars.concat( [] );

	obj.construct();

  obj.set_type('greeting_title');

  // Uses title_slide's create_element().

  // Uses title_slide's transition().

  obj.play = function() {
    var deferred = $.Deferred();
    var ms = obj.get_duration() / 5;
    $('#'+obj.get_id())
      .delay(ms).queueFn(function(){$(this).addClass('is-inverted')})
      .delay(ms).queueFn(function(){$(this).removeClass('is-inverted')})
      .delay(ms).queueFn(function(){$(this).addClass('is-inverted')})
      .delay(ms).queueFn(function(){$(this).removeClass('is-inverted')})
      .delay(ms).queueFn(function(){
        deferred.resolve();
      });
    return deferred.promise();
  };

  return obj;
};

/**********************************************************************
 * BURN TITLE SLIDE.
 * The (optional) "slide" which contains translucent text.
 * If present, it is always visible.
 */
twelescreen.models.burn_title_slide = function(spec) {
	var obj = twelescreen.models.title_slide(spec);

	obj.object_vars = obj.object_vars.concat( [] );

	obj.construct();

  obj.set_type('burn_title');

  // Uses title_slide's create_element().

  // This slide doesn't do anything, so let's just get rid of these:
  obj.transtion = function() {};
  obj.play = function() {};

  return obj;
};

/**********************************************************************
 * SLOGAN TITLE SLIDE.
 * The random slogans that are periodically displayed.
 */
twelescreen.models.slogan_title_slide = function(spec) {
	var obj = twelescreen.models.title_slide(spec);

	obj.object_vars = obj.object_vars.concat( [] );

	obj.construct();

  obj.set_type('slogan_title');

  // Uses title_slide's create_element().

  // Uses title_slide's transition().

  // Uses default slide's play().

  return obj;
};


/**********************************************************************
 * TWEET SLIDE.
 * Each one holding a single tweet (and its image if it has one).
 */
twelescreen.models.tweet_slide = function(spec) {
	var obj = twelescreen.models.slide(spec);

  // 'tweet' will be an object with data about the tweet.
  // Keys like 'user', 'text', 'id'.
	obj.object_vars = obj.object_vars.concat( ['tweet', 'transition_time'] );

	obj.construct();
  
  obj.set_type('tweet');

  obj.create_element = function() {
    var tweet = obj.get_tweet();

    // Match URLs:
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var urls = tweet.text.match(exp);
    var tweet_text;
    // Does the tweet text contain only a URL?
    if (urls !== null && tweet.text.trim() == urls[0]) {
       // If so, keep it:
       tweet_text = '<span class="url">' + tweet.text.trim() + '</span>';
    } else {
      // Otherwise remove all URLs:
      tweet_text = tweet.text.replace(exp, '');
    };
    // If there are URL(s), wrap all the text in the first one.
    if (urls !== null) {
      tweet_text = '<a href="' + urls[0] + '">' + tweet_text + '</a>';
    };

    $('body').append(
      $('<div/>').attr('id', obj.get_id()).addClass('slide slide-tweet').append(
        $('<div/>').addClass('tweet_account').html(
          '<img src="' + tweet.user.profile_image_url + '" alt="" class="tweet_account_avatar" /><div class="tweet_account_name"><a href="https://twitter.com/' + tweet.user.screen_name + '">' + tweet.user.name + "</a></div>"
        )
      ).append(
        $('<div/>').addClass('tweet_message').html(
          '<div class="tweet_message_panel tweet_message_panel-text vbox"><div class="tweet_message_panel_inner">' + tweet_text + '</div></div>'
        )
      ).addClass('slide')
    );
    if ('image' in tweet) {
      $('.tweet_message', $('#'+obj.get_id())).append(
        $('<div/>').addClass('tweet_message_panel tweet_message_panel-image vbox hbox').append(
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
    obj.resize();
  };

  obj.transition = function() {
    var deferred = $.Deferred();

    $to = $('#'+obj.get_id());

    // If this tweet has an image, and has been seen before, the text panel
    // will currently have 0 opacity. So reset it before showing.
    $('.tweet_message_panel-text', $to).css('opacity', 1);

    var from_slide = twelescreen.controller.current_slide
    if (from_slide) {
      $from = $('#'+from_slide.get_id());

      // We're moving from the greeting or slogan to this tweet slide.
      if (['greeting_title', 'slogan_title'].indexOf(from_slide.get_type()) > -1) {
        $to.addClass('is-slide-on').css({zIndex: 200});
        $from.removeClass('is-slide-on');

      } else {
        // Probably another tweet slide - fade between the two.
        $to.addClass('is-slide-on');
        $from.animate(
          {opacity: 0},
          obj.get_transition_time(),
          function(){
            // Move old current slide off-stage, put z-index back to default.
            $from.removeClass('is-slide-on').css({zIndex: 100, opacity: 1}); 
            // Move new current slide forward so we can do all this next time.
            $to.css({zIndex: 200});
          }
        );
      };
    } else {
      $to.addClass('is-slide-on').css({zIndex: 200});
    };

    obj.play().done(function() {
      twelescreen.controller.current_slide = obj;

      setTimeout(function(){
        if ($('.tweet_message_panel-image', $to).exists()) {
          // Hide text to reveal image, wait, then move on.
          $('.tweet_message_panel-text', $to).animate(
            {'opacity': 0},
            obj.get_transition_time(),
            function(){
              setTimeout(function(){
                deferred.resolve();
              }, obj.get_duration());
            }
          );
        } else {
          // No image.
          deferred.resolve();
        };
      }, obj.get_duration());
    });

    return deferred.promise();
  };

  obj.resize_extra = function() {
    $slide = $('#'+obj.get_id());

    $('.tweet_account', $slide).fitText(1.5);

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

    $('.tweet_message_panel-text .tweet_message_panel_inner', $slide).fitTextBlock();

    if ( ! $('html').hasClass('flexbox')) {
      // Need to manually give _inner a top margin, rather than relying on the
      // CSS flexbox stuff.
      $('.tweet_message_panel_inner', $slide).css('marginTop',
        (
          $('.tweet_message_panel', $slide).outerHeight() - $('.tweet_message_panel_inner', $slide).height()
        ) / 2.2
      );
    };

  };

  return obj;
};
