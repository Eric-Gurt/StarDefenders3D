/*

	(C) 2018 Eric Gurt http://www.gevanni.com

*/
	
/* global THREE, sdShaderMaterial, sdCharacter, sdBullet, sdAtom, sdChain, sdSync, sdNet, sdSound, sdRandomPattern, sdSprite, Infinity */

class main
{
	static init_class()
	{
		main.base_resolution_x = 1920;
		main.base_resolution_y = 1080;
		
		main.DisplayedScreen = null;
		
		main.WEAPON_RIFLE = 0;
		main.WEAPON_ROCKET = 1;
		
		main.date_match_started = new Date();
		
		main.anim_frame = -1;
		
		main.hold_w = 0;
		main.hold_s = 0;
		main.hold_a = 0;
		main.hold_d = 0;
		main.hold_space = 0;
		main.hold_ctrl = 0;
		main.hold_shift = 0;
		main.hold_fire = 0;
		
		main.GSPEED = 0.5;
		main.min_safe_GSPEED = 0.01; // 
		main.WSPEED = 0.5;
		main.GAME_FPS = 30;
		
		main.ticks_passed = 0;
		main.ticks_todo = 0;
		main.ticks_last = 0;
		main.ticks_last_delta = 0;
		
		main.game_loop_started = false;
		
		main.MP_mode = false;
		main.max_players = 0;
		main.max_teams = 0;
		
		main.action_weapon = main.WEAPON_RIFLE; // Sets "must-pick" weapon on keypress. Never changes after that but should influence what weapon is being switched to
		
		main.my_character = null;
		main.mp_character = null;
		
		main.walk_vector_xz = new THREE.Vector2( 0, 1 );
		
		main.sensitivity = localStorage.getItem('stardefenders_sensitivity');
		if ( main.sensitivity === null )
		main.sensitivity = 0.0015;
		else
		main.sensitivity = Number( main.sensitivity );
		
		main.turn_method = localStorage.getItem('stardefenders_turn_method');
		if ( main.turn_method === null )
		main.turn_method = 0;
		else
		main.turn_method = Number( main.turn_method );
	
		main.pixel_ratio = Number( localStorage.getItem( 'stardefenders_pixelratio' ) || 0.35 );
	
		main.lod_ratio = Number( localStorage.getItem( 'stardefenders_lodratio' ) || 1.5 );
	
		setTimeout( function()
		{
			document.getElementById('sensitivity').value = main.sensitivity;
		}, 1000 );
		setTimeout( function()
		{
			document.getElementById('turn_method').value = main.turn_method;
		}, 1000 );
		setTimeout( function()
		{
			document.getElementById('quality').value = main.pixel_ratio;
		}, 1000 );
		setTimeout( function()
		{
			document.getElementById('lod').value = main.lod_ratio;
		}, 1000 );
		
		main.ang = 0;
		main.ang2 = 0;
		
		main.speed = new THREE.Vector3( 0, 0, 0 );
		
		main.material_lod = null;
		main.voxel_static = null;
		
		main.chat_messages = [];
		main.chat_off_timer = 0;
		var chat_box = null;
		setInterval(
		function()
		{
			if ( chat_box === null )
			chat_box = document.getElementById('chat_box');
			
			if ( main.chat_off_timer > 0 )
			{
				main.chat_off_timer -= 0.02;
				
				if ( main.chat_off_timer <= 0 )
				main.chat_messages = [];
				
				if ( main.chat_off_timer < 1 )
				chat_box.style.opacity = main.chat_off_timer;
				else
				chat_box.style.opacity = '1';
			}
		}, 20 );
		
		main.InitEngine();
		
		main.team_scores = [];
		
		main.recalc_brightness_tasks = [];
		
		main.pb3driver = null;
		main.pb3driver_channel = null;
		
		main.DestroyLevel();
	}
	static ScoreForTeam( team_id, delta )
	{
		main.team_scores[ team_id ] += delta;
		
		var s = '';
		
		for ( var i = 0; i < main.team_scores.length; i++ )
		{
			var a = {r:1,g:0,b:0};
			
			sdCharacter.ApplyTeamColorToObject( a, i );
			
			a.r = a.r * 0.7 + 0.3;
			a.g = a.g * 0.7 + 0.3;
			a.b = a.b * 0.7 + 0.3;
			
			a.r = ~~( a.r * 255 );
			a.g = ~~( a.g * 255 );
			a.b = ~~( a.b * 255 );
			
			if ( main.team_scores.length <= 4 )
			s += '<span class="team_score" style="color:rgb('+a.r+','+a.g+','+a.b+')">'+main.team_scores[ i ]+'</span>';
			else
			s += '<span class="team_score" style="color:rgb('+a.r+','+a.g+','+a.b+');font-size:1.5vh;margin-left:0.01vh;margin-right:0.01vh;">'+main.team_scores[ i ]+'</span>';
		}
		
		document.getElementById('score_keeper').innerHTML = s;
	}
	static run()
	{
		document.getElementById('lobby_ui').style.display = 'none';
		document.getElementById('ingame_hud').style.display = 'inherit';
		document.getElementById('menu').style.display = 'none';
		
		main.renderer.domElement.onmousedown = main.onMouseDown;
		main.renderer.domElement.onmouseup = main.onMouseUp;
		window.onresize = main.UpdateScreenSize;
		document.onmousemove = main.onMouseMove;
		window.onkeydown = main.onKeyDown;
		window.onkeyup = main.onKeyUp;
		
		main.UpdateScreenSize();
		
		if ( !main.game_loop_started )
		{
			main.game_loop_started = true;
			
			sdAtom.init();
			
			main.onEnterFrame();
		}
	}
	static SetPixelRatio( v, upd=true )
	{
		main.pixel_ratio = v;
		main.renderer.setPixelRatio( main.pixel_ratio );
		
		if ( upd )
		main.UpdateScreenSize();
		
		localStorage.setItem( 'pixel_ratio', v );
	}
	static InitEngine()
	{
		main.scene = new THREE.Scene();
		
		main.renderer = new THREE.WebGLRenderer({ 
			debug_webgl: false, 
			fragDepth:true, 
			precision:'lowp', 
			stencil:false, 
			powerPreference:'high-performance' 
		});
	
		main.SetPixelRatio( main.pixel_ratio, false );

		main.renderer.setSize( window.innerWidth, window.innerHeight );
		main.renderer.autoClear = false;
		document.body.appendChild( main.renderer.domElement );
		
		main.main_camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.01, 1024 );
		main.main_camera.position.x = -5;
		main.main_camera.position.y = -5;
		main.main_camera.position.z = -5;
		
		main.scene.add( main.main_camera );
		
		main.composer = new THREE.EffectComposer( main.renderer );
		
		var in_game_pass = new THREE.RenderPass( main.scene, main.main_camera );
		in_game_pass.clear = true;
		in_game_pass.clearDepth = true;
		in_game_pass.renderToScreen = true;
		main.composer.addPass( in_game_pass );
		
