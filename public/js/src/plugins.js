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

