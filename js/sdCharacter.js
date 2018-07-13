


/* global THREE, main, sdAtom, sdChain, sdBullet, sdSync, lib, sdSound, sdNet, sdAI */

class sdCharacter
{
	static init_class()
	{
		sdCharacter.ATOMS_BODY = 0;
		sdCharacter.ATOMS_HEAD = 1;
		sdCharacter.ATOMS_ARM1 = 2;
		sdCharacter.ATOMS_ARM2 = 3;
		sdCharacter.ATOMS_LEG1A = 4;
		sdCharacter.ATOMS_LEG2A = 5;
		sdCharacter.ATOMS_LEG1B = 6;
		sdCharacter.ATOMS_LEG2B = 7;
		sdCharacter.ATOMS_RIFLE = 8;
		sdCharacter.ATOMS_ROCKET = 9;
		
		sdCharacter.characters = [];
		
		sdCharacter.atoms_per_player = -1; // Decided on first spawn
		
		var player_half_height = 7.5;
		var player_half_width = 3;
		
		sdCharacter.player_half_height = player_half_height;
		sdCharacter.player_half_width = player_half_width;
		
		sdCharacter.shoot_offset_y = 6;
		sdCharacter.max_chain_length = 3; // 5
		
		sdCharacter.arm_cross_left = 0.6; // how much arms are rotated towards each other
		sdCharacter.arm_cross_right = 0.0; // how much arms are rotated towards each other
		
		// [ rifle, rocket, alt-rifle, alt-rocket ]
		sdCharacter.weapon_reload_times = [ 2, 30, 25, 60 ];
		sdCharacter.weapon_self_knockbacks = [ 0.1, 0.5, 0.1, 0.5 ];
		sdCharacter.weapon_is_rocket = [ false, true, false, false ];
		sdCharacter.weapon_speed = [ 20, 2, 15, 40 ];
		sdCharacter.weapon_knock_power = [ 0.02, 0.1, 0.015, 0.04 ];
		sdCharacter.weapon_hp_damage = [ 15, 100, 10, 45 ];
		sdCharacter.weapon_hp_damage_head = [ 34, 100, 20, 100 ];
		sdCharacter.weapon_knock_count = [ 1, 1, 15, 1 ];
		sdCharacter.weapon_knock_spread = [ 0.5, 0, 3.5, 0.5 ];
		sdCharacter.weapon_switch_time = 15;
		
		sdCharacter.collision_dots = [];
		sdCharacter.collision_normals = [];
		sdCharacter.collision_dots_sit = [];
		for ( var r = 0; r < 2; r++ )
		for ( var an = 0; an < 8; an++ )
		{
			if ( r === 1 )
			if ( an % 2 === 1 )
			continue;
			
			var ang = an / 8 * Math.PI * 2;
			
			for ( var v = 0; v <= 8; v++ )
			{
				var y = v / 8 * player_half_height * 2 - player_half_height;
				
				var rad = ( r === 0 ) ? player_half_width : ( player_half_width * 0.5 );
				
				var x = Math.sin( ang ) * rad;
				var z = Math.cos( ang ) * rad;
				sdCharacter.collision_dots.push( new THREE.Vector3( x, y, z ) );
				
				sdCharacter.collision_dots_sit.push( new THREE.Vector3( Math.sin( ang ) * rad, ( y * 2 + player_half_height ) / 3, Math.cos( ang ) * rad ) );

				if ( v === 0 )
				sdCharacter.collision_normals.push( new THREE.Vector3( 0, 1, 0 ) );
				else
				if ( v === 8 )
				sdCharacter.collision_normals.push( new THREE.Vector3( 0, -1, 0 ) );
				else
				sdCharacter.collision_normals.push( new THREE.Vector3( -Math.sin( ang ), 0, -Math.cos( ang ) ) );

			}
		}
		
	}
	
	static CreateCharacter( params )
	{
		var c = new sdCharacter( params );
		sdCharacter.characters.push( c );
		return c;
	}
	
	_UpdateHealthBarIfNeeded()
	{
		if ( this === main.my_character )
		{
			document.getElementById('hp_bar').style.width = Math.max( 0, this.hea )+'%';
			document.getElementById('hp_bar').innerHTML = Math.ceil( Math.max( 0, this.hea ) )+'%';
		}
	}
	
	Ressurect( was_me )
	{
		var old_char = this;
		
		if ( sdCharacter.characters.indexOf( old_char ) === -1 )
		sdCharacter.characters.push( old_char );
		else
		console.log('Ressurect on non-removed character? Not adding it "back" to list of characters.');
		
		old_char.Respawn( was_me );

		for ( var g = 0; g < old_char.atoms.length; g++ )
		for ( var i = 0; i < old_char.atoms[ g ].length; i++ )
		{
			old_char.atoms[ g ][ i ].removed = false;
			old_char.atoms[ g ][ i ].material = old_char.atoms[ g ][ i ].material_initial;
			old_char.atoms[ g ][ i ].r = old_char.atoms[ g ][ i ].r_initial;
			old_char.atoms[ g ][ i ].g = old_char.atoms[ g ][ i ].g_initial;
			old_char.atoms[ g ][ i ].b = old_char.atoms[ g ][ i ].b_initial;

			old_char.atoms[ g ][ i ].my_chains.length = old_char.atoms[ g ][ i ].my_chains_initial_length; // Do not keep all temporary ones

			for ( var ch = 0; ch < old_char.atoms[ g ][ i ].my_chains.length; ch++ )
			{
				old_char.atoms[ g ][ i ].my_chains[ ch ].removed = false;
				sdChain.chains[ old_char.atoms[ g ][ i ].my_chains[ ch ].uid ] = old_char.atoms[ g ][ i ].my_chains[ ch ];
			}
		}

		if ( was_me )
		main.SetActiveCharacter( old_char );
	}
	Respawn( pos=true ) // pos also means it is "me"
	{
		if ( pos || !main.MP_mode )
		{
			this.x = 10 + Math.random() * ( main.level_chunks_x * main.chunk_size - 20 );
			this.y = main.level_chunks_y * main.chunk_size + 20;
			this.z = 10 + Math.random() * ( main.level_chunks_z * main.chunk_size - 20 );
			
			if ( pos )
			{
				main.main_camera.position.x = this.x;
				main.main_camera.position.y = this.y + sdCharacter.shoot_offset_y;
				main.main_camera.position.z = this.z;
			}
		}
		else
		{
			this.y = main.level_chunks_y*main.chunk_size + 1000; // just hide then until coord update
		}
		
		this.last_valid_x = this.x;
		this.last_valid_y = this.y;
		this.last_valid_z = this.z;
		
		this.hea = 100;
		
		this.tox = 0;
		this.toy = 0;
		this.toz = 0;
	}
	
