


/* global THREE, main, sdShaderMaterial */

class sdSprite
{
	static init_class()
	{
		sdSprite.TYPE_BLOOD = 0;
		sdSprite.TYPE_SPARK = 1;
		sdSprite.TYPE_SMOKE = 2;
		sdSprite.TYPE_ROCK = 3;
		sdSprite.TYPE_EXPLOSION = 4;
		sdSprite.TYPE_SPARK_EXPLOSION = 5;
		sdSprite.TYPE_SNIPER_TRAIL = 6;
		sdSprite.TYPE_SNIPER_HIT = 7;
		sdSprite.TYPE_DAMAGE_REPORT = 8;
		sdSprite.TYPE_SHELL = 9;
		
		sdSprite.GEOM_PLANE = 0;
		sdSprite.GEOM_SPHERE = 1;
		
		sdSprite.expl_r = 1;
		sdSprite.expl_g = 0;
		sdSprite.expl_b = 1;
		
		sdSprite.plas_r = 0;
		sdSprite.plas_g = 1;
		sdSprite.plas_b = 0;
		
		sdSprite.sniper_r = 0;
		sdSprite.sniper_g = 1;
		sdSprite.sniper_b = 0;
		
		sdSprite.sprites = [];
		
		sdSprite.texture_blood = null;
		{
			const bmp = new BitmapData( 64, 128, true );
			const mini_texture = new Image();
			mini_texture.src = "assets/hit_marks.png";
			mini_texture.onload = function() 
			{
				bmp.ctx.drawImage( mini_texture, 0, 0 );

				sdSprite.texture_blood = new THREE.CanvasTexture( bmp.canvas );
				//sdSprite.texture_blood.magFilter = THREE.NearestFilter;
				sdSprite.texture_blood.magFilter = THREE.LinearFilter;
				sdSprite.texture_blood.minFilter = THREE.LinearFilter;
				//sdSprite.texture_blood.minFilter = THREE.NearestMipMapNearestFilter;
				sdSprite.texture_blood.flipY = false;
			};
		}
		sdSprite.bitmap_numbers = null;
		{
			const bmp = new BitmapData( 30, 5, true );
			const mini_texture = new Image();
			mini_texture.src = "assets/numbers.png";
			mini_texture.onload = function() 
			{
				bmp.ctx.drawImage( mini_texture, 0, 0 );
				sdSprite.bitmap_numbers = bmp;
/*
				sdSprite.texture_numbers = new THREE.CanvasTexture( bmp.canvas );
				sdSprite.texture_numbers.magFilter = THREE.NearestFilter;
				sdSprite.texture_numbers.minFilter = THREE.NearestMipMapNearestFilter;
				sdSprite.texture_numbers.flipY = false;*/
			};
		}
		
		sdSprite.RandomizeGlobalExplosionColor = function()
		{
			sdSprite.expl_r = sdRandomPattern.random() + 0.5;
			sdSprite.expl_g = sdRandomPattern.random() + 0.5;
			sdSprite.expl_b = sdRandomPattern.random() + 0.5;
			var m = Math.max( sdSprite.expl_r, sdSprite.expl_g, sdSprite.expl_b );
			if ( m === 0 )
			sdSprite.expl_r = sdSprite.expl_g = m = 1;
			else
			{
				sdSprite.expl_r /= m;
				sdSprite.expl_g /= m;
				sdSprite.expl_b /= m;
			}
			
			sdSprite.plas_r = sdRandomPattern.random() + 0.5;
			sdSprite.plas_g = sdRandomPattern.random() + 0.5;
			sdSprite.plas_b = sdRandomPattern.random() + 0.5;
			var m = Math.max( sdSprite.plas_r, sdSprite.plas_g, sdSprite.plas_b );
			if ( m === 0 )
			sdSprite.plas_g = m = 1;
			else
			{
				sdSprite.plas_r /= m;
				sdSprite.plas_g /= m;
				sdSprite.plas_b /= m;
			}
			
			var sniper_color_r = sdRandomPattern.random() + 0.5;
			var sniper_color_g = sdRandomPattern.random() + 0.5;
			var sniper_color_b = sdRandomPattern.random() + 0.5;
			var m = Math.max( sniper_color_r, sniper_color_g, sniper_color_b );
			if ( m === 0 )
			sniper_color_g = m = 1;
			else
			{
				sniper_color_r /= m;
				sniper_color_g /= m;
				sniper_color_b /= m;
			}
			sdSprite.sniper_r = sniper_color_r;
			sdSprite.sniper_g = sniper_color_g;
			sdSprite.sniper_b = sniper_color_b;
			//bmp.ctx.clearRect( 0, 0, bmp.width, bmp.height );
			//bmp.ctx.drawImage( mini_texture, 0, 0 );
			
		};
	}

