
/* global main, sdAtom, THREE, sdCharacter, sdSprite, sdSync, sdByteShifter, lib, sdSound */

class sdBullet
{
	static init_class()
	{
		sdBullet.bullets = [];
		
		sdBullet.ragdoll_knock_scale = 2; // Only bullets. explosions are not influenced
		
		sdBullet.local_peer_uid_counter = 0;
		
		sdBullet.melee_radius = 5;
		sdBullet.melee_range = 15;
	}
	static CreateBullet( params )
	{
		var b = new sdBullet( params );
		sdBullet.bullets.push( b );
		return b;
	}
	constructor( params )
	{
		this.x = params.x;
		this.y = params.y;
		this.z = params.z;
		
		this.lx = this.x;
		this.ly = this.y;
		this.lz = this.z;
		
		this.visual_x = params.visual_x || this.x;
		this.visual_y = params.visual_y || this.y;
		this.visual_z = params.visual_z || this.z;
		
		this.visual_intens = 1;
		
		this.tox = params.tox;
		this.toy = params.toy;
		this.toz = params.toz;
		
		this.knock_power = params.knock_power;
		
		this.hp_damage = params.hp_damage;
		this.hp_damage_head = params.hp_damage_head;
		
		this.owner = params.owner;
		
		if ( this.owner === null )
		{
			this.r = 1;
			this.g = 1;
			this.b = 0;
		}
		else
		{
			this.r = 1;
			this.g = 0;
			this.b = 0;

			sdCharacter.ApplyTeamColorToObject( this, this.owner.team );
			var color = new pb2HighRangeColor().setRGB( this.r + 0.25, this.g + 0.25, this.b + 0.25 );
			
			color.NormalizeAndGetMultiplier();
			
			color.multiply( 1.5 );
			
			this.r = color.r;
			this.g = color.g;
			this.b = color.b;
			
			/*
			this.r *= 0.75;
			this.g *= 0.75;
			this.b *= 0.75;
			this.r += 0.2;
			this.g += 0.2;
			this.b += 0.2;
			*/
		}
		
		this.r = 255 / 255 * 1.5;
		this.g = 251 / 255 * 1.5;
		this.b = 192 / 255 * 1.5;
		
		this.is_rocket = params.is_rocket || false;
		this.is_sniper = params.is_sniper || false;
		this.is_plasma = params.is_plasma || false;
		this.is_melee = params.is_melee || false;
		
		this.world_hits_allowed = this.is_sniper ? 3 : ( this.hp_damage >= 30 ? 2 : 1 );
		
		this.melee_time_to_live = 5;
		
		this.splash_radius = params.splash_radius;
		
		this.trail_spawn = 0;
		
		this.peer_removed = false; // Can be set to true, will mean bullet needs to be removed/exploded
		this.local_peer_uid = -1; // So other players know about which bullet peer is talking about
		
		// Motion vector, if is_rocket
		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.air_friction = 1;
		
		this.mesh = new THREE.Object3D(); // for sound
		main.scene.add( this.mesh );
		
		if ( this.is_rocket )
		{
			if ( this.is_plasma )
			{
				this.air_friction = 0.95;
				this.dy = -0.1;
				
				this.r = sdSprite.plas_r;
				this.g = sdSprite.plas_g;
				this.b = sdSprite.plas_b;
			}
			else
			{
				this.dx = params.dx;
				this.dy = params.dy;
				this.dz = params.dz;
				
				this.r = sdSprite.expl_r;
				this.g = sdSprite.expl_g;
				this.b = sdSprite.expl_b;

				this.air_friction = 0.95;

				sdSound.PlaySound({ sound: lib.rocket_attached_sound, parent_mesh: this.mesh, volume: 1 });
			}
		}
		else
		if ( this.is_sniper )
		{
			this.air_friction = 0.95;
			
			this.r = sdSprite.sniper_r;
			this.g = sdSprite.sniper_g;
			this.b = sdSprite.sniper_b;
		}
		else
		if ( this.is_melee )
		{
			this.air_friction = 1;
		}
		else
		{
			this.air_friction = 0.95;
			//this.dy = -0.05;
		}
	}
	remove()
	{
		main.scene.remove( this.mesh );
		this.mesh = null;
	}
	GiveLocalPeerUID()
	{
		this.local_peer_uid = sdBullet.local_peer_uid_counter++;
	}
	Update( GSPEED )
	{
		this.mesh.position.x = this.x;
		this.mesh.position.y = this.y;
		this.mesh.position.z = this.z;
		
		this.tox = main.MorphWithTimeScale( this.tox, 0, this.air_friction, GSPEED );
		this.toy = main.MorphWithTimeScale( this.toy, 0, this.air_friction, GSPEED );
		this.toz = main.MorphWithTimeScale( this.toz, 0, this.air_friction, GSPEED );
		
		this.tox += this.dx * GSPEED;
		this.toy += this.dy * GSPEED;
		this.toz += this.dz * GSPEED;
		
		
		var tx = this.x + this.tox * GSPEED;
		var ty = this.y + this.toy * GSPEED;
		var tz = this.z + this.toz * GSPEED;
		
		if ( this.is_melee )
		{
			this.x = this.owner.x;
			this.y = this.owner.y + sdCharacter.shoot_offset_y;
			this.z = this.owner.z;
			
			tx = this.x - this.owner.look_direction.x * sdBullet.melee_range;
			ty = this.y - this.owner.look_direction.y * sdBullet.melee_range;
			tz = this.z - this.owner.look_direction.z * sdBullet.melee_range;
			
			this.melee_time_to_live -= GSPEED;
			
			if ( this.owner.hea <= 0 )
			this.melee_time_to_live = 0;
		}
		
		var morph = main.TraceLine( this.x, this.y, this.z, tx, ty, tz, null, 0.5, 0 );
		
		if ( morph === 1 )
		{
			if ( !main.MP_mode || this.owner === main.my_character )
			{
				if ( this.DoEntityDamage( this.x, this.y, this.z, tx, ty, tz ) )
				return true;
			
				if ( this.is_melee )
				if ( this.melee_time_to_live <= 0 )
				return true;
			}
					
			this.visual_x += tx - this.x;
			this.visual_y += ty - this.y;
			this.visual_z += tz - this.z;
					
			this.x = tx;
			this.y = ty;
			this.z = tz;
		}
		else
		{
			tx = this.x * ( 1 - morph ) + tx * morph;
			ty = this.y * ( 1 - morph ) + ty * morph;
			tz = this.z * ( 1 - morph ) + tz * morph;
			
			if ( !main.MP_mode || this.owner === main.my_character )
			if ( this.DoEntityDamage( this.x, this.y, this.z, tx, ty, tz ) )
			return true;
		
			this.x = tx;
			this.y = ty;
			this.z = tz;
			
			if ( !main.MP_mode || this.owner === main.my_character )
			{
				if ( !this.is_rocket )
				{
					var vol = this.hp_damage / 30;
					
					sdSound.PlaySound({ sound: lib.wall_hit, position: new THREE.Vector3( tx, ty, tz ), volume: 1 * vol });
					
					if ( this.is_sniper )
					main.WorldPaintDamage( tx, ty, tz, 4.5 );
					else
					if ( this.is_melee )
					main.WorldPaintDamage( tx, ty, tz, 3.5 );
					else
					main.WorldPaintDamage( tx, ty, tz, 1.5 );
					
					sdSprite.CreateSprite({ type: this.is_sniper || this.is_melee ? sdSprite.TYPE_SNIPER_HIT : sdSprite.TYPE_SPARK, x:tx, y:ty, z:tz });
					
					sdSync.MP_SendEvent( sdSync.COMMAND_I_BULLET_HIT_WORLD, tx, ty, tz, this.is_sniper ? 1 : 0, vol );
				}
				
				this.world_hits_allowed--;
				if ( this.world_hits_allowed <= 0 )
				{
					return true;
				}
				else
				{
					this.hp_damage *= 0.666;
					this.hp_damage_head *= 0.666;
					this.tox *= 0.666;
					this.toy *= 0.666;
					this.toz *= 0.666;
					
				}
			}
		}
		
		if ( this.is_rocket && !this.is_plasma )
		{
			this.trail_spawn += GSPEED;
			//if ( this.trail_spawn > 2 )
			if ( this.trail_spawn > 1.5 )
			{
				this.trail_spawn = this.trail_spawn % 1.5;
				
				var bx = this.x;
				var by = this.y;
				var bz = this.z;
				
				if ( this.visual_intens > 0 )
				{
					bx = bx * ( 1 - this.visual_intens ) + this.visual_x * ( this.visual_intens );
					by = by * ( 1 - this.visual_intens ) + this.visual_y * ( this.visual_intens );
					bz = bz * ( 1 - this.visual_intens ) + this.visual_z * ( this.visual_intens );
				}

				sdSprite.CreateSprite({ type: sdSprite.TYPE_SMOKE, x:bx, y:by - 1, z:bz });
			}
		}
		else
		if ( this.is_sniper )
		{
			this.trail_spawn += GSPEED;
			//if ( this.trail_spawn > 0.5 )
			{
				this.trail_spawn = this.trail_spawn % 0.5;
				
				var bx = this.x;
				var by = this.y;
				var bz = this.z;
				/*
				if ( this.visual_intens > 0 )
				{
					bx = bx * ( 1 - this.visual_intens ) + this.visual_x * ( this.visual_intens );
					by = by * ( 1 - this.visual_intens ) + this.visual_y * ( this.visual_intens );
					bz = bz * ( 1 - this.visual_intens ) + this.visual_z * ( this.visual_intens );
				}*/

				sdSprite.CreateSprite({ type: sdSprite.TYPE_SNIPER_TRAIL, x:bx - this.tox * GSPEED * 0.666, y:by - this.toy * GSPEED * 0.666, z:bz - this.toz * GSPEED * 0.666 });
				sdSprite.CreateSprite({ type: sdSprite.TYPE_SNIPER_TRAIL, x:bx - this.tox * GSPEED * 0.333, y:by - this.toy * GSPEED * 0.333, z:bz - this.toz * GSPEED * 0.333 });
				sdSprite.CreateSprite({ type: sdSprite.TYPE_SNIPER_TRAIL, x:bx, y:by, z:bz });
			}
		}
		else
		if ( this.is_plasma )
		{
		}
		
		if ( !this.is_rocket && !this.is_plasma )
		{
			// Bullets and rails have damage decrease over time
			this.hp_damage = main.MorphWithTimeScale( this.hp_damage, 0, this.air_friction, GSPEED * 2 );
			this.hp_damage_head = main.MorphWithTimeScale( this.hp_damage_head, 0, this.air_friction, GSPEED * 2 );
			
			if ( !main.MP_mode || this.owner === main.my_character )
			if ( this.hp_damage < 0.5 || this.hp_damage_head < 0.5 )
			{
				return true;
			}
		}
		
		if ( main.MP_mode && this.owner !== main.my_character )
		{
			if ( this.peer_removed )
			{
				return true;
			}
		}
		
		if ( !main.MP_mode || this.owner === main.my_character )
		{
			//if ( this.x < -main.world_end_xyz || this.x > main.level_chunks_x * main.chunk_size + main.world_end_xyz )
			//return true;
		
			if ( this.x < 0 || this.z < 0 || this.x > main.level_chunks_x * main.chunk_size || this.z > main.level_chunks_z * main.chunk_size )
			{
				var in_game_x = Math.max( 0, Math.min( this.x, main.level_chunks_x * main.chunk_size ) );
				var in_game_z = Math.max( 0, Math.min( this.z, main.level_chunks_z * main.chunk_size ) );

				var di_out = main.Dist3D( in_game_x, in_game_z, 0, this.x, this.z, 0 );

				if ( this.y < di_out )		
				while ( true ) // We need accurate position so enemies that run on the edge can be hit with splash damage. This is not accurate either by the way - we sould have backward move according to bullet velocity (that can lead into endless loop)
				{
					var di_out = main.Dist3D( in_game_x, in_game_z, 0, this.x, this.z, 0 );

					if ( this.y < di_out )
					{
						var dx = in_game_x - this.x;
						var dz = in_game_z - this.z;

						var di = main.Dist3D( dx, dz, 0, 0, 0, 0 );
						if ( di > 0.01 )
						{
							dx /= di;
							dz /= di;

							this.y += 1;
							this.x += ( 1 ) * dx;
							this.z += ( 1 ) * dz;
						}
						else
						return true;
					}
					else
					return true;
				}
			}
		
		
			if ( this.y < main.world_end_y || this.y > main.level_chunks_y * main.chunk_size + main.world_end_xyz )
			return true;
		
		
			//if ( this.z < -main.world_end_xyz || this.z > main.level_chunks_z * main.chunk_size + main.world_end_xyz )
			//return true;
		}
	
		this.lx = this.x;
		this.ly = this.y;
		this.lz = this.z;
		
		return false;
	}
	DoEntityDamage( fx, fy, fz, tx, ty, tz )
	{
		var impact_radius = sdAtom.atom_scale * 2; // Atom's radius + bullet's radius
		var impact_radius_guns = sdAtom.atom_scale; // Should be always smaller than above or else bounds won't work properly
		
		if ( this.is_melee )
		{
			impact_radius += sdBullet.melee_radius;
		}
		else
		if ( main.mobile )
		impact_radius += 5;
		
		var impact_radius_pow2 = impact_radius * impact_radius;
		var impact_radius_guns_pow2 = impact_radius_guns * impact_radius_guns;
		
		var best_hit = null;
		var best_hit_i = -1;
		var best_hit_morph = 2;
		
		for ( var i = 0; i < sdAtom.atoms.length; i++ )
		{
			var a = sdAtom.atoms[ i ];
			
			if ( Math.max( fx, tx ) + impact_radius < Math.min( a.x, a.lx ) )
			continue;
		
			if ( Math.min( fx, tx ) - impact_radius > Math.max( a.x, a.lx ) )
			continue;
		
			if ( Math.max( fz, tz ) + impact_radius < Math.min( a.z, a.lz ) )
			continue;
		
			if ( Math.min( fz, tz ) - impact_radius > Math.max( a.z, a.lz ) )
			continue;
		
			if ( Math.max( fy, ty ) + impact_radius < Math.min( a.y, a.ly ) )
			continue;
		
			if ( Math.min( fy, ty ) - impact_radius > Math.max( a.y, a.ly ) )
			continue;
		
			if ( a.parent === this.owner )
			continue;
		
			//if ( a.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
			//continue;
			
			if ( a.removed )
			continue;
		
			var di_path_bullet = Math.sqrt( Math.pow( fx-tx, 2 ) + Math.pow( fy-ty, 2 ) + Math.pow( fz-tz, 2 ) );
			var di_path_atom = Math.sqrt( Math.pow( a.x-a.lx, 2 ) + Math.pow( a.y-a.ly, 2 ) + Math.pow( a.z-a.lz, 2 ) );
		
			var steps = Math.max( di_path_bullet, di_path_atom ) / impact_radius;
			
			if ( steps > 100 )
			steps = 100;
			
			for ( var i2 = 0; i2 <= steps; i2++ )
			{
				var morph = i2 / steps;
				
				var bx = tx * morph + fx * ( 1 - morph );
				var by = ty * morph + fy * ( 1 - morph );
				var bz = tz * morph + fz * ( 1 - morph );
				
				var ax = a.x * morph + a.lx * ( 1 - morph );
				var ay = a.y * morph + a.ly * ( 1 - morph );
				var az = a.z * morph + a.lz * ( 1 - morph );
				
				if ( main.Dist3D_Vector_pow2( bx-ax, by-ay, bz-az ) <= impact_radius_pow2 )
				{
					if ( a.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
					{
						if ( main.Dist3D_Vector_pow2( bx-ax, by-ay, bz-az ) > impact_radius_guns_pow2 )
						continue;
					}
					
					if ( best_hit_morph > morph )
					{
						
						if ( this.is_melee )
						{
							if ( main.Dist3D( this.owner.x, this.owner.y + sdCharacter.shoot_offset_y, this.owner.z, a.x, a.y, a.z ) > sdBullet.melee_range )
							continue;
						}
						
						best_hit = a;
						best_hit_i = i;
						best_hit_morph = morph;
					}
					break;
				}
			}
		}
		
		if ( best_hit !== null )
		{
			var hp_damage = sdByteShifter.approx( this.hp_damage );
			var hp_damage_head = sdByteShifter.approx( this.hp_damage_head );
			
			// Send this before damage applied, so sdCharacter.hea > 0 and thus damage sent and not ignored
			if ( main.MP_mode )
			if ( best_hit.parent.hea > 0 ) // Almost Copy [ 1 / 2 ] Do not hit dead players or else damage may happen after respawn
			{
				sdSync.MP_SendEvent( 
					sdSync.COMMAND_I_DIRECT_HIT_ATOM, 
					best_hit_i, 
					this.tox * this.knock_power * ( this.is_rocket ? 0.5 : 1 ), 
					this.toy * this.knock_power * ( this.is_rocket ? 0.5 : 1 ), 
					this.toz * this.knock_power * ( this.is_rocket ? 0.5 : 1 ),
					this.local_peer_uid,
					hp_damage,
					hp_damage_head
				);
			}
			
			sdBullet.DrawPlayerDamageAround( best_hit, 
				this.tox * this.knock_power * ( this.is_rocket ? 0.5 : 1 ), 
				this.toy * this.knock_power * ( this.is_rocket ? 0.5 : 1 ), 
				this.toz * this.knock_power * ( this.is_rocket ? 0.5 : 1 ), 
			this, hp_damage, hp_damage_head );
			
			// Move bullet where it will possibly explode
			this.x = tx * best_hit_morph + fx * ( 1 - best_hit_morph );
			this.y = ty * best_hit_morph + fy * ( 1 - best_hit_morph );
			this.z = tz * best_hit_morph + fz * ( 1 - best_hit_morph );
			return true; // detonation
		}
		
		return false;
	}
	static DrawPlayerDamageAround( t, tox, toy, toz, bullet, hp_damage=null, hp_damage_head=null ) // Last 2 params are usually more accurate values of damage
	{
		t.parent.tox += tox;
		t.parent.toy += toy;
		t.parent.toz += toz;
		
		if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN || t.material === sdAtom.MATERIAL_GIB_GUN )
		{
			sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK, x:t.x, y:t.y, z:t.z, tox:(tox+t.tox)/2, toy:(toy+t.toy)/2, toz:(toz+t.toz)/2 });
			
