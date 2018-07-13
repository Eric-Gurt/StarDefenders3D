
/* global main, sdAtom, THREE, sdCharacter, sdSprite, sdSync, sdByteShifter, lib, sdSound */

class sdBullet
{
	static init_class()
	{
		sdBullet.bullets = [];
		
		sdBullet.ragdoll_knock_scale = 2; // Only bullets. explosions are not influenced
		
		sdBullet.local_peer_uid_counter = 0;
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
		this.is_rocket = params.is_rocket || false;
		
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
			this.dx = params.dx;
			this.dy = params.dy;
			this.dz = params.dz;
			
			this.air_friction = 0.95;
			
			sdSound.PlaySound({ sound: lib.rocket_attached_sound, parent_mesh: this.mesh, volume: 1 });
		}
		else
		{
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
		
		var morph = main.TraceLine( this.x, this.y, this.z, tx, ty, tz, null, 1, 0 );
		
		if ( morph === 1 )
		{
			if ( !main.MP_mode || this.owner === main.my_character )
			if ( this.DoEntityDamage( this.x, this.y, this.z, tx, ty, tz ) )
			return true;
					
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
					sdSound.PlaySound({ sound: lib.wall_hit, position: new THREE.Vector3( tx, ty, tz  ), volume: 1 });
					main.WorldPaintDamage( tx, ty, tz, 1.5 );
					sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK, x:tx, y:ty, z:tz });
					
