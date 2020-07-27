/*

	Physics here. Also visualization for atoms & bullets.

	Unless things change - .atoms array is used for all the damageable & physically movable entities in the world. 
	Anything from player body parts to alien body parts, weapons (when they will become separate and organized class?), barrels and doors should be made using these.

*/

/* global THREE, main, sdShaderMaterial, sdCharacter, sdBullet */
class sdChain
{
	static init_class()
	{
		sdChain.chains = [];
		
		sdChain.initial_length = 0;
		sdChain.enable_reuse = false; // current value
		sdChain.enable_reuse_persistent = false; // true
	}
	static CreateChain( a, b, def, in_limb )
	{
		if ( sdChain.enable_reuse )
		{
			// try to reuse slot in order to prevent array from growing
			var min_i = sdChain.initial_length;
			
			if ( sdChain.chains.length < min_i )
			throw new Error('Where all the starter chains gone? They should exist at this moment.');
			
			for ( var i = min_i; i < sdChain.chains.length; i++ )
			{
				if ( sdChain.chains[ i ].removed )
				{
					var c = new sdChain( a, b, def, in_limb );
					c.uid = i;
					sdChain.chains[ i ] = c;
					return c;
				}
			}
		}
		var c = new sdChain( a, b, def, in_limb );
		c.uid = sdChain.chains.length;
		sdChain.chains.push( c );
		return c;
		
	}
	constructor( a, b, def, in_limb )
	{
		this.uid = -1; // Set later
		
		this.a = a;
		this.b = b;
		this.def = def;
		
		this.in_limb = in_limb;
		
		this.a.my_chains.push( this );
		this.b.my_chains.push( this );
		
		this.removed = false;
		
		//this.stack = sdShaderMaterial.getStackTrace();
	}
	remove()
	{
		this.removed = true;
		
		if ( sdChain.enable_reuse )
		{
			
		}
		else
		{
			if ( !this.removed )
			{
				var id = sdChain.chains.indexOf( this );
				
				//if ( id >= 0 )
				sdChain.chains.splice( id, 1 );
	}
}
	}
}
sdChain.init_class();