			sdSound.PlaySound({ sound: lib.blocked_damage, position: new THREE.Vector3( t.x, t.y, t.z ), volume: Math.min( 4, hp_damage / 50 ) });
		}
		else
		{
			//sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, x:t.x, y:t.y, z:t.z, tox:(tox+t.tox)/2, toy:(toy+t.toy)/2, toz:(toz+t.toz)/2 }); Moved lower
		}
	
		if ( bullet.is_sniper )
		{
			sdSprite.CreateSprite({ type: sdSprite.TYPE_SNIPER_HIT, x:t.x, y:t.y, z:t.z, tox:0, toy:0, toz:0 });
		}
		
		var hit_radius = 2;
		var hit_radius_pow2 = hit_radius * hit_radius;
		
		var damage_done = 0;
		
		var ragdoll_damage_done = 0;
		
		if ( bullet !== null )
		{
			var dmg = 0;
			
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER )
			{
				dmg = hp_damage;
				//dmg = bullet.hp_damage;
			}
			else
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_HEAD )
			{
				dmg = hp_damage_head;
				//dmg = bullet.hp_damage_head;
				
				//if ( bullet.owner === main.my_character )
				//sdSound.PlaySound({ sound: lib.headshot, position:new THREE.Vector3(t.x,t.y,t.z), volume: 5 / 180 * hp_damage_head });
			}
			else
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
			{
				dmg = sdByteShifter.approx( hp_damage * 0.1 );
			}
			
			if ( t.material === sdAtom.MATERIAL_GIB )
			ragdoll_damage_done = hp_damage * sdAtom.atom_hp_damage_scale_bullets;
	
			if ( dmg !== sdByteShifter.approx( dmg ) )
			throw new Error('Possible desync');
		
			//dmg = sdByteShifter.approx( dmg );
			
			
			
			var simulated_damage = 0;
			// Do this before DealDamage because that method will convert everything into gibs
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER )
			simulated_damage = hp_damage;
			else
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_HEAD )
			simulated_damage = hp_damage_head;
			else
			if ( t.material === sdAtom.MATERIAL_GIB )
			simulated_damage = hp_damage * 0.5;
	
	
			
			if ( dmg > 0 )
			{	
				t.parent.DealDamage( dmg, bullet.owner, t.x, t.y, t.z );

				damage_done = dmg * sdAtom.atom_hp_damage_scale_bullets;
			}
			
			if ( simulated_damage > 0 )
			{
				sdSound.PlaySound({ sound: lib.headshot, position:new THREE.Vector3(t.x,t.y,t.z), volume: 7 / 140 * Math.min( 140, simulated_damage ) });
				
				var parts = simulated_damage / 4;
				for ( var i = 0; i < parts; i++ )
				{
					var r = new THREE.Vector3();
					main.SetAsRandom3D( r );

					var rr = Math.random() * simulated_damage / 100;

					var d = Math.random() - 0.5;
					sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, x:t.x, y:t.y, z:t.z, 
						tox:(tox*d+t.tox)/2 + r.x * rr, 
						toy:(toy*d+t.toy)/2 + r.y * rr, 
						toz:(toz*d+t.toz)/2 + r.z * rr });
					
					// Paint the melee weapon in red?
					if ( bullet.is_melee )
					{
						var morph = 0.1;

						var a = bullet.owner.atoms[ sdCharacter.ATOMS_SAW ][ ~~( Math.random() * bullet.owner.atoms[ sdCharacter.ATOMS_SAW ].length ) ];

						a.r = Math.max( 0, a.r * ( 1 - morph * 0.75 ) );
						a.g = Math.max( 0, a.g * ( 1 - morph * 2 ) );
						a.b = Math.max( 0, a.b * ( 1 - morph * 2 ) );
						a.glowing *= ( 1 - morph * 0.75 ) ;
					}
				}
			}
		}
		
		
		
		for ( var i = 0; i < sdAtom.atoms.length; i++ )
		{
			var a = sdAtom.atoms[ i ];
			
			if ( a.parent !== t.parent )
			continue;
		
			if ( a.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
			continue;
			
			if ( a.removed )
			continue;
			
			var di_pow2 = main.Dist3D_Vector_pow2( t.x-a.x, t.y-a.y, t.z-a.z );
			
			if ( di_pow2 < hit_radius_pow2 )
			{
				a.WakeUp();
				a.tox += tox * sdBullet.ragdoll_knock_scale;
				a.toy += toy * sdBullet.ragdoll_knock_scale;
				a.toz += toz * sdBullet.ragdoll_knock_scale;
		
				if ( a.material !== sdAtom.MATERIAL_GIB_GUN )
				{
					var di = Math.sqrt( di_pow2 );

					var morph = Math.pow( 1 - di / hit_radius, 1 ); // 2

					a.r = Math.max( 0, a.r * ( 1 - morph * 0.75 ) );
					a.g = Math.max( 0, a.g * ( 1 - morph * 2 ) );
					a.b = Math.max( 0, a.b * ( 1 - morph * 2 ) );

					if ( damage_done > 0 )
					a.hp -= damage_done * morph;
					else
					if ( ragdoll_damage_done > 0 )
					a.hp -= ragdoll_damage_done * morph;

					//if ( a.r <= 0.25 ) // 0.02
					//if ( a.g <= 0.25 )
					//if ( a.b <= 0.25 )
					if ( a.hp <= 0 )
					{
						a.remove( i );
						i--;
						continue;
					}
				}
			}
		}
	}
	static DrawSingleAtomDamage( a )
	{
		var t = a;
		
		if ( Math.random() < 0.15 )
		{
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN || t.material === sdAtom.MATERIAL_GIB_GUN )
			sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK, x:t.x, y:t.y, z:t.z, tox:(t.tox)/2, toy:(t.toy)/2, toz:(t.toz)/2 });
			else
			sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, x:t.x, y:t.y, z:t.z, tox:(t.tox)/2, toy:(t.toy)/2, toz:(t.toz)/2 });
		}
	
		if ( a.material !== sdAtom.MATERIAL_GIB_GUN )
		{
			var morph = 1;
			
			a.r = Math.max( 0, a.r * ( 1 - morph * 0.75 ) );
			a.g = Math.max( 0, a.g * ( 1 - morph * 2 ) );
			a.b = Math.max( 0, a.b * ( 1 - morph * 2 ) );
			
			if ( a.r <= 0.25 ) // 0.02
			if ( a.g <= 0.25 )
			if ( a.b <= 0.25 )
			{
				a.remove();
			}
		}
	}
	static DrawExplosion( x, y, z, explosion_intens, hp_damage, b )
	{
		main.WorldPaintDamage( x, y, z, b.splash_radius );
		
		if ( b.is_plasma )
		{
		//sdSound.PlaySound({ sound: lib.spark2, position:new THREE.Vector3(x,y,z), volume: 1 });
		}
		else
		sdSound.PlaySound({ sound: lib.explosion, position:new THREE.Vector3(x,y,z), volume: 1 });
		
		sdSprite.CreateSprite({ type: sdSprite.TYPE_EXPLOSION, x:x, y:y, z:z, size:-b.splash_radius, r:b.r, g:b.g, b:b.b });
		
		//var hit_radius = 20;
		var hit_radius = b.splash_radius * 5;
		var hit_radius_pow2 = hit_radius * hit_radius;
		
		var owner_cloud = []; // Pointer is copied for case of removal? Also for sync
		var owner_cloud_damage = [];
		var owner_cloud_tox = [];
		var owner_cloud_toy = [];
		var owner_cloud_toz = [];
		var owner_cloud_affected = [];
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		{
			owner_cloud[ i ] = sdCharacter.characters[ i ];
			owner_cloud_damage[ i ] = 0;
			owner_cloud_tox[ i ] = 0;
			owner_cloud_toy[ i ] = 0;
			owner_cloud_toz[ i ] = 0;
			owner_cloud_affected[ i ] = false;
		}
		
		for ( var i = 0; i < sdAtom.atoms.length; i++ ) // Working with possibly removed atoms, caution
		{
			var a = sdAtom.atoms[ i ];
			
			if ( a.removed )
			continue;
			
			var di_pow2 = main.Dist3D_Vector_pow2( x-a.x, y-a.y, z-a.z );
			
			if ( di_pow2 < hit_radius_pow2 )
			if ( main.TraceLine( x, y, z, a.x, a.y, a.z, null, 1, 0 ) >= 1 ) // After explosion
			{
				var di = Math.sqrt( di_pow2 );
				
				if ( di < 0.1 )
				di = 0.1;
				
				var morph = Math.pow( 1 - di / hit_radius, 2 );
				
				var damage_done = 0;
				
				if ( explosion_intens > 0 )
				{
					var dx = a.x - x;
					var dy = a.y - y;
					var dz = a.z - z;
					
					var power = explosion_intens / di * ( 1 - Math.pow( di / hit_radius, 4 ) ); // Copy [ 1 / 2 ]
					
					a.WakeUp();
					
					var knock_power = 25 * b.splash_radius / 8; // Almost copy [ 1 / 2 ]

					if ( !main.MP_mode || b.owner === main.my_character )
					{
						a.tox += dx * knock_power * power;
						a.toy += dy * knock_power * power;
						a.toz += dz * knock_power * power;

						// Copy [ 1 / 2 ]
						//a.parent.tox += dx * knock_power * power / sdCharacter.atoms_per_player;
						//a.parent.toy += dy * knock_power * power / sdCharacter.atoms_per_player;
						//a.parent.toz += dz * knock_power * power / sdCharacter.atoms_per_player;

						if ( a.material === sdAtom.MATERIAL_ALIVE_PLAYER || a.material === sdAtom.MATERIAL_ALIVE_PLAYER_HEAD )
						{
							var dmg = hp_damage * 100 * power / sdCharacter.atoms_per_player;

							if ( dmg > 0 )
							{
								var cloud_i = owner_cloud.indexOf( a.parent );

								if ( b.owner !== a.parent ) // Could be more fun if no self-damage
								{
									owner_cloud_damage[ cloud_i ] += dmg;

									if ( Math.random() < 0.05 * knock_power * power )
									{
										sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, x:a.x, y:a.y, z:a.z, 
										tox:(dx * knock_power * power + a.tox)/2, 
										toy:(dy * knock_power * power + a.toy)/2, 
										toz:(dz * knock_power * power + a.toz)/2 });
									}
								}

								//owner_cloud_tox[ cloud_i ] += dx * knock_power * power / sdCharacter.atoms_per_player; // Copy [ 2 / 2 ]
								//owner_cloud_toy[ cloud_i ] += dy * knock_power * power / sdCharacter.atoms_per_player;
								//owner_cloud_toz[ cloud_i ] += dz * knock_power * power / sdCharacter.atoms_per_player;
								
								owner_cloud_affected[ cloud_i ] = true;
								
								damage_done = dmg;
							}
						}
					}
				}
				
				if ( a.material !== sdAtom.MATERIAL_GIB_GUN )
				if ( a.material !== sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
				if ( b.owner !== a.parent ) // Not a self-damage
				{
					a.r = Math.max( 0, a.r * ( 1 - morph * 0.75 ) );
					a.g = Math.max( 0, a.g * ( 1 - morph * 2 ) );
					a.b = Math.max( 0, a.b * ( 1 - morph * 2 ) );
					
					if ( damage_done > 0 )
					a.hp -= damage_done;
				
					//if ( a.r <= 0.25 )
					//if ( a.g <= 0.25 )
					//if ( a.b <= 0.25 )
					if ( a.hp <= 0 )
					{
						a.remove( i );
						i--;
						continue;
					}
				}
			}
		}
		
		for ( var i = 0; i < owner_cloud.length; i++ )
		{
			if ( owner_cloud_affected[ i ] )
			{
				var c = owner_cloud[ i ];
				
				//var di_pow2 = main.Dist3D_Vector_pow2( x-c.x, y-( c.y + sdCharacter.player_half_height ), z-c.z );
				var di_pow2 = main.Dist3D_Vector_pow2( x-c.x, y-c.y, z-c.z );
				
				//di_pow2 /= 4; // Calculate as if it was 2 time closer
			
				if ( di_pow2 < hit_radius_pow2 )
				{
					var di = Math.sqrt( di_pow2 );
					
					if ( di < 0.1 )
					di = 0.1;


					var dx = c.x - x;
					//var dy = ( c.y + sdCharacter.player_half_height ) - y;
					var dy = c.y - y;
					var dz = c.z - z;
					
					//dx /= 2; // Calculate as if it was 2 time closer
					//dy /= 2; // Calculate as if it was 2 time closer
					//dz /= 2; // Calculate as if it was 2 time closer

					var power = explosion_intens / di * ( 1 - Math.pow( di / hit_radius, 4 ) );  // Copy [ 2 / 2 ]

					var knock_power = 25 * b.splash_radius / 8 * 0.6; // Almost copy [ 2 / 2 ]

					owner_cloud_tox[ i ] = dx * knock_power * power;
					owner_cloud_toy[ i ] = dy * knock_power * power;
					owner_cloud_toz[ i ] = dz * knock_power * power;
					
					c.tox += owner_cloud_tox[ i ];
					c.toy += owner_cloud_toy[ i ];
					c.toz += owner_cloud_toz[ i ];
				}
			}
			
			if ( owner_cloud_damage[ i ] > 0 )
			{
				owner_cloud_damage[ i ] = sdByteShifter.approx( owner_cloud_damage[ i ] );

				
				//sdSound.PlaySound({ sound: lib.headshot, position:new THREE.Vector3(b.x,b.y,b.z), volume: 7 / 180 * owner_cloud_damage[ i ] });
				sdSound.PlaySound({ sound: lib.headshot, position:new THREE.Vector3(b.x,b.y,b.z), volume: 7 / 140 * Math.min( 140, owner_cloud_damage[ i ] ) });


				// Send earlier as well
				if ( main.MP_mode )
				if ( owner_cloud[ i ].hea > 0 ) // Almost Copy [ 2 / 2 ] Do not hit dead players or else damage may happen after respawn
				sdSync.MP_SendEvent( sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER, 
					owner_cloud[ i ], 
					owner_cloud_damage[ i ],
					owner_cloud_tox[ i ],
					owner_cloud_toy[ i ],
					owner_cloud_toz[ i ],
					b.x,b.y,b.z );

				owner_cloud[ i ].DealDamage( owner_cloud_damage[ i ], b.owner, b.x, b.y, b.z );
			}
		}

	}
	static ThinkNow( GSPEED )
	{
		for ( var i = 0; i < sdBullet.bullets.length; i++ )
		{
			var b = sdBullet.bullets[ i ];
			if ( b.Update( GSPEED ) )
			{
				if ( !main.MP_mode || b.owner === main.my_character )
				{
					if ( b.is_rocket )
					{
						sdBullet.DrawExplosion( b.x, b.y, b.z, b.knock_power, b.hp_damage, b );

						if ( main.MP_mode )
						sdSync.MP_SendEvent( sdSync.COMMAND_I_DRAW_EXPLOSION, b );
					}
				
					if ( main.MP_mode )
					sdSync.MP_SendEvent( sdSync.COMMAND_I_REMOVE_BULLET, b );
				}
				b.remove();
				sdBullet.bullets.splice( i, 1 );
				i--;
				continue;
			}
		}
	}
}
sdBullet.init_class();