
	/* global THREE, main, lib */

class sdSound
	{
		static init_class()
		{
			sdSound.MASTER_SOUND_VOLUME = 0.1; // 0.25
			sdSound.interface_volume = 0.5;


			
			sdSound.SOUND_GROUP_RANGE = 2;

			sdSound.walk_list = null;
			sdSound.last_walk = Math.floor( Math.random() * 5 );

			sdSound.sword_attack_list = null;
			sdSound.last_sword_attack = Math.floor( Math.random() * 3 );

			sdSound.scheduled_sounds_list = [];
			
			sdSound.listener = null;
			
			sdSound.channels = [];
			
			sdSound.max_soundchannels = 64; // 64 was causing glitches sometimes
			
		}
		static GetChannel( forced=false ) // forced might be needed in case of music
		{
			var best = null;
			
			for ( var i = 0; i < sdSound.channels.length; i++ )
			{
				if ( forced )
				{
					if ( sdSound.channels[ i ].isPlaying )
					{
						if ( !sdSound.channels[ i ].forced )
						{
							if ( best === null )
							best = sdSound.channels[ i ];
						}
					}
					else
					return sdSound.channels[ i ];
				}
				else
				{
					if ( !sdSound.channels[ i ].isPlaying )
					return sdSound.channels[ i ];
				}
			}
			
			return best;
		}
		static GetChannelByChannelObject( channel )
		{
			for ( var i = 0; i < sdSound.channels.length; i++ )
			if ( sdSound.channels[ i ].channel === channel )
			return sdSound.channels[ i ];
	
			return sdSound.GetChannel();
		}
	
		static CalculateGlobalVolume()
		{
			var volume = sdSound.MASTER_SOUND_VOLUME;
			
			return volume;
		}
		
		static UpdateVolumes()
		{
			var reusable_global_volume = sdSound.CalculateGlobalVolume();
			for ( var i = 0; i < sdSound.channels.length; i++ )
			if ( sdSound.channels[ i ].isPlaying ) 
			{
				let ch = sdSound.channels[ i ];
				if ( ch.parent !== main.main_camera ) 
				if ( ch.parent === null || 
					 ( ch.parent !== main.scene && ch.parent.parent === null ) )
				{
					ch.stop();
					ch.onEnded();
					ch.remove();
					continue;
				}
				
				sdSound.UpdateVolume( ch, reusable_global_volume );
			}
		
		}
		
		static UpdateVolume( _sound, reusable_global_volume=-1, smooth=0.1 )
		{
			if ( reusable_global_volume === -1 )
			reusable_global_volume = sdSound.CalculateGlobalVolume();
		
			var vector = new THREE.Vector3();
			vector.setFromMatrixPosition( _sound.matrixWorld );
			
			let result_volume = reusable_global_volume * _sound.myvolume;
			
			var new_rate = 1;
			
			_sound.setVolume( result_volume, smooth );
			
			new_rate *= _sound.mypitch; 
			
			if ( new_rate !== _sound.getPlaybackRate() )
			_sound.setPlaybackRate( new_rate );
		}
		
		static init() // This must be called after sounds are actually loaded. In else case they will be undefined
		{
			sdSound.listener = new THREE.AudioListener();
			main.main_camera.add( sdSound.listener );
			
			for ( var i = 0; i < sdSound.max_soundchannels; i++ )
			{
				sdSound.channels[ i ] = new THREE.PositionalAudio( sdSound.listener );
				sdSound.channels[ i ].isAudio = true;
				sdSound.channels[ i ].forced = false;
				sdSound.channels[ i ].myid = i;
				sdSound.channels[ i ].channel = null;
				sdSound.channels[ i ].myvolume = 0;
				
				sdSound.channels[ i ].setRolloffFactor( 4 );
			}
			
		}
		
		static NamedSound( str ) 
		{
			return lib[ str ];
		}
		
		
		static PlaySound( params )
		{
			if ( params.sound === undefined )
			{
				console.warn( 'Sound is not loaded yet: '+ params.sound );
				return;
			}
			
			if ( params.volume === undefined )
			params.volume = 1;
		
			params.callback = params.callback || null;
			
			if ( params.parent_mesh === undefined )
			params.parent_mesh = null;
			
			if ( params.position === undefined )
			params.position = null;
			
			if ( params.pitch === undefined )
			params.pitch = 1;
			
			if ( params.loop === undefined )
			params.loop = false;
			
			if ( params.channel === undefined )
			params.channel = null;
			
			if ( params.volume <= 0 && params.callback === null && params.channel === null )
			return; 
			
			sdSound._PlaySound( params );
		}
		
		static SetSoundVolume( driver, volume )
		{
			if ( driver.sound !== null )
			driver.sound.myvolume = volume;
		}
		static SetSoundPitch( driver, pitch )
		{
			if ( driver.sound !== null )
			driver.sound.mypitch = pitch;
		}
		static _PlaySound( params )
		{
			let _sound;
			
			
			if ( params.channel === null )
			_sound = sdSound.GetChannel();
			else
			_sound = sdSound.GetChannelByChannelObject( params.channel );
		
			let callback = params.callback;
			
			if ( _sound === null )
			{
				if ( callback !== null )
				{
					setTimeout( function(){ callback.f.call( callback.obj ); },1 );
				}
			
				return;
			}
			
			
			if ( _sound.isPlaying )
			{
				_sound.stop();
				_sound.onEnded();
				_sound.remove();
			}
		   
		    // 
			if ( _sound.channel !== null )
			_sound.channel.sound = null;
			
			_sound.channel = params.channel;
		
			if ( _sound.channel !== null )
			_sound.channel.sound = _sound;
			//
			
			
			_sound.setBuffer( params.sound );
			//_sound.setRefDistance( 25 );
			_sound.setRefDistance( 100 );
			
			
			_sound.mypitch = params.pitch;
			
			if ( params.parent_mesh === null )
			{
				if ( params.position === null )
				main.main_camera.add( _sound );
				else
				main.scene.add( _sound );
			}
			else
			params.parent_mesh.add( _sound );
		
		
		
			if ( params.position !== null )
			{
				_sound.position.x = params.position.x;
				_sound.position.y = params.position.y;
				_sound.position.z = params.position.z;
			}
			else
			{
				_sound.position.x = 0;
				_sound.position.y = 0;
				_sound.position.z = 0;
			}
			
			_sound.myvolume = params.volume;
			
			sdSound.UpdateVolume( _sound, -1, 0 );
			
			_sound.setLoop( params.loop );
			
			_sound.onEnded = function( e )
			{
				
				_sound.onEnded = sdSound.DoNothing;
				_sound.source.onended = sdSound.DoNothing; // hacky // onEnd is only updated on .play() usually
				
				if ( callback !== null )
				callback.f.call( callback.obj );
			
				// Remove if not a loop sound
				if ( !_sound.getLoop() )
				_sound.remove();
			};
			
			_sound.remove = function()
			{
				_sound.isPlaying = false;
			
				_sound.onEnded = sdSound.DoNothing;
				_sound.source.onended = sdSound.DoNothing;
				_sound.remove = sdSound.DoNothing;
				
				_sound.stop();
				
				if ( _sound.parent !== null ) 
				_sound.parent.remove( _sound );
			
				if ( _sound.channel !== null ) 
				_sound.channel.sound = null;
				
				_sound.forced = false;
			};
			
			_sound.play();
			
		}
		
		static DoNothing()
		{
		}
		
		static PlayInterfaceSound( params )
		{
		
			if ( params.volume === undefined )
			params.volume = 1;
		
			params.volume *= sdSound.interface_volume;
			
			sdSound.PlaySound( params );
		}
		
		static IsCombinable( params )
		{
			if ( params.callback === null )
			return true;
			
			return false;
		}
		static CanCombine( paramsA, paramsB )
		{
			if ( paramsA.sound === paramsB.sound )
			if ( paramsA.parent_mesh === paramsB.parent_mesh )
			{
				if ( paramsA.position === null && paramsB.position === null )
				return true;
				else
				{
					var dx = 0;
					var dy = 0;
					var dz = 0;
					if ( paramsA.position !== null )
					{
						dx += paramsA.position.x;
						dy += paramsA.position.y;//
						dz += paramsA.position.z;//
					}
					if ( paramsB.position !== null )
					{
						dx -= paramsB.position.x;
						dy -= paramsB.position.y;//
						dz -= paramsB.position.z;//
					}
					if ( Math.abs( dx ) < sdSound.SOUND_GROUP_RANGE && 
						 Math.abs( dy ) < sdSound.SOUND_GROUP_RANGE && 
						 Math.abs( dz ) < sdSound.SOUND_GROUP_RANGE )
					return true;
				}
			}
			return false;
		}
		
		static AddSoundToQueue( params )
		{
			if ( sdSound.IsCombinable( params ) )
			for ( var i2 = sdSound.scheduled_sounds_list.length - 1; i2 >= 0; i2-- )
			if ( sdSound.IsCombinable( sdSound.scheduled_sounds_list[ i2 ] ) )
			{
				if ( params.channel !== null && params.channel === sdSound.scheduled_sounds_list[ i2 ].channel )
				{
					sdSound.scheduled_sounds_list[ i2 ] = params;
				}
				else
				if ( sdSound.CanCombine( params, sdSound.scheduled_sounds_list[ i2 ] ) )
				{
					sdSound.scheduled_sounds_list[ i2 ].volume += params.volume;
					return;
				}
			}
			sdSound.scheduled_sounds_list.push( params );
		}
		
		static ThinkNow()
		{
			for ( var i = 0; i < sdSound.scheduled_sounds_list.length; i++ )
			{
				sdSound._PlaySound( sdSound.scheduled_sounds_list[ i ] );
			}
			sdSound.scheduled_sounds_list.length = 0;
			
			sdSound.UpdateVolumes();
		}
	}

	sdSound.init_class();
	
	
	
	
	class SimplePanVolumeDriver
	{
		constructor()
		{
			this.sound = null;
		}
		
		CancelPlayback()
		{
			if ( this.sound !== null )
			{
				if ( this.sound.isPlaying )
				{
					this.sound.onEnded();
					
					if ( this.sound !== null )
					this.sound.remove();
				}
			}
		}
		
		stop()
		{
			this.CancelPlayback();
		}
	}