class sdAtom
{
	static init_class()
	{
		sdAtom.atoms = [];
		sdAtom.pseudo_atoms = []; // Copies that stay for some time
		
		sdAtom.snow_particles = null;
		sdAtom.snow_particles_last_trace = null;
		sdAtom.snow_particles_tested_i = 0;
		sdAtom.snow_particles_xyz_addition = 100;
		
		sdAtom.pseudo_atoms_ttl_max = 90;
		
		sdAtom.MATERIAL_ALIVE_PLAYER = 1;
		sdAtom.MATERIAL_ALIVE_PLAYER_HEAD = 2;
		sdAtom.MATERIAL_ALIVE_PLAYER_GUN = 3; // Anything below this has no physics logic
		sdAtom.MATERIAL_GIB = 4; // Ragdolls too?
		sdAtom.MATERIAL_GIB_GUN = 5;
		
		sdAtom.atom_scale = 0.5; // Atom & voxel grid scale
		
		sdAtom.atom_hp = 0.2; // 0.1 is not enough for splash-spark attacks (player can disappear)
		sdAtom.atom_hp_damage_scale_bullets = 0.005; // 0.005
		
		sdAtom.material = null; // Created at main.InitEngine() because we need to know extension support

		sdAtom.atom_limit = 4096 * 2 * 2 * 2; // Used to be 4096 * 2 * 2
		
		sdAtom.stars = [];
		
		sdAtom.last_point = 0; // Index of a point that was last in previous frame
		
		sdAtom.mesh = null;
		//sdAtom.mesh = new THREE.Points( sub_geom, sdAtom.material );
		//sdAtom.mesh.frustumCulled = false;
		
		var bmp = new BitmapData( 64, 48 );
		
		var mini_texture = new Image();
		mini_texture.src = "assets/voxel_player3.png";
		mini_texture.onload = function() 
		{
			bmp.ctx.drawImage( mini_texture, 0, 0 );

		};
		sdAtom.character_bitmap = bmp;
	}
	static RandomizeStars()
	{
		sdAtom.stars = [];
		
		class Star
		{
			constructor()
			{
				this.x;
				this.y;
				this.z;
				this.time_offset = sdRandomPattern.random() * Math.PI * 2;
			}
		}
		
		function SetAsRandom3D( v )
		{
			var omega = sdRandomPattern.random() * Math.PI * 2;
			var z = sdRandomPattern.random() * 2 - 1;

			var one_minus_sqr_z = Math.sqrt(1-z*z);

			v.x = one_minus_sqr_z * Math.cos(omega);
			v.y = one_minus_sqr_z * Math.sin(omega);
			v.z = z;

			return v;
		}
		
		for ( var i = 0; i < 200; i++ )
		{
			var v = new Star();
			
			SetAsRandom3D( v );
			
			v.y = Math.abs( v.y );
			
			var r = 250 + sdRandomPattern.random() * 100;
			
			v.x *= r;
			v.y *= r;
			v.z *= r;
			
			sdAtom.stars.push( v );
		}
	}
	static init()
	{
		sdAtom.material.uniforms.fog.value = new THREE.Color( main.fog_color );
		sdAtom.material.uniforms.dot_scale.value = sdAtom.atom_scale;
		
		main.SetSameLampUniforms( sdAtom.material );
		
		if ( sdAtom.mesh === null )
		{
			var sub_geom = new THREE.BufferGeometry();
			var vertices = sub_geom.initVertexData( false, sdAtom.atom_limit * 3 );
			var rgba = sub_geom.initRGBAData( false, sdAtom.atom_limit * 4 );
			var uvs2 = sub_geom.initSecondaryUVDataOpacity( false, sdAtom.atom_limit ); // Brigtness, due to lighting. Negative values will mean voxel is deep inside and should not be rendered at all

			for ( var i = 3; i < rgba.length; i += 4 )
			rgba[ i ] = 0;

			sub_geom.updateVertexDataTyped( vertices );
			sub_geom.updateRGBADataTyped( rgba );
			sub_geom.updateSecondaryUVDataTyped( uvs2 );

			sdAtom.sub_geom = sub_geom;
			sdAtom.vertices = vertices;
			sdAtom.rgba = rgba;
			sdAtom.uvs2 = uvs2;

			sdAtom.mesh = new THREE.Points( sub_geom, sdAtom.material );
			sdAtom.mesh.frustumCulled = false;

			if ( sdAtom.mesh.parent !== main.scene )
			main.scene.add( sdAtom.mesh );
		}
		
		
		if ( main.isWinter )
		{
			sdAtom.snow_particles = [];
			sdAtom.snow_particles_last_trace = [];
			for ( var i = 0; i < main.level_chunks_x * main.level_chunks_z * main.chunk_size * main.chunk_size * 0.1; i++ )
			{
				var v = new THREE.Vector3( Math.random() * ( main.level_chunks_x * main.chunk_size + sdAtom.snow_particles_xyz_addition * 2 ) - sdAtom.snow_particles_xyz_addition,
										   Math.random() * ( main.level_chunks_y * main.chunk_size + sdAtom.snow_particles_xyz_addition ),
										   Math.random() * ( main.level_chunks_z * main.chunk_size + sdAtom.snow_particles_xyz_addition * 2 ) - sdAtom.snow_particles_xyz_addition );
				var v2 = new THREE.Vector3( v.x, v.y, v.z );
				
				sdAtom.snow_particles.push( v );
				sdAtom.snow_particles_last_trace.push( v2 );
			}
		}
	}
	
	clone()
	{
		var a = new sdAtom( this.x, this.y, this.z, this.r, this.g, this.b, this.material, this.model_x, this.model_y, this.model_z, this.parent, this.glowing );
		sdAtom.atoms.push( a );
		return a;
	}
	constructor( x, y, z, r, g, b, material, model_x, model_y, model_z, parent, glowing )
	{
		this.removed = false;
		
		this.x = this.lx = x;
		this.y = this.ly = y;
		this.z = this.lz = z;
		
		// Where it will show up on model 
		this.model_x = model_x;
		this.model_y = model_y;
		this.model_z = model_z;
		
		this.tox = 0;
		this.toy = 0;
		this.toz = 0;
		
		this.r = r;
		this.g = g;
		this.b = b;
		
		this.hp = sdAtom.atom_hp; // Used only to hide atoms due to shots & splash damage
		
		this.r_initial = r;
		this.g_initial = g;
		this.b_initial = b;
		
		this.sleep_tim = 0; // 0 means awake. 1 means sleeps
		
		this.visible = true; // Used only for FPS mode
		
		this.bleed_timer = 0; // Above zero will mean bleeding from time to time
		
		this.parent = parent;
		
		this.material = material;
		this.material_initial = material;
		
		this.temp_grav_disable_tim = 0;
		
		this.my_chains = [];
		this.my_chains_initial_length = 0;
		
		this.glowing = glowing; // Added brightness
		this.glowing_initial = glowing; // Added brightness
	}
	
	remove()
	{
		if ( !this.removed )
		{
			this.removed = true;

			for ( var i = 0; i < this.my_chains.length; i++ )
			this.my_chains[ i ].remove();
		}
	}
	