		main.composer.renderer.domElement.style.imageRendering = 'pixelated';
	}
	static onChatMessage( from, t, character=null, color='255,255,255' )
	{
		if ( from === '' )
		main.chat_messages.push( '<div style="color:rgba('+color+')">'+t+'</div>' );
		else
		{
			if ( character !== null )
			{
				var a = {r:1,g:0,b:0};

				sdCharacter.ApplyTeamColorToObject( a, character.team );

				a.r = a.r * 0.7 + 0.3;
				a.g = a.g * 0.7 + 0.3;
				a.b = a.b * 0.7 + 0.3;

				a.r = ~~( a.r * 255 );
				a.g = ~~( a.g * 255 );
				a.b = ~~( a.b * 255 );

				main.chat_messages.push( '<div><span style="color:rgba('+a.r+','+a.g+','+a.b+',1)">'+from+':</span> '+t+'</div>' );
			}
			else
			main.chat_messages.push( '<div><span style="color:rgba(255,255,255,0.5)">'+from+':</span> '+t+'</div>' );
		}
		
		if ( main.chat_messages.length > 5 )
		{
			main.chat_messages.shift();
		}
		
		var s = '';
		
		for ( var i = 0; i < main.chat_messages.length; i++ )
		{
			s += main.chat_messages[ i ];
		}
		document.getElementById('chat_box').innerHTML = s;
		
		main.chat_off_timer = 7;
	}
	static onKeyDown( e )
	{
		if ( document.activeElement.tagName === 'INPUT' && !document.activeElement.isContentEditable )
		{
			return true;
		}
		
		if ( document.activeElement.isContentEditable )
		{
			if ( e.keyCode === 13 ) // Enter
			{
				document.getElementById('chat_input_box').style.display = 'none';
				
				if ( main.MP_mode )
				sdSync.MP_SendEvent( sdSync.COMMAND_I_SAY, document.getElementById('chat_input_box').value );
				
				main.onChatMessage( 'Player #'+sdNet.uid + ' (you)', document.getElementById('chat_input_box').value, main.my_character );
			}
			return true;
		}
		else
		{
			if ( e.keyCode === 13 ) // Enter
			{
				document.getElementById('chat_input_box').style.display = 'inherit';
				
				document.getElementById('chat_input_box').value = '';
				document.getElementById('chat_input_box').focus();
				return true;
			}
		}
		
		var v = 1;
		
		// Holdable keys
		
		if ( e.keyCode === 87 ) // W
		main.hold_w = v;
		else
		if ( e.keyCode === 83 ) // S
		main.hold_s = v;
		else
		if ( e.keyCode === 65 ) // A
		main.hold_a = v;
		else
		if ( e.keyCode === 68 ) // D
		main.hold_d = v;
		else
		if ( e.keyCode === 32 ) // Space
		main.hold_space = v;
		else
		if ( e.keyCode === 17 ) // Ctrl
		main.hold_ctrl = v;
		else
		if ( e.keyCode === 16 ) // Shift
		main.hold_shift = v;

		//

		if ( e.keyCode === 49 ) // 1
		main.action_weapon = main.WEAPON_RIFLE;
		else
		if ( e.keyCode === 50 ) // 2
		main.action_weapon = main.WEAPON_ROCKET;
		else
		if ( e.keyCode === 9 ) // Tab
		{
			if ( main.MP_mode )
			{
				
			}
			else
			{
				if ( main.my_character === null )
				{
					if ( sdCharacter.characters.length > 0 )
					main.SetActiveCharacter( sdCharacter.characters[ 0 ] );
				}
				else
				{
					if ( sdCharacter.characters.length === 0 )
					main.SetActiveCharacter( null );
					else
					{
						var i = sdCharacter.characters.indexOf( main.my_character );

						if ( i === -1 ) // Old died?
						main.SetActiveCharacter( sdCharacter.characters[ 0 ] );
						else
						{
							if ( i + 1 < sdCharacter.characters.length )
							main.SetActiveCharacter( sdCharacter.characters[ i + 1 ] );
							else
							main.SetActiveCharacter( null );
						}
					}
				}
			}
		}
		else
		if ( e.keyCode === 27 ) // Esc
		{
			if ( document.getElementById('menu').style.display !== 'inherit' )
			document.getElementById('menu').style.display = 'inherit';
			else
			document.getElementById('menu').style.display = 'none';
		}
		
		if ( e.keyCode === 82 && e.ctrlKey ) // Allow Ctrl+R
		{
		}
		else
		{
			e.preventDefault();
			return false;
		}
	}
	static SetActiveCharacter( c )
	{
		if ( c === main.my_character )
		return;
	
		if ( main.my_character !== null )
		main.my_character.UnhideForFPS();
		
		main.my_character = c;
		
		if ( c !== null )
		{
			c.HideForFPS();

			c._UpdateHealthBarIfNeeded();
		}
	}
	static onKeyUp( e )
	{
		//console.log( e );
		var v = 0;
		
		if ( e.keyCode === 87 ) // W
		main.hold_w = v;
		else
		if ( e.keyCode === 83 ) // S
		main.hold_s = v;
		else
		if ( e.keyCode === 65 ) // A
		main.hold_a = v;
		else
		if ( e.keyCode === 68 ) // D
		main.hold_d = v;
		else
		if ( e.keyCode === 32 ) // Space
		main.hold_space = v;
		else
		if ( e.keyCode === 17 ) // Ctrl
		main.hold_ctrl = v;
		else
		if ( e.keyCode === 16 ) // Shift
		main.hold_shift = v;
	}
	static onMouseDown( e )
	{
		main.GoFullscreen();
		
		if ( e.which === 1 )
		main.hold_fire = 1;
	
		if ( e.which === 3 )
		main.hold_fire = 2;
	}
	static onMouseUp( e )
	{
		main.hold_fire = 0;
	}
	static onMouseMove( e )
	{
		var xx = e.movementX * main.sensitivity;
		var yy = e.movementY * main.sensitivity;
		
		if ( main.turn_method === 1 )
		{
			main.ang -= xx;
			main.ang2 -= yy;

			if ( main.ang2 > Math.PI/2 )
			main.ang2 = Math.PI/2;
			if ( main.ang2 < -Math.PI/2 )
			main.ang2 = -Math.PI/2;

			var m = new THREE.Matrix4();
			var q = new THREE.Quaternion();
			q.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), main.ang );
			m.makeRotationFromQuaternion( q );

			var m2 = new THREE.Matrix4();
			var q2 = new THREE.Quaternion();
			q2.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), main.ang2 );
			m2.makeRotationFromQuaternion( q2 );

			m.multiply( m2 );

			main.main_camera.rotation.setFromRotationMatrix( m );
		}
		else
		{
			var q1 = new THREE.Quaternion();
			q1.setFromAxisAngle( new THREE.Vector3( 0, -1, 0 ), xx );
			main.main_camera.quaternion.multiply( q1 );

			var q1 = new THREE.Quaternion();
			q1.setFromAxisAngle( new THREE.Vector3( -1, 0, 0 ), yy );
			main.main_camera.quaternion.multiply( q1 );
		}
		
	}
	static GoFullscreen()
	{
		//return;
		
		if (!document.fullscreenElement && 
			!document.mozFullScreenElement && !document.webkitFullscreenElement) {
			if (document.documentElement.requestFullscreen) {
			document.documentElement.requestFullscreen();
			} else if (document.documentElement.mozRequestFullScreen) {
			document.documentElement.mozRequestFullScreen();
			} else if (document.documentElement.webkitRequestFullscreen) {
			document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			}
		} else {
			/*if (document.cancelFullScreen) {
			document.cancelFullScreen();
			} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
			} else if (document.webkitCancelFullScreen) {
			document.webkitCancelFullScreen();
			}*/
		}

		if ( document.pointerLockElement !== main.renderer.domElement )
		main.renderer.domElement.requestPointerLock();
	}
	static UpdateScreenSize()
	{
		
		main.renderer.setSize( window.innerWidth, window.innerHeight, true );
		
		var DisplayedScreen = main.DisplayedScreen = { x:0, y:0, width:window.innerWidth, height:window.innerHeight };
		
		if ( window.innerWidth / main.base_resolution_x * main.base_resolution_y > window.innerHeight ) // Copy [ 1 / 2 ]
		{
			DisplayedScreen.height = parseInt( window.innerHeight );
			DisplayedScreen.width = parseInt( DisplayedScreen.height / main.base_resolution_y * main.base_resolution_x );

			DisplayedScreen.y = 0;
			DisplayedScreen.x = ( window.innerWidth - DisplayedScreen.width ) / 2;
		}
		else
		{
			DisplayedScreen.width = parseInt( window.innerWidth );
			DisplayedScreen.height = parseInt( DisplayedScreen.width / main.base_resolution_x * main.base_resolution_y ); // Copy [ 2 / 2 ]

			DisplayedScreen.x = 0;
			DisplayedScreen.y = ( window.innerHeight - DisplayedScreen.height ) / 2;
		}
		
		main.composer.setSize( DisplayedScreen.width, DisplayedScreen.height ); // or else it will be blurry
		
		main.renderer.setViewport( DisplayedScreen.x, DisplayedScreen.y, 
									 DisplayedScreen.width, DisplayedScreen.height );

		main.main_camera.aspect = DisplayedScreen.width / DisplayedScreen.height;
		main.main_camera.updateProjectionMatrix();

		for ( var i = 0; i < main.material_lod.length; i++ )
		main.material_lod[ i ].ScreenUpdated();

		sdAtom.material.ScreenUpdated();

	}
	
	static Dist3D_Vector_pow2( tox, toy, toz )
	{
		return ( tox*tox + toy*toy + toz*toz );
	}
	static Dist3D( x1, y1, z1, x2, y2, z2 )
	{
		return Math.sqrt( main.Dist3D_Vector_pow2( x1-x2, y1-y2, z1-z2 ) );
	}
	static MorphWithTimeScale( current, to, remain, _GSPEED )
	{
		remain = Math.pow( remain, _GSPEED );
		return to * ( 1 - remain ) + current * remain;
	}
	static RemoveElement( vec, offset )
	{
		var i = offset;
		var i2 = i + 1;
		var len = vec.length;
		while ( i2 < len )
		{
			vec[ i ] = vec[ i2 ];
			i = i2;
			i2++;
		}
		vec.pop();
	}
	static DestroyLevel()
	{
		main.game_loop_started = false;
		window.cancelAnimationFrame( main.anim_frame );
		
		if ( main.voxel_static !== null )
		{
			for ( var i = 0; i < main.voxel_static.length; i++ )
			main.voxel_static[ i ].remove();
		}
		
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		{
			sdCharacter.characters[ i ].remove( false );
			i--;
			continue;
		}
		for ( var i = 0; i < sdBullet.bullets.length; i++ )
		{
			sdBullet.bullets[ i ].peer_removed = true;
		}
		for ( var i = 0; i < sdAtom.atoms.length; i++ )
		sdAtom.atoms[ i ].remove();
		for ( var i = 0; i < sdChain.chains.length; i++ )
		sdChain.chains[ i ].remove();
	
		sdCharacter.characters.length = 0;
		sdBullet.bullets.length = 0;
		sdAtom.atoms.length = 0;
		sdChain.chains.length = 0;
		
		main.material_lod = [];
		main.voxel_static = [];
		
		if ( main.pb3driver !== null )
		{
			main.scene.remove( main.pb3driver );
			main.pb3driver = null;
		}
	}
	static BuildLevel( seed )
	{
		main.GAME_FPS = 30;
		
		main.pb3driver = new THREE.Object3D();
		main.pb3driver.position.x = 10000;
		main.pb3driver.position.y = 10000;
		main.pb3driver.position.z = 10000;
		main.scene.add( main.pb3driver );
		
		main.pb3driver_channel = new SimplePanVolumeDriver();
		
		sdSound.PlaySound({ sound: lib.pb3_spoiler, parent_mesh: main.pb3driver, channel:main.pb3driver_channel, volume: 0, loop: true });


		var radius = 32;
		var bmp = new BitmapData( radius, radius, true );
		
		var context = bmp.ctx;
		context.fillStyle = '#ffffff';
		
		main.date_match_started = new Date();
		
		context.beginPath();
		context.arc( radius/2, radius/2, radius/2-1, 0, 2 * Math.PI ); // lt
		context.fill();
		
		var texture = new THREE.CanvasTexture( bmp.ctx.canvas );
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestMipMapNearestFilter;
		
		var chunk_size = 32; // 16
		main.chunk_size = chunk_size;
		var level_chunks_x = ~~( 2 * 190 / chunk_size );
		var level_chunks_y = ~~( 2 * 32 / chunk_size ); // 98
		var level_chunks_z = ~~( 2 * 190 / chunk_size );
		var add_concrete = true;
		var add_terrain = true;
		var test_trace_setup = false;
		
		// Hack, speed up loading
		/*level_chunks_x = 2;
		level_chunks_y = 1;
		level_chunks_z = 2;
		add_concrete = true;
		add_terrain = false;
		test_trace_setup = true;*/
		
		
		main.level_chunks_x = level_chunks_x;
		main.level_chunks_y = level_chunks_y;
		main.level_chunks_z = level_chunks_z;
		
		var solve_random_factor = 0.75; 
		var edge_density = 0.5;
		var sky_ground_contrast = 0.05;
		var extra_sky_ground_contrast = 0.025;
		
		var size_x = level_chunks_x * chunk_size;
		var size_y = level_chunks_y * chunk_size;
		var size_z = level_chunks_z * chunk_size;
		
		var size_array = size_x * size_y * size_z;
		
		var fill = [];
		var solved = [];
		var brightness = [];
		var noise_tex = [];
		var world_rgb = [];
		fill.length = size_array;
		solved.length = size_array;
		brightness.length = size_array;
		noise_tex.length = size_array;
		world_rgb.length = size_array * 3;
		
		var reusable_coords = [];
		reusable_coords.length = size_array;
		
		var x = 0;
		var y = 0;
		var z = 0;
		for ( var i = 0; i < reusable_coords.length; i++ )
		{
			// x * size_z * size_y + y * size_z + z
			reusable_coords[ i ] = new CoordXYZ( x,y,z, i );

			z++;
			if ( z >= size_z )
			{
				y++;
				z = 0;
			}
			if ( y >= size_y )
			{
				x++;
				y = 0;
			}
			
			brightness[ i ] = 0;
		}
		
		var size_z_mul_size_y = size_z * size_y;
		function Coord( x, y, z )
		{
			//return ( x * size_z * size_y + y * size_z + z );
			return ( x * size_z_mul_size_y + y * size_z + z );
		}
		
		function FromCoord( x,y,z )
		{
			return reusable_coords[ Coord( x,y,z ) ];
		}
		function FilledDensityByXYZ( x, y, z ) // new
		{
			
			var morph = y / ( size_y - 1 );
			
			if ( x === 0 || z === 0 || x === size_x-1 || z === size_z-1 )
			morph = 1;

			var ret = ( edge_density - sdRandomPattern.random() * sky_ground_contrast - extra_sky_ground_contrast ) * ( 1 - morph ) + 
					  ( edge_density + sdRandomPattern.random() * sky_ground_contrast + extra_sky_ground_contrast ) * morph;

			return ret;
		}
		function SolveCube( x1, y1, z1, x2, y2, z2 )
		{
			/*x1 = ~~x1;
			y1 = ~~y1;
			z1 = ~~z1;

			x2 = ~~x2;
			y2 = ~~y2;
			z2 = ~~z2;
			if ( x1 !== ~~x1 ||
				 y1 !== ~~y1 ||
				 z1 !== ~~z1 ||
				 x2 !== ~~x2 ||
				 y2 !== ~~y2 ||
				 z2 !== ~~z2 )
			throw new Error();
			*/

			var left_top_close = Coord( x1,y1,z1 );
			var left_top_far = Coord( x1,y1,z2 );
			var right_top_close = Coord( x2,y1,z1 );
			var right_top_far = Coord( x2,y1,z2 );

			var left_bottom_close = Coord( x1,y2,z1 );
			var left_bottom_far = Coord( x1,y2,z2 );
			var right_bottom_close = Coord( x2,y2,z1 );
			var right_bottom_far = Coord( x2,y2,z2 );

			var mid_x = ~~( ( x1 + x2 ) / 2 );
			var mid_y = ~~( ( y1 + y2 ) / 2 );
			var mid_z = ~~( ( z1 + z2 ) / 2 );

			// 0-sides:
			var middle = FromCoord( mid_x, mid_y, mid_z );

			// 1-sides:
			var left_middle = FromCoord( x1, mid_y, mid_z );
			var right_middle = FromCoord( x2, mid_y, mid_z );
			var middle_close = FromCoord( mid_x, mid_y, z1 );
			var middle_far = FromCoord( mid_x, mid_y, z2 );
			var top_middle = FromCoord( mid_x, y1, mid_z );
			var bottom_middle = FromCoord( mid_x, y2, mid_z );

			// 2-sides:
			// x
			var middle_top_close = FromCoord( mid_x, y1, z1 );
			var middle_top_far = FromCoord( mid_x, y1, z2 );
			var middle_bottom_close = FromCoord( mid_x, y2, z1 );
			var middle_bottom_far = FromCoord( mid_x, y2, z2 );
			// z
			var left_top_middle = FromCoord( x1, y1, mid_z );
			var right_top_middle = FromCoord( x2, y1, mid_z );
			var left_bottom_middle = FromCoord( x1, y2, mid_z );
			var right_bottom_middle = FromCoord( x2, y2, mid_z );
			// y
			var left_middle_close = FromCoord( x1, mid_y, z1 );
			var left_middle_far = FromCoord( x1, mid_y, z2 );
			var right_middle_close = FromCoord( x2, mid_y, z1 );
			var right_middle_far = FromCoord( x2, mid_y, z2 );
			// 
			
			// Fast check
			if ( x2 - x1 <= 1 )
			if ( y2 - y1 <= 1 )
			if ( z2 - z1 <= 1 )
			return;

			// Check if any action is actually needed (slow check):
			// 0-sides
			if ( solved[ middle.coord ] )
			// 1-sides
			if ( solved[ left_middle.coord ] )
			if ( solved[ right_middle.coord ] )
			if ( solved[ middle_close.coord ] )
			if ( solved[ middle_far.coord ] )
			if ( solved[ top_middle.coord ] )
			if ( solved[ bottom_middle.coord ] )
			// 2-sides
			// x
			if ( solved[ middle_top_close.coord ] )
			if ( solved[ middle_top_far.coord ] )
			if ( solved[ middle_bottom_close.coord ] )
			if ( solved[ middle_bottom_far.coord ] )
			// z
			if ( solved[ left_top_middle.coord ] )
			if ( solved[ right_top_middle.coord ] )
			if ( solved[ left_bottom_middle.coord ] )
			if ( solved[ right_bottom_middle.coord ] )
			// y
			if ( solved[ left_middle_close.coord ] )
			if ( solved[ left_middle_far.coord ] )
			if ( solved[ right_middle_close.coord ] )
			if ( solved[ right_middle_far.coord ] )
			return;

			// Solve these dots
			//{
				// 0-sides:
				SolveBasedOn( middle, [ left_top_close, left_top_far, right_top_close, right_top_far, left_bottom_close, left_bottom_far, right_bottom_close, right_bottom_far ], main.Dist3D( x1, y1, z1, mid_x, mid_y, mid_z ) );

				// 1-sides:
				SolveBasedOn( left_middle, [ left_top_close, left_top_far, left_bottom_close, left_bottom_far ], main.Dist3D( 0, y1, z1, 0, mid_y, mid_z ) );
				SolveBasedOn( right_middle, [ right_top_close, right_top_far, right_bottom_close, right_bottom_far ], main.Dist3D( 0, y1, z1, 0, mid_y, mid_z ) );
				SolveBasedOn( middle_close, [ left_top_close, right_top_close, left_bottom_close, right_bottom_close ], main.Dist3D( x1, y1, 0, mid_x, mid_y, 0 ) );
				SolveBasedOn( middle_far, [ left_top_far, right_top_far, left_bottom_far, right_bottom_far ], main.Dist3D( x1, y1, 0, mid_x, mid_y, 0 ) );
				SolveBasedOn( top_middle, [ left_top_close, left_top_far, right_top_close, right_top_far ], main.Dist3D( x1, 0, z1, mid_x, 0, mid_z ) );
				SolveBasedOn( bottom_middle, [ left_bottom_close, left_bottom_far, right_bottom_close, right_bottom_far ], main.Dist3D( x1, 0, z1, mid_x, 0, mid_z ) );

				// 2-sides:
				// x
				SolveBasedOn( middle_top_close, [ left_top_close, right_top_close ], Math.abs( x1 - mid_x ) );
				SolveBasedOn( middle_top_far, [ left_top_far, right_top_far ], Math.abs( x1 - mid_x ) );
				SolveBasedOn( middle_bottom_close, [ left_bottom_close, right_bottom_close ], Math.abs( x1 - mid_x ) );
				SolveBasedOn( middle_bottom_far, [ left_bottom_far, right_bottom_far ], Math.abs( x1 - mid_x ) );
				// z
				SolveBasedOn( left_top_middle, [ left_top_close, left_top_far ], Math.abs( z1 - mid_z ) );
				SolveBasedOn( right_top_middle, [ right_top_close, right_top_far ], Math.abs( z1 - mid_z ) );
				SolveBasedOn( left_bottom_middle, [ left_bottom_close, left_bottom_far ], Math.abs( z1 - mid_z ) );
				SolveBasedOn( right_bottom_middle, [ right_bottom_close, right_bottom_far ], Math.abs( z1 - mid_z ) );
				// y
				SolveBasedOn( left_middle_close, [ left_top_close, left_bottom_close ], Math.abs( y1 - mid_y ) );
				SolveBasedOn( left_middle_far, [ left_top_far, left_bottom_far ], Math.abs( y1 - mid_y ) );
				SolveBasedOn( right_middle_close, [ right_top_close, right_bottom_close ], Math.abs( y1 - mid_y ) );
				SolveBasedOn( right_middle_far, [ right_top_far, right_bottom_far ], Math.abs( y1 - mid_y ) );

			//}


			// Recursive cubes:

			// left top close
			SolveCube( x1, y1, z1, mid_x, mid_y, mid_z );
			// left top far
			SolveCube( x1, y1, mid_z, mid_x, mid_y, z2 );
			// right top close
			SolveCube( mid_x, y1, z1, x2, mid_y, mid_z );
			// right top far
			SolveCube( mid_x, y1, mid_z, x2, mid_y, z2 );

			// left bottom close
			SolveCube( x1, mid_y, z1, mid_x, y2, mid_z );
			// left bottom far
			SolveCube( x1, mid_y, mid_z, mid_x, y2, z2 );
			// right bottom close
			SolveCube( mid_x, mid_y, z1, x2, y2, mid_z );
			// right bottom far
			SolveCube( mid_x, mid_y, mid_z, x2, y2, z2 );
		}
		
		var all_solvable_based_ons_x = [];
		function SolveBasedOn( solvable, arr, size )
		{
			if ( solved[ solvable.coord ] )
			return;

			var sum = 0;
			var noise = 0;

			//for ( var k = arr.length - 1; k >= 0; k-- ) Usually can be slower in Chrome
			for ( var k = 0; k < arr.length; k++ )
			{
				sum += fill[ arr[ k ] ];
				noise += noise_tex[ arr[ k ] ];
			}

			sum /= arr.length;
			noise /= arr.length;

			noise = noise + ( sdRandomPattern.random() - 0.5 ) * ( size * 0.15 + 0.75 ) * 0.1 * 0.75;
			sum = sum + ( sdRandomPattern.random() - 0.5 ) * size * 0.01 * solve_random_factor;

			if ( all_solvable_based_ons_x[ solvable.x ] === undefined )
			all_solvable_based_ons_x[ solvable.x ] = 1;
			else
			all_solvable_based_ons_x[ solvable.x ]++;
		
			if ( solvable.y === 0 || solvable.x === 0 || solvable.x === size_x-1 || solvable.z === 0 || solvable.z === size_z-1 )
			{
				sum = Math.max( edge_density + 0.02, sum );
			}
			if ( solvable.y === size_y-1 )
			{
				sum = Math.min( edge_density - 0.02, sum );
			}
		
			fill[ solvable.coord ] = sum;
			noise_tex[ solvable.coord ] = noise;

			solved[ solvable.coord ] = true;
		}

		function SolveIfNotSolved( i, val )
		{
			if ( solved[ i ] )
			return;

			fill[ i ] = val;
			noise_tex[ i ] = val;
			
			solved[ i ] = true;

		}

		function PreSolveCube( x1, y1, z1, x2, y2, z2 )
		{
			x1 = ~~x1;
			y1 = ~~y1;
			z1 = ~~z1;

			x2 = ~~x2;
			y2 = ~~y2;
			z2 = ~~z2;

			// over-top
			SolveIfNotSolved( Coord( x1, y1, z1 ), FilledDensityByXYZ( x1, y1, z1 ) );
			SolveIfNotSolved( Coord( x2, y1, z1 ), FilledDensityByXYZ( x2, y1, z1 ) );
			SolveIfNotSolved( Coord( x1, y1, z2 ), FilledDensityByXYZ( x1, y1, z2 ) );
			SolveIfNotSolved( Coord( x2, y1, z2 ), FilledDensityByXYZ( x2, y1, z2 ) );
		
			// under-ground
			SolveIfNotSolved( Coord( x1, y2, z1 ), FilledDensityByXYZ( x1, y2, z1 ) );
			SolveIfNotSolved( Coord( x2, y2, z1 ), FilledDensityByXYZ( x2, y2, z1 ) );
			SolveIfNotSolved( Coord( x1, y2, z2 ), FilledDensityByXYZ( x1, y2, z2 ) );
			SolveIfNotSolved( Coord( x2, y2, z2 ), FilledDensityByXYZ( x2, y2, z2 ) );

		}
		
		sdRandomPattern.SetSeed( seed ); // 43223
		
		
		//main.fog_color = 0xf6d08f;//0xffdd94;
		var c = new pb2HighRangeColor().rand_pattern();
		while ( c.g * 0.5 > c.r + c.b )
		{
			c.g -= 0.05;
			c.r += 0.1;
			c.b += 0.1;
		}
		while ( c.r * 0.45 > c.g + c.b )
		{
			c.r -= 0.05;
			c.g += 0.1;
			c.b += 0.1;
		}
		while ( c.b * 0.35 > c.r + c.g )
		{
			c.b -= 0.05;
			c.r += 0.075;
			c.g += 0.075;
		}
		main.fog_color = c._uint;
		var terrain_color = new pb2HighRangeColor().rand_pattern();
		main.renderer.setClearColor( main.fog_color );
		for ( var i = 0; i < 4; i++ )
		{
			if ( main.material_lod.length === i )
			main.material_lod[ i ] = sdShaderMaterial.CreateMaterial( texture, 'particle' );
		
			main.material_lod[ i ].uniforms.fog.value = new THREE.Color( main.fog_color );
			main.material_lod[ i ].uniforms.dot_scale.value = Math.pow( 2, i * 0.75 );
		}
		sdAtom.init(); // updates fog
		
		
		
		var fractal_cube_size = chunk_size * 2;
		var step_size = ~~( fractal_cube_size );
		if ( add_terrain )
		{
			for ( x = 0; x < size_x; x += step_size )
			for ( y = 0; y < size_y; y += step_size )
			for ( z = 0; z < size_z; z += step_size )
			{
				PreSolveCube( x,
							  y,
							  z,
							  Math.min( x + step_size, size_x-1 ),
							  Math.min( y + step_size, size_y-1 ),
							  Math.min( z + step_size, size_z-1 ) );

				SolveCube(    x,
							  y,
							  z,
							  Math.min( x + step_size, size_x-1 ),
							  Math.min( y + step_size, size_y-1 ),
							  Math.min( z + step_size, size_z-1 ) );
			}
		}
		else
		{
			for ( x = 0; x < size_x; x += 1 )
			for ( y = 0; y < size_y; y += 1 )
			for ( z = 0; z < size_z; z += 1 )
			{
				fill[ x * size_y * size_z + y * size_z + z ] = 0.75;
				noise_tex[ x * size_y * size_z + y * size_z + z ] = 0.5;

				solved[ x * size_y * size_z + y * size_z + z ] = true;
			}
		}

		// Making some cut
		
		var cut_ops = [];
		var cut_ops_y = 20;
		var cluster_size = 17; // 15
		for ( var i = 0; i < 200; i++ )
		{
			var max_size = 60;
			var min_size = 2;
			
			if ( i % 2 === 0 )
			{
				max_size = 120;
				min_size = cluster_size;
			}
			
			var x2 = ( min_size+ Math.min( max_size, ~~(sdRandomPattern.random() * size_x/cluster_size)*cluster_size ) );
			var x1 = ~~(sdRandomPattern.random()*(size_x-x1)/cluster_size)*cluster_size;
			
			var y2 = ( min_size+ Math.min( max_size, ~~(sdRandomPattern.random() * size_y/cluster_size)*cluster_size ) );
			var y1 = ~~(sdRandomPattern.random()*(size_y-y1)/cluster_size)*cluster_size + cut_ops_y;
			
			var z2 = ( min_size+ Math.min( max_size, ~~(sdRandomPattern.random() * size_z/cluster_size)*cluster_size ) );
			var z1 = ~~(sdRandomPattern.random()*(size_z-z1)/cluster_size)*cluster_size;
			
			cut_ops.push({ op:i%2, x1:x1, y1:y1, z1:z1, x2:x1+x2, y2:y1+y2, z2:z1+z2 });
		}
		
		sdRandomPattern.RestoreSeed();
		
		var c = 0;
		for ( x = 0; x < size_x; x++ )
		for ( y = 0; y < size_y; y++ )
		for ( z = 0; z < size_z; z++ )
		{
			var i = Coord( x,y,z );
			
			if ( test_trace_setup )
			{
				if ( y < 5 )
				{
					world_rgb[ c++ ] = terrain_color.r * 255;
					world_rgb[ c++ ] = terrain_color.g * 255;
					world_rgb[ c++ ] = terrain_color.b * 255;
					fill[ i ] = 1;
				}
				else
				{
					if ( Math.max( x, z ) % 40 <= 0 )
					{
						world_rgb[ c++ ] = 100;
						world_rgb[ c++ ] = 100;
						world_rgb[ c++ ] = 100;
						fill[ i ] = 1;
					}
					else
					{
						fill[ i ] = 0;
						c += 3;
					}
				}
				continue;
			}
			
			if ( !add_concrete )
			{
				// Ground
				world_rgb[ c++ ] = terrain_color.r * 255;
				world_rgb[ c++ ] = terrain_color.g * 255;
				world_rgb[ c++ ] = terrain_color.b * 255;
				continue;
			}
			/*
			var quad_radius = Math.max( Math.abs( x - size_x / 2 ), Math.abs( z - size_z / 2 ) );
			
			if ( y > 15 &&
				 quad_radius > size_x / 6 &&
				 quad_radius < size_x / 3 &&
				 !( 
					( y <= 30 && ( Math.abs( x + size_x / 8 - size_x / 2 ) <= 5 || Math.abs( x - size_x / 8 - size_x / 2 ) <= 5  ||
								   Math.abs( z + size_z / 8 - size_z / 2 ) <= 5 || Math.abs( z - size_z / 8 - size_z / 2 ) <= 5 ) )
					||
					( ( y > 35 || quad_radius < size_x / 6 + 10 || quad_radius > size_x / 3 - 10 ) && ( Math.abs( x - size_x / 2 ) <= 15 || Math.abs( z - size_z / 2 ) <= 15 ) )
					||
					( quad_radius > size_x / 6 + 20 && quad_radius < size_x / 3 - 20 && Math.abs( x - size_x / 2 ) > size_x / 6 + 20 && Math.abs( z - size_z / 2 ) > size_z / 6 + 20 )
					) )
			{
				//fill[ i ] = edge_density - 0.1;
				fill[ i ] = 0;
				
				c += 3;
			}
			else
			{
				if ( y > 10 &&
					 quad_radius > size_x / 6 - 5 &&
					 quad_radius < size_x / 3 + 5 )
				{
					// Ruined wall
					world_rgb[ c++ ] = 241 * 1;
					world_rgb[ c++ ] = 241 * 1;
					world_rgb[ c++ ] = 241 * 1;
					
					noise_tex[ i ] = ( noise_tex[ i ] + 0.5 ) / 2;
					
					fill[ i ] += 0.042; // Increase visibility where wall is
				}
				else
				{
					// Ground
					world_rgb[ c++ ] = terrain_color.r * 255;
					world_rgb[ c++ ] = terrain_color.g * 255;
					world_rgb[ c++ ] = terrain_color.b * 255;
				}
			}
			*/
			world_rgb[ c   ] = terrain_color.r * 255;
			world_rgb[ c+1 ] = terrain_color.g * 255;
			world_rgb[ c+2 ] = terrain_color.b * 255;

			for ( var op = 0; op < cut_ops.length; op++ )
			{
				if ( x >= cut_ops[ op ].x1 )
				if ( x < cut_ops[ op ].x2 )
				if ( z >= cut_ops[ op ].z1 )
				if ( z < cut_ops[ op ].z2 )
				if ( y >= cut_ops[ op ].y1 )
				if ( y < cut_ops[ op ].y2 )
				{
					if ( cut_ops[ op ].op === 0 )
					{
						//fill[ i ] -= 0.05 * Math.min( y / 20, 1 );
						fill[ i ] -= 0.03 * Math.min( y / 20, 1 );
					}
					else
					{
						//fill[ i ] = 1;
						fill[ i ] += 0.08;

						world_rgb[ c   ] = 241 * 1;
						world_rgb[ c+1 ] = 241 * 1;
						world_rgb[ c+2 ] = 241 * 1;
					}
				}
			}
			c += 3;
		}
		
		
		// Remove isolated AND hide deeply invisible
		for ( x = 1; x < size_x-1; x++ )
		for ( y = 1; y < size_y-1; y++ )
		for ( z = 1; z < size_z-1; z++ )
		{
			var i = Coord( x,y,z );
			
			var cur_fill = fill[ i ] > edge_density;
			if ( cur_fill )
			{
				var filled_around = 0;
				if ( cur_fill === fill[ i - 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i - size_z ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + size_z ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i - size_y * size_z ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + size_y * size_z ] > edge_density )
				filled_around++;
			
				/*
				if ( cur_fill === fill[ i - size_z - 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + size_z - 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i - size_y * size_z - 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + size_y * size_z - 1 ] > edge_density )
				filled_around++;
				
				if ( cur_fill === fill[ i - size_z + 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + size_z + 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i - size_y * size_z + 1 ] > edge_density )
				filled_around++;
				if ( cur_fill === fill[ i + size_y * size_z + 1 ] > edge_density )
				filled_around++;
				*/
				//if ( filled_around === 14 )
				if ( filled_around === 6 )
				{
					brightness[ i ] = -1; // Will mean it is invisible
				}
				else
				if ( filled_around <= 1 )
				{
					fill[ i ] = 0;
				}
			}
		}
		
		main.lightmap_rays_per_direction = 2;
		main.lightmap_beam_power = 0.1;
		main.lightmap_rare_scale = 3;
		main.lightmap_rare_random = 3;
		main.lightmap_hit_power_multiplier = 0.5;
		main.lightmap_non_existent_power = 0.025;
		main.lightmap_ambient = 0.2;
		
		// Shadows
		for ( x = 0; x < size_x; x++ )
		for ( y = 0; y < size_y; y++ )
		for ( z = 0; z < size_z; z++ )
		{
			var i = Coord( x,y,z );
			if ( brightness[ i ] !== -1 )
			if ( fill[ i ] > edge_density )
			{
				var orig_beam_power = main.lightmap_beam_power;
				
				for ( var b = 0; b < main.lightmap_rays_per_direction; b++ )
				for ( var xx = -1; xx <= 1; xx++ )
				for ( var zz = -1; zz <= 1; zz++ )
				if ( xx !== 0 || zz !== 0 )
				{
					
					var beam_power = orig_beam_power;
					
					// May calc brightness
					var i2 = i;
					var till_sun = size_y - y - 1;
					
					if ( xx > 0 )
					till_sun = Math.min( till_sun, ( size_x - x - 1 ) * 2 );
					else
					if ( xx < 0 )
					till_sun = Math.min( till_sun, ( x - 1 ) * 2 );
			
					if ( zz > 0 )
					till_sun = Math.min( till_sun, ( size_z - z - 1 ) * 2 );
					else
					if ( zz < 0 )
					till_sun = Math.min( till_sun, ( z - 1 ) * 2 );
			
					var speed = size_z;
					var rare_speed = xx * size_y * size_z + zz;
					
					var rare = 0;
					var rare_scale = main.lightmap_rare_scale + Math.random() * main.lightmap_rare_random;
					
					while ( till_sun > 0 )
					{
						till_sun--;
						
						i2 += speed;
						
						if ( rare <= 0 )
						{
							i2 += rare_speed;
							rare += rare_scale;
						}
						rare--;
						
						if ( fill[ i2 ] > edge_density )
						{
							beam_power *= main.lightmap_hit_power_multiplier;
							if ( beam_power <= main.lightmap_non_existent_power )
							break;
						}
					}
					if ( till_sun <= 0 )
					brightness[ i ] += beam_power;
				}
				
				brightness[ i ] += main.lightmap_ambient; // Ambient
			}
		}
		
		// Terrain generated
		for ( var xx = 0; xx < level_chunks_x; xx++ )
		for ( var yy = 0; yy < level_chunks_y; yy++ )
		for ( var zz = 0; zz < level_chunks_z; zz++ )
		{
			var sub_geom = new THREE.BufferGeometry();
			var vertices = sub_geom.initVertexData( false, chunk_size * chunk_size * chunk_size * 3 );
			var rgba = sub_geom.initRGBAData( false, chunk_size * chunk_size * chunk_size * 4 );
			var uvs2 = sub_geom.initSecondaryUVDataOpacity( false, chunk_size * chunk_size * chunk_size ); // Brigtness, due to lighting. Negative values will mean voxel is deep inside and should not be rendered at all

			var dots_total = 0;

			var v = 0;
			var c = 0;
			var b = 0;
			for ( var x = 0; x < chunk_size; x++ )
			for ( var y = 0; y < chunk_size; y++ )
			for ( var z = 0; z < chunk_size; z++ )
			{
				var i = Coord( xx * chunk_size + x, yy * chunk_size + y, zz * chunk_size + z );
				
				vertices[ v++ ] = xx * chunk_size + x;
				vertices[ v++ ] = yy * chunk_size + y;
				vertices[ v++ ] = zz * chunk_size + z;
				
				var br = noise_tex[ i ];
				rgba[ c++ ] = world_rgb[ i*3   ] / 255 * br;
				rgba[ c++ ] = world_rgb[ i*3+1 ] / 255 * br;
				rgba[ c++ ] = world_rgb[ i*3+2 ] / 255 * br;
				
				
				if ( fill[ i ] > edge_density )
				{
					rgba[ c++ ] = 1; // Alpha
					dots_total++;
				}
				else
				rgba[ c++ ] = 0; // Alpha
			
				
				uvs2[ b++ ] = brightness[ i ];
			}

			sub_geom.updateVertexDataTyped( vertices );
			sub_geom.updateRGBADataTyped( rgba );
			sub_geom.updateSecondaryUVDataTyped( uvs2 );
			
			sub_geom.boundingBox = new THREE.Box3( new THREE.Vector3( xx * chunk_size, yy * chunk_size, zz * chunk_size ),
												   new THREE.Vector3( xx * chunk_size + chunk_size, yy * chunk_size + chunk_size, zz * chunk_size + chunk_size ) );
			sub_geom.boundingSphere = new THREE.Sphere( new THREE.Vector3( ( xx + 0.5 ) * chunk_size, ( yy + 0.5 ) * chunk_size, ( zz + 0.5 ) * chunk_size ),
														Math.sqrt( 3 * Math.pow( chunk_size / 2, 2 ) ) );


			var mesh = new THREE.Points( sub_geom, main.material_lod[ 0 ] );
			mesh.position.x = 0.5;
			mesh.position.y = 0.5;
			mesh.position.z = 0.5;
			
			var lod = new THREE.Group();
			lod.add( mesh );
			main.scene.add( lod );
			
			var chunk = new Chunk( xx, yy, zz, lod );
			
			chunk.dots_total = dots_total;
			
			chunk.rgba = rgba;
			chunk.uvs2 = uvs2;
			
			chunk.GenerateLODModels();
			
			if ( zz > 0 )
			{
				chunk.Connect( main.voxel_static[ main.voxel_static.length - 1 ] );
			}
			if ( yy > 0 )
			{
				chunk.Connect( main.voxel_static[ main.voxel_static.length - level_chunks_z ] );
			}
			if ( xx > 0 )
			{
				chunk.Connect( main.voxel_static[ main.voxel_static.length - level_chunks_z * level_chunks_y ] );
			}
			
			main.voxel_static.push( chunk );
		}
		
	}
	static DrawDebugPoint( x, y, z, color=0xFF0000, size=3, opacity=0.5, ms_duration=0 ) // debugdrawpoint
	{
		var mat = sdShaderMaterial.CreateMaterial( null, 'color' );
		mat.color = new THREE.Color( color );
		mat.opacity = opacity;
		mat.transparent = mat.opacity < 1;
		mat.depthWrite = mat.opacity >= 1;

		var debug_mesh = new THREE.Mesh( new THREE.SphereBufferGeometry( size, 8, 8 ), mat );

		debug_mesh.material.depthFunc = THREE.AlwaysDepth;


		debug_mesh.position.x = x;
		debug_mesh.position.y = y;
		debug_mesh.position.z = z;
		main.scene.add( debug_mesh );

		if ( ms_duration > 0 )
		{
			function del()
			{
				main.DestroyMovieClip( debug_mesh );
				debug_mesh = null;
			}
			setTimeout( del, ms_duration );
		}

		return debug_mesh;
	}
	static DestroyMovieClip( mc, keep_material=false )
	{
		
		while ( mc.children.length > 0 )
		{
			main.DestroyMovieClip( mc.children[ mc.children.length - 1 ], keep_material ); 
		}

		if ( mc.isMesh || mc.isPoints ) 
		{
			if ( !keep_material )
			main.DestroySingleMaterial( ( mc.material ) );

			mc.geometry.dispose();
		}

		if ( mc.isAudio )
		{
			mc.remove();
		}

		if ( mc.parent !== null )
		mc.parent.remove( mc );
	}

	static DestroySingleMaterial( tex_mat ) 
	{
		if ( tex_mat.dispose_pb2 !== undefined )
		{
			tex_mat.dispose();
			if ( !tex_mat.disposed )
			tex_mat.dispose_pb2( tex_mat );

			if ( tex_mat.disposed )
			{
			}
			else
			{
				if ( tex_mat.disposable )
				throw new Error('Dispose event did not fired');
			}
		}
		else
		{
			tex_mat.dispose();
		}
	}
	static FastFloor( v ) // In case you need negative values, has 500000 as low limit.
	{
		if ( v < 0 )
		return ( ~~( 500000 + v ) ) - 500000;
		else
		return ~~v;
	}
	static FastCeil( v ) // In case you need negative values, has 500000 as high limit.
	{
		if ( v > 0 )
		return -( ( ~~( 500000 - v ) ) - 500000 );
		else
		return ~~v;
	}
	static limit( min, x, max )
	{
		if ( x >= max ) return max;
		if ( x <= min ) return min;
		return x;
	}
	
	static WorldPaintDamage( x, y, z, radius, is_gore_painter=false )
	{
		var chunk_size = main.chunk_size;
		
		var radius_int = main.FastCeil( radius ) + 2;
		
		var radius_pow2 = radius * radius;
		var radius_vis_upd = radius + 2;
		var radius_pow2_vis_upd = radius_vis_upd * radius_vis_upd;
		
		var chunk_updates = [];
		function chunk_update_function( chunk )
		{
			if ( chunk_updates.indexOf( chunk ) === -1 )
			chunk_updates.push( chunk );
		}
		
		// Smallest voxel
		var av_x = ~~( x );
		var av_y = ~~( y );
		var av_z = ~~( z );

		var chunk_xx_min = ~~( ( av_x - radius_int ) / chunk_size );
		var chunk_yy_min = ~~( ( av_y - radius_int ) / chunk_size );
		var chunk_zz_min = ~~( ( av_z - radius_int ) / chunk_size );

		var chunk_xx_max = ~~( ( av_x + radius_int ) / chunk_size );
		var chunk_yy_max = ~~( ( av_y + radius_int ) / chunk_size );
		var chunk_zz_max = ~~( ( av_z + radius_int ) / chunk_size );
		
		if ( chunk_xx_min < 0 )
		chunk_xx_min = 0;
		
		if ( chunk_yy_min < 0 )
		chunk_yy_min = 0;
		
		if ( chunk_zz_min < 0 )
		chunk_zz_min = 0;
		
		if ( chunk_xx_max > main.level_chunks_x - 1 )
		chunk_xx_max = main.level_chunks_x - 1;
		
		if ( chunk_yy_max > main.level_chunks_y - 1 )
		chunk_yy_max = main.level_chunks_y - 1;
		
		if ( chunk_zz_max > main.level_chunks_z - 1 )
		chunk_zz_max = main.level_chunks_z - 1;
		
		var anything_done = false;
		var geometry_changed = false;
		
		for ( var chunk_xx = chunk_xx_min; chunk_xx <= chunk_xx_max; chunk_xx++ )
		for ( var chunk_yy = chunk_yy_min; chunk_yy <= chunk_yy_max; chunk_yy++ )
		for ( var chunk_zz = chunk_zz_min; chunk_zz <= chunk_zz_max; chunk_zz++ )
		{
			var chunk = null;

			var ch = chunk_xx * main.level_chunks_y * main.level_chunks_z + chunk_yy * main.level_chunks_z + chunk_zz;
			
			chunk = main.voxel_static[ ch ];

			av_x = ~~x - chunk_xx * chunk_size;
			av_y = ~~y - chunk_yy * chunk_size;
			av_z = ~~z - chunk_zz * chunk_size;

			var i = av_x * chunk_size * chunk_size + av_y * chunk_size + av_z;
		
		    var radius_int_x_min = Math.max( 0, av_x - radius_int ) - av_x;
		    var radius_int_y_min = Math.max( 0, av_y - radius_int ) - av_y;
		    var radius_int_z_min = Math.max( 0, av_z - radius_int ) - av_z;
			
			if ( chunk_yy === 0 )
			{
				radius_int_y_min = Math.max( 1, radius_int_y_min + av_y ) - av_y; // Disallows holes at the bottom of terrain.
			}
			
		    var radius_int_x_max = Math.min( chunk_size, av_x + radius_int ) - av_x;
		    var radius_int_y_max = Math.min( chunk_size, av_y + radius_int ) - av_y;
		    var radius_int_z_max = Math.min( chunk_size, av_z + radius_int ) - av_z;

			for ( var xx = radius_int_x_min; xx < radius_int_x_max; xx++ )
			for ( var yy = radius_int_y_min; yy < radius_int_y_max; yy++ )
			for ( var zz = radius_int_z_min; zz < radius_int_z_max; zz++ )
			{
				var di = main.Dist3D_Vector_pow2( xx, yy, zz );
					
				var i = (av_x+xx) * chunk_size * chunk_size + (av_y+yy) * chunk_size + (av_z+zz);
					
				if ( di < radius_pow2 )
				{
					di = Math.sqrt( di );

					if ( chunk.rgba[ i * 4 + 3 ] > 0 )
					{
						anything_done = true;

						if ( is_gore_painter )
						{
							chunk.rgba[ i * 4 + 0 ] = Math.max( 0, chunk.rgba[ i * 4 + 0 ] * ( 1 - 0.2 * 0.75 ) );
							chunk.rgba[ i * 4 + 1 ] = Math.max( 0, chunk.rgba[ i * 4 + 1 ] * ( 1 - 0.2 * 2 ) );
							chunk.rgba[ i * 4 + 2 ] = Math.max( 0, chunk.rgba[ i * 4 + 2 ] * ( 1 - 0.2 * 2 ) );
						}
						else
						{
							chunk.rgba[ i * 4 + 3 ] = 0;
							geometry_changed = true;

							if ( Math.random() < 0.05 )
							{
								var power = -1 / Math.max( 1, di ) * ( radius - di );
								var r_x = ( Math.random() - 0.5 );
								var r_y = ( Math.random() - 0.5 );
								var r_z = ( Math.random() - 0.5 );
								sdSprite.CreateSprite({ type: sdSprite.TYPE_ROCK, x:x-xx, y:y-yy, z:z-zz, tox:(xx+r_x)*power, toy:(yy+r_y)*power, toz:(zz+r_z)*power });
							}
						}
					}
				}
				else
				if ( !is_gore_painter )
				if ( di < radius_pow2_vis_upd )
				{
					if ( chunk.uvs2[ i ] < 0 )
					chunk.uvs2[ i ] = Math.random();
					
					di = Math.sqrt( di );
					var morph = ( di - radius );
					
					if ( morph < 1 )
					{
						morph = 0.5 + morph * 0.5;
						
						chunk.rgba[ i * 4 ] *= morph;
						chunk.rgba[ i * 4 + 1 ] *= morph;
						chunk.rgba[ i * 4 + 2 ] *= morph;
					}
				}
			}

			chunk_update_function( chunk );
		}
		
		if ( anything_done )
		{
			if ( is_gore_painter )
			{
				for ( var i = 0; i < chunk_updates.length; i++ )
				chunk_updates[ i ].UpdateChunk( false, true, false );
			}
			else
			{
				if ( geometry_changed )
				{
					main.RecalcBrightness( ~~x, ~~y, ~~z, radius_int + 1, chunk_update_function );
				}

				for ( var i = 0; i < chunk_updates.length; i++ )
				chunk_updates[ i ].UpdateChunk( false, true, true );
			}
		}
	}
	static GetEntityBrightness( x, y, z )
	{
		if ( Math.abs( main.GetEntityBrightness_lx - x ) <= 2 )
		if ( Math.abs( main.GetEntityBrightness_ly - y ) <= 2 )
		if ( Math.abs( main.GetEntityBrightness_lz - z ) <= 2 )
		{
			return main.GetEntityBrightness_lr;
		}
		
		var chunk_size = main.chunk_size;
		
		var size_x = main.level_chunks_x * chunk_size;
		var size_y = main.level_chunks_y * chunk_size;
		var size_z = main.level_chunks_z * chunk_size;
		
		x = ~~x;
		y = ~~y;
		z = ~~z;
		
		if ( x < 0 || y < 0 || z < 0 )
		return 1;
	
		if ( x > size_x-1 || y > size_y-1 || z > size_z-1 )
		return 1;
		
		var chunk_xx = ~~( x / chunk_size );
		var chunk_yy = ~~( y / chunk_size );
		var chunk_zz = ~~( z / chunk_size );

		var ch = chunk_xx * main.level_chunks_y * main.level_chunks_z + chunk_yy * main.level_chunks_z + chunk_zz;

		var chunk = main.voxel_static[ ch ];

		var av_x = x - chunk_xx * chunk_size;
		var av_y = y - chunk_yy * chunk_size;
		var av_z = z - chunk_zz * chunk_size;

		var i = av_x * chunk_size * chunk_size + av_y * chunk_size + av_z;

		var brightness = 0;
		{
			var orig_beam_power = main.lightmap_beam_power;

			for ( var xx = -1; xx <= 1; xx++ )
			for ( var zz = -1; zz <= 1; zz++ )
			if ( xx !== 0 || zz !== 0 )
			{
				var beam_power = orig_beam_power;

				// May calc brightness
				var i2 = i;

				var till_sun = size_y - y - 1;

				if ( xx > 0 )
				till_sun = Math.min( till_sun, ( size_x - x - 1 ) * 2 );
				else
				if ( xx < 0 )
				till_sun = Math.min( till_sun, ( x - 1 ) * 2 );

				if ( zz > 0 )
				till_sun = Math.min( till_sun, ( size_z - z - 1 ) * 2 );
				else
				if ( zz < 0 )
				till_sun = Math.min( till_sun, ( z - 1 ) * 2 );

				var speed = chunk_size;
				var rare_speed = xx * chunk_size * chunk_size + zz;

				var rare = 0;
				var rare_scale;
				
				rare_scale = 0.5 + 0.666 * main.lightmap_rare_random;

				var current_av_x = av_x;
				var current_av_y = av_y;
				var current_av_z = av_z;

				var _ch = ch;
				var _chunk = chunk;

				var was_stopped = false;

				while ( till_sun > 0 )
				{
					till_sun--;

					i2 += speed;
					current_av_y += 1;

					if ( current_av_y >= chunk_size )
					{
						i2 -= chunk_size * chunk_size;
						current_av_y -= chunk_size;
						_ch += main.level_chunks_z;
						_chunk = main.voxel_static[ _ch ];
					}

					if ( rare <= 0 )
					{
						i2 += rare_speed;
						rare += rare_scale;

						current_av_x += xx;
						current_av_z += zz;

						if ( xx > 0 )
						{
							if ( current_av_x >= chunk_size )
							{
								i2 -= chunk_size * chunk_size * chunk_size;
								current_av_x -= chunk_size;
								_ch += main.level_chunks_z * main.level_chunks_y;
								_chunk = main.voxel_static[ _ch ];
							}
						}
						else
						if ( xx < 0 )
						{
							if ( current_av_x < 0 )
							{
								i2 += chunk_size * chunk_size * chunk_size;
								current_av_x += chunk_size;
								_ch -= main.level_chunks_z * main.level_chunks_y;
								_chunk = main.voxel_static[ _ch ];
							}
						}

						if ( zz > 0 )
						{
							if ( current_av_z >= chunk_size )
							{
								i2 -= chunk_size;
								current_av_z -= chunk_size;
								_ch += 1;
								_chunk = main.voxel_static[ _ch ];
							}
						}
						else
						if ( zz < 0 )
						{
							if ( current_av_z < 0 )
							{
								i2 += chunk_size;
								current_av_z += chunk_size;
								_ch -= 1;
								_chunk = main.voxel_static[ _ch ];
							}
						}
					}

					rare--;

					if ( _chunk.rgba[ i2 * 4 + 3 ] > 0 )
					{
						beam_power *= main.lightmap_hit_power_multiplier;
						if ( beam_power <= main.lightmap_non_existent_power )
						{
							was_stopped = true;
							break;
						}
					}
				}
				if ( !was_stopped )
				brightness += beam_power;
			}

			brightness += main.lightmap_ambient; // Ambient

		}
		main.GetEntityBrightness_lx = x;
		main.GetEntityBrightness_ly = y;
		main.GetEntityBrightness_lz = z;
		main.GetEntityBrightness_lr = brightness;
		return brightness;
	}
	static RecalcBrightness( ux, uy, uz, radius_int=Infinity ) 
	{
		var arr = [ ux, uy, uz, radius_int ];
		
		if ( radius_int === Infinity )
		{
			main.recalc_brightness_tasks = [ arr ];
			return;
		}
		
		for ( var i = i; i < main.recalc_brightness_tasks.length; i++ )
		{
			var arr2 = main.recalc_brightness_tasks[ i ];
			if ( arr2[ 3 ] === Infinity )
			{
				return;
			}
			
			if ( Math.abs( ux - arr2[ 0 ] ) <= radius_int + arr2[ 3 ] )
			if ( Math.abs( uy - arr2[ 1 ] ) <= radius_int + arr2[ 3 ] )
			if ( Math.abs( uz - arr2[ 2 ] ) <= radius_int + arr2[ 3 ] )
			{
				arr2[ 0 ] = ~~( ( ux + arr2[ 0 ] ) / 2 );
				arr2[ 1 ] = ~~( ( uy + arr2[ 1 ] ) / 2 );
				arr2[ 2 ] = ~~( ( uz + arr2[ 2 ] ) / 2 );
				
				arr2[ 3 ] += radius_int;
				return;
			}
		}
		
		main.recalc_brightness_tasks.push( arr );
	}
	static _RecalcBrightness( ux, uy, uz, radius_int ) 
	{
		var chunk_updates = [];
		
		var chunk_size = main.chunk_size;
		
		var size_x = main.level_chunks_x * chunk_size;
		var size_y = main.level_chunks_y * chunk_size;
		var size_z = main.level_chunks_z * chunk_size;
		
		var highest_y = Math.min( size_y, uy + radius_int + 1 );
		
		if ( radius_int === Infinity )
		highest_y = size_y;
		
		var from_x = 0;
		var from_z = 0;
		var to_x = size_x;
		var to_z = size_z;
		
		if ( radius_int !== Infinity )
		{
			from_x = Math.max( 0, ux - main.FastCeil( uy / 3 ) - radius_int );
			to_x = Math.min( size_x, ux + main.FastCeil( uy / 3 ) + radius_int + 1 );
			
			from_z = Math.max( 0, uz - main.FastCeil( uy / 3 ) - radius_int );
			to_z = Math.min( size_z, uz + main.FastCeil( uy / 3 ) + radius_int + 1 );
		}
		
		var pattern = new sdRandomPattern( Math.min( 256, radius_int * radius_int ) ).values;
		var pattern_i = 0;
		
		for ( var y = highest_y - 1; y >= 0; y-- )
		{
			var anything_on_this_level = ( radius_int === Infinity || y > highest_y - radius_int * 2 );
			
			for ( var x = from_x; x < to_x; x++ )
			for ( var z = from_z; z < to_z; z++ )
			if ( radius_int === Infinity || main.FastCeil( Math.max( Math.abs( ux-x ), Math.abs( uz-z ) ) ) <= main.FastCeil( ( uy - y ) / 3 ) + radius_int )
			{
				var chunk_xx = ~~( x / chunk_size );
				var chunk_yy = ~~( y / chunk_size );
				var chunk_zz = ~~( z / chunk_size );

				var ch = chunk_xx * main.level_chunks_y * main.level_chunks_z + chunk_yy * main.level_chunks_z + chunk_zz;

				var chunk = main.voxel_static[ ch ];

				var av_x = x - chunk_xx * chunk_size;
				var av_y = y - chunk_yy * chunk_size;
				var av_z = z - chunk_zz * chunk_size;

				var anything_done = false;

				{
					var i = av_x * chunk_size * chunk_size + av_y * chunk_size + av_z;

					if ( chunk.uvs2[ i ] !== -1 )
					{
						if ( chunk.rgba[ i * 4 + 3 ] <= 0 )
						continue;

						var orig_beam_power = main.lightmap_beam_power;

						var old_uvs2 = chunk.uvs2[ i ];
						chunk.uvs2[ i ] = 0;

						for ( var b = 0; b < main.lightmap_rays_per_direction; b++ )
						for ( var xx = -1; xx <= 1; xx++ )
						for ( var zz = -1; zz <= 1; zz++ )
						if ( xx !== 0 || zz !== 0 )
						{
							var beam_power = orig_beam_power;

							// May calc brightness
							var i2 = i;
							
							var till_sun = size_y - y - 1;

							if ( xx > 0 )
							till_sun = Math.min( till_sun, ( size_x - x - 1 ) * 2 );
							else
							if ( xx < 0 )
							till_sun = Math.min( till_sun, ( x - 1 ) * 2 );

							if ( zz > 0 )
							till_sun = Math.min( till_sun, ( size_z - z - 1 ) * 2 );
							else
							if ( zz < 0 )
							till_sun = Math.min( till_sun, ( z - 1 ) * 2 );
							
							var speed = chunk_size;
							var rare_speed = xx * chunk_size * chunk_size + zz;

							var rare = 0;
							var rare_scale = main.lightmap_rare_scale + pattern[ ( pattern_i++ ) % pattern.length ] * main.lightmap_rare_random;

							var current_av_x = av_x;
							var current_av_y = av_y;
							var current_av_z = av_z;

							var _ch = ch;
							var _chunk = chunk;

							var was_stopped = false;

							while ( till_sun > 0 )
							{
								till_sun--;

								i2 += speed;
								current_av_y += 1;
								if ( current_av_y >= chunk_size )
								{
									i2 -= chunk_size * chunk_size;
									current_av_y -= chunk_size;
									_ch += main.level_chunks_z;
									_chunk = main.voxel_static[ _ch ];
								}

								if ( rare <= 0 )
								{
									i2 += rare_speed;
									rare += rare_scale;

									current_av_x += xx;
									current_av_z += zz;
									if ( xx > 0 )
									{
										if ( current_av_x >= chunk_size )
										{
											i2 -= chunk_size * chunk_size * chunk_size;
											current_av_x -= chunk_size;
											_ch += main.level_chunks_z * main.level_chunks_y;
											_chunk = main.voxel_static[ _ch ];
										}
									}
									else
									if ( xx < 0 )
									{
										if ( current_av_x < 0 )
										{
											i2 += chunk_size * chunk_size * chunk_size;
											current_av_x += chunk_size;
											_ch -= main.level_chunks_z * main.level_chunks_y;
											_chunk = main.voxel_static[ _ch ];
										}
									}

									if ( zz > 0 )
									{
										if ( current_av_z >= chunk_size )
										{
											i2 -= chunk_size;
											current_av_z -= chunk_size;
											_ch += 1;
											_chunk = main.voxel_static[ _ch ];
										}
									}
									else
									if ( zz < 0 )
									{
										if ( current_av_z < 0 )
										{
											i2 += chunk_size;
											current_av_z += chunk_size;
											_ch -= 1;
											_chunk = main.voxel_static[ _ch ];
										}
									}

								}
								rare--;

								if ( _chunk.rgba[ i2 * 4 + 3 ] > 0 )
								{
									beam_power *= main.lightmap_hit_power_multiplier;
									if ( beam_power <= main.lightmap_non_existent_power )
									{
										was_stopped = true;
										break;
									}
								}
							}
							if ( !was_stopped )
							chunk.uvs2[ i ] += beam_power;
						}

						chunk.uvs2[ i ] += main.lightmap_ambient; // Ambient

						if ( old_uvs2 !== chunk.uvs2[ i ] )
						{
							anything_done = true;
							anything_on_this_level = true;
						}

					}
				}

				if ( anything_done )
				{
					var search = chunk_updates.length - 1;
					while ( true )
					{
						if ( chunk_updates[ search ] === chunk )
						break;
						
						search--;
						if ( search < 0 )
						{
							chunk_updates.push( chunk );
							break;
						}
					}
				}
			}
			
			if ( !anything_on_this_level )
			break;
		}
		
		for ( var i = 0; i < chunk_updates.length; i++ )
		chunk_updates[ i ].UpdateChunk( false, false, true );
	}
	
	static TraceLine( x,y,z, x2,y2,z2, stop_condition_chunk=null, step_scale=1, offset=0 )
	{
		var chunk_size = main.chunk_size;
			
		var TraceLine_depth = -1;
		
		x = ~~x;
		y = ~~y;
		z = ~~z;
		x2 = ~~x2;
		y2 = ~~y2;
		z2 = ~~z2;
		function CheckBounds( x3, y3, z3, needs_round )
		{
			if ( needs_round )
			{
				x3 = ~~( x3 );
				y3 = ~~( y3 );
				z3 = ~~( z3 );
			}
			if ( x3 < 0 )
			return false;
			if ( y3 < 0 )
			return false;
			if ( z3 < 0 )
			return false;

			if ( x3 >= main.level_chunks_x * chunk_size )
			return false;
			if ( y3 >= main.level_chunks_y * chunk_size )
			return false;
			if ( z3 >= main.level_chunks_z * chunk_size )
			return false;
			return true;
		}

		var needs_bounds_check = !CheckBounds( x,y,z, true ) || !CheckBounds( x2,y2,z2, true );

		var steps = ~~( Math.max( Math.abs( x-x2 ), Math.abs( y-y2 ), Math.abs( z-z2 ) ) / step_scale );
		
		if ( steps < 1 )
		steps = 1;
	
		if ( steps > 1000 )
		steps = 1000;

		for ( var s = offset * step_scale; s < steps + 1; s++ )
		{
			var morph = s / steps;
			var i_morph = 1 - morph;

			var av_x = ( x * i_morph + x2 * morph );
			var av_y = ( y * i_morph + y2 * morph );
			var av_z = ( z * i_morph + z2 * morph );

			// Fix math errors
			av_x = ~~( Math.round( av_x * 1000 ) / 1000 );
			av_y = ~~( Math.round( av_y * 1000 ) / 1000 );
			av_z = ~~( Math.round( av_z * 1000 ) / 1000 );
			
			if ( needs_bounds_check )
			{
				if ( CheckBounds( av_x,av_y,av_z, false ) )
				{
				}
				else
				continue;
			}

			var chunk_xx = ~~( av_x / chunk_size );
			var chunk_yy = ~~( av_y / chunk_size );
			var chunk_zz = ~~( av_z / chunk_size );

			var chunk = null;

			var ch = chunk_xx * main.level_chunks_y * main.level_chunks_z + chunk_yy * main.level_chunks_z + chunk_zz;
			
			chunk = main.voxel_static[ ch ];

			if ( chunk === stop_condition_chunk )
			{
				TraceLine_depth = 1;
				
				return TraceLine_depth;
			}

			av_x -= chunk_xx * chunk_size;
			av_y -= chunk_yy * chunk_size;
			av_z -= chunk_zz * chunk_size;

			var i = av_x * chunk_size * chunk_size + av_y * chunk_size + av_z;
			
			if ( chunk.rgba[ i * 4 + 3 ] > 0 )
			{
				TraceLine_depth = Math.max( 0, ( s - 1 ) / steps );
				return TraceLine_depth;
			}
			else
			continue;
		}
		TraceLine_depth = 1;
		return TraceLine_depth;
	}
	static flush_fps()
	{
		var pb2_mp = main;
		
		pb2_mp.ticks_last = pb2_mp.ticks_passed = Date.now();
		pb2_mp.ticks_last_delta = 1000 / 60;
	}
	static get_fps()
	{
		var pb2_mp = main;
		
		pb2_mp.ticks_last = pb2_mp.ticks_passed;
		pb2_mp.ticks_passed = Date.now();

		if ( pb2_mp.ticks_passed > pb2_mp.ticks_last )
		{
			pb2_mp.ticks_last_delta = pb2_mp.ticks_passed - pb2_mp.ticks_last;
		}
		
		pb2_mp.ticks_todo += pb2_mp.ticks_last_delta;

		if ( pb2_mp.ticks_todo > 0 )
		{
			var will_do = Math.floor( pb2_mp.ticks_todo * 0.8 );

			pb2_mp.ticks_todo -= will_do;

			pb2_mp.GSPEED = will_do / 1000 * pb2_mp.GAME_FPS;

			if ( pb2_mp.GSPEED < pb2_mp.min_safe_GSPEED )
			{
				if ( pb2_mp.GAME_FPS > 0 )
				pb2_mp.GSPEED = pb2_mp.min_safe_GSPEED;
			}
			else
			if ( pb2_mp.GSPEED > 10 )
			pb2_mp.GSPEED = 10;

			pb2_mp.WSPEED = will_do * 0.03;
			if ( pb2_mp.WSPEED > 10 )
			pb2_mp.WSPEED = 10;
		}
		
	}
	static onEnterFrame()
	{
		var GSPEED = main.GSPEED;
		
		pb2_mp.get_fps();
		
		var xx = main.hold_d - main.hold_a;
		var zz = main.hold_s - main.hold_w;
		var yy = main.hold_space - main.hold_ctrl;
		
		if ( main.my_character === null )
		{
			
			var move_speed = 0.2 * GSPEED;

			if ( main.hold_shift === 1 )
			move_speed *= 5;

			if ( xx !== 0 )
			{
				var axis = new THREE.Vector3( xx * move_speed, 0, 0 );
				var q = new THREE.Quaternion();
				q.setFromRotationMatrix( main.main_camera.matrix );
				axis.applyQuaternion( q );
				main.speed.addVectors( main.speed, axis );
			}
			if ( yy !== 0 )
			{
				var axis = new THREE.Vector3( 0, yy * move_speed, 0 );
				var q = new THREE.Quaternion();
				q.setFromRotationMatrix( main.main_camera.matrix );
				axis.applyQuaternion( q );
				main.speed.addVectors( main.speed, axis );
			}
			if ( zz !== 0 )
			{
				var axis = new THREE.Vector3( 0, 0, zz * move_speed );
				var q = new THREE.Quaternion();
				q.setFromRotationMatrix( main.main_camera.matrix );
				axis.applyQuaternion( q );
				main.speed.addVectors( main.speed, axis );
			}
		}
			
		main.speed.x = main.MorphWithTimeScale( main.speed.x, 0, 0.7, GSPEED );
		main.speed.y = main.MorphWithTimeScale( main.speed.y, 0, 0.7, GSPEED );
		main.speed.z = main.MorphWithTimeScale( main.speed.z, 0, 0.7, GSPEED );

		if ( main.speed.length < 0.01 )
		main.speed.multiplyScalar( 0 );
		
		main.main_camera.position.x += main.speed.x * GSPEED;
		main.main_camera.position.y += main.speed.y * GSPEED;
		main.main_camera.position.z += main.speed.z * GSPEED;
	
	
	
		main.main_camera.updateMatrixWorld();
		
		var front_vector = new THREE.Vector3( 0, 0, 1 );
		front_vector.transformDirection( main.main_camera.matrixWorld );
			
		var up_vector = new THREE.Vector3( 0, 1, 0 );
		up_vector.transformDirection( main.main_camera.matrixWorld );
		
		var look_at_m = new THREE.Matrix4();
		
		look_at_m.lookAt( front_vector, new THREE.Vector3(), new THREE.Vector3( 0, 1, 0 ) );
		
		var old_quaternion = new THREE.Quaternion();
		old_quaternion.setFromRotationMatrix( look_at_m );
		
		main.main_camera.quaternion.slerp( old_quaternion, Math.pow( 1 - ( front_vector.y * front_vector.y ), 1 ) * 0.07 * GSPEED );
		
		
		
		if ( main.my_character === null )
		{
			if ( main.hold_fire )
			{
				main.hold_fire = false;
				if ( !main.MP_mode )
				sdBullet.CreateBullet({ 
							x: main.main_camera.position.x, 
							y: main.main_camera.position.y, 
							z: main.main_camera.position.z,
							tox: -front_vector.x * 7,
							toy: -front_vector.y * 7,
							toz: -front_vector.z * 7,
							owner: sdCharacter.characters[ 0 ],
							knock_power: sdCharacter.weapon_knock_power[ 0 ],
							hp_damage: sdCharacter.weapon_hp_damage[ 0 ],
							hp_damage_head: sdCharacter.weapon_hp_damage_head[ 0 ],
							is_rocket: sdCharacter.weapon_is_rocket[ 0 ]
						});
			}
		}
		
		if ( up_vector.y > 0 )
		{
			if ( main.turn_method === 0 )
			{
				main.walk_vector_xz.x -= front_vector.x * Math.max( 0, Math.pow( up_vector.y, 2 ) ) * GSPEED;
				main.walk_vector_xz.y -= front_vector.z * Math.max( 0, Math.pow( up_vector.y, 2 ) ) * GSPEED;
			}
			else
			{
				main.walk_vector_xz.x = -front_vector.x;
				main.walk_vector_xz.y = -front_vector.z;
			}
			main.walk_vector_xz.normalize();
		}
		
		// Do all possible destruction logic before visilibity tracer
		var closest_di = -1;
		var closest_x = 0;
		var closest_y = 0;
		var closest_z = 0;
		
		if ( main.main_camera.position.x > 0 &&
 		     main.main_camera.position.y > 0 &&
 		     main.main_camera.position.z > 0 &&
 		     main.main_camera.position.x < main.level_chunks_x * main.chunk_size &&
 		     //main.main_camera.position.y < main.level_chunks_y * main.chunk_size &&
 		     main.main_camera.position.z < main.level_chunks_z * main.chunk_size )
		{
			for ( var axis = 0; axis < 3; axis++ )
			for ( var side = 0; side <= 1; side++ )
			{
				if ( axis === 1 )
				continue;

				var x = main.level_chunks_x * main.chunk_size * side;
				var y = main.level_chunks_y * main.chunk_size * side;
				var z = main.level_chunks_z * main.chunk_size * side;

				if ( axis === 0 )
				{
					x = main.main_camera.position.x;
					y = main.main_camera.position.y;
				}
				else
				if ( axis === 1 )
				{
					x = main.main_camera.position.x;
					z = main.main_camera.position.z;
				}
				else
				{
					y = main.main_camera.position.y;
					z = main.main_camera.position.z;
				}
				var di = Math.pow( x - main.main_camera.position.x, 2 ) + Math.pow( y - main.main_camera.position.y, 2 ) + Math.pow( z - main.main_camera.position.z, 2 );
				if ( closest_di === -1 || di < closest_di )
				{
					closest_di = di;
					closest_x = x;
					closest_y = y;
					closest_z = z;
				}
			}
		}
		else
		{
			closest_x = main.main_camera.position.x;
			closest_y = main.main_camera.position.y;
			closest_z = main.main_camera.position.z;
			closest_di = 0;
		}

		main.pb3driver.position.x = closest_x;
		main.pb3driver.position.y = closest_y;
		main.pb3driver.position.z = closest_z;
		
		sdSound.SetSoundVolume( main.pb3driver_channel, 2 * Math.max( 0, 1 - Math.sqrt( closest_di ) / main.chunk_size * 2 ) );
	
		if ( main.MP_mode )
		sdSync.ThinkNow( GSPEED );
	
		sdBullet.ThinkNow( GSPEED );
		sdCharacter.ThinkNow( GSPEED );
		sdAtom.ThinkNow( GSPEED );
		sdSprite.ThinkNow( GSPEED );
		sdSound.ThinkNow(  );
		
		
		if ( main.recalc_brightness_tasks.length > 0 )
		{
			var arr = main.recalc_brightness_tasks[ 0 ];

			main._RecalcBrightness( arr[ 0 ], arr[ 1 ], arr[ 2 ], arr[ 3 ] );
			
			main.recalc_brightness_tasks.shift();
		}
		{
			var default_visible_timer = 40;
			
			var active = [];
			
			var chunk_size = main.chunk_size;
			
			var chunk_xx = main.limit( 0, main.FastFloor( main.main_camera.position.x / chunk_size ), main.level_chunks_x-1 );
			var chunk_yy = main.limit( 0, main.FastFloor( main.main_camera.position.y / chunk_size ), main.level_chunks_y-1 );
			var chunk_zz = main.limit( 0, main.FastFloor( main.main_camera.position.z / chunk_size ), main.level_chunks_z-1 );
			
			var ch = chunk_xx * main.level_chunks_y * main.level_chunks_z + chunk_yy * main.level_chunks_z + chunk_zz;

			main.voxel_static[ ch ].visible_timer = default_visible_timer;
			
			active.push( main.voxel_static[ ch ] );
			
			var _projScreenMatrix = new THREE.Matrix4();
			
			_projScreenMatrix.multiplyMatrices( main.main_camera.projectionMatrix, main.main_camera.matrixWorldInverse );
			var _frustum = new THREE.Frustum();
			_frustum.setFromMatrix( _projScreenMatrix );
			
			while ( active.length > 0 )
			{
				var active_one = active[ 0 ];
				for ( var n = 0; n < active_one.nearby.length; n++ )
				{
					var nearby_one = active_one.nearby[ n ];
					
					if ( !_frustum.intersectsBox( nearby_one.mesh.children[ 0 ].geometry.boundingBox ) )
					continue;
				
					if ( nearby_one.visible_timer < default_visible_timer )
					{
						
						var tot_rays = main.FastCeil( 20 * ( chunk_size / 32 ) * Math.min( 1, 1 - nearby_one.visible_timer / default_visible_timer ) );
						
						if ( tot_rays === 0 )
						continue;
						
						var x1 = 0;
						var y1 = 0;
						var z1 = 0;
						var x2 = chunk_size;
						var y2 = chunk_size;
						var z2 = chunk_size;
						
						if ( active_one.xx < nearby_one.xx )
						x2 = 1;
						else
						if ( active_one.xx > nearby_one.xx )
						x1 = chunk_size-1;
						else
						if ( active_one.zz < nearby_one.zz )
						z2 = 1;
						else
						if ( active_one.zz > nearby_one.zz )
						z1 = chunk_size-1;
						else
						if ( active_one.yy < nearby_one.yy )
						y2 = 1;
						else
						if ( active_one.yy > nearby_one.yy )
						y1 = chunk_size-1;
						
						for ( var r = 0; r < tot_rays; r++ )
						{
							var x = Math.random() * ( x2 - x1 ) + x1;
							var y = Math.random() * ( y2 - y1 ) + y1;
							var z = Math.random() * ( z2 - z1 ) + z1;
							
							if ( main.main_camera.position.y > main.level_chunks_y * chunk_size )
							if ( nearby_one.yy === main.level_chunks_y - 1 )
							y = y1 = y2 = chunk_size;
							if ( main.main_camera.position.y < 0 )
							if ( nearby_one.yy === 0 )
							y = y1 = y2 = -2;
							
							if ( main.main_camera.position.x > main.level_chunks_x * chunk_size )
							if ( nearby_one.xx === main.level_chunks_x - 1 )
							x = x1 = x2 = chunk_size;
							if ( main.main_camera.position.x < 0 )
							if ( nearby_one.xx === 0 )
							x = x1 = x2 = -2;
							
							if ( main.main_camera.position.z > main.level_chunks_z * chunk_size )
							if ( nearby_one.zz === main.level_chunks_z - 1 )
							z = z1 = z2 = chunk_size;
							if ( main.main_camera.position.z < 0 )
							if ( nearby_one.zz === 0 )
							z = z1 = z2 = -2;
							
							if ( main.TraceLine( main.main_camera.position.x, 
												main.main_camera.position.y, 
												main.main_camera.position.z, 
												( nearby_one.xx ) * chunk_size + x + 0.5, 
												( nearby_one.yy ) * chunk_size + y + 0.5, 
												( nearby_one.zz ) * chunk_size + z + 0.5,
												nearby_one,
												3 ) === 1 )
							{
								nearby_one.visible_timer = default_visible_timer;
								active.push( nearby_one );

								x = y = z = chunk_size;
								break;
							}
						}
					}
				}
				active.shift();
			}
			
			function ChoseLODMesh( chunk )
			{
				var di = main.Dist3D(	( chunk.xx + 0.5 ) * main.chunk_size, 
										( chunk.yy + 0.5 ) * main.chunk_size, 
										( chunk.zz + 0.5 ) * main.chunk_size,
										main.main_camera.position.x,
										main.main_camera.position.y,
										main.main_camera.position.z ) / ( 32 * 6 * main.lod_ratio );
				
				di = Math.pow( di, 1.5 );
				
				var meshes = chunk.mesh.children;
				
				var best_i = Math.min( ~~( ( di ) * 4 ), meshes.length - 1 ); // Always expect constant number of LOD models for case when they will be generated progressively
				
				for ( var i = 0; i < meshes.length; i++ )
				{
					meshes[ i ].visible = ( i === best_i );
				}
			}
			
			for ( var i = 0; i < main.voxel_static.length; i++ )
			{
				var chunk = main.voxel_static[ i ];
				
				if ( chunk.visible_timer > 0 )
				{
					chunk.visible_timer -= GSPEED;
					if ( !chunk.mesh.visible )
					if ( chunk.dots_total > 0 )
					chunk.mesh.visible = true;
				
					ChoseLODMesh( chunk );
				}
				else
				{
					if ( chunk.mesh.visible )
					{
						chunk.mesh.visible = false;
						
						for ( var c = 0; c < chunk.mesh.children.length; c++ )
						chunk.mesh.children[ c ].visible = false;
					}
				}
			}
			
		}

		main.composer.render();
			
		main.anim_frame = requestAnimationFrame( main.onEnterFrame );
	}
	
	
}