	static CreateSprite( params )
	{
		if ( sdSprite.texture_blood === null )
		return null;
	
		var s = new sdSprite( params );
	
		sdSprite.sprites.push( s );
		
		return s;
	}
	constructor( params )
	{
		this.tox = params.tox || 0;
		this.toy = params.toy || 0;
		this.toz = params.toz || 0;
		
		this.gravity = 0;
		
		this.frames = 0;
		this.frame = 0;
		this.frame_time_current = 0;
		
		this.frame_time = 8;
		
		this.frames = 4;
		this.frames_to_play = 3;
		
		var effect_id = -1;
		
		var rand_rot = true;
		
		this.scale_speed = 0;
		this.look_at = false;
		
		this.post_destruction = null;
		
		var geom = sdSprite.GEOM_PLANE;
		
		this.is_glowing = false;
		this.glowing_color = null;
		
		this.gore_painter = false;
		
		this.scale_to_keep_size = 0;
		
		this.type = params.type;
		
		var custom_alpha = 1;
			
		if ( params.type === sdSprite.TYPE_BLOOD )
		{
			this.toy += 0.5;
			this.gravity = 0.1;
			effect_id = 0;
			
			//this.frame_time = 10; // 8
			
			custom_alpha = 0.7; // 0.75 is too much
			
			this.gore_painter = true;
		}
		else
		if ( params.type === sdSprite.TYPE_SPARK )
		{
			effect_id = 1;
			this.frame_time = 4;
			
			this.is_glowing = true;
			
			custom_alpha = 0.75;
			
			this.glowing_color = new THREE.Color(	255 / 255 * 0.2, 
													251 / 255 * 0.2, 
													192 / 255 * 0.2 );
		}
		else
		if ( params.type === sdSprite.TYPE_SMOKE )
		{
			effect_id = 2;
			rand_rot = false;
			
			custom_alpha = 0.7;
		}
		else
		if ( params.type === sdSprite.TYPE_ROCK )
		{
			effect_id = 3;
			this.gravity = 0.1;
			this.frames_to_play = 4;
		}
		else
		if ( params.type === sdSprite.TYPE_EXPLOSION )
		{
			rand_rot = false;
			geom = sdSprite.GEOM_SPHERE;
			
			this.frames_to_play = 1;
			this.frame_time = 5;
			
			this.scale_speed = 0.06; // 0.06
			this.look_at = true;
			
			this.post_destruction = this.SpawnSmoke;
			
			this.glowing_color = new THREE.Color(	params.r * 0.1 * Math.pow( params.size, 2 ), 
													params.g * 0.1 * Math.pow( params.size, 2 ), 
													params.b * 0.1 * Math.pow( params.size, 2 ) );
		}
		else
		if ( params.type === sdSprite.TYPE_SPARK_EXPLOSION )
		{
			effect_id = 4;
			this.frame_time = 6; // 4
			this.frames_to_play = 4;
			
			this.gravity = 0.1;
			
			this.is_glowing = true;
		}
		else
		if ( params.type === sdSprite.TYPE_SNIPER_TRAIL)
		{
			effect_id = 5;
			this.frame_time = 5; // 10
			this.frames_to_play = 4;
			
			custom_alpha = 0.4;
			
			this.is_glowing = true;
			if ( params.r === undefined )
			{
				params.r = sdSprite.sniper_r;
				params.g = sdSprite.sniper_g;
				params.b = sdSprite.sniper_b;
			}
			
			this.glowing_color = new THREE.Color(	params.r * 0.3, 
													params.g * 0.3, 
													params.b * 0.3 );
		}
		else
		if ( params.type === sdSprite.TYPE_SNIPER_HIT )
		{
			effect_id = 6;
			this.frame_time = 4;
			
			this.is_glowing = true;
			params.r = sdSprite.sniper_r;
			params.g = sdSprite.sniper_g;
			params.b = sdSprite.sniper_b;
			
			this.glowing_color = new THREE.Color(	params.r * 4, 
													params.g * 4, 
													params.b * 4 );
		}
		else
		if ( params.type === sdSprite.TYPE_DAMAGE_REPORT )
		{
			this.is_glowing = true;
			this.frame_time = 35 + Math.random() * 15;
			this.frames = 1;
			this.frames_to_play = 1;
			rand_rot = false;
			this.gravity = 0.05;
			
			this.scale_to_keep_size = 0.001 * 0.35 / main.pixel_ratio * ( main.base_resolution_y / main.composer.renderTarget1.height );
		}
		else
		if ( params.type === sdSprite.TYPE_SHELL )
		{
			effect_id = 7;
			rand_rot = true;
			this.frame_time = 35 + Math.random() * 15;
			this.frames = 4;
			this.frames_to_play = 1;
			this.gravity = 0.1;
		}
		
		var rot = new THREE.Quaternion();
		if ( rand_rot )
		rot.setFromEuler( new THREE.Euler( 0, 0, Math.PI * 2 * Math.random() ) );
		//rot.setFromEuler( new THREE.Euler( 0, 0, ~~( Math.random() * 4 ) * Math.PI * 0.5 ) );
		this.rotation_quaternion = rot;
		
		
		
		
		var g;
		var m;
		
		if ( geom === sdSprite.GEOM_PLANE )
		{
			if ( params.type === sdSprite.TYPE_BLOOD )
			g = new THREE.PlaneBufferGeometry( 8 * 1.5, 8 * 1.5 );
			else
			if ( params.type === sdSprite.TYPE_SPARK_EXPLOSION )
			g = new THREE.PlaneBufferGeometry( 8 * 0.5, 8 * 0.5 );
			else
			g = new THREE.PlaneBufferGeometry( 8, 8 );
		
		
			if ( params.type === sdSprite.TYPE_DAMAGE_REPORT )
			{
				var bmp = new BitmapData( 64, 64, true );
				//bmp.fillRectCSS( 0, 0, 64, 64, '#FF0000');
				/*
				bmp.ctx.textAlign = "center"; 
				bmp.ctx.font = "bold 16px Verdana";
				//bmp.ctx.font = "bold 12px Courier";
				bmp.ctx.fillStyle = "white";
				bmp.ctx.fillText( Math.ceil( params.text ), 32, 32 - 8 );
				*/
			   
				//sdSprite.bitmap_numbers
				if ( params.text >= 0 )
				{
					var s = ( Math.ceil( params.text ) ).toString();

					var offset_x = ~~( 32 - ( s.length * 4 - 1 ) / 2 );

					for ( var i = 0; i < s.length; i++ )
					{
						var char_id = s.charCodeAt( i ) - '0'.charCodeAt( 0 );
						bmp.ctx.drawImage( sdSprite.bitmap_numbers.canvas, char_id*3,0, 3,5, i*4+offset_x,32-3, 3,5 );
					}
				}
				else
				{
					const smiley = [ '🤔','🤨','😒','😕','🙁','😞','😟','😭','😦','😧','😠' ];
					
					bmp.ctx.textAlign = "center"; 
					bmp.ctx.font = "bold 16px Verdana";
					
					bmp.ctx.fillStyle = "red";
					var rand_id = ~~( Math.random() * smiley.length );
					bmp.ctx.fillText( smiley[ rand_id ], 32, 32 + 8 /* - 8*/ );
				}
			   
				var tex = new THREE.CanvasTexture( bmp.canvas );
				tex.magFilter = THREE.NearestFilter;
				tex.minFilter = THREE.NearestMipMapNearestFilter;
				//tex.flipY = false;

				m = sdShaderMaterial.CreateMaterial( tex, 'sprite' );
					
				
				if ( sdShaderMaterial.EXT_frag_depth )
				{
					//m.depthTest = false;
					//m.uniforms.depth_offset.value = 100;
					m.uniforms.depth_offset.value = 1000;
				}
				else
				{
					//m.depthTest = false;
					m.polygonOffset = true;
					m.polygonOffsetFactor = -100000;
					m.polygonOffsetUnits = -100000;
				}
			}
			else
			m = sdShaderMaterial.CreateMaterial( sdSprite.texture_blood, 'sprite' );
			
			m.uniforms.fog.value = new THREE.Color( main.fog_color );
			m.uniforms.fog_intensity.value = this.is_glowing ? 0 : 1;
			
			if ( params.r !== undefined )
			{
				m.uniforms.diffuse.value.r = params.r;
				m.uniforms.diffuse.value.g = params.g;
				m.uniforms.diffuse.value.b = params.b;
			}
		
			if ( params.type === sdSprite.TYPE_SPARK )
			m.uniforms.depth_offset.value = 2;
		}
		else
		{
			g = new THREE.SphereBufferGeometry( 1, 16, 16 );
			m = sdShaderMaterial.CreateMaterial( null, 'explosion' );
			/*m.uniforms.r.value = sdSprite.expl_r;
			m.uniforms.g.value = sdSprite.expl_g;
			m.uniforms.b.value = sdSprite.expl_b;*/
			m.uniforms.r.value = params.r;
			m.uniforms.g.value = params.g;
			m.uniforms.b.value = params.b;
			
			let v = new THREE.Vector3();
			for ( var i = 0; i < 50; i++ )
			{
				main.SetAsRandom3D( v );
				let r = ( Math.random() + 1 ) * 1.5;
				v.x *= r;
				v.y *= r;
				v.z *= r;
				sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK_EXPLOSION, x:params.x, y:params.y, z:params.z, tox:v.x, toy:v.y, toz:v.z, r:params.r * 2, g:params.g * 2, b:params.b * 2 });
			}
		}
		
		if ( custom_alpha !== 1 || geom === sdSprite.GEOM_SPHERE )
		{
			//m.depthWrite = false;
			//m.transparent = true;
			
			if ( custom_alpha !== 1)
			m.opacity = custom_alpha;
		}
		
		this.mesh = new THREE.Mesh( g, m );
		main.scene.add( this.mesh );
		
		this.mesh.position.x = params.x;
		this.mesh.position.y = params.y;
		this.mesh.position.z = params.z;
		
		if ( geom === sdSprite.GEOM_PLANE )
		{
			if ( effect_id !== -1 )
			{
				this.SetEffectID( effect_id, 8 );
				this.SetFrame( 0 );
			}
		}
		else
		{	
			this.mesh.scale.x = params.size;
			this.mesh.scale.y = params.size;
			this.mesh.scale.z = params.size;
		}
	}
	remove()
	{
		if ( this.post_destruction !== null )
		this.post_destruction();
		
		//main.scene.remove( this.mesh );
		main.DestroyMovieClip( this.mesh );
	}
	SpawnSmoke()
	{
		sdSprite.CreateSprite({ type: sdSprite.TYPE_SMOKE, x:this.mesh.position.x, y:this.mesh.position.y, z:this.mesh.position.z });
	}
	SetFrame()
	{
		var buf = this.mesh.geometry.getAttribute( 'uv' );
		var uvs = buf.array;
		
		uvs[ 0 * 2 ] = ( this.frame + 1 ) / this.frames;
		uvs[ 1 * 2 ] = ( this.frame + 0 ) / this.frames;
		uvs[ 2 * 2 ] = ( this.frame + 1 ) / this.frames;
		uvs[ 3 * 2 ] = ( this.frame + 0 ) / this.frames;
		
		buf.needsUpdate = true;
	}
	SetEffectID( id, out_of )
	{
		var buf = this.mesh.geometry.getAttribute( 'uv' );
		var uvs = buf.array;
		
		uvs[ 0 * 2 + 1 ] = ( id + 0 ) / out_of;
		uvs[ 1 * 2 + 1 ] = ( id + 0 ) / out_of;
		uvs[ 2 * 2 + 1 ] = ( id + 1 ) / out_of;
		uvs[ 3 * 2 + 1 ] = ( id + 1 ) / out_of;
		
		buf.needsUpdate = true;
	}
	ApplyBrightnessLogic()
	{
		if ( this.scale_to_keep_size !== 0 )
		{
			this.mesh.material.uniforms.brightness_r.value = 1;
			this.mesh.material.uniforms.brightness_g.value = 1;
			this.mesh.material.uniforms.brightness_b.value = 1;
		}
		else
		if ( this.is_glowing )
		{
			sdShaderMaterial.GetDynamicBrithnessShaderless( this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, this.mesh.material.uniforms );
			
			this.mesh.material.uniforms.brightness_r.value += 1;
			this.mesh.material.uniforms.brightness_g.value += 1;
			this.mesh.material.uniforms.brightness_b.value += 1;
		}
		else
		{
			var gray = main.GetEntityBrightness( this.mesh.position.x, this.mesh.position.y, this.mesh.position.z );
			
			sdShaderMaterial.GetDynamicBrithnessShaderless( this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, this.mesh.material.uniforms );
			
			this.mesh.material.uniforms.brightness_r.value += gray;
			this.mesh.material.uniforms.brightness_g.value += gray;
			this.mesh.material.uniforms.brightness_b.value += gray;
		}
	}
	Update( GSPEED )
	{
		if ( this.gore_painter )
		{
			var ox = this.mesh.position.x;
			var oy = this.mesh.position.y;
			var oz = this.mesh.position.z;
			
			this.mesh.position.x += this.tox * GSPEED;
			this.mesh.position.y += this.toy * GSPEED;
			this.mesh.position.z += this.toz * GSPEED;
			
			var morph = main.TraceLine( ox, oy, oz, this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, null, 1, 0 );
		
			if ( morph === 1 )
			{
			}
			else
			{
				main.WorldPaintDamage( 
				ox * ( 1 - morph ) + this.mesh.position.x * morph, 
				oy * ( 1 - morph ) + this.mesh.position.y * morph, 
				oz * ( 1 - morph ) + this.mesh.position.z * morph, 
				1 + Math.random(), 
				1 );
				
				this.frame++; // so there is more gore...
			}
		}
		else
		{
			this.mesh.position.x += this.tox * GSPEED;
			this.mesh.position.y += this.toy * GSPEED;
			this.mesh.position.z += this.toz * GSPEED;
		}
		this.mesh.scale.x += this.scale_speed * GSPEED;
		this.mesh.scale.y += this.scale_speed * GSPEED;
		this.mesh.scale.z += this.scale_speed * GSPEED;
		
		if ( this.type === sdSprite.TYPE_EXPLOSION )
		this.mesh.material.opacity -= 0.05 * GSPEED;
		
		if ( this.scale_to_keep_size !== 0 )
		{
			var di = main.Dist3D( this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, main.main_camera.position.x, main.main_camera.position.y, main.main_camera.position.z );
			this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = di * this.scale_to_keep_size * main.main_camera.fov;
		}
			
		if ( this.glowing_color !== null )
		{
			main.DrawDynamicLight( 
				this.mesh.position.x, 
				this.mesh.position.y,
				this.mesh.position.z, 
				this.glowing_color.r * ( 1 - ( this.frame + this.frame_time_current / this.frame_time ) / ( this.frames_to_play + 1 ) ), 
				this.glowing_color.g * ( 1 - ( this.frame + this.frame_time_current / this.frame_time ) / ( this.frames_to_play + 1 ) ), 
				this.glowing_color.b * ( 1 - ( this.frame + this.frame_time_current / this.frame_time ) / ( this.frames_to_play + 1 ) ) 
			);
		}
		
		this.toy -= this.gravity * GSPEED;
		
		this.frame_time_current += GSPEED;
		
		if ( this.frame_time_current >= this.frame_time )
		{
			this.frame_time_current -= this.frame_time;
			this.frame++;	
			
			if ( this.type === sdSprite.TYPE_BLOOD )
			if ( this.frame === 2 )
			this.frame_time *= 3;
			
			this.SetFrame( 0 );
		}
		
		if ( this.frame > this.frames_to_play )
		{
			this.remove();
			return true;
		}
		
		if ( this.look_at )
		{
			this.mesh.lookAt( main.main_camera.position );
		}
		else
		{
			this.mesh.quaternion.copy( main.main_camera.quaternion );
			this.mesh.quaternion.multiply( this.rotation_quaternion );
		}
		
		return false;
	}
	static ThinkNow( GSPEED )
	{
		for ( var i = 0; i < sdSprite.sprites.length; i++ )
		{
			if ( sdSprite.sprites[ i ].Update( GSPEED ) )
			{
				main.RemoveElement( sdSprite.sprites, i );
				i--;
				continue;
			}
		}
		
		for ( var i = 0; i < sdSprite.sprites.length; i++ )
		sdSprite.sprites[ i ].ApplyBrightnessLogic();
	}
}
sdSprite.init_class();