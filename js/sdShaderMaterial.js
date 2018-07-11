

/* global THREE, main */

class sdShaderMaterial
{
	static init_class()
	{
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
					brightness: { type: "f", value: 1 }
				},
				depthWrite: true,
				transparent: false,
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
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
				
					pos = gl_Position;
					vert_pos = position;
				}
				`,
				fragmentShader: `
				
				varying vec4 pos;
				varying vec3 vert_pos;
				
				void main()
				{
					gl_FragColor.rgba = vec4( 1.0, 1.0, 1.0, 1.0 );
				
					if ( vert_pos.z < 0.3 )
					gl_FragColor.rgba = vec4( 1.0, 1.0, 0.0, 1.0 );
				
					//gl_FragDepthEXT = ( pos.z ) / 1024.0;
					gl_FragDepthEXT = ( pos.z - 3.0 ) / 1024.0;
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
					brightness: { type: "f", value: 999 }
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
				
				uniform vec3 fog;
				uniform float fog_intensity;
				varying float fog_final;
				
				void main() 
				{
					vUv = uv;
				
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
				
					pos = gl_Position;
				
					if ( fog_intensity > 0.0 )
					{
						float fog_morph = 1.0 / ( 1.0 + gl_Position.z * 0.017 );
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
				
				uniform float brightness;
				
				void main()
				{
					gl_FragColor.rgba = texture2D( tDiffuse, vUv ).rgba;
					
					if ( gl_FragColor.a < 0.5 )
					{
						discard;
					}
				
					if ( fog_final < 1.0 )
					{
						gl_FragColor.rgb *= vec3( brightness );

						gl_FragColor.rgb = gl_FragColor.rgb * vec3( fog_final ) + fog.rgb * vec3( 1.0 - fog_final );
					}
					gl_FragDepthEXT = ( pos.z - 1.5 ) / 1024.0;
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
					dot_scale: { type: "f", value: 1 }
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
				
				attribute float uv2;
				
				varying vec2 pre_calc;
				
				void main()
				{
					if ( uv2 >= 0.0 && colo.a > 0.0 )
					{
						gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				
						rgba = colo;

						rgba.rgb *= vec3( uv2 );


						gl_PointSize = 0.8 * screen_height / ( gl_Position.z * 0.5 + 1.0 ) * dot_scale * colo.a;
				
						float di = sqrt( pow( ( gl_Position.x - 0.5 ) / ( 0.25 + gl_Position.z * 0.5 ), 2.0 ) + pow( ( gl_Position.y - 0.5 ) / ( 0.25 + gl_Position.z * 0.5 ), 2.0 ) );
						
						gl_PointSize *= min( 2.7, 1.0 + di * 0.2 );
				
						float fog_morph = 1.0 / ( 1.0 + gl_Position.z * 0.017 ); // 0.025
						rgba.rgb = rgba.rgb * vec3( fog_morph ) + fog.rgb * vec3( 1.0 - fog_morph );
				
						pre_calc.x = gl_Position.z / 1024.0;
						pre_calc.y = 16.0 / ( 4096.0 / dot_scale + gl_Position.z * gl_Position.z * 1.024 );
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
				
				varying vec2 pre_calc;
				
				void main()
				{
					if ( rgba.a <= 0.0 )
					discard;
				
					float di_pow2 = pow( ( gl_PointCoord.x - 0.5 ), 2.0 ) + pow( ( gl_PointCoord.y - 0.5 ), 2.0 );
				
					if ( 0.25 < di_pow2 )
					discard;
				
					gl_FragColor.rgb = rgba.rgb;
				
					gl_FragDepthEXT = pre_calc.x - pre_calc.y * pow( 0.25 - di_pow2, 0.5 );
					
					
					if ( 0.4 * 0.4 < di_pow2 )
					{
						gl_FragColor.r += 0.1;
						gl_FragColor.g += 0.1;
						gl_FragColor.b += 0.1;
				
						gl_FragDepthEXT += 2.0 / 1024.0 + gl_FragDepthEXT * 0.1;
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
					opacity: { value: 1 }
				},
				depthWrite: true,
				transparent: false,
				flatShading: true,
				vertexShader: `
				void main() 
				{
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
				}
				`,
				fragmentShader: `
				uniform vec3 diffuse;
				uniform float opacity;

				void main()
				{
					gl_FragColor.rgb = diffuse.rgb;
					gl_FragColor.a = opacity;
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