

/* global main, THREE */

class Chunk
{
	get mesh()
	{
		throw new Error();
	}
	set mesh( v )
	{
		throw new Error();
	}
	constructor( xx, yy, zz, mesh )
	{
		this.xx = xx;
		this.yy = yy;
		this.zz = zz;
		//this.mesh = mesh;
		
		this.bit_mesh = null;
		
		this.bitmap = null;
		
		this.nearby = [];
		
		this.rgba = null; // Color, opacity
		this.uvs2 = null; // Brightness and invisibility due to being hidden (invisibility is deprecated)
		
		this.update_needed = true;
		
		this.recalc_brightness_current_update_hash = []; // Another huge array. Keeps main.recalc_brightness_hash whenever update happens. Depending on their value brightness will be or won't be recalculated (prevention of pointless brightness recalcs).
		
		this.visible_timer = 0; // Timer that should be set to certain value after which retrace will be needed
		
		this.dots_total = 0; // Only used to not render empty chunks
	}
	remove()
	{
		//main.DestroyMovieClip( this.mesh );
		main.DestroyMovieClip( this.bit_mesh );
		
		this.bitmap = null;
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
		/*var lod = this.mesh;
		
		var sub_geom = lod.children[ 0 ].geometry;
				
		var vertices = lod.children[ 0 ].geometry.getAttribute( 'position' ).array;
		var rgba = lod.children[ 0 ].geometry.getAttribute( 'colo' ).array;
		var uvs2 = lod.children[ 0 ].geometry.getAttribute( 'uv2' ).array;
		
		sub_geom.updateVertexDataTyped( vertices );
		sub_geom.updateRGBADataTyped( rgba );
		sub_geom.updateSecondaryUVDataTyped( uvs2 );
		
		this.GenerateLODModels( upd_vertices, upd_rgba, upd_brightness_visibility );*/
		
		if ( upd_rgba || upd_brightness_visibility )
		this.update_needed = true;
	}
	GenerateLODModels( upd_vertices=true, upd_rgba=true, upd_brightness_visibility=true )
	{
		/*if ( main.generate_lod_chunks === 0 )
		return;
		
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
			
			var x,y,z,x2,y2,z2;
			
			for ( x = 0; x < larger_chunk_size; x++ )
			for ( y = 0; y < larger_chunk_size; y++ )
			for ( z = 0; z < larger_chunk_size; z++ )
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

					out1: for ( x2 = 0; x2 < 2; x2++ )
					for ( y2 = 0; y2 < 2; y2++ )
					for ( z2 = 0; z2 < 2; z2++ )
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

						break out1;
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
		}*/
		
		this.ChoseLODMesh();
	}
	ChoseLODMesh() // Logic method
	{
		/*
		var di = main.Dist3D(	( this.xx + 0.5 ) * main.chunk_size, 
								( this.yy + 0.5 ) * main.chunk_size, 
								( this.zz + 0.5 ) * main.chunk_size,
								main.main_camera.position.x,
								main.main_camera.position.y,
								main.main_camera.position.z ) / ( 32 * 6 * main.lod_ratio );

		di = Math.pow( di, 1.5 );

		var meshes = this.mesh.children;

		var best_i = Math.min( ~~( ( di ) * 4 ), meshes.length - 1 ); // Always expect constant number of LOD models for case when they will be generated progressively

		for ( var i = 0; i < meshes.length; i++ )
		{
			meshes[ i ].visible = ( i === best_i );
		}*/
		
		if ( this.update_needed )
		{
			this.update_needed = false;
			
			var chunk_size = main.chunk_size;
			
			if ( this.bitmap === null )
			{
				this.bitmap = new BitmapData( main.chunk_size * main.chunk_size, main.chunk_size * 4, true );
				this.bitmap._WakeUpPixelDataArray( false, false );
				
				
				var sub_geom = new THREE.BufferGeometry();
				
				var vertices = sub_geom.initVertexData( false, ( 4 * main.chunk_size * 3 ) * 3 * 2 );
				var uvs = sub_geom.initUVData( false, ( 4 * main.chunk_size * 3 ) * 2 * 2 );
				var indices = sub_geom.initIndexData( false, ( 6 * main.chunk_size * 3 ) * 2 );
				
				var vert = 0;
				var ind = 0;
				var uv = 0;
				
				//var uv_scale_x = 1 / chunk_size; // 1024 / 32 = 32
				//var uv_scale_y = 1 / 3; // 96 / 3 = 32
				
				var uv_scale_x = 1 / ( chunk_size ); // 1024 / 32 = 32
				var uv_scale_y = 1 / ( 4 ); // 96 / 3 = 32
				
				//const micro_border_offset = 0; // Pointless solution?
				const micro_border_offset_0 = 0; // Slightly better
				const micro_border_offset_1 = 1 - 0.000065; // Slightly better (solution for GPU inaccuracy. Probably will be different for different drivers/GPUs)
				
				for ( var side = 0; side <= 1; side++ )
				//var side = 0;
				{
					//if ( false )
					//for ( var x = 0; x < chunk_size; x++ )
					for ( var x = chunk_size - 1; x >= 0; x-- )
					{
						var uv_x = x / chunk_size;
						var uv_y = uv_scale_y * 3;

						if ( side === 0 )
						{
							indices[ ind++ ] = vert / 3;
							indices[ ind++ ] = vert / 3 + 1;
							indices[ ind++ ] = vert / 3 + 2;

							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3 + 3;
							indices[ ind++ ] = vert / 3;
						}
						else
						{
							indices[ ind++ ] = vert / 3;
							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3 + 1;

							indices[ ind++ ] = vert / 3 + 3;
							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3;
						}

						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = x + side;

						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = x + side;

						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = x + side;

						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = x + side;

						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_y + uv_y;
					}
				
					//if ( false )
					for ( var x = 0; x < chunk_size; x++ )
					//for ( var x = chunk_size - 1; x >= 0; x-- )
					{
						var uv_x = x / chunk_size;
						var uv_y = uv_scale_y * 2;

						if ( side === 0 )
						{
							indices[ ind++ ] = vert / 3;
							indices[ ind++ ] = vert / 3 + 1;
							indices[ ind++ ] = vert / 3 + 2;

							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3 + 3;
							indices[ ind++ ] = vert / 3;
						}
						else
						{
							indices[ ind++ ] = vert / 3;
							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3 + 1;

							indices[ ind++ ] = vert / 3 + 3;
							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3;
						}

						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = 0;

						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = 0;

						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = main.chunk_size;

						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = main.chunk_size;

						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_y + uv_y;
					}
				
					//if ( false )
					for ( var x = 0; x < chunk_size; x++ )
					//for ( var x = chunk_size - 1; x >= 0; x-- )
					{
						var uv_x = x / chunk_size;
						var uv_y = uv_scale_y;

						if ( side === 0 )
						{
							indices[ ind++ ] = vert / 3;
							indices[ ind++ ] = vert / 3 + 1;
							indices[ ind++ ] = vert / 3 + 2;

							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3 + 3;
							indices[ ind++ ] = vert / 3;
						}
						else
						{
							indices[ ind++ ] = vert / 3;
							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3 + 1;

							indices[ ind++ ] = vert / 3 + 3;
							indices[ ind++ ] = vert / 3 + 2;
							indices[ ind++ ] = vert / 3;
						}

						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = 0;

						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = 0;
						vertices[ vert++ ] = main.chunk_size;

						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = main.chunk_size;

						vertices[ vert++ ] = x + side;
						vertices[ vert++ ] = main.chunk_size;
						vertices[ vert++ ] = 0;

						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_0 * uv_scale_y + uv_y;

						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_x + uv_x;
						uvs[ uv++ ] = micro_border_offset_1 * uv_scale_y + uv_y;
					}
				}
				
				sub_geom.updateVertexDataTyped( vertices );

				sub_geom.updateIndexDataTyped( indices );

				sub_geom.updateUVDataTyped( uvs );

				sub_geom.boundingBox = new THREE.Box3( new THREE.Vector3( 0, 0, 0 ),
													   new THREE.Vector3( chunk_size, chunk_size, chunk_size ) );
				sub_geom.boundingSphere = new THREE.Sphere( new THREE.Vector3( ( 0.5 ) * chunk_size, ( 0.5 ) * chunk_size, ( 0.5 ) * chunk_size ),
															Math.sqrt( 3 * Math.pow( chunk_size / 2, 2 ) ) );

				var tex = new THREE.CanvasTexture( this.bitmap.ctx.canvas );
				tex.magFilter = THREE.NearestFilter;
				//tex.magFilter = THREE.LinearFilter;
				tex.minFilter = THREE.NearestFilter;
				
				tex.generateMipmaps = false;
				
				var mat = sdShaderMaterial.CreateMaterial( tex, 'voxel_map' );
				//mat.color = new THREE.Color( 0xFF0000 );
				//mat.opacity = 0.5;
				//mat.transparent = mat.opacity < 1;
				//mat.depthWrite = mat.opacity >= 1;
				//mat.side = THREE.DoubleSide;
/*
				mat.depthFunc = THREE.AlwaysDepth;*/
				
				main.materials_with_dyn_light.push( mat );
		
				this.bit_mesh = new THREE.Mesh( sub_geom, mat );

				this.bit_mesh.position.x = this.xx * main.chunk_size;
				this.bit_mesh.position.y = this.yy * main.chunk_size;
				this.bit_mesh.position.z = this.zz * main.chunk_size;
				main.scene.add( this.bit_mesh );
				
				mat.uniforms.fog.value = new THREE.Color( main.fog_color );
				mat.uniforms.fog_intensity.value = 1;
				/*
				setTimeout( function()
				{
					this.bit_mesh.matrixAutoUpdate = false; // not needed after first update
				}, 100 );*/
			}

			var c = new RGBA();
			
			var i = 0;
			
			var bitmap = this.bitmap;
			var data = this.bitmap.pixel_data.data;
			
			function SetRGB( x, y, r,g,b,a )
			{
				var p = ( y * bitmap.width + x ) * 4;
				
				data[ p++ ] = r;
				data[ p++ ] = g;
				data[ p++ ] = b;
				data[ p ] = a;
			}
			
			var rgba = this.rgba;
			
			var uvs2 = this.uvs2;
			
			var x, y, z, br;

			for ( z = 0; z < chunk_size; z++ )
			for ( y = 0; y < chunk_size; y++ )
			for ( x = 0; x < chunk_size; x++ )
			{
				i = x * chunk_size * chunk_size + y * chunk_size + z;
				
				br = uvs2[ i ] * 85;
				
				i *= 4;
				
				if ( br >= 0 )
				SetRGB( x + z * chunk_size, y, 
					rgba[ i++ ] * br, rgba[ i++ ] * br, rgba[ i++ ] * br, rgba[ i ] * 255 );
				else
				SetRGB( x + z * chunk_size, y + chunk_size * 2, 0,0,0,0 );
			}

			for ( z = 0; z < chunk_size; z++ )
			for ( y = 0; y < chunk_size; y++ )
			for ( x = 0; x < chunk_size; x++ )
			{
				i = y * chunk_size * chunk_size + z * chunk_size + x;
				
				br = uvs2[ i ] * 85;
				
				i *= 4;
				
				if ( br >= 0 )
				SetRGB( x + z * chunk_size, y + chunk_size, 
					rgba[ i++ ] * br, rgba[ i++ ] * br, rgba[ i++ ] * br, rgba[ i ] * 255 );
				else
				SetRGB( x + z * chunk_size, y + chunk_size * 2, 0,0,0,0 );
			}

			for ( z = 0; z < chunk_size; z++ )
			for ( y = 0; y < chunk_size; y++ )
			for ( x = 0; x < chunk_size; x++ )
			{
				i = z * chunk_size * chunk_size + x * chunk_size + y;
				
				br = uvs2[ i ] * 85;
				
				i *= 4;
				
				if ( br >= 0 )
				SetRGB( x + z * chunk_size, y + chunk_size * 2, 
					rgba[ i++ ] * br, rgba[ i++ ] * br, rgba[ i++ ] * br, rgba[ i ] * 255 );
				else
				SetRGB( x + z * chunk_size, y + chunk_size * 2, 0,0,0,0 );
			}

			this.bitmap.setPixelsDone();
				
			this.bit_mesh.material.map.needsUpdate = true;

			//this.bitmap.debugPreview( 1 );
		}
	}
}