class CoordXYZ
{
	constructor( a, b, c, d )
	{
		this.x = a;
		this.y = b;
		this.z = c;
		this.coord = d;
	}
}
class Chunk
{
	constructor( xx, yy, zz, mesh )
	{
		this.xx = xx;
		this.yy = yy;
		this.zz = zz;
		this.mesh = mesh;
		
		
		this.nearby = [];
		
		this.rgba = null; // Color, opacity
		this.uvs2 = null; // Brightness and invisibility due to being hidden
		
		this.visible_timer = 0; // Timer that should be set to certain value after which retrace will be needed
		
		this.dots_total = 0; // Only used for not to render empty chunks
	}
	remove()
	{
		main.DestroyMovieClip( this.mesh );
	}
	
	Connect( c )
	{
		if ( c === null )
		throw new Error();
	
		if ( this.nearby.indexOf( c ) !== -1 )
		throw new Error();
	
		if ( c === this )
		throw new Error();
	
		if ( Math.abs( this.xx - c.xx ) > 1 )
		throw new Error();
		if ( Math.abs( this.yy - c.yy ) > 1 )
		throw new Error();
		if ( Math.abs( this.zz - c.zz ) > 1 )
		throw new Error();
	
		if ( ( this.xx === c.xx && this.yy === c.yy ) ||
			 ( this.xx === c.xx && this.zz === c.zz ) ||
			 ( this.yy === c.yy && this.zz === c.zz ) )
		{
		}
		else
		throw new Error();
	
		this.nearby.push( c );
		c.nearby.push( this );
	}
	UpdateChunk( upd_vertices=false, upd_rgba=true, upd_brightness_visibility=true )
	{
		var lod = this.mesh;
		
		var sub_geom = lod.children[ 0 ].geometry;
				
		var vertices = lod.children[ 0 ].geometry.getAttribute( 'position' ).array;
		var rgba = lod.children[ 0 ].geometry.getAttribute( 'colo' ).array;
		var uvs2 = lod.children[ 0 ].geometry.getAttribute( 'uv2' ).array;
		
		sub_geom.updateVertexDataTyped( vertices );
		sub_geom.updateRGBADataTyped( rgba );
		sub_geom.updateSecondaryUVDataTyped( uvs2 );
		
		this.GenerateLODModels( upd_vertices, upd_rgba, upd_brightness_visibility );
	}
	GenerateLODModels( upd_vertices=true, upd_rgba=true, upd_brightness_visibility=true )
	{
		var chunk_size = main.chunk_size;
		var lod = this.mesh;
		
		var sub_geom = lod.children[ 0 ].geometry;
				
		var vertices = sub_geom.getAttribute( 'position' ).array;
		var rgba = sub_geom.getAttribute( 'colo' ).array;
		var uvs2 = sub_geom.getAttribute( 'uv2' ).array;
		
		// Generate lod models...
		for ( var level = 1; level < 4; level++ )
		{
			var skip = Math.pow( 2, level );

			var larger_chunk_size = chunk_size / Math.pow( 2, level - 1 );
			var smaller_chunk_size = chunk_size / skip;

			
			var _mesh = null;
			var _sub_geom;
			var _vertices;
			var _rgba;
			var _uvs2;
			
			if ( lod.children.length === level )
			{
				_sub_geom = new THREE.BufferGeometry();
				
				_mesh = new THREE.Points( _sub_geom, main.material_lod[ level ] );
				
				_vertices = _sub_geom.initVertexData( false, smaller_chunk_size * smaller_chunk_size * smaller_chunk_size * 3 );
				_rgba = _sub_geom.initRGBAData( false, smaller_chunk_size * smaller_chunk_size * smaller_chunk_size * 4 );
				_uvs2 = _sub_geom.initSecondaryUVDataOpacity( false, smaller_chunk_size * smaller_chunk_size * smaller_chunk_size ); // brigtness, due to lighting. Negative values will mean voxel is deep inside and should not be rendered at all
				
				_sub_geom.boundingBox = sub_geom.boundingBox;
				_sub_geom.boundingSphere = sub_geom.boundingSphere;
		
				lod.add( _mesh );

			}
			else
			{
				_mesh = lod.children[ level ];
				_sub_geom = _mesh.geometry;
				
				if ( upd_vertices )
				_vertices = _sub_geom.getAttribute( 'position' ).array;
				//if ( upd_rgba ) Needed
				_rgba = _sub_geom.getAttribute( 'colo' ).array;
				//if ( upd_brightness_visibility ) Needed
				_uvs2 = _sub_geom.getAttribute( 'uv2' ).array;
			}
			
			_mesh.position.x = skip * 0.5;
			_mesh.position.y = skip * 0.5;
			_mesh.position.z = skip * 0.5;

			var v = 0;
			var c = 0;
			var b = 0;

			var _v = 0;
			var _c = 0;
			var _b = 0;
			
			for ( var x = 0; x < larger_chunk_size; x++ )
			for ( var y = 0; y < larger_chunk_size; y++ )
			for ( var z = 0; z < larger_chunk_size; z++ )
			{
				if ( x % 2 === 0 )
				if ( y % 2 === 0 )
				if ( z % 2 === 0 )
				{
					if ( upd_vertices )
					{
						_vertices[ _v++ ] = vertices[ v     ];
						_vertices[ _v++ ] = vertices[ v + 1 ];
						_vertices[ _v++ ] = vertices[ v + 2 ];
					}

					if ( upd_rgba )
					{
						_rgba[ _c ] = 0;
						_rgba[ _c + 1 ] = 0;
						_rgba[ _c + 2 ] = 0;
						_rgba[ _c + 3 ] = 0; // Max value
					}

					if ( upd_brightness_visibility )
					_uvs2[ _b ] = -1; // Max value

					for ( var x2 = 0; x2 < 2; x2++ )
					for ( var y2 = 0; y2 < 2; y2++ )
					for ( var z2 = 0; z2 < 2; z2++ )
					if ( rgba[ c + 3 + ( x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ) * 4 ] > 0 &&
						 uvs2[ b + x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ] >= 0 )
					{

						if ( upd_rgba )
						{
							_rgba[ _c     ] = rgba[ c   + ( x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ) * 4 ];
							_rgba[ _c + 1 ] = rgba[ c + 1 + ( x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ) * 4 ];
							_rgba[ _c + 2 ] = rgba[ c + 2 + ( x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ) * 4 ];
							_rgba[ _c + 3 ] = rgba[ c + 3 + ( x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ) * 4 ];
						}

						if ( upd_brightness_visibility )
						_uvs2[ _b ] = Math.max( _uvs2[ _b ], uvs2[ b + x2 * larger_chunk_size * larger_chunk_size + y2 * larger_chunk_size + z2 ] );

						break;
					}

					_c += 4;
					_b++;
				}

				v += 3;
				c += 4;
				b++;
			}

			if ( upd_vertices )
			_sub_geom.updateVertexDataTyped( _vertices );
			if ( upd_rgba )
			_sub_geom.updateRGBADataTyped( _rgba );
			if ( upd_brightness_visibility )
			_sub_geom.updateSecondaryUVDataTyped( _uvs2 );

			// Now use these for next LOD level
			vertices = _vertices;
			rgba = _rgba;
			uvs2 = _uvs2;
		}
	}
}
main.init_class();
var pb2_mp = main;