					sdSync.MP_SendEvent( sdSync.COMMAND_I_BULLET_HIT_WORLD, tx, ty, tz );
				}

				return true;
			}
		}
		
		if ( this.is_rocket )
		{
			this.trail_spawn += GSPEED;
			if ( this.trail_spawn > 2 )
			{
				this.trail_spawn -= 2;
				
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
		
		if ( main.MP_mode && this.owner !== main.my_character )
		{
			if ( this.peer_removed )
			{
				return true;
			}
		}
		
		if ( !main.MP_mode || this.owner === main.my_character )
		{
			if ( this.x < -200 || this.x > main.level_chunks_x * main.chunk_size + 200 )
			return true;
			if ( this.y < -200 || this.y > main.level_chunks_y * main.chunk_size + 200 )
			return true;
			if ( this.z < -200 || this.z > main.level_chunks_z * main.chunk_size + 200 )
			return true;
		}
	
		this.lx = this.x;
		this.ly = this.y;
		this.lz = this.z;
		
		return false;
	}
	DoEntityDamage( fx, fy, fz, tx, ty, tz )
	{
		var impact_radius = sdAtom.atom_scale * 2; // Atom's radius + bullet's radius
		var impact_radius_pow2 = impact_radius * impact_radius;
		
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
		
			if ( a.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
			continue;
			
			if ( a.removed )
			continue;
		
			var di_path_bullet = Math.sqrt( Math.pow( fx-tx, 2 ), Math.pow( fy-ty, 2 ), Math.pow( fz-tz, 2 ) );
			var di_path_atom = Math.sqrt( Math.pow( a.x-a.lx, 2 ), Math.pow( a.y-a.ly, 2 ), Math.pow( a.z-a.lz, 2 ) );
		
			var steps = Math.max( di_path_bullet, di_path_atom ) / impact_radius * 8; // 4 is not enough
			
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
					if ( best_hit_morph > morph )
					{
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
			
			sdBullet.DrawPlayerDamageAround( best_hit, this.tox * this.knock_power, this.toy * this.knock_power, this.toz * this.knock_power, this );
			
			if ( main.MP_mode )
			sdSync.MP_SendEvent( 
				sdSync.COMMAND_I_DIRECT_HIT_ATOM, 
				best_hit_i, 
				this.tox * this.knock_power, 
				this.toy * this.knock_power, 
				this.toz * this.knock_power,
				this.local_peer_uid
			);
			
			return true; // detonation
		}
		
		return false;
	}
	static DrawPlayerDamageAround( t, tox, toy, toz, bullet )
	{
		t.parent.tox += tox;
		t.parent.toy += toy;
		t.parent.toz += toz;
		
		if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_GUN || t.material === sdAtom.MATERIAL_GIB_GUN )
		sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK, x:t.x, y:t.y, z:t.z, tox:(tox+t.tox)/2, toy:(toy+t.toy)/2, toz:(toz+t.toz)/2 });
		else
		sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, x:t.x, y:t.y, z:t.z, tox:(tox+t.tox)/2, toy:(toy+t.toy)/2, toz:(toz+t.toz)/2 });
		
		var hit_radius = 2;
		var hit_radius_pow2 = hit_radius * hit_radius;
		
		if ( bullet !== null )
		{
			var dmg = 0;
			
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER )
			dmg = bullet.hp_damage;
			else
			if ( t.material === sdAtom.MATERIAL_ALIVE_PLAYER_HEAD )
			dmg = bullet.hp_damage_head;
	
			dmg = sdByteShifter.approx( dmg );
			
			if ( dmg > 0 )
			{	
				t.parent.DealDamage( dmg, bullet.owner );

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
				var di = Math.sqrt( di_pow2 );
				
				var morph = Math.pow( 1 - di / hit_radius, 2 );
				
				a.WakeUp();
				a.tox += tox * sdBullet.ragdoll_knock_scale;
				a.toy += toy * sdBullet.ragdoll_knock_scale;
				a.toz += toz * sdBullet.ragdoll_knock_scale;
		
				if ( a.material !== sdAtom.MATERIAL_GIB_GUN )
				{
					a.r = Math.max( 0, a.r * ( 1 - morph * 0.75 ) );
					a.g = Math.max( 0, a.g * ( 1 - morph * 2 ) );
					a.b = Math.max( 0, a.b * ( 1 - morph * 2 ) );

					if ( a.r <= 0.02 )
					if ( a.g <= 0.02 )
					if ( a.b <= 0.02 )
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
			
			if ( a.r <= 0.02 )
			if ( a.g <= 0.02 )
			if ( a.b <= 0.02 )
			{
				a.remove();
			}
		}
	}
	static DrawExplosion( x, y, z, explosion_intens, hp_damage, b )
	{
		main.WorldPaintDamage( x, y, z, 8 );
		
		sdSound.PlaySound({ sound: lib.explosion, position:new THREE.Vector3(x,y,z), volume: 1 });
		
		sdSprite.CreateSprite({ type: sdSprite.TYPE_EXPLOSION, x:x, y:y, z:z, size:-8 });
		
		var hit_radius = 20;
		var hit_radius_pow2 = hit_radius * hit_radius;
		
		var owner_cloud = []; // Pointer is copied for case of removal? Also for sync
		var owner_cloud_damage = [];
		var owner_cloud_tox = [];
		var owner_cloud_toy = [];
		var owner_cloud_toz = [];
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		{
			owner_cloud[ i ] = sdCharacter.characters[ i ];
			owner_cloud_damage[ i ] = 0;
			owner_cloud_tox[ i ] = 0;
			owner_cloud_toy[ i ] = 0;
			owner_cloud_toz[ i ] = 0;
		}
		
		for ( var i = 0; i < sdAtom.atoms.length; i++ )
		{
			var a = sdAtom.atoms[ i ];
			
			if ( a.removed )
			continue;
			
			var di_pow2 = main.Dist3D_Vector_pow2( x-a.x, y-a.y, z-a.z );
			
			if ( di_pow2 < hit_radius_pow2 )
			{
				var di = Math.sqrt( di_pow2 );
				
				if ( di < 0.1 )
				di = 0.1;
				
				var morph = Math.pow( 1 - di / hit_radius, 2 );
				
				if ( explosion_intens > 0 )
				{
					var dx = a.x - x;
					var dy = a.y - y;
					var dz = a.z - z;
					
					var power = explosion_intens / di * ( 1 - Math.pow( di / hit_radius, 2 ) ); 
					
					a.WakeUp();

					a.tox += dx * 25 * power;
					a.toy += dy * 25 * power;
					a.toz += dz * 25 * power;

					// Copy [ 1 / 2 ]
					a.parent.tox += dx * 25 * power / sdCharacter.atoms_per_player;
					a.parent.toy += dy * 25 * power / sdCharacter.atoms_per_player;
					a.parent.toz += dz * 25 * power / sdCharacter.atoms_per_player;
					
					if ( !main.MP_mode || b.owner === main.my_character )
					if ( a.material === sdAtom.MATERIAL_ALIVE_PLAYER || a.material === sdAtom.MATERIAL_ALIVE_PLAYER_HEAD )
					{
						var dmg = hp_damage * 100 * power / sdCharacter.atoms_per_player;
						
						if ( dmg > 0 )
						{
							var cloud_i = owner_cloud.indexOf( a.parent );
							owner_cloud_damage[ cloud_i ] += dmg;
							owner_cloud_tox[ cloud_i ] += dx * 25 * power / sdCharacter.atoms_per_player; // Copy [ 2 / 2 ]
							owner_cloud_toy[ cloud_i ] += dy * 25 * power / sdCharacter.atoms_per_player;
							owner_cloud_toz[ cloud_i ] += dz * 25 * power / sdCharacter.atoms_per_player;
						}
					}
				}
				
				if ( a.material !== sdAtom.MATERIAL_GIB_GUN )
				if ( a.material !== sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
				{
					a.r = Math.max( 0, a.r * ( 1 - morph * 0.75 ) );
					a.g = Math.max( 0, a.g * ( 1 - morph * 2 ) );
					a.b = Math.max( 0, a.b * ( 1 - morph * 2 ) );

					if ( a.r <= 0.02 )
					if ( a.g <= 0.02 )
					if ( a.b <= 0.02 )
					{
						a.remove( i );
						i--;
						continue;
					}
				}
			}
		}

		for ( var i = 0; i < owner_cloud.length; i++ )
		if ( owner_cloud_damage[ i ] > 0 )
		{
			owner_cloud_damage[ i ] = sdByteShifter.approx( owner_cloud_damage[ i ] );

			owner_cloud[ i ].DealDamage( owner_cloud_damage[ i ], b.owner );

			if ( main.MP_mode )
			sdSync.MP_SendEvent( sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER, 
				owner_cloud[ i ], 
				owner_cloud_damage[ i ],
				owner_cloud_tox[ i ],
				owner_cloud_toy[ i ],
				owner_cloud_toz[ i ] );
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