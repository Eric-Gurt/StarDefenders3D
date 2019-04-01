


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
		
		sdSprite.GEOM_PLANE = 0;
		sdSprite.GEOM_SPHERE = 1;
		
		sdSprite.expl_r = 1;
		sdSprite.expl_g = 0;
		sdSprite.expl_b = 1;
		
		sdSprite.sprites = [];
		
		sdSprite.texture_blood = null;
		
		var bmp = new BitmapData( 64, 128, true );
		var mini_texture = new Image();
		mini_texture.src = "assets/hit_marks.png";
		mini_texture.onload = function() 
		{
			bmp.ctx.drawImage( mini_texture, 0, 0 );
		
			sdSprite.texture_blood = new THREE.CanvasTexture( bmp.canvas );
			sdSprite.texture_blood.magFilter = THREE.NearestFilter;
			sdSprite.texture_blood.minFilter = THREE.NearestMipMapNearestFilter;
			sdSprite.texture_blood.flipY = false;
		};
		
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
			
			bmp.ctx.clearRect( 0, 0, bmp.width, bmp.height );
			bmp.ctx.drawImage( mini_texture, 0, 0 );
			
			for ( var x = 0; x < bmp.width; x++ )
			for ( var y = 0; y < bmp.height; y++ )
			{
				var c = bmp.getPixel32( x, y );
				if ( c.g === 255 )
				{
					if ( c.r === 255 )
					if ( c.b === 0 )
					{
						// Yellow
						c.r = sdSprite.expl_r;
						c.g = sdSprite.expl_g;
						c.b = sdSprite.expl_b;

						bmp.setPixelC( x, y, c, 255 );
					}
					
					
					if ( c.r === 0 )
					if ( c.b === 0 )
					{
						// Green
						c.r = sniper_color_r;
						c.g = sniper_color_g;
						c.b = sniper_color_b;

						bmp.setPixelC( x, y, c, 255 );
					}
				}
			}
			bmp.setPixelsDone();
			
			sdSprite.texture_blood.needsUpdate = true;
			
		};
	}

	static CreateSprite( params )
	{
		if ( sdSprite.texture_blood === null )
		return;
	
		sdSprite.sprites.push( new sdSprite( params ) );
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
		
		var effect_id = 0;
		
		var rand_rot = true;
		
		this.scale_speed = 0;
		this.look_at = false;
		
		this.post_destruction = null;
		
		var geom = sdSprite.GEOM_PLANE;
		
		this.is_glowing = false;
		
		this.gore_painter = false;
			
		if ( params.type === sdSprite.TYPE_BLOOD )
		{
			this.toy = 0.5;
			this.gravity = 0.1;
			effect_id = 0;
			
			this.gore_painter = true;
		}
		else
		if ( params.type === sdSprite.TYPE_SPARK )
		{
			effect_id = 1;
			this.frame_time = 4;
			
			this.is_glowing = true;
		}
		else
		if ( params.type === sdSprite.TYPE_SMOKE )
		{
			effect_id = 2;
			rand_rot = false;
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
			
			this.is_glowing = true;
		}
		else
		if ( params.type === sdSprite.TYPE_SNIPER_HIT )
		{
			effect_id = 6;
			this.frame_time = 4;
			
			this.is_glowing = true;
		}
		
		var rot = new THREE.Quaternion();
		if ( rand_rot )
		rot.setFromEuler( new THREE.Euler( 0, 0, ~~( Math.random() * 4 ) * Math.PI * 0.5 ) );
		this.rotation_quaternion = rot;
		
		
		
		
		var g;
		var m;
		
		if ( geom === sdSprite.GEOM_PLANE )
		{
			if ( params.type === sdSprite.TYPE_BLOOD )
			g = new THREE.PlaneBufferGeometry( 8 * 1.5, 8 * 1.5 );
			else
			g = new THREE.PlaneBufferGeometry( 8, 8 );
		
			m = sdShaderMaterial.CreateMaterial( sdSprite.texture_blood, 'sprite' );
			
			m.uniforms.fog.value = new THREE.Color( main.fog_color );
			m.uniforms.fog_intensity.value = this.is_glowing ? 0 : 1;
		}
		else
		{
			g = new THREE.SphereBufferGeometry( 1, 16, 16 );
			m = sdShaderMaterial.CreateMaterial( null, 'explosion' );
			m.uniforms.r.value = sdSprite.expl_r;
			m.uniforms.g.value = sdSprite.expl_g;
			m.uniforms.b.value = sdSprite.expl_b;
			
			let v = new THREE.Vector3();
			for ( var i = 0; i < 50; i++ )
			{
				main.SetAsRandom3D( v );
				let r = ( Math.random() + 1 ) * 1.5;
				v.x *= r;
				v.y *= r;
				v.z *= r;
				sdSprite.CreateSprite({ type: sdSprite.TYPE_SPARK_EXPLOSION, x:params.x, y:params.y, z:params.z, tox:v.x, toy:v.y, toz:v.z });
			}
		}
		
		
		this.mesh = new THREE.Mesh( g, m );
		main.scene.add( this.mesh );
		
		this.mesh.position.x = params.x;
		this.mesh.position.y = params.y;
		this.mesh.position.z = params.z;
		
		if ( geom === sdSprite.GEOM_PLANE )
		{
			this.SetEffectID( effect_id, 8 );
			this.SetFrame( 0 );
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
				true );
				
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
		
		if ( this.is_glowing )
		this.mesh.material.uniforms.brightness.value = 1;
		else
		this.mesh.material.uniforms.brightness.value = main.GetEntityBrightness( this.mesh.position.x, this.mesh.position.y, this.mesh.position.z );
		
		this.toy -= this.gravity * GSPEED;
		
		this.frame_time_current += GSPEED;
		
		if ( this.frame_time_current >= this.frame_time )
		{
			this.frame_time_current -= this.frame_time;
			this.frame++;
			
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
	}
}
sdSprite.init_class();