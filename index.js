/*

  the media for a book
  
*/

var Emitter = require('emitter');
var Platform = require('storytimeisland-platform');
var buzz = require('./buzz');

module.exports = function storytimeisland_media(book, options){

  options = options || {};

  var platform = Platform();

  var media = new Emitter();

  media.is_android = platform.is_android;
  media.sounds = {};
  media.playing = {};
  media.playspeech = true;

  function exitFromApp(){
    media.stopsounds();
  }

  if(platform.is_phonegap){

    document.addEventListener("backbutton", exitFromApp, false);
    document.addEventListener("pause", exitFromApp, false);
    document.addEventListener("menubutton", exitFromApp, false);

  }

  /*
  
    extracts a list of URLS for the sound files we will need for a book
    
  */
  function extract_book_files(){
    
    var all_images = [];
    var all_sounds = [];

    var dictionary_sounds = {};

    all_sounds.push("audio/pagespeech/page0");
    all_sounds.push("audio/pagefx/page0");

    var found = {};
    book.pages.forEach(function(page, i){

      if(page.dictionary){
        var extra_config = page.extra_config;

        page.dictionary.forEach(function(entry){
          var sound_name = entry.name.replace(/_.*$/, '');
          if(extra_config && extra_config.sounds){
            var sound = extra_config.sounds[sound_name];
            if(sound){
              sound_name = sound.sound;
            }
          }
          dictionary_sounds["audio/sfx/" + sound_name] = true;
          found[sound_name] = true;          
        })
      }

      if(i<book.pages.length-2){
        all_sounds.push("audio/pagespeech/page" + page.number);
        all_sounds.push("audio/pagefx/page" + page.number);
      }
      
      all_images.push('images/page' + page.number + '.png');
    })

    for(var i in found){
      console.log(i);
    }

    var keys = [];
    for(var p in dictionary_sounds){
      keys.push(p);
    }

    all_sounds = all_sounds.concat(keys);

    return {
      images:all_images,
      sounds:all_sounds
    }

  }

  /*
  
    --------------------------------------------
    --------------------------------------------


    LOAD


    --------------------------------------------
    --------------------------------------------
    
  */

  var _loaded = false;

  media.load = function(extrafiles){

    if(_loaded){
      return;
    }

    _loaded = true;

    var self = this;
    
    var bookfiles = extract_book_files(book);

    var allfiles = {
      images:(extrafiles.images || []).concat(bookfiles.images),
      sounds:(extrafiles.sounds || []).concat(bookfiles.sounds)
    }

    var loadsounds = [].concat(allfiles.sounds);

    media.images = allfiles.images;

    var soundcounter = 0;

    function success(){
      // media has loaded
    }

    function media_error(e){
      console.log('media error');
      console.dir(e);
    }

    function load_sound(soundsrc, nextsound){
      var theSound = null;

      if(media.is_android){
        var src = '/android_asset/www/' + soundsrc + '.mp3';
        theSound = new Media(src, success, media_error);
      }
      else{
        theSound = new buzz.sound(soundsrc + '.mp3', {
          preload:soundcounter<20 ? true : false
        })
        soundcounter++;
      }

      media.sounds[soundsrc] = theSound;

      setTimeout(function(){
        self.emit('loaded:sound', soundsrc);
        nextsound();
      }, 10)
    }

    function load_next_sound(){
      if(loadsounds.length<=0){
        self.emit('loaded:all');
        return;
      }
      var nextsound = loadsounds.shift();

      load_sound(nextsound, load_next_sound);
    }

    load_next_sound();
  }


  /*
  
    --------------------------------------------
    --------------------------------------------


    PLAY SOUND


    --------------------------------------------
    --------------------------------------------
    
  */

  media.playdictionarysound = function(name){
    var snd = this.sounds["audio/sfx/" + name];

    if(snd){
      snd.play();
    }
  }

  media.playpagesounds = function(index){

    this.stopsounds();
    
    var fx = this.sounds["audio/pagefx/page" + index];
    if(!fx){
      return;
    }
    
    fx.play();

    if(options.speech_active){
      var speech = this.sounds["audio/pagespeech/page" + index];
      speech.play();
    }
  }

  media.playsound = function(name){
    var snd = this.sounds[name];

    if(snd){
      snd.play();
    }
  }

  /*
  
    --------------------------------------------
    --------------------------------------------


    STOP SOUNDS


    --------------------------------------------
    --------------------------------------------
    
  */

  media.stopsounds = function(){
    var self = this;

    clearTimeout(this.seqid);

    for(var name in this.sounds){
      var snd = self.sounds[name];

      if(self.is_android){
        snd.seekTo(0);
        snd.stop();
        snd.release();
      }
      else{
        snd.stop();  
      }
    }
  }

  return media;
}