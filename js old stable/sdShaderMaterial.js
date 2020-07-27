

/* global THREE, main */

class sdShaderMaterial
{
	static init_class()
	{
		sdShaderMaterial.EXT_frag_depth = false; // Defined at main.InitEngine(), makes spheres more "in-depth"
		sdShaderMaterial.EXT_frag_depth_sphericals = false;
		
		sdShaderMaterial.max_lamps = 8; // Per chunk. Atoms should calculate this other way perhaps?
		sdShaderMaterial.lamp_range = 32; // integer!
		
		sdShaderMaterial.position_formula = `
	
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
		
		`;
	}
	static GenerateDynamicLightUniformsCode()
	{
		var s = '';
		
		for ( var i = 0; i < sdShaderMaterial.max_lamps; i++ )
		{
			s += 'uniform vec3 lamp'+i+'_pos;\n';
			s += 'uniform vec3 lamp'+i+'_color;\n';
		}
		
		return s;
	}
	static GenerateDynamicLightAffectionCodeForColor( position, final_var_name ) // rgba and position are String
	{
		var s = `float light_intens;`;
		
		for ( var i = 0; i < sdShaderMaterial.max_lamps; i++ )
		{
			s += `light_intens = 8.0 * pow( max( 0.0, 1.0 - sqrt( pow( ${position}.x - lamp${i}_pos.x, 2.0 ) + pow( ${position}.y - lamp${i}_pos.y, 2.0 ) + pow( ${position}.z - lamp${i}_pos.z, 2.0 ) ) / ${sdShaderMaterial.lamp_range}.0 ), 2.0 );\n`;
			
			s += `${final_var_name}.rgb += lamp${i}_color.rgb * vec3( light_intens );`;
		}
		
		return s;
	}
	static GetDynamicBrithnessShaderless( x,y,z, target_uniform )
	{
		var r = 0;
		var g = 0;
		var b = 0;
		
		var tot = Math.min( sdShaderMaterial.max_lamps, main.next_dynamic_lamp_id );
		
		for ( var m = 0; m < tot; m++ )
		{
			var p = main.materials_with_dyn_light[ 0 ].uniforms[ 'lamp' + m + '_pos' ].value;
			
			var di = main.Dist3D_Vector_pow2( x-p.x, y-p.y, z-p.z );
			if ( di < sdShaderMaterial.lamp_range * sdShaderMaterial.lamp_range )
			{
				di = Math.sqrt( di );

				var light_intens = Math.pow( 1 - di / sdShaderMaterial.lamp_range, 2 );
				
				if ( light_intens > 0.8 )
				light_intens = 0.8;
				
				//light_intens *= 8;
				light_intens *= 4;
				
				var c = main.materials_with_dyn_light[ 0 ].uniforms[ 'lamp' + m + '_color' ].value;
				
				r += light_intens * c.r;
				g += light_intens * c.g;
				b += light_intens * c.b;
			}
		}
		
		target_uniform.brightness_r.value = r;
		target_uniform.brightness_g.value = g;
		target_uniform.brightness_b.value = b;
	}
	static DummyExport( c )
	{
	}
	constructor()
	{
		throw new Error();
	}
	static CreateMaterial( texture, method ) // particle 
	{
		let mat;

		if ( method === 'explosion' )
		{
			mat = new THREE.ShaderMaterial({
				uniforms: 
				{
					brightness_r: { type: "f", value: 1 },
					brightness_g: { type: "f", value: 1 },
					brightness_b: { type: "f", value: 1 },
					r: { type: "f", value: 1 },
					g: { type: "f", value: 1 },
					b: { type: "f", value: 0 },
					opacity: { type: "f", value: 1 }
				},
				depthWrite: false,
				transparent: true,
				flatShading: true,
				extensions: {
					derivatives: false, // set to use derivatives
					fragDepth: true, // set to use fragment depth values
					drawBuffers: false, // set to use draw buffers
					shaderTextureLOD: false // set to use shader texture LOD
				},
				vertexShader: `
				
				varying vec4 pos;
				varying vec3 vert_pos;
				
				void main() 
				{
					${sdShaderMaterial.position_formula}
				
					pos = gl_Position;
					vert_pos = position;
				}
				`,
				fragmentShader: `
				
				varying vec4 pos;
				varying vec3 vert_pos;
				
				uniform float r;
				uniform float g;
				uniform float b;
				uniform float opacity;
				
				void main()
				{
					//gl_FragColor.rgba = vec4( 1.0, 1.0, 1.0, 0.9 );
					gl_FragColor.rgba = vec4( r * 2.0, g * 2.0, b * 2.0, 0.7 * 2.0 * opacity );
				
					if ( vert_pos.z < 0.3 )
					gl_FragColor.rgba = vec4( r, g, b, 0.7 * opacity );
				
					`+( sdShaderMaterial.EXT_frag_depth ? `
						//gl_FragDepthEXT = ( pos.z ) / 1024.0;
						gl_FragDepthEXT = ( pos.z - 3.0 ) / 1024.0;
					` : '' )+`
				}	
			`
			});
		}
		else
		if ( method === 'sprite' )
		{
			mat = new THREE.ShaderMaterial({
				uniforms: 
				{
					tDiffuse: { type: "t", value: texture },
					fog: { type: "c", value: new THREE.Color( 0x000000 ) },
					fog_intensity: { type: "f", value: 0 },
					brightness_r: { type: "f", value: 999 },
					brightness_g: { type: "f", value: 999 },
					brightness_b: { type: "f", value: 999 },
					diffuse: { type: "c", value: new THREE.Color( 0xffffff ) },
					depth_offset: { type: "f", value: 1.5 },
					opacity: { type: "f", value: 1 }
				},
				depthWrite: false,
				transparent: true,
				flatShading: true,
				extensions: {
					derivatives: false,
					fragDepth: true, 
					drawBuffers: false,
					shaderTextureLOD: false
				},
				vertexShader: `
				
				varying vec2 vUv;
				
				varying vec4 pos;
				
				uniform vec3 fog;
				uniform float fog_intensity;
				varying float fog_final;
				
				void main() 
				{
					vUv = uv;
				
					${sdShaderMaterial.position_formula}
				
					pos = gl_Position;
				
					if ( fog_intensity > 0.0 )
					{
						//float fog_morph = 1.0 / ( 1.0 + gl_Position.z * 0.017 );
						float fog_morph = 1.0 / max( 1.0 + gl_Position.z * 0.017, 1.0 );
						fog_final = fog_morph;
					}
					else
					{
						fog_final = 1.0;
					}
				}
				`,
				fragmentShader: `
				
				uniform sampler2D tDiffuse;
				varying vec2 vUv;
				
				varying vec4 pos;
				
				varying float fog_final;
				uniform vec3 fog;
				
				uniform float brightness_r;
				uniform float brightness_g;
				uniform float brightness_b;
				
				uniform vec3 diffuse;
				uniform float depth_offset;
				uniform float opacity;
				
				void main()
				{
					gl_FragColor.rgba = texture2D( tDiffuse, vUv ).rgba;
					
					//if ( gl_FragColor.a < 0.5 )
					if ( gl_FragColor.a < 0.01 )
					{
						discard;
					}
					gl_FragColor.r /= gl_FragColor.a;
					gl_FragColor.g /= gl_FragColor.a;
					gl_FragColor.b /= gl_FragColor.a;
				
					gl_FragColor.rgb *= diffuse.rgb;
				
					gl_FragColor.a *= opacity;
				
					if ( fog_final < 1.0 )
					{
						gl_FragColor.rgb *= vec3( brightness_r, brightness_g, brightness_b );

						gl_FragColor.rgb = gl_FragColor.rgb * vec3( fog_final ) + fog.rgb * vec3( 1.0 - fog_final );
					}
				
					`+( sdShaderMaterial.EXT_frag_depth ? `
						gl_FragDepthEXT = ( pos.z - depth_offset ) / 1024.0;
					` : '' )+`
				}	
			`
			});
		}
		else
		if ( method === 'particle' )
		{
			mat = new THREE.ShaderMaterial({
				uniforms: 
				{
					tDiffuse: { type: "t", value: texture },
					fog: { type: "c", value: new THREE.Color( 0x000000 ) },
					screen_height: { type: "f", value: 1 }, // define later
					dot_scale: { type: "f", value: 1 },
					
					lamp0_pos: { type: "v3", value: new THREE.Vector3() },
					lamp0_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp1_pos: { type: "v3", value: new THREE.Vector3() },
					lamp1_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp2_pos: { type: "v3", value: new THREE.Vector3() },
					lamp2_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp3_pos: { type: "v3", value: new THREE.Vector3() },
					lamp3_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp4_pos: { type: "v3", value: new THREE.Vector3() },
					lamp4_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp5_pos: { type: "v3", value: new THREE.Vector3() },
					lamp5_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp6_pos: { type: "v3", value: new THREE.Vector3() },
					lamp6_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp7_pos: { type: "v3", value: new THREE.Vector3() },
					lamp7_color: { type: "c", value: new THREE.Color( 0x000000 ) }
				},
				depthWrite: true,
				depthTest: true,
				transparent: false,
				flatShading: true,
				extensions: {
					derivatives: false,
					fragDepth: true,
					drawBuffers: false,
					shaderTextureLOD: false
				},
				vertexShader: `
				
				uniform float screen_height;
				uniform vec3 fog;
				uniform float dot_scale;
				
				attribute vec4 colo;
				varying vec4 rgba;
				varying vec4 rgba2;
				
				attribute float uv2;
				
				varying vec3 pre_calc;
				
				`+sdShaderMaterial.GenerateDynamicLightUniformsCode()+`
				
				void main()
				{
					vec3 dyn_light_intens;
				
					bool is_visible = ( uv2 >= 0.0 && colo.a > 0.0 );
				
					if ( is_visible ) // Taking care of NVIDIA bug... We need 2 if-s for no reason at all but in else case we can get random noise
					{
						dyn_light_intens = vec3( 0.0, 0.0, 0.0 );
						`+sdShaderMaterial.GenerateDynamicLightAffectionCodeForColor( `position`, `dyn_light_intens` )+`
					}
				
					if ( is_visible )
					{
						//gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
						${sdShaderMaterial.position_formula}
				
						rgba = colo;

						//rgba.rgb *= vec3( uv2 );
						rgba.rgb *= vec3( uv2 ) + dyn_light_intens.rgb;

						gl_PointSize = 0.8 * screen_height / ( gl_Position.z * 0.5 + 1.0 ) * dot_scale * colo.a;
				
						float di = sqrt( pow( ( gl_Position.x - 0.5 ) / ( 0.25 + gl_Position.z * 0.5 ), 2.0 ) + pow( ( gl_Position.y - 0.5 ) / ( 0.25 + gl_Position.z * 0.5 ), 2.0 ) );
						
						gl_PointSize *= min( 2.7, 1.0 + di * 0.2 );
				
						float fog_morph = 1.0 / ( 1.0 + gl_Position.z * 0.017 ); // 0.025
						rgba2.rgb = rgba.rgb * vec3( fog_morph * 0.8 ) + fog.rgb * vec3( 1.0 - fog_morph );
						rgba.rgb = rgba.rgb * vec3( fog_morph ) + fog.rgb * vec3( 1.0 - fog_morph );
				
				
						// For EXT_frag_depth
						//pre_calc.x = gl_Position.z / 1024.0;
						//pre_calc.y = 16.0 / ( 4096.0 / dot_scale + gl_Position.z * gl_Position.z * 1.024 );
				
						// For EXT_frag_depth_sphericals
						pre_calc.x = gl_Position.z;
						pre_calc.y = gl_Position.w;
						pre_calc.z = dot_scale * colo.a / gl_Position.z / gl_Position.z * 0.5;
					}
					else
					{
						rgba.a = 0.0;
						gl_PointSize = 0.0;
						gl_Position.xy = vec2( -1.0, -1.0 );
					}
				}`,
				fragmentShader: `
				
				varying vec4 rgba;
				varying vec4 rgba2;
				
				varying vec3 pre_calc;
				
				void main()
				{
					if ( rgba.a <= 0.0 )
					discard;
				
					float di_pow2 = pow( ( gl_PointCoord.x - 0.5 ), 2.0 ) + pow( ( gl_PointCoord.y - 0.5 ), 2.0 );
				
					if ( 0.25 < di_pow2 )
					discard;
				
					gl_FragColor.rgb = rgba.rgb;
				
					`+( sdShaderMaterial.EXT_frag_depth ? `
						gl_FragDepthEXT = pre_calc.x - pre_calc.y * pow( 0.25 - di_pow2, 0.5 );
					` : '' )+`
				
					`+( sdShaderMaterial.EXT_frag_depth_sphericals ? `
						gl_FragDepthEXT = ( ( pre_calc.x - pre_calc.z * pow( 0.25 - di_pow2, 0.5 ) ) / pre_calc.y + 1.0 ) * 0.5;
					` : '' )+`
					
					
					if ( 0.4 * 0.4 < di_pow2 )
					{
						gl_FragColor.rgb = rgba2.rgb;
				
						/*
						`+( sdShaderMaterial.EXT_frag_depth ? `
							gl_FragDepthEXT += 2.0 / 1024.0 + gl_FragDepthEXT * 0.1;
						` : '' )+`
					
						*/
						`+( sdShaderMaterial.EXT_frag_depth_sphericals ? `
							gl_FragDepthEXT = ( ( pre_calc.x + 0.0025 - pre_calc.z * pow( 0.25 - di_pow2, 0.5 ) ) / pre_calc.y + 1.0 ) * 0.5;
						` : '' )+`
						
					}
				}
				`
			});
			mat.ScreenUpdated = function()
			{
				mat.uniforms.screen_height.value = main.DisplayedScreen.height * 75 / main.main_camera.fov * main.pixel_ratio;
			};
		}
		else
		if ( method === 'color' )
		{
			mat = new THREE.ShaderMaterial({
				uniforms: 
				{
					diffuse: { type: "c", value: new THREE.Color( 0xffffff ) },
					opacity: { value: 1 },
					depth_offset: { type: "f", value: 1.5 }
				},
				depthWrite: true,
				transparent: false,
				flatShading: true,
				extensions: {
					derivatives: false,
					fragDepth: true, 
					drawBuffers: false,
					shaderTextureLOD: false
				},
				vertexShader: `
				
				varying vec4 pos;
				
				void main() 
				{
					${sdShaderMaterial.position_formula}
					
					pos = gl_Position;
				}
				`,
				fragmentShader: `
				uniform vec3 diffuse;
				uniform float opacity;
				
				varying vec4 pos;
				uniform float depth_offset;

				void main()
				{
					gl_FragColor.rgb = diffuse.rgb;
					gl_FragColor.a = opacity;
					
					`+( sdShaderMaterial.EXT_frag_depth ? `
						gl_FragDepthEXT = ( pos.z - depth_offset ) / 1024.0;
					` : '' )+`
				}	
			`
			});
		}
		else
		if ( method === 'voxel_map' )
		{
			mat = new THREE.ShaderMaterial({
				uniforms: 
				{
					tDiffuse: { type: "t", value: texture },
					fog: { type: "c", value: new THREE.Color( 0x000000 ) },
					fog_intensity: { type: "f", value: 0 },
					/*brightness_r: { type: "f", value: 999 },
					brightness_g: { type: "f", value: 999 },
					brightness_b: { type: "f", value: 999 },*/
					depth_offset: { type: "f", value: 1.5 },
					
					lamp0_pos: { type: "v3", value: new THREE.Vector3() },
					lamp0_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp1_pos: { type: "v3", value: new THREE.Vector3() },
					lamp1_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp2_pos: { type: "v3", value: new THREE.Vector3() },
					lamp2_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp3_pos: { type: "v3", value: new THREE.Vector3() },
					lamp3_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp4_pos: { type: "v3", value: new THREE.Vector3() },
					lamp4_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp5_pos: { type: "v3", value: new THREE.Vector3() },
					lamp5_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp6_pos: { type: "v3", value: new THREE.Vector3() },
					lamp6_color: { type: "c", value: new THREE.Color( 0x000000 ) },
					
					lamp7_pos: { type: "v3", value: new THREE.Vector3() },
					lamp7_color: { type: "c", value: new THREE.Color( 0x000000 ) }
				},
				depthWrite: true,
				transparent: false,
				flatShading: true,
				extensions: {
					derivatives: false,
					fragDepth: true, 
					drawBuffers: false,
					shaderTextureLOD: false
				},
				vertexShader: `
				
				varying vec2 vUv;
				
				varying vec4 pos;
				varying vec4 world_pos;
				
				uniform vec3 fog;
				uniform float fog_intensity;
				varying float fog_final;
				
				void main() 
				{
					vUv = uv;
				
					${sdShaderMaterial.position_formula}
				
					pos = gl_Position;
				
					//world_pos = modelViewMatrix * vec4( position, 1.0 );
					world_pos = modelMatrix * vec4( position, 1.0 );
				
					if ( fog_intensity > 0.0 )
					{
						//float fog_morph = 1.0 / ( 1.0 + gl_Position.z * 0.017 );
						float fog_morph = 1.0 / max( 1.0 + gl_Position.z * 0.017, 1.0 );
						fog_final = fog_morph;
					}
					else
					{
						fog_final = 1.0;
					}
				}
				`,
				fragmentShader: /* More of a volume-based solution. Needs 3 times as less data to upload, 3 times as less data to update in bitmap, 3 times as less polygons and just needs camera front vector to be passed so proper side of a mesh is chosen.
						
						
				`
				
				uniform sampler2D tDiffuse;
				varying vec2 vUv;
				
				varying vec4 pos;
				varying vec4 world_pos;
				
				varying float fog_final;
				uniform vec3 fog;
				
				uniform float depth_offset;
				
				`+sdShaderMaterial.GenerateDynamicLightUniformsCode()+`
				
				void main()
				{
					vec2 xy = vec2( 0.0, 0.0 );

                    xy.x += mod( world_pos.x, 32.0 ) * ( 1.0 / 1024.0 );
                    xy.y += 1.0 - mod( world_pos.y, 32.0 ) * ( 1.0 / 128.0 );

                    xy.x += floor( mod( world_pos.z, 32.0 ) ) * ( 1.0 / 1024.0 ) * 32.0;

					gl_FragColor.rgba = texture2D( tDiffuse, xy ).rgba;

                    if ( world_pos.x < 1.0 || world_pos.y < 1.0 || world_pos.z < 1.0 )
                    if ( world_pos.x < 10.0 && world_pos.y < 10.0 && world_pos.z < 10.0 )
                    {
						gl_FragColor.a = 1.0;
						gl_FragColor.rgb = vec3( world_pos.x / 32.0, world_pos.y / 32.0, world_pos.z / 32.0 );
					}
					
					if ( gl_FragColor.a < 0.5 )
					{
						discard;
					}
					gl_FragColor.a = 1.0;
                    

				
					vec3 dyn_light_intens = vec3( 0.0, 0.0, 0.0 );
				
					`+sdShaderMaterial.GenerateDynamicLightAffectionCodeForColor( `world_pos`, `dyn_light_intens` )+`
				
					//gl_FragColor.rgb += dyn_light_intens.rgb;
					gl_FragColor.rgb += dyn_light_intens.rgb * ( vec3( 0.05 ) + gl_FragColor.rgb * 0.95 );
				
				
					if ( fog_final < 1.0 )
					{
						//gl_FragColor.rgb *= vec3( brightness_r, brightness_g, brightness_b );

						gl_FragColor.rgb = gl_FragColor.rgb * vec3( fog_final ) + fog.rgb * vec3( 1.0 - fog_final );
					}
					
				
					`+( sdShaderMaterial.EXT_frag_depth ? `
						gl_FragDepthEXT = ( pos.z - depth_offset ) / 1024.0;
					` : '' )+`
				
				}	
			`
						
						
						
						
						
						
						
						
						
						*/`
				
				uniform sampler2D tDiffuse;
				varying vec2 vUv;
				
				varying vec4 pos;
				varying vec4 world_pos;
				
				varying float fog_final;
				uniform vec3 fog;
				
				/*uniform float brightness_r;
				uniform float brightness_g;
				uniform float brightness_b;*/
				
				uniform float depth_offset;
				
				`+sdShaderMaterial.GenerateDynamicLightUniformsCode()+`
				
				void main()
				{
					gl_FragColor.rgba = texture2D( tDiffuse, vUv ).rgba * vec4( 3.0, 3.0, 3.0, 1.0 );
					
					if ( gl_FragColor.a < 0.5 )
					{
						discard;
					}
				
					
				
					vec3 dyn_light_intens = vec3( 0.0, 0.0, 0.0 );
				
					`+sdShaderMaterial.GenerateDynamicLightAffectionCodeForColor( `world_pos`, `dyn_light_intens` )+`
				
					//gl_FragColor.rgb += dyn_light_intens.rgb;
					gl_FragColor.rgb += dyn_light_intens.rgb * ( vec3( 0.05 ) + gl_FragColor.rgb * 0.95 );
				
				
					if ( fog_final < 1.0 )
					{
						//gl_FragColor.rgb *= vec3( brightness_r, brightness_g, brightness_b );

						gl_FragColor.rgb = gl_FragColor.rgb * vec3( fog_final ) + fog.rgb * vec3( 1.0 - fog_final );
					}
					
				
					`+( sdShaderMaterial.EXT_frag_depth ? `
						gl_FragDepthEXT = ( pos.z - depth_offset ) / 1024.0;
					` : '' )+`
				
				}	
			`
			});
		}
		else
		throw new Error('sdShaderMaterial: '+method+' is not a defined method');
		
		Object.defineProperty( mat, "color",
		{
			get: function color() { return this.uniforms.diffuse.value; },
			set: function color( v ) { this.uniforms.diffuse.value = v; }
		});
		
		Object.defineProperty( mat, "opacity",
		{
			get: function opacity() { return this.uniforms.opacity.value; },
			set: function opacity( v ) { this.uniforms.opacity.value = v; }
		});
		if ( mat.uniforms.tDiffuse !== undefined )
		{
			Object.defineProperty( mat, "map", 
			{
				get: function map() { return this.uniforms.tDiffuse.value; },
				set: function map( v ) { this.uniforms.tDiffuse.value = v; }
			});
		}
		
		return mat;
	}
	
	static getStackTrace()
	{
		var obj = {};
		Error.captureStackTrace( obj, sdShaderMaterial.getStackTrace );
		return obj.stack;
	}
	
}
sdShaderMaterial.init_class();