	DealDamage( d, from=null )
	{
		if ( this.hea > 0 )
		{
			this.hea -= d;
			
			var color = '255,255,255,0.25';
			
			if ( this.team !== main.mp_character.team )
			{
				if ( from === main.my_character )
				{
					color = '100,255,100,1';
					
					if ( this.hea <= 0 )
					setTimeout( function()
					{
						sdSound.PlayInterfaceSound({ sound: lib.frag_report, volume: 1 });
					}, 200 );
				}
			}
			
			if ( this.team === main.mp_character.team )
			{
				color = '255,100,100,1';
			}
			
			if ( this.hea <= 0 )
			{
				if ( from !== null && from !== this )
				main.onChatMessage( '', 'Player #'+from.GetUserUID() + ' frags Player #'+this.GetUserUID(), null, color );
				else
				main.onChatMessage( '', 'Player #'+this.GetUserUID() + ' dies', null, color );
			
				sdSound.PlaySound({ sound: lib.player_death, parent_mesh: this.mesh, volume: 1 });
			}
			else
			{
				sdSound.PlaySound({ sound: lib.player_hit, parent_mesh: this.mesh, volume: 1 });
			}
			
			this._UpdateHealthBarIfNeeded();
			
			if ( this.hea <= 0 )
			{
				if ( from === null || from === this )
				main.ScoreForTeam( this.team, -1 );
				else
				main.ScoreForTeam( from.team, 1 );
		
				this.remove();
			}
		}
	}
	SetBodyPartMaterial( all, m, initial=false )
	{
		for ( var i = 0; i < all.length; i++ )
		{
			var a = all[ i ];
			a.material = m;
			if ( initial )
			a.material_initial = m;
		}
	}
	remove( respawn=true )
	{
		let was_me = false;
		if ( main.my_character === this )
		{
			if ( !main.MP_mode )
			{
				main.GAME_FPS = 15;
			}
			
			main.main_camera.position.x += this.look_direction.x * 10;
			main.main_camera.position.y += this.look_direction.y * 10;
			main.main_camera.position.z += this.look_direction.z * 10;
		
			was_me = true;
			main.SetActiveCharacter( null );
		}
		
		var i = sdCharacter.characters.indexOf( this );
		
		if ( i >= 0 )
		{
			let ragdoll_chains = [];
			
			main.RemoveElement( sdCharacter.characters, i );
			
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_BODY   ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_HEAD   ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_ARM1   ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_ARM2   ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_LEG1A  ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_LEG2A  ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_LEG1B  ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_LEG2B  ], sdAtom.MATERIAL_GIB );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_RIFLE  ], sdAtom.MATERIAL_GIB_GUN );
			this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_ROCKET ], sdAtom.MATERIAL_GIB_GUN );
			
			function ConnectAToBAtBOriginAt( all, all2, x, y, z )
			{
				for ( var i = 0; i < all.length; i++ )
				{
					var a = all[ i ];

					if ( a.removed )
					continue;

					for ( var i2 = 0; i2 < all2.length; i2++ )
					{
						var b = all2[ i2 ];

						if ( b.removed )
						continue;

						var di = main.Dist3D( a.x, a.y, a.z, b.x, b.y, b.z );
						
						if ( di <= 1 )
						{
							var ch = sdChain.CreateChain( a, b, di, false );
							ragdoll_chains.push( ch );
						}
					}
				}
			}

			var body = this.atoms[ sdCharacter.ATOMS_BODY ];
			var head = this.atoms[ sdCharacter.ATOMS_HEAD ];
			var arm1 = this.atoms[ sdCharacter.ATOMS_ARM1 ];
			var arm2 = this.atoms[ sdCharacter.ATOMS_ARM2 ];
			var leg1a = this.atoms[ sdCharacter.ATOMS_LEG1A ];
			var leg2a = this.atoms[ sdCharacter.ATOMS_LEG2A ];
			var leg1b = this.atoms[ sdCharacter.ATOMS_LEG1B ];
			var leg2b = this.atoms[ sdCharacter.ATOMS_LEG2B ];

			ConnectAToBAtBOriginAt( body, head, this.head.position.x, this.head.position.y-2, 0 );
			ConnectAToBAtBOriginAt( body, arm1, this.arm1.position.x, this.arm1.position.y, this.arm1.position.z );
			ConnectAToBAtBOriginAt( body, arm2, this.arm2.position.x, this.arm2.position.y, this.arm2.position.z );
			ConnectAToBAtBOriginAt( body, leg1a, this.leg1a.position.x, this.leg1a.position.y, this.leg1a.position.z );
			ConnectAToBAtBOriginAt( body, leg2a, this.leg2a.position.x, this.leg2a.position.y, this.leg2a.position.z );
			
			ConnectAToBAtBOriginAt( leg1a, leg1b, this.leg1b.position.x, this.leg1b.position.y, this.leg1b.position.z );
			ConnectAToBAtBOriginAt( leg2a, leg2b, this.leg2b.position.x, this.leg2b.position.y, this.leg2b.position.z );

			if ( respawn )
			{
				var old_char = this;
				
				setTimeout( function()
				{
					for ( var i = 0; i < ragdoll_chains.length; i++ )
					ragdoll_chains[ i ].remove();

					if ( was_me )
					if ( !main.MP_mode )
					main.GAME_FPS = 30;

					if ( was_me || !main.MP_mode )
					{
		
						old_char.Ressurect( was_me );
						
						if ( main.MP_mode )
						sdSync.MP_SendEvent( sdSync.COMMAND_I_RESSURECT );
					}
					
				}, 2000 );
			}
		}
	}
	
	GetUserUID()
	{
		if ( this.dataConnection === null )
		{
			return sdNet.uid;
		}
		else
		{
			return this.dataConnection.user_uid;
		}
	}
	
	constructor( params )
	{
		this.uid = sdCharacter.characters.length; // keeps original uid so peers can reference this user using it
		
		this.dataConnection = null; // for mp
		
		this.x = params.x;
		this.y = params.y;
		this.z = params.z;
		
		this.ai = ( main.MP_mode ? null : new sdAI( this ) );
		
		this.last_valid_x = this.x;
		this.last_valid_y = this.y;
		this.last_valid_z = this.z;
		this.last_valid_sit = 0;
		
		this.tox = 0;
		this.toy = 0;
		this.toz = 0;
		
		this.stand = false;
		
		this.act_x = 0;
		this.act_y = 0;
		this.act_jump = 0;
		this.act_sit = 0;
		this.act_sprint = 0;
		this.walk_vector_xz = new THREE.Vector2( 0, 0 );
		
		this.recoil = 0;
		
		this.sit = 0;
		
		this.reload_timer = 0; // <= 0 means can shoot
		
		var bmp = params.bmp;
		
		this.hea = 100;
		
		this.team = params.team || 0;
		
		this.walk_phase = 0;
		this.look_direction = new THREE.Vector3( 1, 0, 0 );
		
		this.curwea = 0; // 0 is rifle, 1 is rocket
		this.act_weapon = 0; // 
		this.act_fire = 0;
		
		this.mesh = new THREE.Object3D();
		this.mesh.scale.set( sdAtom.atom_scale, sdAtom.atom_scale, sdAtom.atom_scale );
		main.scene.add( this.mesh );
		
		this.body = new THREE.Object3D();
		this.body.position.y = -1;
		this.mesh.add( this.body );
		
		this.head = new THREE.Object3D();
		this.head.position.y = 10;
		this.body.add( this.head );
		
		this.arm1 = new THREE.Object3D();
		this.arm1.position.x = -1;
		this.arm1.position.y = 7;
		this.arm1.position.z = 3;
		this.arm1.rotation.y = -0.3;
		this.body.add( this.arm1 );
		
		this.arm2 = new THREE.Object3D();
		this.arm2.position.x = -1;
		this.arm2.position.y = 7;
		this.arm2.position.z = -3;
		this.arm2.rotation.y = 0.3;
		this.body.add( this.arm2 );
		
		this.leg1a = new THREE.Object3D();
		this.leg1a.position.z = 2;
		this.leg1a.position.y = -2;
		this.mesh.add( this.leg1a );
		//
			this.leg1b = new THREE.Object3D();
			this.leg1b.position.x = -6;
			this.leg1b.position.y = 0;
			this.leg1a.add( this.leg1b );
		
		this.leg2a = new THREE.Object3D();
		this.leg2a.position.z = -2;
		this.leg2a.position.y = -2;
		this.mesh.add( this.leg2a );
		//
			this.leg2b = new THREE.Object3D();
			this.leg2b.position.x = -6;
			this.leg2b.position.y = 0;
			this.leg2a.add( this.leg2b );
		
		this.rifle = new THREE.Object3D();
		this.mesh.add( this.rifle );
		
		this.rocket = new THREE.Object3D();
		this.mesh.add( this.rocket );
		
		var f = new THREE.Object3D();
		f.position.x = -8;
		f.position.y = 3;
		this.rifle.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -7;
		f.position.y = 1;
		this.rocket.add( f );
		//
		
		var max_chain_length = sdCharacter.max_chain_length;
		var offset_x = 0;
		var offset_y = 0;
		var offset_z = 0;

		var context_atoms_from = sdAtom.atoms.length;

		for ( var x = 0; x < 32; x++ )
		for ( var y = 0; y < 16; y++ )
		{
			var rgba = bmp.getPixel32( x, y );

			var r = rgba.r / 255;
			var g = rgba.g / 255;
			var b = rgba.b / 255;

			rgba = bmp.getPixel32( x, y + 16 );
			
			var tolerance = ( rgba.r ) / 50;
			var tolerance_ceil = Math.ceil( tolerance );
			for ( var z = 0; z < tolerance_ceil; z++ )
			{
				sdAtom.atoms.push( new sdAtom( x * sdAtom.atom_scale + offset_x, 
					y * sdAtom.atom_scale + offset_y, 
					offset_z + z / tolerance_ceil * tolerance * sdAtom.atom_scale, 
					r, g, b, sdAtom.MATERIAL_ALIVE_PLAYER, 
					-x,
					-y,
					z / tolerance_ceil * tolerance,
					this ) );

				if ( z !== 0 )
				sdAtom.atoms.push( new sdAtom( x * sdAtom.atom_scale + offset_x, 
					y * sdAtom.atom_scale + offset_y, 
					offset_z - z / tolerance_ceil * tolerance * sdAtom.atom_scale, 
					r, g, b, sdAtom.MATERIAL_ALIVE_PLAYER, 
					-x,
					-y,
					-z / tolerance_ceil * tolerance,
					this ) );
			}
		}

		function ConnectBodyPart( x1, y1, w, h )
		{
			x1 *= sdAtom.atom_scale;
			y1 *= sdAtom.atom_scale;
			w *= sdAtom.atom_scale;
			h *= sdAtom.atom_scale;

			x1 += offset_x;
			y1 += offset_y;

			var all = [];
			for ( var i = context_atoms_from; i < sdAtom.atoms.length; i++ )
			{
				var a = sdAtom.atoms[ i ];

				if ( a.x >= x1 )
				if ( a.y >= y1 )
				if ( a.x < x1 + w )
				if ( a.y < y1 + h )
				all.push( a );
			}
			
			for ( var i = 0; i < all.length; i++ )
			{
				var a = all[ i ];
					
				if ( a.removed )
				continue;

				for ( var i2 = i + 1; i2 < all.length; i2++ )
				{
					var b = all[ i2 ];
					
					if ( b.removed )
					continue;
					
					var di = main.Dist3D( a.x, a.y, a.z, b.x, b.y, b.z );
					if ( di <= max_chain_length * sdAtom.atom_scale )
					sdChain.CreateChain( a, b, di, true );
				}
			}

			return all;
		}
		function CopyPart( all )
		{
			var all2 = [];
			for ( var i = 0; i < all.length; i++ )
			{
				var a = all[ i ];

				var a2 = a.clone();

				all2.push( a2 );

			}

			for ( var i = 0; i < all2.length; i++ )
			{
				var a = all2[ i ];
				for ( var i2 = i + 1; i2 < all2.length; i2++ )
				{
					var b = all2[ i2 ];

					var di = main.Dist3D( a.x, a.y, a.z, b.x, b.y, b.z );
					if ( di <= max_chain_length * sdAtom.atom_scale )
					sdChain.CreateChain( a, b, di, true );
				}
			}
			return all2;
		}
		function SetOrigin( all, x, y, z )
		{
			for ( var i = 0; i < all.length; i++ )
			{
				var a = all[ i ];

				a.model_x = a.model_x + x;
				a.model_y = a.model_y + y;
				a.model_z = a.model_z - z;
			}
		}
		var body,head,arm1,arm2,leg1a,leg2a,leg1b,leg2b,rifle,rocket;
		this.atoms = [];
		this.atoms[ sdCharacter.ATOMS_BODY ] = body = ConnectBodyPart( 0, 0, 7, 11 ); // body
		this.atoms[ sdCharacter.ATOMS_HEAD ] = head = ConnectBodyPart( 19, 6, 7, 6 ); // head
		this.atoms[ sdCharacter.ATOMS_ARM1 ] = arm1 = ConnectBodyPart( 8, 0, 10, 3 ); // arm
		this.atoms[ sdCharacter.ATOMS_ARM2 ] = arm2 = CopyPart( this.atoms[ sdCharacter.ATOMS_ARM1 ] ); // arm
		this.atoms[ sdCharacter.ATOMS_LEG1A ] = leg1a = ConnectBodyPart( 19, 0, 7, 4 ); // leg
		this.atoms[ sdCharacter.ATOMS_LEG2A ] = leg2a = CopyPart( this.atoms[ sdCharacter.ATOMS_LEG1A ] ); // leg
		this.atoms[ sdCharacter.ATOMS_LEG1B ] = leg1b = ConnectBodyPart( 26, 0, 7, 4 ); // leg
		this.atoms[ sdCharacter.ATOMS_LEG2B ] = leg2b = CopyPart( this.atoms[ sdCharacter.ATOMS_LEG1B ] ); // leg
		this.atoms[ sdCharacter.ATOMS_RIFLE ] = rifle = ConnectBodyPart( 8, 5, 10, 5 ); // rifle
		this.atoms[ sdCharacter.ATOMS_ROCKET ] = rocket = ConnectBodyPart( 0, 11, 14, 5 ); // rocket
		
		this.SetBodyPartMaterial( head, sdAtom.MATERIAL_ALIVE_PLAYER_HEAD, true );
		this.SetBodyPartMaterial( rifle, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( rocket, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
	
		SetOrigin( body, 4, 9, 0 );
		SetOrigin( arm1, 8, 0, 0 );
		SetOrigin( arm2, 8, 0, 0 );
		SetOrigin( leg1a, 20, 2, 0 );
		SetOrigin( leg2a, 20, 2, 0 );
		SetOrigin( leg1b, 26, 3, 0 );
		SetOrigin( leg2b, 26, 3, 0 );
		SetOrigin( head, 21, 11, 0 );
		
		SetOrigin( rifle, 11, 9, 0 );
		SetOrigin( rocket, 8, 15, 0 );
		
		for ( var i = context_atoms_from; i < sdAtom.atoms.length; i++ )
		{
			var a = sdAtom.atoms[ i ];

			sdCharacter.ApplyTeamColorToObject( a, this.team );
			a.r_initial = a.r;
			a.g_initial = a.g;
			a.b_initial = a.b;
			
			a.my_chains_initial_length = a.my_chains.length;
		}
		
		function Occlusion( all )
		{
			for ( var i = 0; i < all.length; i++ )
			{
				var a = all[ i ];

				for ( var i2 = 0; i2 < all.length; i2++ )
				if ( i !== i2 )
				{
					var b = all[ i2 ];
					
					var di = main.Dist3D_Vector_pow2( a.x-b.x,a.y-b.y,a.z-b.z );
					if ( di < 9 )
					{
						di = Math.sqrt( di );
						var br = ( di / 3 ) * 0.005 + 0.995;
						
						a.r_initial = a.r = a.r * br;
						a.g_initial = a.g = a.g * br;
						a.b_initial = a.b = a.b * br;
					}
				}
				// origin
				if ( all !== body )
				{
					var di = main.Dist3D_Vector_pow2( a.x,a.y,a.z );
					if ( di < 25 )
					{
						di = Math.sqrt( di );
						var br = ( di / 5 ) * 1;
						
						a.r_initial = a.r = a.r * br;
						a.g_initial = a.g = a.g * br;
						a.b_initial = a.b = a.b * br;
					}
				}
				
				a.r_initial = a.r = a.r * 1.25;
				a.g_initial = a.g = a.g * 1.25;
				a.b_initial = a.b = a.b * 1.25;
			}
		}

		Occlusion( body );
		Occlusion( arm1 );
		Occlusion( arm2 );
		Occlusion( leg1a );
		Occlusion( leg2a );
		Occlusion( leg1b );
		Occlusion( leg2b );
		Occlusion( head );
		
		
		
		sdCharacter.atoms_per_player = sdAtom.atoms.length - context_atoms_from;
		
		this._UpdateHealthBarIfNeeded();
	}
	
	static ApplyTeamColorToObject( a, team )
	{
		if ( team === 0 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 128 / 255;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 1;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 1 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 128 / 255;
				a.g = 0;
				a.b = 0;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 1;
				a.g = 0;
				a.b = 0;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 2 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 0;
				a.g = 128 / 255;
				a.b = 0;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 1;
				a.b = 0;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 3 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 128 / 255;
				a.g = 128 / 255;
				a.b = 0;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 1;
				a.g = 1;
				a.b = 0;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 4 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 0;
				a.g = 128 / 255;
				a.b = 128 / 255;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 1;
				a.b = 1;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 5 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 128 / 255;
				a.g = 0;
				a.b = 128 / 255;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 1;
				a.g = 0;
				a.b = 1;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 6 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 128 / 255;
				a.g = 128 / 255;
				a.b = 128 / 255;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 1;
				a.g = 1;
				a.b = 1;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
		else
		if ( team === 7 )
		{
			if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )
			{
				a.r = 32 / 255;
				a.g = 32 / 255;
				a.b = 32 / 255;
			}
			else
			if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )
			{
				a.r = 64 / 255;
				a.g = 64 / 255;
				a.b = 64 / 255;
			}
			else
			if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )
			{
				a.r = 0;
				a.g = 0;
				a.b = 0;
			}
		}
	}
	
	UnhideForFPS()
	{
		this.UpdateWeaponVisibilityFPS( false );
		
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_HEAD ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_BODY ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG1A ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG2A ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG1B ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG2B ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ARM1 ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ARM2 ], true );
	}
	
	HideForFPS()
	{
		this.UpdateWeaponVisibilityFPS( true );
		
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_HEAD ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_BODY ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG1A ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG2A ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG1B ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG2B ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ARM1 ], false );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ARM2 ], false );
	}
	
	SetLimbIsVisible( arr, v )
	{
		for ( var i = 0; i < arr.length; i++ )
		arr[ i ].visible = v;
	}
	
	UpdateWeaponVisibilityFPS( for_fps )
	{
		for_fps = !for_fps;
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_RIFLE ], for_fps || this.curwea === main.WEAPON_RIFLE );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ROCKET ], for_fps || this.curwea === main.WEAPON_ROCKET );
	}
	
	PlayShotSound( curwea )
	{
		var c = this;
		if ( c === main.my_character )
		{
			if ( curwea === 0 )
			sdSound.PlaySound({ sound: lib.rifle_fire, parent_mesh: c.mesh, volume: 0.25 });
			else
			sdSound.PlaySound({ sound: lib.rocket_fire, parent_mesh: c.mesh, volume: 0.25 });
		}
		else
		{
			if ( curwea === 0 )
			sdSound.PlaySound({ sound: lib.rifle_fire, parent_mesh:c.body, volume: 0.25 });
			else
			sdSound.PlaySound({ sound: lib.rocket_fire, parent_mesh:c.body, volume: 0.25 });
		}
	}

	static ThinkNow( GSPEED )
	{
		function MoveLimbTo( atoms_group, mesh, c )
		{
			mesh.parent.updateMatrixWorld();
			mesh.updateMatrixWorld();
			for ( var i2 = 0; i2 < atoms_group.length; i2++ )
			{
				var a = atoms_group[ i2 ];
				
				var v = new THREE.Vector3( a.model_x, a.model_y, a.model_z );
				
				v.applyMatrix4( mesh.matrixWorld );
				
				a.x = v.x;
				a.y = v.y;
				a.z = v.z;
				
				a.tox = main.MorphWithTimeScale( a.tox, c.tox, 0.9, GSPEED );
				a.toy = main.MorphWithTimeScale( a.toy, c.toy, 0.9, GSPEED );
				a.toz = main.MorphWithTimeScale( a.toz, c.toz, 0.9, GSPEED );
				
				a.WakeUp();
			}
		}
		
		
		var trace_line_direction_normal = new THREE.Vector3();
		var trace_line_percentage = 0;
		function TraceLineAllDirection( cx, cy, cz, dx, dy, dz, step_size, sit )
		{
			var contacts_tot = 0;
			trace_line_direction_normal.set( 0, 0, 0 );
			
			var morph = 1;
			for ( var i2 = 0; i2 < sdCharacter.collision_dots.length; i2++ )
			{
				var d = sdCharacter.collision_dots[ i2 ];
				var dotx = d.x;
				var doty = d.y * ( 1 - sit ) + sdCharacter.collision_dots_sit[ i2 ].y * sit;
				var dotz = d.z;
				
				var fx = cx + dotx;
				var fy = cy + doty;
				var fz = cz + dotz;
				
				var tx = fx + dx;
				var ty = fy + dy;
				var tz = fz + dz;
				var morph2 = main.TraceLine( fx, fy, fz, tx, ty, tz, null, step_size, 0 );
				
				morph = Math.min( morph, morph2 );
				
				
				if ( morph2 < 1 )
				{
					contacts_tot += 1;
					trace_line_direction_normal.x += sdCharacter.collision_normals[ i2 ].x;
					trace_line_direction_normal.y += sdCharacter.collision_normals[ i2 ].y;
					trace_line_direction_normal.z += sdCharacter.collision_normals[ i2 ].z;
				}
			}
			
			if ( contacts_tot > 0 )
			{
				trace_line_direction_normal.x /= contacts_tot;
				trace_line_direction_normal.y /= contacts_tot;
				trace_line_direction_normal.z /= contacts_tot;
			}
			
			trace_line_percentage = contacts_tot / sdCharacter.collision_dots.length;
			
			return morph;
		}
		var correct_mesh_rotation_ang = 0;
		function Movement( c, stand, GSPEED )
		{
			var correct_mesh_rotation = false;
			
			if ( c === main.my_character )
			{
				c.act_x = main.hold_d - main.hold_a;
				c.act_y = main.hold_w - main.hold_s;
				c.act_jump = main.hold_space;
				c.act_sit = main.hold_ctrl;
				c.act_sprint = main.hold_shift;
				
				c.walk_vector_xz.x = main.walk_vector_xz.x;
				c.walk_vector_xz.y = main.walk_vector_xz.y;
			}
			
			if ( c.act_sit )
			{
				if ( c.sit < 1 )
				c.sit = Math.min( 1, c.sit + GSPEED * 0.1 );
			}
			else
			{
				if ( c.sit > 0 )
				{
					var delta = c.sit;
					c.sit = Math.max( 0, c.sit - GSPEED * 0.17 );
					
					if ( stand )
					{
						delta -= c.sit;

						c.y += delta * sdCharacter.player_half_height / 3 * 1 * 2;
					}
				}
			}
				
			var dir_unscaled = new THREE.Vector2( c.act_x, c.act_y );
			var dir = new THREE.Vector2( dir_unscaled.x, dir_unscaled.y );
			dir.normalize();
			
			if ( stand )
			{
				dir.x *= 0.3 * GSPEED * ( 1 - c.sit * 0.666 );
				dir.y *= 0.3 * GSPEED * ( 1 - c.sit * 0.666 );
			
				if ( c.act_jump )
				{
					c.toy = 1.3;
					sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 0.5 });
				}
			
				if ( c.act_sprint && c.sit === 0 )
				{
					dir.x *= 0.5;
					dir.y *= 0.5;
				}
			}
			else
			{
				dir.x *= 0.02 * GSPEED;
				dir.y *= 0.02 * GSPEED;
			}
			
			c.tox += c.walk_vector_xz.x * dir.y;
			c.toz += c.walk_vector_xz.y * dir.y;
			
			c.tox += -c.walk_vector_xz.y * dir.x;
			c.toz += c.walk_vector_xz.x * dir.x;
		
			c.stand = stand;
			
			if ( stand )
			{
				if ( dir.x !== 0 || dir.y !== 0 )
				{
					var old_phase = c.walk_phase;
					
					if ( c.act_sprint )
					c.walk_phase += GSPEED * 0.25;
					else
					c.walk_phase += GSPEED * 0.5;
					
					if ( old_phase < Math.PI && c.walk_phase >= Math.PI )
					{
						if ( !c.act_sprint && c.sit < 0.5 )
						sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 1 });
					}
					if ( c.walk_phase >= Math.PI * 2 )
					{
						if ( !c.act_sprint && c.sit < 0.5 )
						sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 1 });
						
						c.walk_phase -= Math.PI * 2;
					}
					
					correct_mesh_rotation = true;
					
					if ( dir_unscaled.y >= 0 )
					correct_mesh_rotation_ang = dir_unscaled.x * Math.PI * 0.25;
					else
					correct_mesh_rotation_ang = -dir_unscaled.x * Math.PI * 0.25;
				}
				else
				c.walk_phase += Math.sin( c.walk_phase ) * 0.5 * GSPEED;
			}
			else
			{
				c.walk_phase += Math.cos( c.walk_phase * 2 ) * 0.2 * GSPEED;
			}
			return correct_mesh_rotation;
		}
		
		function WeaponLogic( c, GSPEED, active_weapon )
		{
			if ( c.reload_timer > 0 )
			{
				c.reload_timer -= GSPEED;
			}
			else
			{
				if ( c === main.my_character )
				{
					c.act_weapon = main.action_weapon;
					c.act_fire = main.hold_fire;
				}
				
				if ( c.curwea !== c.act_weapon )
				{
					c.curwea = c.act_weapon;
					
					if ( c === main.my_character )
					c.UpdateWeaponVisibilityFPS( true );

					c.reload_timer = sdCharacter.weapon_switch_time;
				}
				
				if ( c.reload_timer <= 0 )
				{
					if ( c.act_fire > 0 )
					{
						var curwea = c.curwea;
						
						if ( c.act_fire === 2 )
						{
							curwea += 2;
						}
						
						c.reload_timer = sdCharacter.weapon_reload_times[ curwea ];
						
						if ( !c.stand )
						{
							c.tox += c.look_direction.x * sdCharacter.weapon_self_knockbacks[ curwea ];
							c.toy += c.look_direction.y * sdCharacter.weapon_self_knockbacks[ curwea ];
							c.toz += c.look_direction.z * sdCharacter.weapon_self_knockbacks[ curwea ];
						}
						
						c.recoil += sdCharacter.weapon_self_knockbacks[ curwea ];
						
						var speed = sdCharacter.weapon_speed[ curwea ];
						
						var visual = active_weapon.children[ 0 ].getWorldPosition();

						if ( !main.MP_mode || main.my_character === c )
						{
							c.PlayShotSound( curwea );
						
							function SetAsRandom3D( v )
							{
								var omega = Math.random() * Math.PI * 2;
								var z = Math.random() * 2 - 1;

								var one_minus_sqr_z = Math.sqrt(1-z*z);

								v.x = one_minus_sqr_z * Math.cos(omega);
								v.y = one_minus_sqr_z * Math.sin(omega);
								v.z = z;

								return v;
							}
							
							for ( var p = 0; p < sdCharacter.weapon_knock_count[ curwea ]; p++ )
							{
								var spread = { x:0, y:0, z:0 };

								if ( sdCharacter.weapon_knock_spread[ curwea ] > 0 )
								{
									SetAsRandom3D( spread );
									var r = Math.random() * sdCharacter.weapon_knock_spread[ curwea ];
									spread.x *= r;
									spread.y *= r;
									spread.z *= r;
								}

								var bullet = sdBullet.CreateBullet({ 
									x: c.x, 
									y: c.y + sdCharacter.shoot_offset_y, 
									z: c.z,
									visual_x: visual.x,
									visual_y: visual.y,
									visual_z: visual.z,
									tox: -c.look_direction.x * speed + c.tox + spread.x,
									toy: -c.look_direction.y * speed + c.toy + spread.y,
									toz: -c.look_direction.z * speed + c.toz + spread.z,
									dx: -c.look_direction.x * speed * 0.2,
									dy: -c.look_direction.y * speed * 0.2,
									dz: -c.look_direction.z * speed * 0.2,
									owner: c,
									knock_power: sdCharacter.weapon_knock_power[ curwea ],
									hp_damage: sdCharacter.weapon_hp_damage[ curwea ],
									hp_damage_head: sdCharacter.weapon_hp_damage_head[ curwea ],
									is_rocket: sdCharacter.weapon_is_rocket[ curwea ]
								});

								if ( main.MP_mode )
								{
									bullet.GiveLocalPeerUID();
									sdSync.MP_SendEvent( sdSync.COMMAND_I_SPAWN_BULLET, bullet, curwea, p );
								}
							}

						}
					}
				}
			}
		}
		function CanClimb( c )
		{
			return ( main.TraceLine( c.x, c.y + sdCharacter.shoot_offset_y, c.z, c.x - c.look_direction.x * 8, c.y + sdCharacter.shoot_offset_y + 2 - c.look_direction.y * 8, c.z - c.look_direction.z * 8, null, 1, 0 ) === 1 &&
					 main.TraceLine( c.x, c.y + sdCharacter.shoot_offset_y, c.z, c.x - c.look_direction.x * 8, c.y + sdCharacter.shoot_offset_y - 8 - c.look_direction.y * 8, c.z - c.look_direction.z * 8, null, 1, 0 ) < 1 );
		}
		
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		{
			var c = sdCharacter.characters[ i ];
			
			if ( c.ai !== null )
			if ( c !== main.my_character )
			if ( !main.MP_mode )
			c.ai.ApplyLogic( GSPEED );
			
			if ( c.y < -200 )
			if ( !main.MP_mode || c === main.my_character )
			{
				c.DealDamage( 1000 );
				
				sdSync.MP_SendEvent( sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER, c, 1000, 0, 0, 0 );
			}
			
			correct_mesh_rotation_ang = 0;
			
			var correct_mesh_rotation = false;
			
			c.toy -= 0.1 * GSPEED;
			
			var tx = c.tox * GSPEED;
			var ty = c.toy * GSPEED;
			var tz = c.toz * GSPEED;

			var morph = TraceLineAllDirection( c.x, c.y, c.z, tx, ty, tz, 1, c.sit );
			
			var last_trace_line_percentage = trace_line_percentage;
			
			if ( c.act_jump )
			if ( CanClimb( c ) )
			{
				c.toy = main.MorphWithTimeScale( c.toy, 1, 0.7, GSPEED );
				c.tox = main.MorphWithTimeScale( c.tox, 0, 0.7, GSPEED );
				c.toz = main.MorphWithTimeScale( c.toz, 0, 0.7, GSPEED );
			}

			if ( morph === 1 )
			{
				c.x += tx;
				c.y += ty;
				c.z += tz;
				
				Movement( c, false, GSPEED );
			}
			else
			{
				trace_line_direction_normal.normalize();
				
				var last_direction = new THREE.Vector3( trace_line_direction_normal.x, trace_line_direction_normal.y, trace_line_direction_normal.z );
				
				
				if ( last_direction.y === 1 )
				if ( c.toy < -1.1 )
				sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 2 + Math.min( 8, Math.abs( c.toy * 0.5 ) ) });
				
				var dot_product = last_direction.x * c.tox + last_direction.y * c.toy + last_direction.z * c.toz;
				if ( dot_product < 0 )
				{
					if ( c.act_jump )
					{
						if ( CanClimb( c ) )
						{
						}
						else
						{
							// walljump
							dot_product -= 0.7;
							c.toy += 0.7;
							
							sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 0.5 });
						}
					}
					c.tox = c.tox - dot_product * last_direction.x;
					c.toy = c.toy - dot_product * last_direction.y;
					c.toz = c.toz - dot_product * last_direction.z;
				}
				
				var GSPEED2 = ( 1 - morph ) * GSPEED;
				
				c.x += c.tox * GSPEED2;
				c.y += c.toy * GSPEED2;
				c.z += c.toz * GSPEED2;
			   
			    var step_up_size = 4;
				while ( step_up_size > 0 )
				{
					var morph2 = TraceLineAllDirection( 
							c.x + last_direction.x * step_up_size, 
							c.y + last_direction.y * step_up_size, 
							c.z + last_direction.z * step_up_size, 
						-last_direction.x * step_up_size, 
						-last_direction.y * step_up_size, 
						-last_direction.z * step_up_size, 0.1, c.sit );
					if ( morph2 < 1 )
					if ( morph2 > 0 )
					{
						c.x += last_direction.x * ( 1 - morph2 ) * step_up_size * 1;
						c.y += last_direction.y * ( 1 - morph2 ) * step_up_size * 1;
						c.z += last_direction.z * ( 1 - morph2 ) * step_up_size * 1;
						break;
					}
					step_up_size--;
				}

				if ( Movement( c, last_direction.y > 0.5, GSPEED ) )
				correct_mesh_rotation = true;
				
				var friction = 0.85;
				
				c.tox = main.MorphWithTimeScale( c.tox, 0, friction, GSPEED );
				c.toy = main.MorphWithTimeScale( c.toy, 0, friction, GSPEED );
				c.toz = main.MorphWithTimeScale( c.toz, 0, friction, GSPEED );
			}
			
			var c_high = c.y + sdCharacter.player_half_height;
			var c_low = c.y + ( -sdCharacter.player_half_height * ( 1 - c.sit * 0.333 ) + sdCharacter.player_half_height * ( c.sit * 0.333 ) );
			for ( var i2 = 0; i2 < sdCharacter.characters.length; i2++ )
			{
				var c2 = sdCharacter.characters[ i2 ];
				var c2_high = c2.y + sdCharacter.player_half_height;
				var c2_low = c2.y + ( -sdCharacter.player_half_height * ( 1 - c2.sit * 0.333 ) + sdCharacter.player_half_height * ( c2.sit * 0.333 ) );
				
				if ( c.x + sdCharacter.player_half_width > c2.x - sdCharacter.player_half_width )
				if ( c.x - sdCharacter.player_half_width < c2.x + sdCharacter.player_half_width )
				if ( c.z + sdCharacter.player_half_width > c2.z - sdCharacter.player_half_width )
				if ( c.z - sdCharacter.player_half_width < c2.z + sdCharacter.player_half_width )
				if ( c_high > c2_low )
				if ( c_low < c2_high )
				{
					var di = Math.sqrt( Math.pow( c.x - c2.x, 2 ) + Math.pow( c.z - c2.z, 2 ) );
					
					if ( di < sdCharacter.player_half_width * 2 )
					{
						var y_di = Math.abs( c.y - c2.y );
						
						if ( y_di * sdCharacter.player_half_width / sdCharacter.player_half_height * 2 > di )
						{
							var av_toy = ( c.toy + c2.toy ) / 2;
							
							if ( c.y > c2.y )
							{
								var yy = ( c_low + c2_high ) / 2;
								
								if ( c2.stand )
								yy = c2_high;
								
								c.y += yy - c_low;
								c2.y += yy - c2_high;
								
								c.toy = av_toy;
								c2.toy = av_toy;
								
								if ( !c.stand )
								{
									if ( Movement( c, true, GSPEED ) )
									correct_mesh_rotation = true;

									var friction = 0.85;

									c.tox = main.MorphWithTimeScale( c.tox, 0, friction, GSPEED );
									c.toy = main.MorphWithTimeScale( c.toy, 0, friction, GSPEED );
									c.toz = main.MorphWithTimeScale( c.toz, 0, friction, GSPEED );
								}
							}
							else
							{
								var yy = ( c2_low + c_high ) / 2;
								
								if ( c.stand )
								yy = c_high;
								
								c.y += yy - c_high;
								c2.y += yy - c2_low;
								
								c.toy = av_toy;
								c2.toy = av_toy;
							}
						}
						else
						if ( di > 1 )
						{
							var av_x = ( c.x + c2.x ) / 2;
							var av_z = ( c.z + c2.z ) / 2;
							
							//var av_tox = ( c.tox + c2.tox ) / 2;
							//var av_toz = ( c.toz + c2.toz ) / 2;
							
							var xx = ( c2.x - c.x ) / di;
							var zz = ( c2.z - c.z ) / di;
							
							c.x = av_x - xx * sdCharacter.player_half_width;
							c.z = av_z - zz * sdCharacter.player_half_width;
							
							c2.x = av_x + xx * sdCharacter.player_half_width;
							c2.z = av_z + zz * sdCharacter.player_half_width;
						}
					}
				}
				
				//sdCharacter.player_half_height
			}
				
			if ( last_trace_line_percentage > 0.35 )
			{
				c.x = c.last_valid_x;
				c.y = c.last_valid_y;
				c.z = c.last_valid_z;

				c.sit = c.last_valid_sit;
				
				c.tox = 0;
				c.toy = 0;
				c.toz = 0;
			}
			
			if ( last_trace_line_percentage < 0.15 )
			{
				c.last_valid_x = c.x;
				c.last_valid_y = c.y;
				c.last_valid_z = c.z;
				
				c.last_valid_sit = c.sit;
			}
			
			var active_weapon = ( c.curwea === 0 ) ? c.rifle : c.rocket;
			var passive_weapon = ( c.curwea !== 0 ) ? c.rifle : c.rocket;
			
			WeaponLogic( c, GSPEED, active_weapon );
			

			if ( active_weapon.parent !== c.arm2 )
			{
				active_weapon.parent.remove( active_weapon );
				c.arm2.add( active_weapon );
			}
			if ( passive_weapon.parent !== c.body )
			{
				passive_weapon.parent.remove( passive_weapon );
				c.body.add( passive_weapon );
			}
			
			
			
			active_weapon.position.x = -10;
			active_weapon.position.y = 0;
			active_weapon.position.z = 0 - c.recoil;
			
			active_weapon.rotation.x = 0;
			active_weapon.rotation.y = -sdCharacter.arm_cross_right;
			active_weapon.rotation.z = 0;
			
			passive_weapon.position.x = 5;
			passive_weapon.position.y = 6;
			passive_weapon.position.z = 0;
			
			passive_weapon.rotation.y = Math.PI / 2;
			passive_weapon.rotation.x = Math.PI / 2;
			passive_weapon.rotation.z = 0;
			
			
			
			
			
			
			var look_direction = c.look_direction;
			
			if ( c === main.my_character )
			{

				var front_vector = new THREE.Vector3( 0, 0, 1 );
				main.main_camera.updateMatrixWorld();
				front_vector.transformDirection( main.main_camera.matrixWorld );
				
				
				// fps
				main.main_camera.position.x = main.MorphWithTimeScale( main.main_camera.position.x, c.x, 0.7, GSPEED );
				main.main_camera.position.y = main.MorphWithTimeScale( main.main_camera.position.y, c.y + sdCharacter.shoot_offset_y, 0.7, GSPEED );
				main.main_camera.position.z = main.MorphWithTimeScale( main.main_camera.position.z, c.z, 0.7, GSPEED );
				// fps
				/*main.main_camera.position.x = c.x;
				main.main_camera.position.y = c.y + sdCharacter.shoot_offset_y;
				main.main_camera.position.z = c.z;*/
				/*
				main.main_camera.position.x = c.x + front_vector.x * 25;
				main.main_camera.position.y = c.y + front_vector.y * 25 + sdCharacter.shoot_offset_y;
				main.main_camera.position.z = c.z + front_vector.z * 25;
				*/
				/*
				main.main_camera.position.x = main.MorphWithTimeScale( main.main_camera.position.x, c.x + front_vector.x * 25, 0.9, GSPEED );
				main.main_camera.position.y = main.MorphWithTimeScale( main.main_camera.position.y, c.y + front_vector.y * 25 + sdCharacter.shoot_offset_y, 0.9, GSPEED );
				main.main_camera.position.z = main.MorphWithTimeScale( main.main_camera.position.z, c.z + front_vector.z * 25, 0.9, GSPEED );*/
				
				
				main.speed.x = c.tox;
				main.speed.y = c.toy;
				main.speed.z = c.toz;
				
				look_direction.set( front_vector.x, front_vector.y, front_vector.z );
				
				if ( active_weapon.parent !== main.main_camera )
				{
					active_weapon.parent.remove( active_weapon );
					main.main_camera.add( active_weapon );
				}
					
				active_weapon.position.set( 2.5, -6.5, -5 + c.recoil * 5 );
				active_weapon.rotation.set( 0, -Math.PI * 0.5, 0 - c.recoil * 0.1 );
			}
			
			c.recoil = main.MorphWithTimeScale( c.recoil, 0, 0.9, GSPEED );
			
			c.mesh.position.set( c.x, c.y, c.z );
			
			
			var look_at_m = new THREE.Matrix4();
			var front_vector_local = new THREE.Vector3();
			front_vector_local.copy( look_direction );
			front_vector_local.applyAxisAngle( new THREE.Vector3( 0, -1, 0 ), c.mesh.rotation.y );
			
			var front_vector_projection_xz = new THREE.Vector2( look_direction.x, look_direction.z );
			front_vector_projection_xz.normalize();
			if ( correct_mesh_rotation_ang !== 0 )
			front_vector_projection_xz.rotateAround( new THREE.Vector2(), correct_mesh_rotation_ang );
		
			var current_vector_projection_xz = new THREE.Vector2( Math.cos( -c.mesh.rotation.y ), Math.sin( -c.mesh.rotation.y ) );
			
			var di = Math.pow( front_vector_projection_xz.x - current_vector_projection_xz.x, 2 ) + Math.pow( front_vector_projection_xz.y - current_vector_projection_xz.y, 2 );
			if ( di > Math.pow( 1, 2 ) )
			{
				c.mesh.rotation.y = Math.atan2( front_vector_projection_xz.x, front_vector_projection_xz.y ) - Math.PI * 0.5;
				
				front_vector_local.copy( look_direction );
				front_vector_local.applyAxisAngle( new THREE.Vector3( 0, -1, 0 ), c.mesh.rotation.y );
			}
			else
			if ( di > Math.pow( 0.75, 2 ) )
			correct_mesh_rotation = true;
	
			if ( correct_mesh_rotation )
			{
				var morph = Math.min( 1, 0.3 * GSPEED );
				current_vector_projection_xz.x = front_vector_projection_xz.x * morph + current_vector_projection_xz.x * ( 1 - morph );
				current_vector_projection_xz.y = front_vector_projection_xz.y * morph + current_vector_projection_xz.y * ( 1 - morph );
				
				c.mesh.rotation.y = Math.atan2( current_vector_projection_xz.x, current_vector_projection_xz.y ) - Math.PI * 0.5;
				
				front_vector_local.copy( look_direction );
				front_vector_local.applyAxisAngle( new THREE.Vector3( 0, -1, 0 ), c.mesh.rotation.y );
			}
			
			
			look_at_m.lookAt( front_vector_local, new THREE.Vector3(), new THREE.Vector3( 0, 1, 0 ) );
			
			// Main rotation
			c.head.quaternion.setFromRotationMatrix( look_at_m );
			
			
			// Decrease head rotation by 2 (as it given to all parent objects of head)
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, Math.PI * 0.5, 0 ) );
			c.head.quaternion.slerp( rot, 0.5 ); // decrease head transform by 2
			
			
			// Body
			c.body.quaternion.copy( c.head.quaternion );
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, -Math.PI * 0.5, 0 ) );
			c.body.quaternion.multiply( rot );
			
			
			
			
			
			
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, -Math.PI * 0.5, 0 ) );
			c.head.quaternion.multiply( rot );
			
			c.arm1.quaternion.copy( c.head.quaternion );
			c.arm2.quaternion.copy( c.head.quaternion );
			
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, -sdCharacter.arm_cross_left, 0 ) );
			c.arm1.quaternion.premultiply( rot );
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, sdCharacter.arm_cross_right, 0 ) );
			c.arm2.quaternion.premultiply( rot );
			
			c.leg1a.rotation.z = Math.PI * 0.5 + Math.sin( c.walk_phase ) * 0.5;
			c.leg2a.rotation.z = Math.PI * 0.5 - Math.sin( c.walk_phase ) * 0.5;
			c.leg1b.rotation.z = 0;
			c.leg2b.rotation.z = 0;
			
			if ( c.sit > 0 )
			{
				var morph = c.sit;
				
				c.leg1a.rotation.z = ( Math.PI * 0.5 + Math.sin( c.walk_phase ) * 0.2 - 2 ) * morph + c.leg1a.rotation.z * ( 1 - morph );
				c.leg2a.rotation.z = ( Math.PI * 0.5 - Math.sin( c.walk_phase ) * 0.2 - 2 ) * morph + c.leg2a.rotation.z * ( 1 - morph );
				
				c.leg1b.rotation.z = (   Math.sin( c.walk_phase ) * 0.2 + 3 ) * morph + c.leg1b.rotation.z * ( 1 - morph );
				c.leg2b.rotation.z = ( - Math.sin( c.walk_phase ) * 0.2 + 3 ) * morph + c.leg2b.rotation.z * ( 1 - morph );
			}
			
			c.mesh.updateMatrixWorld();
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_BODY ], c.body, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_HEAD ], c.head, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_ARM1 ], c.arm1, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_ARM2 ], c.arm2, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_LEG1A ], c.leg1a, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_LEG2A ], c.leg2a, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_LEG1B ], c.leg1b, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_LEG2B ], c.leg2b, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_ROCKET ], c.rocket, c );
			MoveLimbTo( c.atoms[ sdCharacter.ATOMS_RIFLE ], c.rifle, c );
		}
	}
}
sdCharacter.init_class();