var lib = {};
var sounds_raw = `explosion.mp3
frag_report.mp3
game_start.mp3
pb3_spoiler.mp3
player_death.mp3
player_hit.mp3
player_step.mp3
rifle_fire.mp3
rocket_attached_sound.mp3
rocket_fire.mp3
ui_down.mp3
ui_notification.mp3
wall_hit.mp3`;
var sounds = sounds_raw.split('\r').join('').split('\n');
delete sounds_raw;

var to_load = 0;
var loaded = 0;
function FileLoaded()
{
	loaded += 1;
	
	if ( loaded === to_load )
	{
		sdSound.init();
		
		delete to_load;
		delete loaded;
		delete DoLoadStuff;
		delete FileLoadStarted;
		delete FileLoaded;
	}
}
function FileLoadStarted()
{
	to_load += 1;
}
function DoLoadStuff()
{
	for ( let i in sounds ) // Loads and saves buffer to "lib" variable
	if ( i !== '' ) // Ignore empty ones
	{
		let this_i = sounds[ i ];

		FileLoadStarted();

		let audioLoader = new THREE.AudioLoader();

		audioLoader.load( 'assets/sounds/'+this_i, 
			function( buffer )
			{
				// No extension needed
				if ( this_i.lastIndexOf( '.mp3' ) === this_i.length - 4 )
				this_i = this_i.substr( 0, this_i.length - 4 );

				lib[ this_i ] = buffer;

				lib[ this_i ].title = this_i;
				FileLoaded();
			},
			undefined,
			function()
			{
				console.log('Cannot load sound file "'+this_i+'"');
			}
		);
	}
}

DoLoadStuff();