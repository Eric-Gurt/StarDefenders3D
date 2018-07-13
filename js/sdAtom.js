/*

	Physics here. Also visualization for atoms & bullets.

*/

/* global THREE, main, sdShaderMaterial, sdCharacter, sdBullet */
class sdChain
{
	static init_class()
	{
		sdChain.chains = [];
		
		sdChain.initial_length = 0;
		sdChain.enable_reuse = false;
	}
	static CreateChain( a, b, def, in_limb )
	{
		if ( sdChain.enable_reuse )
		{
			// try to reuse slot in order to prevent array from growing
			var min_i = sdChain.initial_length;
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
		//if ( sdChain.chains[ this.uid ] === this )
		{
			this.removed = true;
		}
	}
}
sdChain.init_class();

class sdAtom
{
	static init_class()
	{
		sdAtom.atoms = [];
		
		sdAtom.MATERIAL_ALIVE_PLAYER = 1;
		sdAtom.MATERIAL_ALIVE_PLAYER_HEAD = 2;
		sdAtom.MATERIAL_ALIVE_PLAYER_GUN = 3; // Anything below this has no physics logic
		sdAtom.MATERIAL_GIB = 4; // Ragdolls too?
		sdAtom.MATERIAL_GIB_GUN = 5;
		sdAtom.MATERIAL_BLOOD = 6;
		
		sdAtom.atom_scale = 0.5; // Atom & voxel grid scale
		
		sdAtom.material = sdShaderMaterial.CreateMaterial( null, 'particle' );

		sdAtom.atom_limit = 4096 * 2 * 2;

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
		
		sdAtom.last_point = 0; // Index of a point that was last in previous frame
		
		sdAtom.mesh = new THREE.Points( sub_geom, sdAtom.material );
		sdAtom.mesh.frustumCulled = false;
		
		var bmp = new BitmapData( 32, 32 );
		
		var mini_texture = new Image();
		mini_texture.src = "assets/voxel_player.png";
		mini_texture.onload = function() 
		{
			bmp.ctx.drawImage( mini_texture, 0, 0 );

		};
		sdAtom.character_bitmap = bmp;
	}
	static init()
	{
		sdAtom.material.uniforms.fog.value = new THREE.Color( main.fog_color );
		sdAtom.material.uniforms.dot_scale.value = sdAtom.atom_scale;
		
		if ( sdAtom.mesh.parent !== main.scene )
		main.scene.add( sdAtom.mesh );
	}
	
	constructor( x, y, z, r, g, b, material, model_x, model_y, model_z, parent )
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
		
		this.r_initial = r;
		this.g_initial = g;
		this.b_initial = b;
		
		this.sleep_tim = 0; // 0 means awake. 1 means sleeps
		
		this.visible = true; // Used only for FPS mode
		
		
		this.parent = parent;
		
		this.material = material;
		this.material_initial = material;
		
		this.temp_grav_disable_tim = 0;
		
