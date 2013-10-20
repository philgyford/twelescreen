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
 *       ['id', 'text']
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
 * BASE SLIDE CLASS.
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

	obj.object_vars = obj.object_vars.concat( ['text'] );

	obj.construct();

  obj.set_type('title');

  obj.create_element = function() {
    $('body').append(
      $('<div/>').attr('id', obj.get_id()).addClass('slide slide-title vbox center')
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
  };

  obj.update_elements_text = function() {
    $('#'+obj.get_id()).html( obj.get_text() );
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
    // To move the vertically-centered text up a bit.
    var padding_bottom = Math.round($slide.height() / 10);
    $slide
      .css('paddingBottom', padding_bottom)
      .height($slide.height() - padding_bottom)
      .fitText(0.7);
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

    // Make URLs into links.
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var tweet_text = tweet.text.replace(exp, "<a href='$1'>$1</a>");

    $('body').append(
      $('<div/>').attr('id', obj.get_id()).addClass('slide slide-tweet').append(
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
      $('.tweet_message', $('#'+obj.get_id())).append(
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
  };

  return obj;
};