	AddSpeedPosFrictionFractal( bx, by, bz, x, y, z, fx, fy, fz, GSPEED ) // Only for collisions with world
	{
		for ( var i = 0; i < this.my_chains.length; i++ )
		{
			var c = this.my_chains[ i ];
			
			if ( c.removed )
			continue;
			
			if ( !c.in_limb )
			continue;

			var other = ( c.a === this ) ? c.b : c.a;

			if ( bx !== 0 )
			other.tox = Math.abs( other.tox ) * bx;
			if ( by !== 0 )
			other.toy = Math.abs( other.toy ) * by;
			if ( bz !== 0 )
			other.toz = Math.abs( other.toz ) * bz;

			other.x += x;
			other.y += y;
			other.z += z;

			other.tox = main.MorphWithTimeScale( other.tox, 0, fx, GSPEED );
			other.toy = main.MorphWithTimeScale( other.toy, 0, fy, GSPEED );
			other.toz = main.MorphWithTimeScale( other.toz, 0, fz, GSPEED );
			
			if ( by > 0 )
			other.temp_grav_disable_tim = 0;
		}
		
		if ( bx !== 0 )
		this.tox = Math.abs( this.tox ) * by;
		if ( by !== 0 )
		this.toy = Math.abs( this.toy ) * by;
		if ( bz !== 0 )
		this.toz = Math.abs( this.toz ) * by;
			
		this.x += x;
		this.y += y;
		this.z += z;

		this.tox = main.MorphWithTimeScale( this.tox, 0, fx, GSPEED );
		this.toy = main.MorphWithTimeScale( this.toy, 0, fy, GSPEED );
		this.toz = main.MorphWithTimeScale( this.toz, 0, fz, GSPEED );
			
		if ( by > 0 )
		this.temp_grav_disable_tim = 0;
	}
	
	WakeUp()
	{
		this.sleep_tim = 0;
	}
	
