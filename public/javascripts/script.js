var twelescreen_client = {

  config: {
    category: {},
    number_of_tweets_to_display: 3
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
  },

  size_screen: function() {
    $('.slide').width($(window).width()).height($(window).height());
  },

  prepare_connection: function() {
    var that = this;
    that.socket = io.connect(window.location.hostname);
    that.socket.on('connect', function(){
      that.hide_disconnection_alert();
    });
    that.socket.on('disconnect', function(){
      that.display_disconnection_alert();
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
          //$('#tweets').prepend('<li><img src="' + tweet.user.profile_image_url + '" /> '+ tweet.text + '</li>');

          //if ($('#tweets li').length > that.config.number_of_tweets_to_display) {
            //$('#tweets li:last-child').remove();
          //};
        };
      });
    });
  },

  start_carousel: function() {
    this.show_greeting();
  },

  /**
   * Decides what to show next; a new, queued tweet, or something from the
   * store.
   */
  show_next_item: function() {
    if (this.tweet_queue.length > 0) {
      this.show_new_tweet();
    } else {
      this.show_stored_tweet();
    };
  },


  /**
   * Displays the ATTENTION CITIZENS type greeting.
   * If `next_tweet` is set (to a tweet object), then that will be shown next.
   * Otherwise, this is followed by whatever show_next_item() decides.
   */
  show_greeting: function(next_tweet) {
    var that = this;
    $('#greeting').text(that.config.category.greeting);
    that.show_slide('#greeting');
    setTimeout(function(){
      if (next_tweet) {
        that.display_tweet(next_tweet); 
      } else {
        that.show_next_item();
      };
    }, 2000);
  },


  /**
   * Show a random tweet from the carousel (but not the one already displayed).
   */
  show_stored_tweet: function() {
    var that = this;

    // Return an index of a random tweet from the store, which isn't the tweet
    // that's currently displayed.
    var new_index = function() {
      var index = Math.floor(Math.random() * (that.tweet_store.length));
      if (that.tweet_store[index].id == that.current_tweet_id) {
        return new_index(); 
      } else {
        return index; 
      };
    };

    this.display_tweet(this.tweet_store[new_index()]);
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
    if ( ! $('#tweet-'+tweet.id).exists()) {
      this.make_tweet_slide(tweet);
    };
    this.show_slide('#tweet-'+tweet.id);
    this.current_tweet_id = tweet.id;
    var that = this;
    setTimeout(function(){
      that.show_next_item();
    }, 2000);
  },

  make_tweet_slide: function(tweet) {
    $('body').append(
      $('<div/>').attr('id', 'tweet-'+tweet.id).addClass('slide').text(tweet.text)
    );
  },

  show_slide: function(selector) {
    $('.slide-on').removeClass('slide-on');
    $(selector).addClass('slide-on').slabText();
  },

  display_disconnection_alert: function() {
    $('#alert').text(this.config.category.disconnect_warning).show();
  },

  hide_disconnection_alert: function() {
    $('#alert').hide();
  },

  add_to_tweet_store: function(tweet) {
    this.tweet_store.push(tweet);
    if (this.tweet_store.length > this.config.number_of_tweets_to_display) {
      var old_tweet = this.tweet_store.shift();
      $('#tweet-'+old_tweet.id).remove();
    };
  },

  add_to_tweet_queue: function(tweet) {
    this.tweet_queue.push(tweet);
  },

  tweet_is_in_this_category: function(tweet) {
    if (this.config.category.accounts.indexOf(tweet.user.id) > -1) {
      return true;
    } else {
      return false;
    };
  }
};

jQuery.fn.exists = function(){return jQuery(this).length>0;};  

/*! jQuery slabtext plugin v2.3 MIT/GPL2 @freqdec
 * From https://github.com/freqDec/slabText/ */
