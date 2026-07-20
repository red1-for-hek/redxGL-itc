var bkcore = bkcore || {};

bkcore.Audio = {};
bkcore.Audio.sounds = {};

bkcore.Audio.init = function(){
	if(window.AudioContext||window.webkitAudioContext){
		bkcore.Audio._ctx = new (window.AudioContext||window.webkitAudioContext)();
		bkcore.Audio._panner = bkcore.Audio._ctx.createPanner();
		bkcore.Audio._panner.connect(bkcore.Audio._ctx.destination);
	}
	else {
		bkcore.Audio._ctx = null;
	}

	bkcore.Audio.posMultipler = 1.5;
};

bkcore.Audio.resume = function(){
	var ctx = bkcore.Audio._ctx;

	if(ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function'){
		ctx.resume();
	}
};

bkcore.Audio.init();

bkcore.Audio.addSound = function(src, id, loop, callback, usePanner){
	var ctx = bkcore.Audio._ctx;
	var audio = new Audio();
	
	if(ctx){
		var audio = { src: null, gainNode: null, bufferNode: null, loop: loop, fallback: null, useFallback: false };
		var failOpen = function(reason){
			console.warn('Audio load fallback for %s.'.replace('%s', id), reason || '');
			audio.fallback = new Audio();
			audio.fallback.loop = loop;
			audio.fallback.autoplay = false;
			audio.fallback.src = src;
			audio.useFallback = true;
			callback();
		};
		var xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer';

		xhr.onload = function(){
			ctx.decodeAudioData(xhr.response, function(b){
				// Create Gain Node
				var gainNode = ctx.createGain();

				if(usePanner === true){
					gainNode.connect(bkcore.Audio._panner);
				}
				else {
					gainNode.connect(ctx.destination);
				}

				// Add the audio source
				audio.src = b;

				//Remember the gain node
				audio.gainNode = gainNode;
				
				callback();
			}, function(e){
				console.error('Audio decode failed!', e);
				failOpen(e);
			});
		};

		xhr.onerror = function(e){
			console.error('Audio request failed!', e);
			failOpen(e);
		};

		xhr.open('GET', src, true);
		xhr.send(null);
	}
	else {
		// Workaround for old Safari
		audio.addEventListener('canplay', function(){
			audio.pause();
			audio.currentTime = 0;

			callback();
		}, false);

		audio.autoplay = true;
		audio.loop = loop;
		audio.src = src;
	}
	
	bkcore.Audio.sounds[id] = audio;
};

bkcore.Audio.play = function(id){
	var ctx = bkcore.Audio._ctx;
	bkcore.Audio.resume();
	var sound = bkcore.Audio.sounds[id];

	if(sound == null){
		return;
	}

	if(ctx && sound.useFallback !== true && sound.gainNode != null && sound.src != null){
		var sound = ctx.createBufferSource();
		sound.connect(bkcore.Audio.sounds[id].gainNode);
		
		sound.buffer = bkcore.Audio.sounds[id].src;
		sound.loop = bkcore.Audio.sounds[id].loop;

		bkcore.Audio.sounds[id].gainNode.gain.value = 1;
		bkcore.Audio.sounds[id].bufferNode = sound;

		sound.start ? sound.start(0) : sound.noteOn(0);
	}
	else if(sound.fallback != null){
		if(sound.fallback.currentTime > 0){
			sound.fallback.pause();
			sound.fallback.currentTime = 0;
		}

		sound.fallback.play();
	}
	else {
		if(sound.currentTime > 0){
			sound.pause();
			sound.currentTime = 0;
		}

		sound.play();
	}
};

bkcore.Audio.stop = function(id){
	var ctx = bkcore.Audio._ctx;

	if(ctx){
		if(bkcore.Audio.sounds[id].bufferNode !== null){
			var bufferNode = bkcore.Audio.sounds[id].bufferNode;
			bufferNode.stop ? bufferNode.stop(ctx.currentTime) : bufferNode.noteOff(ctx.currentTime);
		}
		else if(bkcore.Audio.sounds[id].fallback != null){
			bkcore.Audio.sounds[id].fallback.pause();
			bkcore.Audio.sounds[id].fallback.currentTime = 0;
		}
	}
	else {
		bkcore.Audio.sounds[id].pause();
		bkcore.Audio.sounds[id].currentTime = 0;
	}
};

bkcore.Audio.volume = function(id, volume){
	var ctx = bkcore.Audio._ctx;

	if(ctx){
		if(bkcore.Audio.sounds[id].gainNode != null){
			bkcore.Audio.sounds[id].gainNode.gain.value = volume;
		}
		else if(bkcore.Audio.sounds[id].fallback != null){
			bkcore.Audio.sounds[id].fallback.volume = volume;
		}
	}
	else {
		bkcore.Audio.sounds[id].volume = volume;
	}
};

bkcore.Audio.setListenerPos = function(vec){
	if(bkcore.Audio._ctx){
		var panner = bkcore.Audio._panner;
		var vec2 = vec.normalize();
		panner.setPosition(
			vec2.x * bkcore.Audio.posMultipler,
			vec2.y * bkcore.Audio.posMultipler,
			vec2.z * bkcore.Audio.posMultipler
		);
	}
};

bkcore.Audio.setListenerVelocity = function(vec){
	if(bkcore.Audio._ctx){
		var panner = bkcore.Audio._panner;
		//panner.setVelocity(vec.x, vec.y, vec.z);
	}
};