	static ThinkNow( GSPEED )
	{
		var point = 0;
		
		var sub_geom = sdAtom.sub_geom;
		
		var vertices = sdAtom.vertices;
		var rgba = sdAtom.rgba;
		var uvs2 = sdAtom.uvs2;
		
		var steps = Math.ceil( GSPEED / 2.5 );
		var GSPEED_old = GSPEED;
		
		
		//if ( main.low_physics === 1 )
		steps = 1;
	
		const sdAtom_MATERIAL_ALIVE_PLAYER_GUN = sdAtom.MATERIAL_ALIVE_PLAYER_GUN;
		
		for ( var step = 0; step < steps; step++ )
		{
			let GSPEED = GSPEED_old / steps;
			
			if ( main.mobile )
			{
				step = steps; // Just skip everything to prevent lag
			}

			if ( main.low_physics === 0 )
			{
				const chains = sdChain.chains;

				var i = 0;
				var len = chains.length;

				//for ( var i = 0; i < sdChain.chains.length; i++ )
				while ( i < len ) // Faster by almost a 1/3
				{
					var ch = chains[ i ];

					var a = ch.a;

					if ( a.material > sdAtom_MATERIAL_ALIVE_PLAYER_GUN )
					{
						if ( !ch.removed )
						{
							var b = ch.b;

							if ( a.sleep_tim < 1 || b.sleep_tim < 1 )
							{
								a.sleep_tim = b.sleep_tim = Math.min( a.sleep_tim, b.sleep_tim );

								var target_di = ch.def;

								var di = main.Dist3D( a.x, a.y, a.z, b.x, b.y, b.z );

								var dx = b.x - a.x;
								var dy = b.y - a.y;
								var dz = b.z - a.z;

								if ( di > 0 )
								{
									dx /= di;
									dy /= di;
									dz /= di;

									if ( ch.in_limb )
									//if ( di > target_di + 2 * GSPEED )
									//if ( di > target_di + 2 + 2 * GSPEED )
									if ( di > target_di + 8 )
									{
										sdBullet.DrawSingleAtomDamage( ch.a );
										sdBullet.DrawSingleAtomDamage( ch.b );
										ch.remove();
										i--;
										len--;
										continue;
									}
								}

								a.temp_grav_disable_tim = b.temp_grav_disable_tim = Math.min( a.temp_grav_disable_tim, b.temp_grav_disable_tim );

								if ( di > 0.1 )
								{
									var cx = ( a.x + b.x ) / 2;
									var cy = ( a.y + b.y ) / 2;
									var cz = ( a.z + b.z ) / 2;

									var power = 0.25;
									var power_pos = 0.5;
									/*
									var xx = ( cx - dx * target_di * 0.5 - a.x );
									var yy = ( cy - dy * target_di * 0.5 - a.y );
									var zz = ( cz - dz * target_di * 0.5 - a.z );
									*/
									var xx = ( cx - a.x ) / di * ( di - target_di );
									var yy = ( cy - a.y ) / di * ( di - target_di );
									var zz = ( cz - a.z ) / di * ( di - target_di );

									a.tox += xx * power;
									a.toy += yy * power;
									a.toz += zz * power;

									b.tox -= xx * power;
									b.toy -= yy * power;
									b.toz -= zz * power;

									a.x += xx * power_pos;
									a.y += yy * power_pos;
									a.z += zz * power_pos;

									b.x -= xx * power_pos;
									b.y -= yy * power_pos;
									b.z -= zz * power_pos;
								}
							}
						}
					}

					i++;
				}
			}

			for ( var i = 0; i < sdAtom.atoms.length; i++ )
			{
				var a = sdAtom.atoms[ i ];

				if ( a.removed )
				continue;

				// Always update for accurate atom-bullet collisions
				if ( step === 0 )
				{
					a.lx = a.x;
					a.ly = a.y;
					a.lz = a.z;
				}

				//if ( a.material > sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
				if ( a.parent.stability < 1 || a.material > sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
				{
					if ( a.parent.hea <= 0 )
					{
						/*if ( a.y < main.world_end_y )
						{
							a.remove();
							i--;
							continue;
						}*/
						var c = a;
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

									c.tox = main.MorphWithTimeScale( c.tox, 0, 0.7, GSPEED );
									c.toy = main.MorphWithTimeScale( c.toy, 0, 0.7, GSPEED );
									c.toz = main.MorphWithTimeScale( c.toz, 0, 0.7, GSPEED );

									c.toy += 1 * GSPEED;

									c.tox += ( 1 ) * dx * GSPEED;
									c.toz += ( 1 ) * dz * GSPEED;
								}
							}
						}
					}

					if ( a.sleep_tim < 1 )
					{
						if ( Math.pow( a.tox, 2 ) + Math.pow( a.toy, 2 ) + Math.pow( a.toz, 2 ) < 0.25 )
						{
							a.sleep_tim += GSPEED * 0.01;
						}
						else
						{
							a.sleep_tim = 0;
						}

						var tx = a.x + a.tox * GSPEED;
						var ty = a.y + a.toy * GSPEED;
						var tz = a.z + a.toz * GSPEED;

						var y_offset = 1;

						var morph = main.TraceLine( a.x, a.y - y_offset, a.z, tx, ty - y_offset, tz, null, 1, 0 );

						if ( morph === 1 )
						{
							a.x = tx;
							a.y = ty;
							a.z = tz;

							if ( a.temp_grav_disable_tim < 1 )
							a.temp_grav_disable_tim = Math.min( 1, a.temp_grav_disable_tim + GSPEED * 0.15 );

							if ( a.temp_grav_disable_tim >= 0 )
							a.toy -= GSPEED * 0.1 * a.temp_grav_disable_tim;
						}
						else
						{
							var translate = 1;
							
							//var hit_power = main.Dist3D( 0,0,0, a.tox, a.toy, a.toz );
							//if ( hit_power > 3 )
							//sdSound.PlaySound({ sound: lib.player_step, position: new THREE.Vector3( a.x, a.y, a.z ), volume: Math.min( 1, hit_power * 0.25 ) });

							if ( main.TraceLine( a.x, a.y + y_offset + translate, a.z, 
												 a.x, a.y + y_offset + translate, a.z, null, 1, 0 ) === 1 )
							{
								a.toy = Math.abs( a.toy * 0.2 );
								a.tox *= 0.9;
								a.toz *= 0.9;
										
								a.temp_grav_disable_tim = 0;
							}
							else
							if ( main.TraceLine( a.x + y_offset + translate, a.y, a.z, 
												 a.x + y_offset + translate, a.y, a.z, null, 1, 0 ) === 1 )
							{
								a.tox = Math.abs( a.tox * 0.2 );
								a.toy *= 0.9;
								a.toz *= 0.9;
							}
							else
							if ( main.TraceLine( a.x - y_offset - translate, a.y, a.z, 
												 a.x - y_offset - translate, a.y, a.z, null, 1, 0 ) === 1 )
							{
								a.tox = -Math.abs( a.tox * 0.5 );
								a.toy *= 0.9;
								a.toz *= 0.9;
							}
							else
							if ( main.TraceLine( a.x, a.y, a.z + y_offset + translate, 
												 a.x, a.y, a.z + y_offset + translate, null, 1, 0 ) === 1 )
							{
								a.toz = Math.abs( a.toz * 0.2 );
								a.toy *= 0.9;
								a.tox *= 0.9;
							}
							else
							if ( main.TraceLine( a.x, a.y, a.z - y_offset - translate, 
												 a.x, a.y, a.z - y_offset - translate, null, 1, 0 ) === 1 )
							{
								a.toz = -Math.abs( a.toz * 0.2 );
								a.toy *= 0.9;
								a.tox *= 0.9;
							}
							else
							{
								/*a.x -= a.tox;
								a.y -= a.toy;
								a.z -= a.toz;*/
								a.tox *= 0.5;
								a.toy *= 0.5;
								a.toz *= 0.5;
										/*
								a.x -= a.tox;
								a.y -= a.toy;
								a.z -= a.toz;
								
								a.tox = - a.tox * 0.5;
								a.toy = - a.toy * 0.5;
								a.toz = - a.toz * 0.5;*/
							}
						}
					}
				}

				if ( a.visible ) // If it is not visible, simply skip
				{
					vertices[ point * 3     ] = a.x;
					vertices[ point * 3 + 1 ] = a.y;
					vertices[ point * 3 + 2 ] = a.z;

					rgba[ point * 4     ] = a.r;
					rgba[ point * 4 + 1 ] = a.g;
					rgba[ point * 4 + 2 ] = a.b;
					rgba[ point * 4 + 3 ] = 1;

					if ( a.glowing > 0 )
					uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z ) + a.glowing;
					else
					if ( a.glowing < 0 )
					uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z ) / ( 1 - a.glowing );
					else
					uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z );

					point++;

					if ( a.bleed_timer > 0 )
					{
						var old_val = a.bleed_timer;

						a.bleed_timer -= GSPEED * 0.1;

						if ( ~~( a.bleed_timer ) !== ~~old_val )
						{
							sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, x:a.x, y:a.y, z:a.z, tox:a.tox, toy:a.toy, toz:a.toz });
						}
					}
				}
			}

		} // steps
		
		for ( var i = 0; i < sdAtom.pseudo_atoms.length; i++ )
		{
			var a = sdAtom.pseudo_atoms[ i ];
			
			if ( a.ttl <= 0 )
			{
				for ( var more = 1; more < sdAtom.pseudo_atoms.length - i; more++ )
				if ( sdAtom.pseudo_atoms[ i + more ].ttl > 0 )
				break;
				
				sdAtom.pseudo_atoms.splice( i, more );
				i--;
				continue;
			}
			
			vertices[ point * 3     ] = a.x;
			vertices[ point * 3 + 1 ] = a.y;
			vertices[ point * 3 + 2 ] = a.z;

			rgba[ point * 4     ] = a.r;
			rgba[ point * 4 + 1 ] = a.g;
			rgba[ point * 4 + 2 ] = a.b;
			rgba[ point * 4 + 3 ] = a.ttl / sdAtom.pseudo_atoms_ttl_max;

			//uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z );
			if ( a.glowing > 0 )
			uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z ) + a.glowing;
			else
			if ( a.glowing < 0 )
			uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z ) / ( 1 - a.glowing );
			else
			uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z );


			point++;
			
			a.toy -= 0.01 * GSPEED * a.ttl / sdAtom.pseudo_atoms_ttl_max;
			
			a.x += a.tox * GSPEED;
			a.y += a.toy * GSPEED;
			a.z += a.toz * GSPEED;
			
			a.tox = main.MorphWithTimeScale( a.tox, 0, 0.9, GSPEED );
			a.toy = main.MorphWithTimeScale( a.toy, 0, 0.9, GSPEED );
			a.toz = main.MorphWithTimeScale( a.toz, 0, 0.9, GSPEED );
			
			
			a.r = main.MorphWithTimeScale( a.r, 0, 0.9, GSPEED );
			a.g = main.MorphWithTimeScale( a.g, 0, 0.9, GSPEED );
			a.b = main.MorphWithTimeScale( a.b, 0, 0.9, GSPEED );
			/*a.r += 0.01 * GSPEED;
			a.g += 0.05 * GSPEED;
			a.b += 0.04 * GSPEED;*/
			
			a.ttl -= GSPEED;
			
		}
		
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		{
			var c = sdCharacter.characters[ i ];
				
			if ( sdCharacter.characters[ i ].hook_enabled )
			{
				var di = main.Dist3D( c.x, c.y + 3, c.z, c.hook_pos.x, c.hook_pos.y, c.hook_pos.z ) * 4;

				if ( di > 1 )
				for ( var i2 = 0; i2 < di; i2++ )
				{
					var morph = i2 / di;

					vertices[ point * 3     ] = c.x * morph + c.hook_pos.x * ( 1 - morph );
					vertices[ point * 3 + 1 ] = ( c.y + 3 ) * morph + c.hook_pos.y * ( 1 - morph );
					vertices[ point * 3 + 2 ] = c.z * morph + c.hook_pos.z * ( 1 - morph );

					rgba[ point * 4     ] = ( i2 % 4 < 2 ) ? 0.2 : 0.1;
					rgba[ point * 4 + 1 ] = ( i2 % 4 < 2 ) ? 0.2 : 0.1;
					rgba[ point * 4 + 2 ] = ( i2 % 4 < 2 ) ? 0.2 : 0.1;

					rgba[ point * 4 + 3 ] = ( i2 % 4 < 2 ) ? 0.5 : 0.4; // Scale

					uvs2[ point ] = main.GetEntityBrightness( vertices[ point * 3     ], vertices[ point * 3 + 1 ], vertices[ point * 3 + 2 ] );

					point++;
				}
			}
			
			if ( c.muzzle_a > 0 )
			if ( c.cur_weapon_object.gun_class.has_muzzle_flash )
			{
				var visual = c.cur_weapon_mesh.children[ 0 ].getWorldPosition();

				for ( var f = 0; f < 16; f++ )
				{
					var intens = 1 - Math.pow( 1 - f / 16, 2 );
					
					// Muzzle flash?
					vertices[ point * 3     ] = visual.x - c.look_direction.x * c.muzzle_a * intens * 12 / 2 * 1.5;
					vertices[ point * 3 + 1 ] = visual.y - c.look_direction.y * c.muzzle_a * intens * 12 / 2 * 1.5;
					vertices[ point * 3 + 2 ] = visual.z - c.look_direction.z * c.muzzle_a * intens * 12 / 2 * 1.5;

					rgba[ point * 4     ] = c.muzzle_r;
					rgba[ point * 4 + 1 ] = c.muzzle_g;
					rgba[ point * 4 + 2 ] = c.muzzle_b;

					rgba[ point * 4 + 3 ] = 1.5 * c.muzzle_a * ( 1 - intens ); // Scale

					uvs2[ point ] = 1;

					point++;
				}
			}
		}
		
		for ( var i = 0; i < sdBullet.bullets.length; i++ )
		{
			var b = sdBullet.bullets[ i ];
			
			if ( b.is_melee )
			continue;
			
			if ( b.is_sniper )
			continue;
			
			var length;
			
			var bx = b.x;
			var by = b.y;
			var bz = b.z;
			
			if ( b.visual_intens > 0 )
			{
				bx = bx * ( 1 - b.visual_intens ) + b.visual_x * ( b.visual_intens );
				by = by * ( 1 - b.visual_intens ) + b.visual_y * ( b.visual_intens );
				bz = bz * ( 1 - b.visual_intens ) + b.visual_z * ( b.visual_intens );
				
				//b.visual_intens -= GSPEED * 0.5 * b.visual_intens;
				b.visual_intens -= GSPEED * b.visual_intens * Math.min( 1, main.Dist3D( b.x, b.y, b.z, b.owner.x, b.owner.y, b.owner.z ) / 10 );
			}
			
			var dx = 0;
			var dy = 0;
			var dz = 0;
			
			var is_rocket = b.is_rocket;
			var is_plasma = b.is_plasma;
			
			if ( is_rocket || is_plasma )
			main.DrawDynamicLight( b.x, b.y, b.z, b.r, b.g, b.b );
			else
			main.DrawDynamicLight( b.x, b.y, b.z, b.r * 0.2, b.g * 0.2, b.b * 0.2 );
		
			if ( is_plasma )
			{
				dx = b.tox;
				dy = b.toy;
				dz = b.toz;
				
				length = 6;
			}
			else
			if ( is_rocket )
			{
				dx = b.dx;
				dy = b.dy;
				dz = b.dz;
				
				length = 4;
			}
			else
			{
				dx = b.tox - main.speed.x;
				dy = b.toy - main.speed.y;
				dz = b.toz - main.speed.z;
				
				length = 10; // 6
			}

			var di = Math.sqrt( main.Dist3D_Vector_pow2( dx, dy, dz ) ) / length;
			if ( di > 0.001 )
			{
				dx /= di;
				dy /= di;
				dz /= di;
			}
			
			// More iterations for nearby bullets
			if ( !is_plasma && !is_rocket )
			if ( main.Dist3D( main.main_camera.position.x, main.main_camera.position.y, main.main_camera.position.z, b.x, b.y, b.z ) < 32 )
			length = 50;
			
			for ( var i2 = 0; i2 <= length; i2 += sdAtom.atom_scale )
			{
				var morph = i2 / length;
				
				vertices[ point * 3     ] = bx + dx * morph;
				vertices[ point * 3 + 1 ] = by + dy * morph;
				vertices[ point * 3 + 2 ] = bz + dz * morph;

				rgba[ point * 4 + 3 ] = 1; // Scale
				if ( is_plasma )
				{
					rgba[ point * 4     ] = b.r * 2;
					rgba[ point * 4 + 1 ] = b.g * 2;
					rgba[ point * 4 + 2 ] = b.b * 2;
					uvs2[ point ] = 1;
				}
				else
				if ( is_rocket )
				{
					if ( i2 < 1 )
					{
						rgba[ point * 4     ] = 255 / 255 * 1.5;
						rgba[ point * 4 + 1 ] = 251 / 255 * 1.5;
						rgba[ point * 4 + 2 ] = 192 / 255 * 1.5;
						uvs2[ point ] = 1;
						
						if ( i2 === 0 )
						rgba[ point * 4 + 3 ] = 0.5; // Scale
						if ( i2 === 0.5 )
						rgba[ point * 4 + 3 ] = 0.7; // Scale
					}
					else
					if ( i2 === 1 )
					{
						rgba[ point * 4     ] = 255 / 255 * 1.5;
						rgba[ point * 4 + 1 ] = 251 / 255 * 1.5;
						rgba[ point * 4 + 2 ] = 192 / 255 * 1.5;
						uvs2[ point ] = 1;
						
						rgba[ point * 4 + 3 ] = 0.75; // Scale
					}
					else
					{
						rgba[ point * 4     ] = 0.3;
						rgba[ point * 4 + 1 ] = 0.3;
						rgba[ point * 4 + 2 ] = 0.3;
						uvs2[ point ] = main.GetEntityBrightness( vertices[ point * 3     ], vertices[ point * 3 + 1 ], vertices[ point * 3 + 2 ] );
						
						rgba[ point * 4 + 3 ] = 1 - Math.pow( i2 / length, 6 ); // Scale
					}
				}
				else
				{
					rgba[ point * 4     ] = b.r;
					rgba[ point * 4 + 1 ] = b.g;
					rgba[ point * 4 + 2 ] = b.b;
					uvs2[ point ] = 1;
					
					rgba[ point * 4 + 3 ] = 0.4; // Scale
				}

				
				point++;
			}
		}
		
		for ( var i = 0; i < sdAtom.stars.length; i++ )
		{
			sdAtom.stars[ i ].time_offset = ( sdAtom.stars[ i ].time_offset + GSPEED * 0.02 ) % ( Math.PI * 2 ); // 0.01
			
			vertices[ point * 3     ] = sdAtom.stars[ i ].x + main.main_camera.position.x;
			vertices[ point * 3 + 1 ] = sdAtom.stars[ i ].y + main.main_camera.position.y;
			vertices[ point * 3 + 2 ] = sdAtom.stars[ i ].z + main.main_camera.position.z;

			rgba[ point * 4     ] = main.fog_color_color.r + 0.8 + Math.sin( sdAtom.stars[ i ].time_offset ) * 0.4; // 0.4 0.2
			rgba[ point * 4 + 1 ] = main.fog_color_color.g + 0.8 + Math.sin( sdAtom.stars[ i ].time_offset ) * 0.4;
			rgba[ point * 4 + 2 ] = main.fog_color_color.b + 0.8 + Math.sin( sdAtom.stars[ i ].time_offset ) * 0.4;
			rgba[ point * 4 + 3 ] = 1;
			uvs2[ point ] = 1;
			
			point++;
		}
		
		if ( sdAtom.snow_particles !== null )
		{
			var particles_to_check = 50;
			
			sdAtom.snow_particles_tested_i = ( sdAtom.snow_particles_tested_i + particles_to_check ) % sdAtom.snow_particles.length;
			
			var av_br = ( main.fog_color_color.r + main.fog_color_color.g + main.fog_color_color.b ) / 3;
			
			var max_height = main.level_chunks_y * main.chunk_size + sdAtom.snow_particles_xyz_addition;
			for ( var i = 0; i < sdAtom.snow_particles.length; i++ )
			{
				sdAtom.snow_particles[ i ].y -= GSPEED * 0.1;
				
				var trace_result = true;
				
				var is_tested = ( i >= sdAtom.snow_particles_tested_i && i < sdAtom.snow_particles_tested_i + particles_to_check );
				
				if ( is_tested )
				{
					trace_result = main.TraceLine(  sdAtom.snow_particles[ i ].x,
													sdAtom.snow_particles[ i ].y,
													sdAtom.snow_particles[ i ].z, 
													sdAtom.snow_particles_last_trace[ i ].x,
													sdAtom.snow_particles_last_trace[ i ].y,
													sdAtom.snow_particles_last_trace[ i ].z, null, 1, 0 );
				}
				
				if ( sdAtom.snow_particles[ i ].y < 0 || !trace_result )
				{
					sdAtom.snow_particles[ i ].y += max_height;
					
					is_tested = true;
				}

				if ( is_tested )
				{
					sdAtom.snow_particles_last_trace[ i ].x = sdAtom.snow_particles[ i ].x;
					sdAtom.snow_particles_last_trace[ i ].y = sdAtom.snow_particles[ i ].y;
					sdAtom.snow_particles_last_trace[ i ].z = sdAtom.snow_particles[ i ].z;
				}
				
				vertices[ point * 3     ] = sdAtom.snow_particles[ i ].x + Math.sin( i * 0.1 ) * Math.sin( sdAtom.snow_particles[ i ].y );
				vertices[ point * 3 + 1 ] = sdAtom.snow_particles[ i ].y;
				vertices[ point * 3 + 2 ] = sdAtom.snow_particles[ i ].z + Math.sin( i * 0.1 ) * Math.cos( sdAtom.snow_particles[ i ].y );

				rgba[ point * 4     ] = 1;// * av_br;
				rgba[ point * 4 + 1 ] = 1;// * av_br;
				rgba[ point * 4 + 2 ] = 1;// * av_br;
				rgba[ point * 4 + 3 ] = 0.5;
				
				if ( main.Dist3D( sdAtom.snow_particles[ i ].x, sdAtom.snow_particles[ i ].y, sdAtom.snow_particles[ i ].z, main.main_camera.position.x, main.main_camera.position.y, main.main_camera.position.z ) > 64 )
				uvs2[ point ] = 1.5 * ( main.lightmap_ambient + main.lightmap_beam_power * 8 );
				else
				uvs2[ point ] = 1.5 * main.GetEntityBrightness( vertices[ point * 3     ], vertices[ point * 3 + 1 ], vertices[ point * 3 + 2 ] );

				point++;
			}
		}
		
		if ( main.my_character !== null )
		if ( main.my_character.cur_weapon_object.gun_class.is_build_tool )
		{
			//var gun_id = main.my_character.cur_weapon_mesh.gun_id;
			var c = main.my_character;
			
			var rad = main.my_character.cur_weapon_object.gun_class.splash_radius;
									
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
			
			rad = Math.round( rad );

			for ( var x = -rad+1; x < rad; x++ )
			for ( var y = -rad+1; y < rad; y++ )
			for ( var z = -rad+1; z < rad; z++ )
			{
				var di = main.Dist3D( 0,0,0, x,y,z );
				
				if ( di < rad )
				if ( di > rad - 1 )
				{
					var br = 1 - ( ( y * 0.5 + main.ticks_passed / 400 ) % 5 ) / 5;

					if ( br > 0.25 )
					{
						vertices[ point * 3     ] = new_x + x + 0.5;
						vertices[ point * 3 + 1 ] = new_y + y + 0.5;
						vertices[ point * 3 + 2 ] = new_z + z + 0.5;

						rgba[ point * 4     ] = 0.2 * br;
						rgba[ point * 4 + 1 ] = 1 * br;
						rgba[ point * 4 + 2 ] = 0.2 * br;
						rgba[ point * 4 + 3 ] = 2;
						uvs2[ point ] = 1;

						point++;
					}
				}
			}
		}
		
		var point2 = point;
		while ( point2 < sdAtom.last_point )
		{
			uvs2[ point2++ ] = -1;
		}
		sdAtom.last_point = point;
		
		sub_geom.updateVertexDataTyped( vertices );
		sub_geom.updateRGBADataTyped( rgba );
		sub_geom.updateSecondaryUVDataTyped( uvs2 );

	}
}

sdAtom.init_class();


class PseudoAtom
{
	constructor( atom )
	{
		this.x = atom.x;
		this.y = atom.y;
		this.z = atom.z;
		
		this.tox = atom.tox;
		this.toy = atom.toy;
		this.toz = atom.toz;
		
		this.r = atom.r;
		this.g = atom.g;
		this.b = atom.b;
		
		this.ttl = sdAtom.pseudo_atoms_ttl_max;
		
		this.glowing = atom.glowing;
	}
}