


/* global THREE, main, sdAtom, sdChain, sdBullet, sdSync, lib, sdSound, sdNet, sdAI */

class sdCharacter
{
	static init_class()
	{
		sdCharacter.first_person_view = false;
		
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
		sdCharacter.ATOMS_SNIPER = 10;
		sdCharacter.ATOMS_SHOTGUN = 11;
		sdCharacter.ATOMS_SPARK = 12;
		sdCharacter.ATOMS_BUILD1 = 13;
		sdCharacter.ATOMS_SAW = 14;
		
		sdCharacter.characters = [];
		
		sdCharacter.player_speed = 0.425; // 0.3
		sdCharacter.player_air_speed = 0.04; // 0.02
		sdCharacter.player_crouch_percentage_nerf = 0.9; // 0.666
		
		sdCharacter.player_max_air_speed = 0; // when decrease starts
		sdCharacter.player_air_stop_factor = 0;
		sdCharacter.walk_friction = 0.82; // 0.85
		sdCharacter.slide_friction = 0.97;
		
		sdCharacter.atoms_per_player = -1; // Decided on first spawn
		
		var player_half_height = 7; // 7.5
		var player_half_width = 3;
		
		sdCharacter.player_half_height = player_half_height;
		sdCharacter.player_half_width = player_half_width;
		
		sdCharacter.shoot_offset_y = 6;
		sdCharacter.max_chain_length = 2; // 3 // 5
		
		sdCharacter.arm_cross_left = 0.6; // how much arms are rotated towards each other
		sdCharacter.arm_cross_right = 0.0; // how much arms are rotated towards each other
		
		/*  Moved to sdGunClass
		//										[ rifle,	rocket,		shotgun,	sniper,		spark,		build1,	saw ]
		sdCharacter.weapon_ammo_per_clip =		[ 25,		Infinity,	8,			Infinity,	15,			15,		Infinity ];
		sdCharacter.weapon_reload_times =		[ 2.5,		25,			30 * 0.3,	30,			5,			5,		10 ];
		sdCharacter.weapon_self_knockbacks =	[ 0.1,		0.5,		0.35,		0.5,		0.2,		0,		0 ];
		sdCharacter.weapon_is_rocket =			[ false,	true,		false,		false,		true,		false,	false ];
		sdCharacter.weapon_is_sniper =			[ false,	false,		false,		true,		false,		false,	false ];
		sdCharacter.weapon_is_plasma =			[ false,	false,		false,		false,		true,		false,	false ];

		sdCharacter.weapon_speed =				[ 40,		4,			40,			80,			40,			0,		40 ];
		sdCharacter.weapon_knock_power =		[ 0.02,		0.1,		0.01,		0.04,		0.1,		9,		0.1 ]; // Splash damage depends on this value too, besides hp_damage
		sdCharacter.weapon_hp_damage =			[ 30,		115,		10,			90,			20/*40*,	0,		80 ];
		sdCharacter.weapon_hp_damage_head =		[ 60,		115,		20,			180,		22/*45*,	0,		110 ];
		sdCharacter.weapon_knock_count =		[ 1,		1,			15,			1,			1,			0,		1 ];
		sdCharacter.weapon_knock_spread =		[ 0,		0,			5 * 4/3,	0.5,		2.5,		0,		0 ];
		sdCharacter.weapon_spread_from_recoil =	[ 5,		0,			0,			0,			5,			0,		0 ];
		sdCharacter.weapon_splash_radius =		[ null,		8,			null,		null,		4,			4,		null ];
		sdCharacter.weapon_spawn_shell =		[ true,		false,		true,		false,		false,		false,	false ];
		sdCharacter.weapon_melee =				[ false,	false,		false,		false,		false,		false,	true ];
		sdCharacter.weapon_zeros =				[ 0,		0,			0,			0,			0,			0,		0 ]; // Used as copy source for starter reload times per weapon
		sdCharacter.weapon_switch_time = 7; // 15
		*/
		
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
				if ( r === 1 )
				if ( v > 0 && v < 8 )
				continue;
				
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
	
	ReloadIfPossible()
	{
		//var active_weapon = this.GetActiveWeapon();
		if ( this.cur_weapon_object.ammo < this.cur_weapon_object.gun_class.ammo_per_clip )
		if ( this.time_to_reload <= 0 )
		{
			this.cur_weapon_object.ammo = 0;
			this._UpdateAmmoBarIfNeeded();
			
			this.time_to_reload = Math.PI * 2;
			
			if ( main.my_character === this )
			sdSync.MP_SendEvent( sdSync.COMMAND_I_RELOAD );
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
			document.getElementById('hp_bar').style.width = Math.max( 0, this.hea / this.max_hea * 100 )+'%';
			document.getElementById('hp_bar').innerHTML = Math.ceil( Math.max( 0, this.hea ) )+' HP';
		}
	}
	_UpdateAmmoBarIfNeeded()
	{
		if ( this === main.my_character )
		{
			document.getElementById('ammo_bar').style.display = ( this.cur_weapon_object.ammo !== Infinity ) ? 'block' : 'none';
		//	document.getElementById('ammo_bar').innerHTML = this.ammo[ this.curwea ] + ' | ' + sdGunClass.weapon_ammo_per_clip[ this.curwea ];

			if ( this.cur_weapon_object.ammo !== Infinity )
			{
				var s = '';
				for ( var i = 0; i < this.cur_weapon_object.gun_class.ammo_per_clip; i++ )
				{
					if ( this.cur_weapon_object.ammo > i )
					s += '|';
					else
					s += '.';
				}
				
				var offs = ( this.cur_weapon_object.gun_class.ammo_per_clip * 0.6 + 2 );
				document.getElementById('ammo_bar').style.width = offs + 'vh';
				document.getElementById('ammo_bar').style.marginLeft = ( -offs/2 ) + 'vh';
				
				document.getElementById('ammo_bar').innerHTML = s;
			}
		}
	}
	
	ApplyLimbImmortalityIfNeeded()
	{
		if ( !sdNet.MP_mode )
		if ( main.my_character === this )
		{
			for ( var g = 0; g < this.atoms.length; g++ )
			{
				this.atoms[ g ].hp = 99999999;
			}
		}
	}
	
	Ressurect( was_me )
	{
		var old_char = this;
		
		this.shadow.visible = true;
		
		if ( sdCharacter.characters.indexOf( old_char ) === -1 )
		sdCharacter.characters.push( old_char );
		else
		console.log('Ressurect on non-removed character? Not adding it "back" to list of characters.');
		
		old_char.Respawn( was_me );
		
		//var hash = {};

		old_char.RestoreLimbs();

		if ( was_me )
		main.SetActiveCharacter( old_char );
	
		old_char.UpdateCharacter( 0, true ); // So atoms are moved to their new positions and ragdoll attacker can't damage player at the moment of respawn
		
		sdSound.PlaySound({ sound: lib.player_spawn, parent_mesh: old_char.mesh, volume: 0.666 });
	}
	RestoreLimbs( spawn_pseudo_atoms=true ) // spawn_pseudo_atoms also means that color needs to be reset, not just alpha
	{
		var old_char = this;
		
		for ( var g = 0; g < old_char.atoms.length; g++ )
		for ( var i = 0; i < old_char.atoms[ g ].length; i++ )
		{
			// Leave rigid bodies as part of the level. Looks messy, ruins immersion
			/*if ( !main.MP_mode )
			if ( !old_char.atoms[ g ][ i ].removed )
			{
				var xx = ~~( old_char.atoms[ g ][ i ].x );
				var yy = ~~( old_char.atoms[ g ][ i ].y );
				var zz = ~~( old_char.atoms[ g ][ i ].z );
				
				var h = xx+':'+yy+':'+zz;
				
				if ( hash[ h ] === undefined )
				{
					if ( main.TraceLine( xx,yy,zz, xx,yy-2,zz, null, 1, 0 ) < 1 )
					{
						hash[ h ] = true;
						main.WorldPaintDamage( xx, yy, zz, 0.75, 2, old_char.atoms[ g ][ i ].r, old_char.atoms[ g ][ i ].g, old_char.atoms[ g ][ i ].b );
					}
					
				}
			}*/
			
			if ( spawn_pseudo_atoms )
			if ( !old_char.atoms[ g ][ i ].removed )
			{
				sdAtom.pseudo_atoms.push( new PseudoAtom( old_char.atoms[ g ][ i ] ) );
			}
			
			old_char.atoms[ g ][ i ].removed = false;
			old_char.atoms[ g ][ i ].material = old_char.atoms[ g ][ i ].material_initial;
			
			if ( spawn_pseudo_atoms )
			{
				old_char.atoms[ g ][ i ].r = old_char.atoms[ g ][ i ].r_initial;
				old_char.atoms[ g ][ i ].g = old_char.atoms[ g ][ i ].g_initial;
				old_char.atoms[ g ][ i ].b = old_char.atoms[ g ][ i ].b_initial;
			}
			
			old_char.atoms[ g ][ i ].glowing = old_char.atoms[ g ][ i ].glowing_initial;
			old_char.atoms[ g ][ i ].bleed_timer = 0;
			
			old_char.atoms[ g ][ i ].hp = sdAtom.atom_hp;

			old_char.atoms[ g ][ i ].my_chains.length = old_char.atoms[ g ][ i ].my_chains_initial_length; // Do not keep all temporary ones

			for ( var ch = 0; ch < old_char.atoms[ g ][ i ].my_chains.length; ch++ )
			{
				old_char.atoms[ g ][ i ].my_chains[ ch ].removed = false;
				sdChain.chains[ old_char.atoms[ g ][ i ].my_chains[ ch ].uid ] = old_char.atoms[ g ][ i ].my_chains[ ch ];
			}
		}
	}
	Respawn( pos=true ) // pos also means it is "me"
	{
		if ( pos || !main.MP_mode )
		{
			for ( var tr = 2000; tr > 0; tr-- ) // Prevent spawning near enemies
			{
				this.x = 10 + Math.random() * ( main.level_chunks_x * main.chunk_size - 20 );
				this.y = main.level_chunks_y * main.chunk_size + 20;
				this.z = 10 + Math.random() * ( main.level_chunks_z * main.chunk_size - 20 );
				
				var ok = true;
				for ( var i = 0; i < sdCharacter.characters.length; i++ )
				if ( sdCharacter.characters[ i ].team !== this.team )
				if ( main.Dist3D( this.x, 0, this.z, sdCharacter.characters[ i ].x, 0, sdCharacter.characters[ i ].z ) < 128 * tr / 2000 )
				{
					ok = false;
					break;
				}
				if ( ok )
				break;
			}
			
			//var morph2 = main.TraceLine( this.x, this.y, this.z, this.x, 0, this.z, null, 5, 0 );
			
			var morph2 = this.TraceLineAllDirection( this.x, this.y, this.z, 0, -this.y, 0, 2, 0 );
			
			//morph2 = Math.min( morph2, main.TraceLine( this.x + sdCharacter.player_half_width, this.y, this.z, this.x + sdCharacter.player_half_width, 0, this.z, null, 5, 0 ) );
			
			//trace( 'morph2', morph2 );
			
			this.y = this.y * ( 1 - morph2 ) + 10;
			
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
		
		this.hea = this.max_hea;
		
		this.tox = 0;
		this.toy = 0;
		this.toz = 0;
		
		this.sliding_intens = 0;
		
		this.hurt_timeout = 0;
		this.hurt_anim = 0;
		this.hurt_direction = 0;
		this.hurt_direction2 = 0;
		this.hurt_direction_morph = 0;
		this.hurt_direction2_morph = 0;
		
		if ( this.ai !== null )
		this.ai.ResetFavGun();
	
		//this.ammo = sdGunClass.weapon_ammo_per_clip.slice(); // Copy
					
		this.time_to_reload = 0; // Reset reload
		
		this.last_attacker = null;
		this.last_attacker_time = 0;
		
		this.ApplyLimbImmortalityIfNeeded();
	}
	
	DealDamage( d, from=null, x=0, y=0, z=0 )
	{
		if ( this.hea > 0 )
		{
			if ( from !== null && from !== this )
			{
				this.last_attacker = from;
				this.last_attacker_time = pb2_mp.ticks_passed;
			}
			else
			{
				if ( this.last_attacker !== null )
				if ( pb2_mp.ticks_passed - this.last_attacker_time < 7000 )
				{
					from = this.last_attacker;
				}
			}
			
			
			if ( this.hea > 30 && this.hea - d <= 30 )
			if ( this.ai !== null )
			this.ai.ResetFavGun();
		
			this.hea -= d;
			this.regen_timer = 0;
			
			var color = '255,255,255,0.25';
			
			if ( from === main.my_character && main.my_character !== null )
			{
				if ( this.team !== main.mp_character.team )
				{
					color = '100,255,100,1';
					
					if ( main.report_damage )
					{
						main.HitPulse( d );
				
						var v = new THREE.Vector3();
						main.SetAsRandom3D( v );
						v.x *= 0.25;
						v.y *= 0.25;
						v.z *= 0.25;
						sdSprite.CreateSprite({ type: sdSprite.TYPE_DAMAGE_REPORT, x:x, y:y, z:z, tox:v.x, toy:v.y+0.2, toz:v.z, text:d });

						if ( this.hea <= 0 )
						{
							main.HitPulse( 100 );

							setTimeout( function()
							{
								sdSound.PlayInterfaceSound({ sound: lib.frag_report, volume: 6 });
							}, 1000 );
						}
					}
				}
				else
				{
					if ( main.report_damage )
					{
						main.HitPulse( -d );

						var v = new THREE.Vector3();
						main.SetAsRandom3D( v );
						v.x *= 0.25;
						v.y *= 0.25;
						v.z *= 0.25;
						sdSprite.CreateSprite({ type: sdSprite.TYPE_DAMAGE_REPORT, x:x, y:y, z:z, tox:v.x, toy:v.y+0.2, toz:v.z, text:-1 });

						if ( this.hea <= 0 )
						main.HitPulse( -100 );
					}
				}
			}
			
			if ( this.team === main.mp_character.team )
			{
				color = '255,100,100,1';
			}
			
			//if ( this.hurt_anim === 0 )
			//{
				this.hurt_direction = ( Math.random() < 0.5 ? 1 : -1 );
				this.hurt_direction2 = ( Math.random() < 0.5 ? 1 : -1 );
			//}
			this.hurt_anim = 5;
		
			
			if ( this.hea <= 0 )
			{
				if ( from !== null && from !== this )
				main.onChatMessage( '', 'Player #'+from.GetUserUID() + ' frags Player #'+this.GetUserUID(), null, color );
				else
				main.onChatMessage( '', 'Player #'+this.GetUserUID() + ' dies', null, color );
			
				sdSound.PlaySound({ sound: lib.player_death, parent_mesh: this.mesh, volume: 0.666 });
			}
			else
			{
				if ( this.hurt_timeout <= 0 )
				{
					sdSound.PlaySound({ sound: ( Math.random() < 0.5 ? lib.player_hit : lib.player_hit2 ), parent_mesh: this.mesh, volume: 0.666 });
					this.hurt_timeout = 5;
				}
			}
			
			this._UpdateHealthBarIfNeeded();
			
			if ( this.hea <= 0 )
			{
				if ( from === null || from === this )
				main.ScoreForTeam( this.team, -1 );
				else
				main.ScoreForTeam( from.team, 1 );
				
				var limbs = this.atoms;
				var limb_to_bleed = limbs[ ~~( Math.random() * ( sdCharacter.ATOMS_LEG2B + 1 ) ) ];
				var atom_to_bleed = limb_to_bleed[ ~~( Math.random() * limb_to_bleed.length ) ];
				atom_to_bleed.bleed_timer = 9;
		
				this.remove();
			}
		}
	}
	SetBodyPartMaterial( all, m, initial=false )
	{
		var r = null;
		
		if ( !initial )
		{
			r = new THREE.Vector3();
			main.SetAsRandom3D( r );
			r.x *= 0.5;
			r.y *= 0.5;
			r.z *= 0.5;
		}
		
		for ( var i = 0; i < all.length; i++ )
		{
			var a = all[ i ];
			
			a.material = m;
			
			if ( m === sdAtom.MATERIAL_GIB || m === sdAtom.MATERIAL_GIB_GUN )
			{
				if ( a.glowing > 0 )
				a.glowing = -7; // brightness / ( 1 + (-a.glowing) )
			}
			
			if ( initial )
			a.material_initial = m;
			else
			{
				a.tox += r.x;
				a.toy += r.y;
				a.toz += r.z;
			}
		}
	}
	HookHere( x, y, z, di=-1 )
	{
		this.hook_pos.x = x;
		this.hook_pos.y = y;
		this.hook_pos.z = z;

		if ( !this.hook_enabled )
		{
			this.hook_enabled = true;

			if ( di === -1 )
			this.hook_di = main.Dist3D( this.x, this.y, this.z, x,y,z );
			else
			this.hook_di = di;

			sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK, x:this.hook_pos.x, y:this.hook_pos.y, z:this.hook_pos.z, tox:0, toy:0, toz:0 });

			sdSound.PlaySound({ sound: lib.blocked_damage, position: this.hook_pos.clone(), volume: 1 });
		}
	}
	remove( respawn=true )
	{
		this.hook_enabled = false;
		
		this.shadow.visible = false;
		
		let was_me = false;
		if ( main.my_character === this )
		{
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
			
			if ( respawn )
			{
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
				this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_SNIPER ], sdAtom.MATERIAL_GIB_GUN );
				this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_SHOTGUN ], sdAtom.MATERIAL_GIB_GUN );
				this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_SPARK ], sdAtom.MATERIAL_GIB_GUN );
				this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_BUILD1 ], sdAtom.MATERIAL_GIB_GUN );
				this.SetBodyPartMaterial( this.atoms[ sdCharacter.ATOMS_SAW ], sdAtom.MATERIAL_GIB_GUN );
				
				

				function ConnectAToBAtBOriginAt( all, all2, x, y, z )
				{
					for ( var i = 0; i < all.length; i+=8 )
					{
						var a = all[ i ];

						if ( a.removed )
						continue;

						for ( var i2 = 0; i2 < all2.length; i2+=8 )
						{
							var b = all2[ i2 ];

							if ( b.removed )
							continue;

							//var di = main.Dist3D( a.x, a.y, a.z, b.x, b.y, b.z );
							var di_pow2 = main.Dist3D_Vector_pow2( a.x-b.x, a.y-b.y, a.z-b.z );

							//if ( di <= 1 )
							//if ( di_pow2 <= 8 )
							{
								var di = Math.sqrt( di_pow2 );
								
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

				if ( !main.mobile )
				{
					ConnectAToBAtBOriginAt( body, head, this.head.position.x, this.head.position.y-2, 0 );
					ConnectAToBAtBOriginAt( body, arm1, this.arm1.position.x, this.arm1.position.y, this.arm1.position.z );
					ConnectAToBAtBOriginAt( body, arm2, this.arm2.position.x, this.arm2.position.y, this.arm2.position.z );
					ConnectAToBAtBOriginAt( body, leg1a, this.leg1a.position.x, this.leg1a.position.y, this.leg1a.position.z );
					ConnectAToBAtBOriginAt( body, leg2a, this.leg2a.position.x, this.leg2a.position.y, this.leg2a.position.z );

					ConnectAToBAtBOriginAt( leg1a, leg1b, this.leg1b.position.x, this.leg1b.position.y, this.leg1b.position.z );
					ConnectAToBAtBOriginAt( leg2a, leg2b, this.leg2b.position.x, this.leg2b.position.y, this.leg2b.position.z );
				}

				var old_char = this;
				
				setTimeout( function()
				{
					if ( !main.game_loop_started )
					return;
				
					for ( var i = 0; i < ragdoll_chains.length; i++ )
					ragdoll_chains[ i ].remove();
					/*
					if ( was_me )
					if ( !main.MP_mode )
					main.GAME_FPS = 30;
					*/
					if ( was_me || !main.MP_mode )
					{
		
						old_char.Ressurect( was_me );
						
						if ( main.MP_mode )
						sdSync.MP_SendEvent( sdSync.COMMAND_I_RESSURECT );
					}
					
				//}, 2000 );
				//}, ( !main.MP_mode && was_me ) ? 500 : 2000 );
				}, ( ( !main.MP_mode && was_me ) ? 250 : ( main.MP_mode ? sdNet.respawn_time : 5000 ) ) * 30 / main.GAME_FPS );
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
	/*
	get tox() { return this._tox; }
	get toy() { return this._toy; }
	get toz() { return this._toz; }
	
	set tox( v ) { if ( Math.abs( v - this._tox ) > 5 ) throw new Error('Too rapid velocity change?'); this._tox = v; }
	set toy( v ) { if ( Math.abs( v - this._toy ) > 300 ) throw new Error('Too rapid velocity change?'); this._toy = v; }
	set toz( v ) { if ( Math.abs( v - this._toz ) > 5 ) throw new Error('Too rapid velocity change?'); this._toz = v; }
	*/
	get reload_timer()
	{
		debugger;
		//return this.cur_weapon_object.reload_timer;
	}
	set reload_timer( v )
	{
		debugger;
		//this.cur_weapon_object.reload_timer = v;
	}
	
	get cur_weapon_mesh()
	{
		return this.inventory[ this.cur_weapon_slot ].mesh;
	}
	get cur_weapon_object()
	{
		return this.inventory[ this.cur_weapon_slot ];
	}
	set cur_weapon_mesh( v )
	{
		debugger; // Set this.cur_weapon_slot instead?
		//return this.inventory[ this.cur_weapon_slot ].mesh;
	}
	
	get reload_timers()
	{
		debugger;
	}
	
	constructor( params )
	{
		this.uid = sdCharacter.characters.length; // keeps original uid so peers can reference this user using it
		
		this.dataConnection = null; // for mp
		
		this.x = params.x;
		this.y = params.y;
		this.z = params.z;
		
		this.last_out_of_bounds_timer = 0;
		
		this.muzzle_r = 0;
		this.muzzle_g = 0;
		this.muzzle_b = 0;
		this.muzzle_a = 0;
		
		this.time_to_reload = 0;
		
		//this.glow_color = new THREE.Color( 0xff0000 );
		
		//this.ammo = sdGunClass.weapon_ammo_per_clip.slice(); // Copy
		
		this.ai = ( main.MP_mode ? null : new sdAI( this ) );
		
		this.last_attacker = null;
		
		this.last_valid_x = this.x;
		this.last_valid_y = this.y;
		this.last_valid_z = this.z;
		this.last_valid_sit = 0;
		/*
		this._tox = 0;
		this._toy = 0;
		this._toz = 0;
		*/
		
		this.tox = 0;
		this.toy = 0;
		this.toz = 0;
		
		this.stand = false;
		this.stand_timer = 0; // Whenever above 0 - player can play walk animation
		
		this.act_x = 0;
		this.act_y = 0;
		this.act_jump = 0;
		this.act_sit = 0;
		this.act_sprint = 0;
		this.walk_vector_xz = new THREE.Vector2( 0, 0 );
		
		this.recoil = 0;
		
		this.sit = 0;
		
		//this.reload_timers = sdGunClass.weapon_zeros.slice(); // Arry for each gun. Can shoot if <= 0
		//this.reload_timer = 0; // is getter now
		
		var bmp = params.bmp;
		
		this.hea = 100;
		this.regen_timer = 0;
		
		this.hook_enabled = false;
		this.hook_pos = new THREE.Vector3( 1, 0, 0 );
		this.hook_di = 0;
		
		this.team = params.team || 0;
		
		if ( main.game_mode === main.MODE_ONE_VS_ALL )
		if ( this.team === 0 )
		this.hea = 1000;

		this.max_hea = this.hea;
		
		this.walk_phase = 0;
		this.idle_phase = 0;
		this.look_direction = new THREE.Vector3( 1, 0, 0 );
		
		//this.cur_weapon_mesh = null;
		this.act_weapon = 0; // 
		this.act_fire = 0;
		this.weapon_change_tim = 0; // Value grows whenever weapon needs to be changed. Once it reaches certain ponit - weapon switched and value goes down.
		
		this.mesh = new THREE.Object3D();
		this.mesh.scale.set( sdAtom.atom_scale, sdAtom.atom_scale, sdAtom.atom_scale );
		main.scene.add( this.mesh );
		
		//
		var mat = sdShaderMaterial.CreateMaterial( null, 'color' );
		mat.color = new THREE.Color( 0x000000 );
		mat.opacity = 0.3;
		mat.transparent = mat.opacity < 1;
		mat.depthWrite = mat.opacity >= 1;
		mat.uniforms.depth_offset.value = 2;
		var debug_mesh = new THREE.Mesh( new THREE.ConeBufferGeometry( sdCharacter.player_half_width, 0, 32, 1, true ), mat );
		//debug_mesh.material.depthFunc = THREE.AlwaysDepth;
		debug_mesh.position.x = x;
		debug_mesh.position.y = y;
		debug_mesh.position.z = z;
		main.scene.add( debug_mesh );
		this.shadow = debug_mesh;
		//
		
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
			
		//this.cur_weapon_mesh = 0;
		this.cur_weapon_slot = 0;
		
		
		this.inventory = [];
		var i = 0;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_rifle' );
		this.rifle = this.inventory[ i ].mesh;
		this.mesh.add( this.rifle );
		i++;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_rocket' );
		this.rocket = this.inventory[ i ].mesh; // new sdRocket( 1 );
		this.mesh.add( this.rocket );
		i++;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_shotgun' );
		this.shotgun = this.inventory[ i ].mesh;
		this.mesh.add( this.shotgun );
		i++;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_sniper' );
		this.sniper = this.inventory[ i ].mesh;
		this.mesh.add( this.sniper );
		i++;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_spark' );
		this.spark = this.inventory[ i ].mesh;
		this.mesh.add( this.spark );
		i++;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_build' );
		this.build1 = this.inventory[ i ].mesh;
		this.mesh.add( this.build1 );
		i++;
		
		this.inventory[ i ] = sdGun.CreateGun( 'gun_saw' );
		this.saw = this.inventory[ i ].mesh;
		this.mesh.add( this.saw );
		i++;
		
		var f = new THREE.Object3D();
		f.position.x = -8;
		f.position.y = 3;
		this.rifle.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -7;
		f.position.y = 1;
		this.rocket.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -8;
		f.position.y = 2;
		this.sniper.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -8;
		f.position.y = 2;
		this.shotgun.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -9;
		f.position.y = 2;
		this.spark.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -8;
		f.position.y = 3;
		this.build1.add( f );
		
		var f = new THREE.Object3D();
		f.position.x = -8;
		f.position.y = 3;
		this.saw.add( f );
		//
		
		var max_chain_length = sdCharacter.max_chain_length;
		var offset_x = 0;
		var offset_y = 0;
		var offset_z = 0;

		var context_atoms_from = sdAtom.atoms.length;

		for ( var x = 0; x < 64; x++ )
		for ( var y = 0; y < 16; y++ )
		{
			var rgba = bmp.getPixel32( x, y );

			var r = rgba.r / 255;
			var g = rgba.g / 255;
			var b = rgba.b / 255;
			
			var glowing = ( bmp.getPixel32( x, y + 32 ).r > 127 ) ? 0.25 : 0;

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
					this,
					glowing ) );

				if ( z !== 0 )
				sdAtom.atoms.push( new sdAtom( x * sdAtom.atom_scale + offset_x, 
					y * sdAtom.atom_scale + offset_y, 
					offset_z - z / tolerance_ceil * tolerance * sdAtom.atom_scale, 
					r, g, b, sdAtom.MATERIAL_ALIVE_PLAYER, 
					-x,
					-y,
					-z / tolerance_ceil * tolerance,
					this,
					glowing  ) );
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
				/*if ( -a.model_x >= x1 )
				if ( -a.model_y >= y1 )
				if ( -a.model_x < x1 + w )
				if ( -a.model_y < y1 + h )*/
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
			
			if ( all.length === 0 )
			throw new Error('No atoms here?');
		
			//console.log( all.length );

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
		var body,head,arm1,arm2,leg1a,leg2a,leg1b,leg2b,rifle,rocket,sniper,shotgun,spark,build1,saw;
		this.atoms = [];
		this.atoms[ sdCharacter.ATOMS_BODY ] = body = ConnectBodyPart( 0, 0, 7, 11 ); // body
		this.atoms[ sdCharacter.ATOMS_HEAD ] = head = ConnectBodyPart( 19, 6, 7, 6 ); // head
		this.atoms[ sdCharacter.ATOMS_ARM1 ] = arm1 = ConnectBodyPart( 8, 0, 10, 3 ); // arm
		this.atoms[ sdCharacter.ATOMS_ARM2 ] = arm2 = CopyPart( this.atoms[ sdCharacter.ATOMS_ARM1 ] ); // arm
		this.atoms[ sdCharacter.ATOMS_LEG1A ] = leg1a = ConnectBodyPart( 19, 0, 7, 4 ); // leg
		this.atoms[ sdCharacter.ATOMS_LEG2A ] = leg2a = CopyPart( this.atoms[ sdCharacter.ATOMS_LEG1A ] ); // leg
		this.atoms[ sdCharacter.ATOMS_LEG1B ] = leg1b = ConnectBodyPart( 26, 0, 5, 4 ); // leg
		this.atoms[ sdCharacter.ATOMS_LEG2B ] = leg2b = CopyPart( this.atoms[ sdCharacter.ATOMS_LEG1B ] ); // leg
		this.atoms[ sdCharacter.ATOMS_RIFLE ] = rifle = ConnectBodyPart( 8, 5, 10, 5 ); // rifle
		this.atoms[ sdCharacter.ATOMS_ROCKET ] = rocket = ConnectBodyPart( 0, 11, 14, 5 ); // rocket
		this.atoms[ sdCharacter.ATOMS_SNIPER ] = sniper = ConnectBodyPart( 32, 0, 10, 4 ); // sniper
		this.atoms[ sdCharacter.ATOMS_SHOTGUN ] = shotgun = ConnectBodyPart( 43, 0, 14, 5 ); // shotgun
		this.atoms[ sdCharacter.ATOMS_SPARK ] = spark = ConnectBodyPart( 27, 5, 12, 5 ); // spark
		this.atoms[ sdCharacter.ATOMS_BUILD1 ] = build1 = ConnectBodyPart( 40, 6, 7, 7 ); // build1
		this.atoms[ sdCharacter.ATOMS_SAW ] = saw = ConnectBodyPart( 48, 6, 15, 4 ); // saw
		
		
		this.SetBodyPartMaterial( head, sdAtom.MATERIAL_ALIVE_PLAYER_HEAD, true );
		this.SetBodyPartMaterial( rifle, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( rocket, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( sniper, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( shotgun, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( spark, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( build1, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
		this.SetBodyPartMaterial( saw, sdAtom.MATERIAL_ALIVE_PLAYER_GUN, true );
	
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
		SetOrigin( sniper, 35, 3, 0 );
		SetOrigin( shotgun, 49, 3, 0 );
		SetOrigin( spark, 31, 8, 0 );
		SetOrigin( build1, 42, 12, 0 );
		SetOrigin( saw, 51, 8, 0 );
		
		/*sdCharacter.ApplyTeamColorToObject( this.glow_color, this.team );
		this.glow_color.r *= 0.1;
		this.glow_color.g *= 0.1;
		this.glow_color.b *= 0.1;*/
		
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
		
		
		this.trace_line_direction_normal = new THREE.Vector3();
		this.trace_line_percentage = 0;
		
		this._UpdateHealthBarIfNeeded();
	}
	
	TraceLineAllDirection( cx, cy, cz, dx, dy, dz, step_size, sit )
	{
		var contacts_tot = 0;
		this.trace_line_direction_normal.set( 0, 0, 0 );

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
				this.trace_line_direction_normal.x += sdCharacter.collision_normals[ i2 ].x;
				this.trace_line_direction_normal.y += sdCharacter.collision_normals[ i2 ].y;
				this.trace_line_direction_normal.z += sdCharacter.collision_normals[ i2 ].z;
			}
		}

		if ( contacts_tot > 0 )
		{
			this.trace_line_direction_normal.x /= contacts_tot;
			this.trace_line_direction_normal.y /= contacts_tot;
			this.trace_line_direction_normal.z /= contacts_tot;
		}

		this.trace_line_percentage = contacts_tot / sdCharacter.collision_dots.length;

		return morph;
	}
	
	static ApplyTeamColorToObject( a, team )
	{
		function Delta( x,y,z )
		{
			if ( a.r === a.g )
			if ( a.r === a.b )
			{
				return false;
			}
			var di = Math.sqrt( Math.pow( Math.abs( a.r * 255 - x ), 2 ) + Math.pow( Math.abs( a.g * 255 - y ), 2 ) + Math.pow( Math.abs( a.b * 255 - z ), 2 ) );
			if ( di < 130 )
			return true;
			return false;
		}
		
		function Set( r,g,b )
		{
			//var br = ( a.r + a.g + a.b ) / 3;
			var br = Math.max( a.r + a.g + a.b );
			
			a.r = br * r * 0.9 + br * 0.1;
			a.g = br * g * 0.9 + br * 0.1;
			a.b = br * b * 0.9 + br * 0.1;
			/*
			a.r = 1;
			a.g = 1;
			a.b = 1;*/
		}
		
		if ( team === 0 )
		{
			if ( Delta( 0, 0, 128 ) )
			{
				Set( 0, 128 / 255 * 0.5, 128 / 255 );
			}
			else
			if ( Delta( 255, 0, 0 ) )
			{
				Set( 0, 1 * 0.5, 1 );
			}
			else
			if ( Delta( 128, 128, 0 ) )
			{
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 1 )
		{
			if ( Delta( 0, 0, 128 ) )
			{
				Set( 128 / 255, 128 / 255 * 0.666, 0 );
			}
			else
			if ( Delta( 255, 0, 0 ) )
			{
				Set( 1, 1 * 0.666, 0 );
			}
			else
			if ( Delta( 128, 128, 0 ) )
			{
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 2 )
		{
			/*if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )*/
			if ( Delta( 0, 0, 128 ) )
			{
				/*a.r = 0;
				a.g = 128 / 255;
				a.b = 0;*/
				Set( 0, 128 / 255, 0 );
			}
			else
			/*if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 255, 0, 0 ) )
			{
				/*a.r = 0;
				a.g = 1;
				a.b = 0;*/
				Set( 0, 1, 0 );
			}
			else
			/*if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 128, 128, 0 ) )
			{
				/*a.r = 0;
				a.g = 0;
				a.b = 0;*/
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 3 )
		{
			/*if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )*/
			if ( Delta( 0, 0, 128 ) )
			{
				/*a.r = 128 / 255;
				a.g = 128 / 255;
				a.b = 0;*/
				Set( 128 / 255, 128 / 255, 0 );
			}
			else
			/*if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 255, 0, 0 ) )
			{
				/*a.r = 1;
				a.g = 1;
				a.b = 0;*/
				Set( 1, 1, 0 );
			}
			else
			/*if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 128, 128, 0 ) )
			{
				/*a.r = 0;
				a.g = 0;
				a.b = 0;*/
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 4 )
		{
			/*if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )*/
			if ( Delta( 0, 0, 128 ) )
			{
				/*a.r = 0;
				a.g = 128 / 255;
				a.b = 128 / 255;*/
				Set( 0, 128 / 255, 128 / 255 );
			}
			else
			/*if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 255, 0, 0 ) )
			{
				/*a.r = 0;
				a.g = 1;
				a.b = 1;*/
				Set( 0, 1, 1 );
			}
			else
			/*if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 128, 128, 0 ) )
			{
				/*a.r = 0;
				a.g = 0;
				a.b = 0;*/
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 5 )
		{
			/*if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )*/
			if ( Delta( 0, 0, 128 ) )
			{
				/*a.r = 128 / 255;
				a.g = 0;
				a.b = 128 / 255;*/
				Set( 128 / 255, 0, 128 / 255 );
			}
			else
			/*if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 255, 0, 0 ) )
			{
				/*a.r = 1;
				a.g = 0;
				a.b = 1;*/
				Set( 1, 0, 1 );
			}
			else
			/*if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 128, 128, 0 ) )
			{
				/*a.r = 0;
				a.g = 0;
				a.b = 0;*/
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 6 )
		{
			/*if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )*/
			if ( Delta( 0, 0, 128 ) )
			{
				/*a.r = 128 / 255;
				a.g = 128 / 255;
				a.b = 128 / 255;*/
				Set( 128 / 255, 128 / 255, 128 / 255 );
			}
			else
			/*if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 255, 0, 0 ) )
			{
				/*a.r = 1;
				a.g = 1;
				a.b = 1;*/
				Set( 1, 1, 1 );
			}
			else
			/*if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 128, 128, 0 ) )
			{
				/*a.r = 0;
				a.g = 0;
				a.b = 0;*/
				Set( 0, 0, 0 );
			}
		}
		else
		if ( team === 7 )
		{
			/*if ( a.r * 255 === 0 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 128 )*/
			if ( Delta( 0, 0, 128 ) )
			{
				/*a.r = 32 / 255;
				a.g = 32 / 255;
				a.b = 32 / 255;*/
				Set( 32 / 255, 32 / 255, 32 / 255 );
			}
			else
			/*if ( a.r * 255 === 255 &&
			     a.g * 255 === 0 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 255, 0, 0 ) )
			{
				/*a.r = 64 / 255;
				a.g = 64 / 255;
				a.b = 64 / 255;*/
				Set( 64 / 255, 64 / 255, 64 / 255 );
			}
			else
			/*if ( a.r * 255 === 128 &&
			     a.g * 255 === 128 &&
			     a.b * 255 === 0 )*/
			if ( Delta( 128, 128, 0 ) )
			{
				/*a.r = 0;
				a.g = 0;
				a.b = 0;*/
				Set( 0, 0, 0 );
			}
		}
	}
	
	UnhideForFPS()
	{
		this.UpdateWeaponVisibilityFPS( false );
		
		// Body Parts
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_HEAD ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_BODY ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG1A ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG2A ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG1B ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_LEG2B ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ARM1 ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ARM2 ], true );
                
		// Weapons
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_RIFLE ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ROCKET ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SNIPER ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SHOTGUN ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SPARK ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_BUILD1 ], true );
		this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SAW ], true );
	}
	
	HideForFPS()
	{
		if ( !sdCharacter.first_person_view )
		return;
		
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
		if ( sdCharacter.first_person_view )
		{
			for_fps = !for_fps;
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_RIFLE ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_RIFLE );
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_ROCKET ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_ROCKET );
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SNIPER ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SNIPER );
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SHOTGUN ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SHOTGUN );
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SPARK ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SPARK );
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_BUILD1 ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_BUILD1 );
			this.SetLimbIsVisible( this.atoms[ sdCharacter.ATOMS_SAW ], for_fps || this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SAW );
		}
	}
	
	PlayShotSound( gun_id )
	{
		var c = this;
		if ( c === main.my_character && sdCharacter.first_person_view )
		{
			if ( gun_id === main.WEAPON_RIFLE )
			sdSound.PlaySound({ sound: lib.rifle_fire, parent_mesh: c.mesh, volume: 0.25 });
			else
			if ( gun_id === main.WEAPON_SNIPER )
			sdSound.PlaySound({ sound: lib.sniper, parent_mesh: c.mesh, volume: 0.75 });
			else
			if ( gun_id === main.WEAPON_SHOTGUN )
			sdSound.PlaySound({ sound: lib.shotgun, parent_mesh: c.mesh, volume: 1 });
			else
			if ( gun_id === main.WEAPON_SPARK )
			sdSound.PlaySound({ sound: lib.spark2, parent_mesh: c.mesh, volume: 1 });
			else
			if ( gun_id === main.WEAPON_BUILD1 )
			sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 1 });
			else
			sdSound.PlaySound({ sound: lib.rocket_fire, parent_mesh: c.mesh, volume: 0.25 });
		}
		else
		{
			if ( gun_id === main.WEAPON_RIFLE )
			sdSound.PlaySound({ sound: lib.rifle_fire, parent_mesh:c.body, volume: 0.25 });
			else
			if ( gun_id === main.WEAPON_SNIPER )
			sdSound.PlaySound({ sound: lib.sniper, parent_mesh:c.body, volume: 0.75 });
			else
			if ( gun_id === main.WEAPON_SHOTGUN )
			sdSound.PlaySound({ sound: lib.shotgun, parent_mesh:c.body, volume: 2 });
			else
			if ( gun_id === main.WEAPON_SPARK )
			sdSound.PlaySound({ sound: lib.spark2, parent_mesh:c.body, volume: 1 });
			else
			if ( gun_id === main.WEAPON_BUILD1 )
			sdSound.PlaySound({ sound: lib.player_step, parent_mesh:c.body, volume: 1 });
			else
			sdSound.PlaySound({ sound: lib.rocket_fire, parent_mesh:c.body, volume: 0.25 });
		}
	}
	
	GetActiveWeapon( passive_weapons=null )
	{
		var c = this;
		var active_weapon = null;
		
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_RIFLE ) && (passive_weapons !== null) ) passive_weapons.push( c.rifle );
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_ROCKET ) && (passive_weapons !== null) ) passive_weapons.push( c.rocket );
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SHOTGUN ) && (passive_weapons !== null) ) passive_weapons.push( c.shotgun );
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SNIPER ) && (passive_weapons !== null) ) passive_weapons.push( c.sniper );
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SPARK ) && (passive_weapons !== null) ) passive_weapons.push( c.spark );
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_BUILD1 ) && (passive_weapons !== null) ) passive_weapons.push( c.build1 );
		if ( !(this.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SAW ) && (passive_weapons !== null) ) passive_weapons.push( c.saw );
		
		return active_weapon;
	}
	
	UpdateCharacter( GSPEED, teleport_limb_mode )
	{
		//main.DrawDynamicLight( this.x, this.y, this.z, this.glow_color.r, this.glow_color.g, this.glow_color.b );
		
		function MoveLimbTo( atoms_group, mesh, c ) // Should move atoms no matter whether they are .removed or not - because in else case damaged played would not be able to rocket-jump
		{
			var factor = main.MorphWithTimeScale( 0, 1, 0.9, GSPEED );
			var one_minus_factor = 1 - factor;
			
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

				if ( teleport_limb_mode )
				{
					a.lx = a.x;
					a.ly = a.y;
					a.lz = a.z;
				}

				/*a.tox = main.MorphWithTimeScale( a.tox, c.tox, 0.9, GSPEED );
				a.toy = main.MorphWithTimeScale( a.toy, c.toy, 0.9, GSPEED );
				a.toz = main.MorphWithTimeScale( a.toz, c.toz, 0.9, GSPEED );*/

				a.tox = c.tox * factor + a.tox * one_minus_factor;
				a.toy = c.toy * factor + a.toy * one_minus_factor;
				a.toz = c.toz * factor + a.toz * one_minus_factor;

				a.WakeUp();
			}
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
			
			// Prevent AI from falling
			if ( c.ai !== null && main.my_character !== c )
			{
				if ( c.x < 10 )
				{
					dir_unscaled.x = -1;
					c.walk_vector_xz.x = 0;
					c.walk_vector_xz.y = 1;
				}
				if ( c.x > main.level_chunks_x * main.chunk_size - 10 )
				{
					dir_unscaled.x = 1;
					c.walk_vector_xz.x = 0;
					c.walk_vector_xz.y = 1;
				}
				if ( c.z < 10 )
				{
					dir_unscaled.y = 1;
					c.walk_vector_xz.x = 0;
					c.walk_vector_xz.y = 1;
				}
				if ( c.z > main.level_chunks_z * main.chunk_size - 10 )
				{
					dir_unscaled.y = -1;
					c.walk_vector_xz.x = 0;
					c.walk_vector_xz.y = 1;
				}
			}
			
			var dir = new THREE.Vector2( dir_unscaled.x, dir_unscaled.y );
			if ( dir.length() > 1 )
			dir.normalize();
			
			if ( stand )
			{	
				dir.x *= sdCharacter.player_speed * GSPEED * ( 1 - c.sit * sdCharacter.player_crouch_percentage_nerf );
				dir.y *= sdCharacter.player_speed * GSPEED * ( 1 - c.sit * sdCharacter.player_crouch_percentage_nerf );
			
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
				dir.x *= sdCharacter.player_air_speed * GSPEED;
				dir.y *= sdCharacter.player_air_speed * GSPEED;
				
				var cur_vel = Math.sqrt( c.tox * c.tox + c.toy * c.toy + c.toz * c.toz );
				if ( cur_vel > sdCharacter.player_max_air_speed )
				dir.x /= 1 + ( cur_vel - sdCharacter.player_max_air_speed ) * sdCharacter.player_air_stop_factor;
			}
			
			c.tox += c.walk_vector_xz.x * dir.y;
			c.toz += c.walk_vector_xz.y * dir.y;
			
			c.tox += -c.walk_vector_xz.y * dir.x;
			c.toz += c.walk_vector_xz.x * dir.x;
		
			c.stand = stand;
			
			if ( stand )
			c.stand_timer = 15;
			else
			c.stand_timer -= GSPEED;
			
			if ( c.stand_timer > 0 )
			{
				GSPEED *= c.stand_timer / 15;
				
				if ( dir.x !== 0 || dir.y !== 0 )
				{
					var old_phase = c.walk_phase;
					
					if ( c.act_sprint )
					c.walk_phase += GSPEED * 0.3;
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

				GSPEED = undefined; // Disallow work with this variable in this method because it was changed and is no longer correct
			}
			else
			{
				c.walk_phase += Math.cos( c.walk_phase * 2 ) * 0.2 * GSPEED;
			}
			return correct_mesh_rotation;
		}
		
		function WeaponLogic( c, GSPEED, active_weapon )
		{
			if ( c === main.my_character )
			{
				c.act_weapon = main.action_weapon;
				c.act_fire = main.hold_fire;
			}
			
			if ( c.muzzle_a > 0 )
			{
				c.muzzle_a -= GSPEED * 0.5;
				if ( c.muzzle_a < 0 )
				c.muzzle_a = 0;
			}

			if ( c.cur_weapon_slot !== c.act_weapon )
			{
				if ( c.weapon_change_tim < sdGunClass.weapon_switch_time )
				{
					c.weapon_change_tim = Math.min( c.weapon_change_tim + GSPEED, sdGunClass.weapon_switch_time );
				}
				else
				{
					//c.cur_weapon_mesh = sdGun.Guns[ c.act_weapon ];
					//c.cur_weapon_object.gun_class.old_class_id = c.act_weapon;
					c.cur_weapon_slot = c.act_weapon;

					c._UpdateAmmoBarIfNeeded();

					if ( c === main.my_character )
					c.UpdateWeaponVisibilityFPS( true );

					//c.cur_weapon_object.reload_timer = sdCharacter.weapon_switch_time;

					c.time_to_reload = 0; // Reset reload
				}
			}
			else
			{
				if ( c.weapon_change_tim > 0 )
				c.weapon_change_tim = Math.max( c.weapon_change_tim - GSPEED, 0 );
			}
			
			for ( var i = 0; i < c.inventory.length; i++ )
			{
				if ( c.inventory[ i ].reload_timer > 0 )
				c.inventory[ i ].reload_timer -= GSPEED;
			}


			/*if ( c.cur_weapon_object.reload_timer > 0 )
			{
				c.cur_weapon_object.reload_timer -= GSPEED;
			}
			else*/
			if ( c.weapon_change_tim <= 0 )
			{	
				if ( c.cur_weapon_object.reload_timer <= 0 )
				{
					if ( c.act_fire > 0 )
					if ( c.time_to_reload <= 0 )
					{
						if ( c.cur_weapon_object.ammo > 0 )
						{
							//var gun_id = c.cur_weapon_object.gun_class.old_class_id;

							c.cur_weapon_object.reload_timer = c.cur_weapon_object.gun_class.reload_time;

							if ( !c.stand )
							{
								c.tox += c.look_direction.x * c.cur_weapon_object.gun_class.self_knockback;
								c.toy += c.look_direction.y * c.cur_weapon_object.gun_class.self_knockback;
								c.toz += c.look_direction.z * c.cur_weapon_object.gun_class.self_knockback;
							}
							
							if ( c.cur_weapon_object.gun_class.spawn_shell )
							{
								var v = new THREE.Vector3();
								main.SetAsRandom3D( v );
								v.x *= 0.1;
								v.y *= 0.1;
								v.z *= 0.1;
								var gun_world_pos = c.cur_weapon_mesh.getWorldPosition();

								var quaternion = new THREE.Quaternion();
								c.cur_weapon_mesh.getWorldQuaternion( quaternion );
								var gun_world_dir = new THREE.Vector3( -0.5, 1, -1 );
								gun_world_dir.applyQuaternion( quaternion );

								v.x += gun_world_dir.x * 0.5;
								v.y += gun_world_dir.y * 0.5;
								v.z += gun_world_dir.z * 0.5;
								
								sdSprite.CreateSprite({ type: sdSprite.TYPE_SHELL, x:gun_world_pos.x, y:gun_world_pos.y, z:gun_world_pos.z, tox:v.x + c.tox, toy:v.y + c.toy, toz:v.z + c.toz });
							}
							
							var speed = c.cur_weapon_object.gun_class.speed;

							var visual = c.cur_weapon_mesh.children[ 0 ].getWorldPosition();

							if ( !main.MP_mode || main.my_character === c )
							{
								c.PlayShotSound( c.cur_weapon_object.gun_class.old_class_id );

								for ( var p = 0; p < c.cur_weapon_object.gun_class.projectile_count; p++ )
								{
									var spread = { x:0, y:0, z:0 };

									if ( c.cur_weapon_object.gun_class.projectile_spread > 0 || c.cur_weapon_object.gun_class.spread_from_recoil > 0 )
									{
										main.SetAsRandom3D( spread );
										var r = Math.random() * ( c.cur_weapon_object.gun_class.projectile_spread + c.cur_weapon_object.gun_class.spread_from_recoil * c.recoil );
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
										knock_power: c.cur_weapon_object.gun_class.knock_power,
										hp_damage: c.cur_weapon_object.gun_class.hp_damage,
										hp_damage_head: c.cur_weapon_object.gun_class.hp_damage_head,
										is_rocket: c.cur_weapon_object.gun_class.is_rocket,
										is_sniper: c.cur_weapon_object.gun_class.is_sniper,
										is_plasma: c.cur_weapon_object.gun_class.is_plasma,
										is_melee: c.cur_weapon_object.gun_class.is_melee,
										splash_radius: c.cur_weapon_object.gun_class.splash_radius
									});
									
									c.muzzle_r = bullet.r;
									c.muzzle_g = bullet.g;
									c.muzzle_b = bullet.b;

									if ( main.MP_mode )
									{
										bullet.GiveLocalPeerUID();
										sdSync.MP_SendEvent( sdSync.COMMAND_I_SPAWN_BULLET, bullet, c.cur_weapon_object.gun_class.uid, p );
									}
								}
								
								c.muzzle_a = 1;
								
								if ( c.cur_weapon_object.gun_class.old_class_id === main.WEAPON_BUILD1 )
								{
									var rad = c.cur_weapon_object.gun_class.splash_radius;
									
									var new_x = c.x - c.look_direction.x * ( rad + sdCharacter.player_half_height + 1 );
									var new_y = c.y + sdCharacter.shoot_offset_y - c.look_direction.y * ( rad + sdCharacter.player_half_height + 1 );
									var new_z = c.z - c.look_direction.z * ( rad + sdCharacter.player_half_height + 1 );
									
									new_x -= c.x;
									new_y -= c.y;
									new_z -= c.z;
									
									var di = main.Dist3D( 0, 0, 0, new_x, new_y, new_z );
									
									new_x /= di / ( rad + sdCharacter.player_half_height + 1 );
									new_y /= di / ( rad + sdCharacter.player_half_height + 1 );
									new_z /= di / ( rad + sdCharacter.player_half_height + 1 );
									
									new_x += c.x;
									new_y += c.y;
									new_z += c.z;
									
									new_x = Math.round( new_x );
									new_y = Math.round( new_y );
									new_z = Math.round( new_z );
									
									if ( main.WorldPaintDamage( 
													new_x,
													new_y, 
													new_z, 
											rad, 2, 1,1,1 ) // mode: cutter=0, gore_paiter=1, gore_builder=2
										)
									{
										// Can build here
										if ( main.MP_mode )
										sdSync.MP_SendEvent( sdSync.COMMAND_I_BUILD, new_x, new_y, new_z, rad, 1,1,1 );
									}
									else
									{
										// Nothing was changed, return bullet
										c.cur_weapon_object.ammo += 1;
									}
								}
							}
							
							c.cur_weapon_object.ammo -= 1;
							
							c._UpdateAmmoBarIfNeeded();
						

							c.recoil += c.cur_weapon_object.gun_class.self_knockback;
						}
						else
						{
							c.ReloadIfPossible();
						}
					}
				}
			}
		}
		function CanClimb( c )
		{
			var look_direction_flat_x = -c.look_direction.x;
			var look_direction_flat_z = -c.look_direction.z;
			
			var di = main.Dist3D( look_direction_flat_x, look_direction_flat_z, 0, 0,0,0 );
			var c_low = ( - sdCharacter.player_half_height * ( 1 - c.sit * 0.333 ) + sdCharacter.player_half_height * ( c.sit * 0.333 ) ) + 2;
			
			if ( di < 0.01 )
			return false;
			
			look_direction_flat_x /= di;
			look_direction_flat_z /= di;
			
			for ( var depth = 1.5; depth <= 2.5; depth += 1 )
			for ( var hei = c_low; hei <= sdCharacter.player_half_height; hei += 1 )
			{
				if ( main.TraceLine( c.x, 
									 c.y + hei, 
									 c.z, 
									 c.x + look_direction_flat_x * sdCharacter.player_half_width * depth, 
									 c.y + hei, 
									 c.z + look_direction_flat_z * sdCharacter.player_half_width * depth, 
									 null, 1, 0 ) === 1 )
				{
					var prog_last = main.TraceLine( c.x + look_direction_flat_x * sdCharacter.player_half_width * depth, 
										 c.y + hei, 
										 c.z + look_direction_flat_z * sdCharacter.player_half_width * depth, 
										 c.x + look_direction_flat_x * sdCharacter.player_half_width * depth, 
										 c.y + hei - 2, 
										 c.z + look_direction_flat_z * sdCharacter.player_half_width * depth, 
										 null, 1, 0 );
					if ( prog_last > 0 && prog_last < 1 )
					return true;
				}
			}
	
			return false;
			
			/*return ( main.TraceLine( c.x, c.y + sdCharacter.shoot_offset_y, c.z, c.x - c.look_direction.x * 8, c.y + sdCharacter.shoot_offset_y + 2 - c.look_direction.y * 8, c.z - c.look_direction.z * 8, null, 1, 0 ) === 1 &&
					 main.TraceLine( c.x, c.y + sdCharacter.shoot_offset_y, c.z, c.x - c.look_direction.x * 8, c.y + sdCharacter.shoot_offset_y - 8 - c.look_direction.y * 8, c.z - c.look_direction.z * 8, null, 1, 0 ) < 1 );*/
		}
		
		var c = this;
		
		if ( c.ai !== null )
		if ( c !== main.my_character )
		if ( !main.MP_mode )
		{
			c.ai.ApplyLogic( GSPEED );
			//if ( c.look_direction.length() > 1.1 )
			//throw new Error('How?');
		}
		
		if ( c.hurt_timeout > 0 )
		c.hurt_timeout -= GSPEED;
	
		if ( !main.MP_mode && c === main.my_character )
		{
			if ( c.hea < this.max_hea )
			{
				if ( c.regen_timer < 90 )
				{
					c.regen_timer += GSPEED;
				}
				else
				{
					c.hea = Math.min( this.max_hea, c.hea + GSPEED );
					c._UpdateHealthBarIfNeeded();
					
					if ( c.hea === this.max_hea )
					{
						c.RestoreLimbs( false );
					}
				}
			}
		}

		/*if ( c.y < main.world_end_y )
		if ( !main.MP_mode || c === main.my_character )
		{
			c.DealDamage( 1000, null, c.x, c.y, c.z );

			sdSync.MP_SendEvent( sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER, c, 1000, 0,0,0, c.x,c.y,c.z );
		}*/
		
		if ( c.last_out_of_bounds_timer > 0 )
		c.last_out_of_bounds_timer -= GSPEED;
	
		if ( c.x < 0 || c.z < 0 || c.x > main.level_chunks_x * main.chunk_size || c.z > main.level_chunks_z * main.chunk_size )
		{
			var in_game_x = Math.max( 0, Math.min( c.x, main.level_chunks_x * main.chunk_size ) );
			var in_game_z = Math.max( 0, Math.min( c.z, main.level_chunks_z * main.chunk_size ) );
			
			var di_out = main.Dist3D( in_game_x, in_game_z, 0, c.x, c.z, 0 );
			
			if ( c.y < di_out )
			{
				var dx = in_game_x - c.x;
				var dz = in_game_z - c.z;

				var di = main.Dist3D( dx, dz, 0, 0, 0, 0 );
				if ( di > 0.01 )
				{
					dx /= di;
					dz /= di;

					c.tox = main.MorphWithTimeScale( c.tox, 0, 0.9, GSPEED );
					c.toy = main.MorphWithTimeScale( c.toy, 0, 0.9, GSPEED );
					c.toz = main.MorphWithTimeScale( c.toz, 0, 0.9, GSPEED );

					if ( c.y < 16 )
					c.toy = ( 16 - c.y ) * 0.15;

					c.toy += 1 * GSPEED;
					
					c.tox += ( 1 ) * dx * GSPEED;
					c.toz += ( 1 ) * dz * GSPEED;

					if ( c.last_out_of_bounds_timer <= 0 )
					{
						c.last_out_of_bounds_timer = 10;
						
						if ( !main.MP_mode || c === main.my_character )
						{
							c.DealDamage( 15, null, c.x, c.y, c.z );

							sdSync.MP_SendEvent( sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER, c, 15, 0,0,0, c.x,c.y,c.z );
						}
						
						for ( var x = -2; x <= 2; x++ )
						for ( var y = -2; y <= 2; y++ )
						if ( main.Dist3D( x,y,0, 0,0,0 ) < 2.5 )
						{
							var sx = c.x + 2 * ( dx * x * 0.71 - dz * y ) * 3;
							var sy = c.y - 2 * ( x * 0.71 ) * 3;
							var sz = c.z + 2 * ( dz * x * 0.71 + dx * y ) * 3;
							sdSprite.CreateSprite({ type: sdSprite.TYPE_SNIPER_TRAIL, x:sx, y:sy, z:sz, r:0.4, g:0.6, b:1.0 });
						}
					}
				}
			}
		}
		

		correct_mesh_rotation_ang = 0;

		var correct_mesh_rotation = false;

		c.toy -= 0.1 * GSPEED;

		var tx = c.tox * GSPEED;
		var ty = c.toy * GSPEED;
		var tz = c.toz * GSPEED;

		var morph = c.TraceLineAllDirection( c.x, c.y, c.z, tx, ty, tz, 1, c.sit );

		var last_trace_line_percentage = c.trace_line_percentage;

		if ( c.act_jump )
		if ( !c.stand )
		if ( CanClimb( c ) )
		{
			if ( c.act_y > 0 )
			{
				c.toy = Math.max( c.toy, main.MorphWithTimeScale( c.toy, 1, 0.7, GSPEED ) ); // 0.5
				c.tox = main.MorphWithTimeScale( c.tox, -c.look_direction.x, 0.99, GSPEED );
				c.toz = main.MorphWithTimeScale( c.toz, -c.look_direction.z, 0.99, GSPEED );
			}
			else
			{
				c.toy = Math.max( c.toy, main.MorphWithTimeScale( c.toy, 0.175, 0.5, GSPEED ) );
				c.tox = main.MorphWithTimeScale( c.tox, 0, 0.8, GSPEED );
				c.toz = main.MorphWithTimeScale( c.toz, 0, 0.8, GSPEED );
			}
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
			c.trace_line_direction_normal.normalize();

			var last_direction = new THREE.Vector3( c.trace_line_direction_normal.x, c.trace_line_direction_normal.y, c.trace_line_direction_normal.z );
			
			if ( last_direction.y === 1 )
			if ( c.toy < -1.1 )
			sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 2 + Math.min( 8, Math.abs( c.toy * 0.5 ) ) });

			var dot_product = last_direction.x * c.tox + last_direction.y * c.toy + last_direction.z * c.toz;
			if ( dot_product < 0 )
			{
				if ( c.act_jump )
				if ( !c.stand )
				{
					if ( CanClimb( c ) )
					{
					}
					else
					{
						var di = main.Dist3D(
							-last_direction.x,
							-last_direction.y,
							-last_direction.z,
							c.walk_vector_xz.x * c.act_y - c.walk_vector_xz.y * c.act_x,
							0,
							c.walk_vector_xz.y * c.act_y + c.walk_vector_xz.x * c.act_x
						);

						//main.DrawDebugPoint( c.x, c.y, c.z, 0xFF0000, 1, 1, 3000 );
						//main.DrawDebugPoint( c.x - last_direction.x, c.y - last_direction.y, c.z - last_direction.z, 0x00FF00, 1, 1, 3000 );
						//main.DrawDebugPoint( c.x + c.walk_vector_xz.x * c.act_y - c.walk_vector_xz.y * c.act_x, c.y, c.z + c.walk_vector_xz.y * c.act_y + c.walk_vector_xz.x * c.act_x, 0x0000FF, 1, 1, 3000 );

						//console.log( di );

						if ( di > 1 )
						{
							// walljump
							dot_product -= 0.7;
							c.toy += 0.7;

							sdSound.PlaySound({ sound: lib.player_step, parent_mesh: c.mesh, volume: 0.5 });
						}
					}
				}
				var last_tox = c.tox;
				var last_toy = c.toy;
				var last_toz = c.toz;


				c.tox = c.tox - dot_product * last_direction.x;
				c.toy = c.toy - dot_product * last_direction.y;
				c.toz = c.toz - dot_product * last_direction.z;

				var fall_damage = main.Dist3D( last_tox, last_toy, last_toz, c.tox, c.toy, c.toz );
				if ( fall_damage > 2.7 )
				{
					//console.log( fall_damage );
					fall_damage = ~~( fall_damage * fall_damage * 5 );

					if ( !main.MP_mode || c === main.my_character )
					{
						c.DealDamage( fall_damage, null, c.x, c.y, c.z );

						sdSync.MP_SendEvent( sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER, c, 15, 0,0,0, c.x,c.y,c.z );
					}
				}
			}
			
			var GSPEED2 = ( 1 - morph ) * GSPEED;

			c.x += c.tox * GSPEED2;
			c.y += c.toy * GSPEED2;
			c.z += c.toz * GSPEED2;

			var step_up_size = 4;
			while ( step_up_size > 0 )
			{
				var morph2 = c.TraceLineAllDirection( 
						c.x + last_direction.x * step_up_size, 
						c.y + last_direction.y * step_up_size, 
						c.z + last_direction.z * step_up_size, 
					-last_direction.x * step_up_size, 
					-last_direction.y * step_up_size, 
					//-last_direction.z * step_up_size, 0.1, c.sit );
					-last_direction.z * step_up_size, 1, c.sit ); // Should work with 1 now since traceline method fixed
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

			var friction = sdCharacter.walk_friction;
			
			if ( c.sit > 0.5 )
			friction = sdCharacter.slide_friction;
			
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

		var active_weapon = null;//( c.curwea === 0 ) ? c.rifle : c.rocket;
		var passive_weapons = [];
		
		active_weapon = c.GetActiveWeapon( passive_weapons );
		
		//
		WeaponLogic( c, GSPEED, this.cur_weapon_mesh );

		if ( c.cur_weapon_mesh.parent !== c.arm2 )
		{
			c.cur_weapon_mesh.parent.remove( c.cur_weapon_mesh );
			c.arm2.add( c.cur_weapon_mesh );
		}
		
		c.cur_weapon_object.init_pos( c.recoil );
		
		
		for ( var p = 0; p < passive_weapons.length; p++ )
		{
			var passive_weapon = passive_weapons[ p ];

			if ( passive_weapon.parent !== c.body )
			{
				passive_weapon.parent.remove( passive_weapon );
				c.body.add( passive_weapon );
				
				passive_weapon.scale.x = passive_weapon.scale.y = passive_weapon.scale.z = 1;
			}

			passive_weapon.position.x = 5;
			passive_weapon.position.y = 6;
			passive_weapon.position.z = 0;

			passive_weapon.rotation.y = Math.PI / 2;
			passive_weapon.rotation.x = Math.PI / 2;
			passive_weapon.rotation.z = 0;

			if ( passive_weapons.length > 0 )
			{
				var prog = p / ( passive_weapons.length - 1 ) * Math.PI * 0.5 + Math.PI * 0.5 / 2;
				passive_weapon.position.x += Math.sin( prog ) * 5 - 4;
				passive_weapon.position.z += Math.cos( prog ) * 5;
			}
		}






		var look_direction = c.look_direction;

		if ( c === main.my_character )
		{
			main.main_camera.updateMatrixWorld();

			var front_vector = new THREE.Vector3( 0, 0, 1 );
			front_vector.transformDirection( main.main_camera.matrixWorld );

			var right_vector = new THREE.Vector3( 1, 0, 0 );
			right_vector.transformDirection( main.main_camera.matrixWorld );

			// fps
			if ( sdCharacter.first_person_view )
			{
				main.main_camera.position.x = main.MorphWithTimeScale( main.main_camera.position.x, c.x, 0, GSPEED );
				main.main_camera.position.y = main.MorphWithTimeScale( main.main_camera.position.y, c.y + sdCharacter.shoot_offset_y, 0, GSPEED );
				main.main_camera.position.z = main.MorphWithTimeScale( main.main_camera.position.z, c.z, 0, GSPEED );
			}
			else
			{
				// fps
				/*main.main_camera.position.x = c.x;
				main.main_camera.position.y = c.y + sdCharacter.shoot_offset_y;
				main.main_camera.position.z = c.z;*/
				/*
				main.main_camera.position.x = c.x + front_vector.x * 25;
				main.main_camera.position.y = c.y + front_vector.y * 25 + sdCharacter.shoot_offset_y;
				main.main_camera.position.z = c.z + front_vector.z * 25;
				*/

				main.main_camera.position.x = main.MorphWithTimeScale( main.main_camera.position.x, c.x + front_vector.x * 8 + right_vector.x * 6, 0.7, GSPEED );
				main.main_camera.position.y = main.MorphWithTimeScale( main.main_camera.position.y, c.y + front_vector.y * 8 + right_vector.y * 6 + sdCharacter.shoot_offset_y, 0.7, GSPEED );
				main.main_camera.position.z = main.MorphWithTimeScale( main.main_camera.position.z, c.z + front_vector.z * 8 + right_vector.z * 6, 0.7, GSPEED );
				
				var depth = main.TraceLine( c.x, (c.y+sdCharacter.shoot_offset_y), c.z, 
					 c.x+( front_vector.x * 8 + right_vector.x * 6 ),
					 c.y+( front_vector.y * 8 + right_vector.y * 6 )+sdCharacter.shoot_offset_y,
					 c.z+( front_vector.z * 8 + right_vector.z * 6 ), null, 1, 0
				);
				if ( depth < 1 )
				{
					if ( depth < 0.4 )
					depth = -0.4;
					main.main_camera.position.x = c.x + ( front_vector.x * 8 + right_vector.x * 6 ) * depth;
					main.main_camera.position.y = c.y + ( front_vector.y * 8 + right_vector.y * 6 ) * depth + sdCharacter.shoot_offset_y;
					main.main_camera.position.z = c.z + ( front_vector.z * 8 + right_vector.z * 6 ) * depth;
				}
			}


			main.speed.x = c.tox;
			main.speed.y = c.toy;
			main.speed.z = c.toz;

			if ( sdCharacter.first_person_view )
			look_direction.set( front_vector.x, front_vector.y, front_vector.z );
			else
			{
				var depth = main.TraceLine( main.main_camera.position.x,main.main_camera.position.y,main.main_camera.position.z, 
					main.main_camera.position.x-front_vector.x*1000,
					main.main_camera.position.y-front_vector.y*1000,
					main.main_camera.position.z-front_vector.z*1000, null, 1, 0
				);
		
				look_direction.x = -(main.main_camera.position.x - front_vector.x*1000 * depth - c.x);
				look_direction.y = -(main.main_camera.position.y - front_vector.y*1000 * depth - c.y - sdCharacter.shoot_offset_y);
				look_direction.z = -(main.main_camera.position.z - front_vector.z*1000 * depth - c.z);

				/*main.DrawDebugPoint( 
				main.main_camera.position.x - front_vector.x*1000 * depth, 
				main.main_camera.position.y - front_vector.y*1000 * depth, 
				main.main_camera.position.z - front_vector.z*1000 * depth, 0xFF0000, 3, 1, 1000 );*/
				
				look_direction.normalize();
			}

			if ( sdCharacter.first_person_view )
			{
				if ( c.cur_weapon_mesh.parent !== main.main_camera )
				{
					c.cur_weapon_mesh.parent.remove( c.cur_weapon_mesh );
					main.main_camera.add( c.cur_weapon_mesh );

					c.cur_weapon_mesh.scale.x = c.cur_weapon_mesh.scale.y = c.cur_weapon_mesh.scale.z = 0.5;
				}

				if ( main.zoom_intensity === 1 )
				c.cur_weapon_mesh.position.set( 
					main.gun_x_offset + Math.sin( c.walk_phase * 0.5 ) * 0.3, 
					main.gun_y_offset - Math.abs( Math.sin( c.walk_phase ) ) * 0.2, 
					main.gun_z_offset + c.recoil * main.gun_recoil 
				);
				else
				if ( main.zoom_intensity === 0.5 )
				c.cur_weapon_mesh.position.set( 
					0, 
					-3.25, 
					-4.5 + c.recoil * main.gun_recoil 
				);
				else
				{
					var morph = main.zoom_intensity * 2 - 1;
					var m_morph = 1 - morph;

					c.cur_weapon_mesh.position.set( 
						( main.gun_x_offset + Math.sin( c.walk_phase * 0.5 ) * 0.3 ) * morph + 0 * m_morph, 
						( main.gun_y_offset - Math.abs( Math.sin( c.walk_phase ) ) * 0.2 ) * morph + (-3.25) * m_morph, 
						( main.gun_z_offset + c.recoil * main.gun_recoil ) * morph + (-4.5 + c.recoil * main.gun_recoil) * m_morph
					);
				}

				c.cur_weapon_mesh.rotation.set( 0, -Math.PI * 0.5, 0 - Math.pow( c.recoil * 0.5, 2 ) * 3 );

				c.cur_weapon_object.gun_class.change_transformations( c );

				c.cur_weapon_object.gun_class.set_fpspos( c );
			}
			else
			{
				//c.cur_weapon_mesh.change_transformations( c, true );
				c.cur_weapon_object.gun_class.change_transformations( c, true );
			}
		}
		
		if ( c.time_to_reload > 0 )
		{
			var turn = 1 - Math.cos( c.time_to_reload );

			c.cur_weapon_mesh.rotation.z -= ( 1 - Math.pow( 1 - turn / 2, 4 ) ) * 2 * 0.5;

			var shake_time = -8;
			if ( c.time_to_reload * 4 + shake_time > 0 && c.time_to_reload * 4 + shake_time < Math.PI * 2 )
			{
				var shake = 1 - Math.cos( c.time_to_reload * 4 + shake_time );
				c.cur_weapon_mesh.position.x += shake * 0.25;

				c.cur_weapon_mesh.rotation.x -= shake * 0.2;
				
				
				if ( c.cur_weapon_object.ammo < c.cur_weapon_object.gun_class.ammo_per_clip )
				{
					sdSound.PlaySound({ sound: lib.reload, parent_mesh: this.mesh, volume: 1.5 });
					
					c.cur_weapon_object.ammo = c.cur_weapon_object.gun_class.ammo_per_clip;
					c._UpdateAmmoBarIfNeeded();
				}
			}

			if ( c.cur_weapon_slot === c.act_weapon ) // if not switching
			c.time_to_reload -= GSPEED * 0.25;
			
			/*if ( c.time_to_reload <= 0 )
			{
				c.ammo[ c.curwea ] = sdCharacter.weapon_ammo_per_clip[ c.curwea ];
				c._UpdateAmmoBarIfNeeded();
			}*/
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

		c.idle_phase += GSPEED * 0.1;

		// Decrease head rotation by 2 (as it given to all parent objects of head)
		var rot = new THREE.Quaternion();
		if ( c.weapon_change_tim > 0 )
		{
			var prog = Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 0.5 );
			rot.setFromEuler( new THREE.Euler( 0 + prog * 0.5, Math.PI * 0.5 - prog * 0.5, 0 - prog * 0.25 ) );
		}
		else
		if ( c.time_to_reload > 0 )
		{
			var turn = 1 - Math.cos( c.time_to_reload );
			turn *= 0.2;
			rot.setFromEuler( new THREE.Euler( 0 + turn, Math.PI * 0.5 + turn, 0 - turn ) );
		}
		else
		{
			var breath1 = Math.round( Math.sin( c.idle_phase ) * 0.05 * 50 ) / 50;
			var breath2 = Math.round( Math.cos( c.idle_phase ) * 0.05 * 50 ) / 50;
			var breath3 = Math.round( Math.sin( c.idle_phase ) * 0.05 * 50 ) / 50;
			rot.setFromEuler( new THREE.Euler( 0 + breath1, Math.PI * 0.5 + breath2, 0 - breath3 ) );
		}
		c.head.quaternion.slerp( rot, 0.5 ); // decrease head transform by 2


		// Body
		c.body.quaternion.copy( c.head.quaternion );
		var rot = new THREE.Quaternion();
		{
			var breath4 = Math.round( Math.cos( c.idle_phase ) * 0.04 * 100 ) / 200;
			rot.setFromEuler( new THREE.Euler( 0, -Math.PI * 0.5, 0 + breath4 ) );
		}
		c.body.quaternion.multiply( rot );






		var rot = new THREE.Quaternion();
		rot.setFromEuler( new THREE.Euler( 0, -Math.PI * 0.5, 0 ) );
		c.head.quaternion.multiply( rot );

		c.arm1.quaternion.copy( c.head.quaternion );
		c.arm2.quaternion.copy( c.head.quaternion );

		if ( c.weapon_change_tim > 0 )
		{
			var prog = Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 );

			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, -sdCharacter.arm_cross_left, prog ) );
			c.arm1.quaternion.premultiply( rot );
			//
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0 + prog*0.5, sdCharacter.arm_cross_right, prog * 2 ) );
			c.arm2.quaternion.premultiply( rot );
		}
		else
		if ( c.time_to_reload > 0 )
		{
			var turn = 1 - Math.cos( c.time_to_reload );
			
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, -sdCharacter.arm_cross_left, -turn * 0.2 ) );
			c.arm1.quaternion.premultiply( rot );
			//
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( turn*0.3, sdCharacter.arm_cross_right, -turn * 0.2 ) );
			c.arm2.quaternion.premultiply( rot );
		}
		else
		{
			var rel = 0;
			
			if ( c.cur_weapon_object.gun_class.old_class_id === main.WEAPON_SAW )
			{
				var prog = c.cur_weapon_object.reload_timer / c.cur_weapon_object.gun_class.reload_time;

				

				var mid = 0.9;

				if ( prog > mid )
				rel = ( prog - mid ) / ( 1 - mid );
				else
				{
					rel = 1 - prog / mid;
					rel *= rel;
				}
				rel = rel * 1.2 - 0.2;
			}
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, -sdCharacter.arm_cross_left, -c.recoil * 0.1 + rel ) );
			c.arm1.quaternion.premultiply( rot );
			//
			var rot = new THREE.Quaternion();
			rot.setFromEuler( new THREE.Euler( 0, sdCharacter.arm_cross_right, -c.recoil * 0.1 + rel ) );
			c.arm2.quaternion.premultiply( rot );
		}

		c.leg1a.rotation.x = 0;
		c.leg2a.rotation.x = 0;
		
		c.leg1a.rotation.z = Math.PI * 0.5 + Math.sin( c.walk_phase ) * 0.5 - 0.25;
		c.leg2a.rotation.z = Math.PI * 0.5 - Math.sin( c.walk_phase ) * 0.5 - 0.25;
		c.leg1b.rotation.z = ( Math.cos( c.walk_phase - Math.PI * 0.25 ) * 0.5 + 1 ) * 1;
		c.leg2b.rotation.z = ( Math.cos( c.walk_phase ) * 0.5 + 1 ) * 1;

		if ( c.sit > 0 )
		{
			var morph = c.sit;

			c.leg1a.rotation.z = ( Math.PI * 0.5 + Math.sin( c.walk_phase ) * 0.2 - 2 ) * morph + c.leg1a.rotation.z * ( 1 - morph );
			c.leg2a.rotation.z = ( Math.PI * 0.5 - Math.sin( c.walk_phase ) * 0.2 - 2 ) * morph + c.leg2a.rotation.z * ( 1 - morph );

			c.leg1b.rotation.z = (   Math.sin( c.walk_phase ) * 0.2 + 3 ) * morph + c.leg1b.rotation.z * ( 1 - morph );
			c.leg2b.rotation.z = ( - Math.sin( c.walk_phase ) * 0.2 + 3 ) * morph + c.leg2b.rotation.z * ( 1 - morph );
		}
			
		var velocity = main.Dist3D( c.tox, 0, c.toz, 0,0,0 );

		if ( c.sit > 0 && velocity > 1.5 && c.stand ) // sliding?
		{
			c.sliding_intens = main.MorphWithTimeScale( c.sliding_intens, Math.min( 1, velocity ), 0.7, GSPEED );
		}
		else
		{
			c.sliding_intens = main.MorphWithTimeScale( c.sliding_intens, 0, 0.9, GSPEED );
		}
		c.mesh.rotation.z = -Math.PI * 0.333 * c.sliding_intens;
		c.body.rotation.z += Math.PI * 0.333 / 2 * c.sliding_intens;
		c.head.rotation.z += Math.PI * 0.333 / 2 * c.sliding_intens;
		
		if ( c.hurt_anim > 0 )
		{
			//var arr = [ c.head, c.body ];
			
			c.hurt_direction_morph = main.MorphWithTimeScale( c.hurt_direction_morph, c.hurt_direction, 0.7, GSPEED );
			c.hurt_direction2_morph = main.MorphWithTimeScale( c.hurt_direction2_morph, c.hurt_direction2, 0.7, GSPEED );
		
			for ( var i2 = 0; i2 < 4; i2++ )
			{
				var m; //= arr[ i2 ];
				
				var scale = Math.pow( c.hurt_anim / 5, 2 ) * Math.PI * 0.1;
						
				if ( i2 === 0 )
				m = c.head;
				if ( i2 === 1 )
				m = c.body;
				if ( i2 === 2 )
				{
					m = c.leg1a;
					scale *= -0.5;
				}
				if ( i2 === 3 )
				{
					m = c.leg2a;
					scale *= -0.5;
				}
				
				var power = scale * c.hurt_direction_morph;
				m.rotation.z += power;
				
				var power = scale * c.hurt_direction2_morph;
				m.rotation.x += power;
			}
			
			c.hurt_anim = Math.max( 0, c.hurt_anim - GSPEED * ( c.stand ? 0.25 : 0.05 ) );
			
			if ( c.hurt_anim === 0 )
			{
				c.hurt_direction_morph = 0;
				c.hurt_direction2_morph = 0;
			}
		}
		
		/*
			this.hook_enabled = false;
			this.hook_pos = new THREE.Vector3( 1, 0, 0 );
			this.hook_di = 0;
		 */
		if ( c.hook_enabled )
		{
			var dx = c.hook_pos.x - c.x;
			var dy = c.hook_pos.y - c.y;
			var dz = c.hook_pos.z - c.z;
			var di = main.Dist3D( dx, dy, dz, 0,0,0 );
			//c.hook_di = ( di + Math.max( 0, c.hook_di - GSPEED * 0.75 ) ) / 2;
			//c.hook_di = main.MorphWithTimeScale( c.hook_di, ( di + Math.max( 0, c.hook_di - GSPEED * 1 ) ) / 2, 0.1, GSPEED );
			c.hook_di = main.MorphWithTimeScale( c.hook_di - GSPEED * 0.5, di, 0.5, GSPEED );
			
			//if ( di < c.hook_di )
			//c.hook_di = di;
			
			if ( di > 3 )
			if ( di > c.hook_di )
			{
				c.tox += dx / di * ( di - c.hook_di ) * 0.5 * GSPEED;
				c.toy += dy / di * ( di - c.hook_di ) * 0.5 * GSPEED;
				c.toz += dz / di * ( di - c.hook_di ) * 0.5 * GSPEED;
			}
		}

		
		c.shadow.position.x = c.x;
		//c.shadow.position.y = c.y;
		c.shadow.position.z = c.z;
		
		var morph2 = main.TraceLine( c.x, ~~c.y, c.z, c.x, 0, c.z, null, 1, 0 );
		c.shadow.position.y = (~~c.y) * ( 1 - morph2 ) + 1;
		
		c.shadow.scale.x = c.shadow.scale.z = 1 / ( 1 + Math.max( 0, c.y - sdCharacter.player_half_height - c.shadow.position.y ) * 0.05 );
		c.shadow.material.opacity = c.shadow.scale.x * 0.2;

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
		MoveLimbTo( c.atoms[ sdCharacter.ATOMS_SNIPER ], c.sniper, c );
		MoveLimbTo( c.atoms[ sdCharacter.ATOMS_SHOTGUN ], c.shotgun, c );
		MoveLimbTo( c.atoms[ sdCharacter.ATOMS_SPARK ], c.spark, c );
		MoveLimbTo( c.atoms[ sdCharacter.ATOMS_BUILD1 ], c.build1, c );
		MoveLimbTo( c.atoms[ sdCharacter.ATOMS_SAW ], c.saw, c );
	}

	static ThinkNow( GSPEED )
	{
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		sdCharacter.characters[ i ].UpdateCharacter( GSPEED, false );
	}
}
sdCharacter.init_class();