		this.my_chains = [];
		this.my_chains_initial_length = 0;
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
	clone()
	{
		var a = new sdAtom( this.x, this.y, this.z, this.r, this.g, this.b, this.material, this.model_x, this.model_y, this.model_z, this.parent );
		sdAtom.atoms.push( a );
		return a;
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
		
		for ( var i = 0; i < sdChain.chains.length; i++ )
		{
			var ch = sdChain.chains[ i ];
			
			var a = ch.a;
			
			if ( a.material <= sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
			continue;
			
			if ( ch.removed )
			continue;
			
			
			var b = ch.b;
			
			if ( a.sleep_tim >= 1 )
			if ( b.sleep_tim >= 1 )
			continue;
	
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
				if ( di > target_di + 2 * GSPEED )
				{
					sdBullet.DrawSingleAtomDamage( ch.a );
					sdBullet.DrawSingleAtomDamage( ch.b );
					ch.remove();
					i--;
					continue;
				}
			}
		
			var cx = ( a.x + b.x ) / 2;
			var cy = ( a.y + b.y ) / 2;
			var cz = ( a.z + b.z ) / 2;
			
			var power = 0.25;
			var power_pos = 0.5;
			
			var xx = ( cx - dx * target_di * 0.5 - a.x );
			var yy = ( cy - dy * target_di * 0.5 - a.y );
			var zz = ( cz - dz * target_di * 0.5 - a.z );
			
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
		
		for ( var i = 0; i < sdAtom.atoms.length; i++ )
		{
			var a = sdAtom.atoms[ i ];
			
			if ( a.removed )
			continue;
			
			// Always update for accurate atom-bullet collisions
			a.lx = a.x;
			a.ly = a.y;
			a.lz = a.z;
			
			if ( a.material > sdAtom.MATERIAL_ALIVE_PLAYER_GUN )
			{
				if ( a.parent.hea <= 0 )
				if ( a.y < -200 )
				{
					a.remove();
					i--;
					continue;
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

					var morph = main.TraceLine( a.x, a.y, a.z, tx, ty, tz, null, 1, 0 );

					if ( morph === 1 )
					{
						a.x = tx;
						a.y = ty;
						a.z = tz;

						if ( a.temp_grav_disable_tim < 1 )
						a.temp_grav_disable_tim = Math.min( 1, a.temp_grav_disable_tim + GSPEED * 0.03 );

						if ( a.temp_grav_disable_tim > 0 )
						a.toy -= GSPEED * 0.1 * a.temp_grav_disable_tim;
					}
					else
					{
						var ox = a.x;
						var oy = a.y;
						var oz = a.z;

						a.x = a.x * ( 1 - morph ) + tx * morph;
						a.y = a.y * ( 1 - morph ) + ty * morph;
						a.z = a.z * ( 1 - morph ) + tz * morph;

						var translate = 1;

						var bounce = 0.3;

						var friction = 0.7;

						if ( main.TraceLine( a.x, a.y + translate, a.z, a.x, a.y + translate, a.z, null, 1, 0 ) === 1 )
						{
							var teleport_morph = main.TraceLine( a.x, a.y + translate, a.z, a.x, a.y, a.z, null, 0.01, 0 );

							a.AddSpeedPosFrictionFractal( 0, bounce, 0, 
														  0, translate * ( 1 - teleport_morph ), 0,
														  friction, 1, friction,
														  GSPEED );
						}
						else
						if ( main.TraceLine( a.x, a.y - translate, a.z, a.x, a.y - translate, a.z, null, 1, 0 ) === 1 )
						{
							var teleport_morph = main.TraceLine( a.x, a.y - translate, a.z, a.x, a.y, a.z, null, 0.01, 0 );

							a.AddSpeedPosFrictionFractal( 0, -bounce, 0, 
														  0, -translate * ( 1 - teleport_morph ), 0,
														  friction, 1, friction,
														  GSPEED );
						}

						else

						if ( main.TraceLine( a.x + translate, a.y, a.z, a.x + translate, a.y, a.z, null, 1, 0 ) === 1 )
						{
							var teleport_morph = main.TraceLine( a.x + translate, a.y, a.z, a.x, a.y, a.z, null, 0.01, 0 );

							a.AddSpeedPosFrictionFractal( bounce, 0, 0, 
														  translate * ( 1 - teleport_morph ), 0, 0,
														  1, friction, friction,
														  GSPEED );
						}
						else
						if ( main.TraceLine( a.x - translate, a.y, a.z, a.x - translate, a.y, a.z, null, 1, 0 ) === 1 )
						{
							var teleport_morph = main.TraceLine( a.x - translate, a.y, a.z, a.x, a.y, a.z, null, 0.01, 0 );

							a.AddSpeedPosFrictionFractal( -bounce, 0, 0, 
														  -translate * ( 1 - teleport_morph ), 0, 0,
														  1, friction, friction,
														  GSPEED );
						}

						else

						if ( main.TraceLine( a.x, a.y, a.z + translate, a.x, a.y, a.z + translate, null, 1, 0 ) === 1 )
						{
							var teleport_morph = main.TraceLine( a.x, a.y, a.z + translate, a.x, a.y, a.z, null, 0.01, 0 );

							a.AddSpeedPosFrictionFractal( 0, 0, bounce, 
														  0, 0, translate * ( 1 - teleport_morph ), 
														  friction, friction, 1, 
														  GSPEED );
						}
						else
						if ( main.TraceLine( a.x, a.y, a.z - translate, a.x, a.y, a.z - translate, null, 1, 0 ) === 1 )
						{
							var teleport_morph = main.TraceLine( a.x, a.y, a.z - translate, a.x, a.y, a.z, null, 0.01, 0 );

							a.AddSpeedPosFrictionFractal( 0, 0, -bounce, 
														  0, 0, -translate * ( 1 - teleport_morph ), 
														  friction, friction, 1, 
														  GSPEED );
						}
						else
						{
							a.tox = main.MorphWithTimeScale( a.tox, 0, friction, GSPEED );
							a.toy = main.MorphWithTimeScale( a.toy, 0, friction, GSPEED );
							a.toz = main.MorphWithTimeScale( a.toz, 0, friction, GSPEED );

							a.x = ox;
							a.y = oy;
							a.z = oz;
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

				uvs2[ point ] = main.GetEntityBrightness( a.x, a.y, a.z );

				point++;
			}
		}
		
		for ( var i = 0; i < sdBullet.bullets.length; i++ )
		{
			var b = sdBullet.bullets[ i ];
			
			var length;
			
			var bx = b.x;
			var by = b.y;
			var bz = b.z;
			
			if ( b.visual_intens > 0 )
			{
				bx = bx * ( 1 - b.visual_intens ) + b.visual_x * ( b.visual_intens );
				by = by * ( 1 - b.visual_intens ) + b.visual_y * ( b.visual_intens );
				bz = bz * ( 1 - b.visual_intens ) + b.visual_z * ( b.visual_intens );
				
				b.visual_intens -= GSPEED * 0.5 * b.visual_intens;
			}
			
			var dx = 0;
			var dy = 0;
			var dz = 0;
			
			var is_rocket = b.is_rocket;
			
			if ( is_rocket )
			{
				dx = b.dx;
				dy = b.dy;
				dz = b.dz;
				
				length = 4;
			}
			else
			{
				dx = b.tox;
				dy = b.toy;
				dz = b.toz;
				
				length = 6;
			}
			
			var di = Math.sqrt( main.Dist3D_Vector_pow2( dx, dy, dz ) ) / length;
			if ( di > 0.001 )
			{
				dx /= di;
				dy /= di;
				dz /= di;
			}
			
			for ( var i2 = 0; i2 <= length; i2 += sdAtom.atom_scale )
			{
				var morph = i2 / length;
				
				vertices[ point * 3     ] = bx + dx * morph;
				vertices[ point * 3 + 1 ] = by + dy * morph;
				vertices[ point * 3 + 2 ] = bz + dz * morph;

				rgba[ point * 4 + 3 ] = 1; // Scale
				if ( is_rocket )
				{
					if ( i2 < 1 )
					{
						rgba[ point * 4     ] = 1;
						rgba[ point * 4 + 1 ] = 1;
						rgba[ point * 4 + 2 ] = 1;
						uvs2[ point ] = 1;
						
						if ( i2 === 0 )
						rgba[ point * 4 + 3 ] = 0.5; // Scale
						if ( i2 === 0.5 )
						rgba[ point * 4 + 3 ] = 0.7; // Scale
					}
					else
					if ( i2 === 1 )
					{
						rgba[ point * 4     ] = 1;
						rgba[ point * 4 + 1 ] = 1;
						rgba[ point * 4 + 2 ] = 1;
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
				}

				
				point++;
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