(function($){$.fn.slabText=function(options){var settings={fontRatio:0.78,forceNewCharCount:true,wrapAmpersand:true,headerBreakpoint:null,viewportBreakpoint:null,noResizeEvent:false,resizeThrottleTime:300,maxFontSize:999,postTweak:true,precision:3,minCharsPerLine:0};$("body").addClass("slabtexted");return this.each(function(){if(options){$.extend(settings,options);}var $this=$(this),keepSpans=$("span.slabtext",$this).length,words=keepSpans?[]:String($.trim($this.text())).replace(/\s{2,}/g," ").split(" "),origFontSize=null,idealCharPerLine=null,fontRatio=settings.fontRatio,forceNewCharCount=settings.forceNewCharCount,headerBreakpoint=settings.headerBreakpoint,viewportBreakpoint=settings.viewportBreakpoint,postTweak=settings.postTweak,precision=settings.precision,resizeThrottleTime=settings.resizeThrottleTime,minCharsPerLine=settings.minCharsPerLine,resizeThrottle=null,viewportWidth=$(window).width(),headLink=$this.find("a:first").attr("href")||$this.attr("href"),linkTitle=headLink?$this.find("a:first").attr("title"):"";if(!keepSpans&&minCharsPerLine&&words.join(" ").length<minCharsPerLine){return;}var grabPixelFontSize=function(){var dummy=jQuery('<div style="display:none;font-size:1em;margin:0;padding:0;height:auto;line-height:1;border:0;">&nbsp;</div>').appendTo($this),emH=dummy.height();dummy.remove();return emH;};var resizeSlabs=function resizeSlabs(){var parentWidth=$this.width(),fs;if(parentWidth===0){return;}$this.removeClass("slabtextdone slabtextinactive");if(viewportBreakpoint&&viewportBreakpoint>viewportWidth||headerBreakpoint&&headerBreakpoint>parentWidth){$this.addClass("slabtextinactive");return;}fs=grabPixelFontSize();if(!keepSpans&&(forceNewCharCount||fs!=origFontSize)){origFontSize=fs;var newCharPerLine=Math.min(60,Math.floor(parentWidth/(origFontSize*fontRatio))),wordIndex=0,lineText=[],counter=0,preText="",postText="",finalText="",slice,preDiff,postDiff;if(newCharPerLine!=idealCharPerLine){idealCharPerLine=newCharPerLine;while(wordIndex<words.length){postText="";while(postText.length<idealCharPerLine){preText=postText;postText+=words[wordIndex]+" ";if(++wordIndex>=words.length){break;}}if(minCharsPerLine){slice=words.slice(wordIndex).join(" ");if(slice.length<minCharsPerLine){postText+=slice;preText=postText;wordIndex=words.length+2;}}preDiff=idealCharPerLine-preText.length;postDiff=postText.length-idealCharPerLine;if((preDiff<postDiff)&&(preText.length>=(minCharsPerLine||2))){finalText=preText;wordIndex--;}else{finalText=postText;}finalText=$("<div/>").text(finalText).html();if(settings.wrapAmpersand){finalText=finalText.replace(/&amp;/g,'<span class="amp">&amp;</span>');}finalText=$.trim(finalText);lineText.push('<span class="slabtext">'+finalText+"</span>");}$this.html(lineText.join(" "));if(headLink){$this.wrapInner('<a href="'+headLink+'" '+(linkTitle?'title="'+linkTitle+'" ':"")+"/>");}}}else{origFontSize=fs;}$("span.slabtext",$this).each(function(){var $span=$(this),innerText=$span.text(),wordSpacing=innerText.split(" ").length>1,diff,ratio,fontSize;if(postTweak){$span.css({"word-spacing":0,"letter-spacing":0});}ratio=parentWidth/$span.width();fontSize=parseFloat(this.style.fontSize)||origFontSize;$span.css("font-size",Math.min((fontSize*ratio).toFixed(precision),settings.maxFontSize)+"px");diff=!!postTweak?parentWidth-$span.width():false;if(diff){$span.css((wordSpacing?"word":"letter")+"-spacing",(diff/(wordSpacing?innerText.split(" ").length-1:innerText.length)).toFixed(precision)+"px");}});$this.addClass("slabtextdone");};resizeSlabs();if(!settings.noResizeEvent){$(window).resize(function(){if($(window).width()==viewportWidth){return;}viewportWidth=$(window).width();clearTimeout(resizeThrottle);resizeThrottle=setTimeout(resizeSlabs,resizeThrottleTime);});}});};})(jQuery);
