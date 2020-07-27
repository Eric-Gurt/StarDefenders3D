class sdGunClass
{
	static init_class()
	{
		//										[ rifle,	rocket,		shotgun,	sniper,		spark,		build1,	saw ]
		sdGunClass.weapon_ammo_per_clip =		[ 25,		Infinity,	8,			Infinity,	15,			15,		Infinity ];
		sdGunClass.weapon_reload_times =		[ 2.5,		25,			30 * 0.3,	30,			5,			5,		10 ];
		sdGunClass.weapon_self_knockbacks =	[ 0.1,		0.5,		0.35,		0.5,		0.2,		0,		0 ];
		sdGunClass.weapon_is_rocket =			[ false,	true,		false,		false,		true,		false,	false ];
		sdGunClass.weapon_is_sniper =			[ false,	false,		false,		true,		false,		false,	false ];
		sdGunClass.weapon_is_plasma =			[ false,	false,		false,		false,		true,		false,	false ];

		sdGunClass.weapon_speed =				[ 40,		4,			40,			80,			40,			0,		40 ];
		sdGunClass.weapon_knock_power =		[ 0.02,		0.1,		0.01,		0.04,		0.1,		9,		0.1 ]; // Splash damage depends on this value too, besides hp_damage
		sdGunClass.weapon_hp_damage =			[ 30,		115,		10,			90,			20/*40*/,	0,		80 ];
		sdGunClass.weapon_hp_damage_head =		[ 60,		115,		20,			180,		22/*45*/,	0,		110 ];
		sdGunClass.weapon_knock_count =		[ 1,		1,			15,			1,			1,			0,		1 ];
		sdGunClass.weapon_knock_spread =		[ 0,		0,			5 * 4/3,	0.5,		2.5,		0,		0 ];
		sdGunClass.weapon_spread_from_recoil =	[ 5,		0,			0,			0,			5,			0,		0 ];
		sdGunClass.weapon_splash_radius =		[ null,		8,			null,		null,		4,			4,		null ];
		sdGunClass.weapon_spawn_shell =		[ true,		false,		true,		false,		false,		false,	false ];
		sdGunClass.weapon_melee =				[ false,	false,		false,		false,		false,		false,	true ];
		sdGunClass.weapon_zeros =				[ 0,		0,			0,			0,			0,			0,		0 ]; // Used as copy source for starter reload times per weapon
		sdGunClass.weapon_old_gun_names = [ 'gun_rifle', 'gun_rocket', 'gun_shotgun', 'gun_sniper', 'gun_spark', 'gun_build', 'gun_saw' ];
		sdGunClass.weapon_switch_time = 7; // 15
		
		sdGunClass.gun_classes = [];
		/*
		main.WEAPON_RIFLE = 0;
		main.WEAPON_ROCKET = 1;
		main.WEAPON_SHOTGUN = 2;
		main.WEAPON_SNIPER = 3;
		main.WEAPON_SPARK = 4;
		main.WEAPON_BUILD1 = 5;
		main.WEAPON_SAW = 6;
		*/
	   
		// Spawn some old gun classes, values for these comes from arrays above. New classes will use different spawn method, for example from params objects.
		for ( var i = 0; i < 7; i++ )
		sdGunClass.gun_classes[ i ] = new sdGunClass( { old_class_id: i }, i );
	}
	constructor( params, uid )
	{
		this.uid = uid;
		
		this.old_class_id = -1; // Used for voxel model ID as well. Voxel model should be separate from players later.
		
		if ( params.old_class_id !== undefined )
		{
			let old_class_id = params.old_class_id;
			
			this.old_class_id = old_class_id;

			this.ammo_per_clip = sdGunClass.weapon_ammo_per_clip[ old_class_id ];
			this.reload_time = sdGunClass.weapon_reload_times[ old_class_id ];

			this.self_knockback = sdGunClass.weapon_self_knockbacks[ old_class_id ];
			this.is_rocket = sdGunClass.weapon_is_rocket[ old_class_id ];
			this.is_sniper = sdGunClass.weapon_is_sniper[ old_class_id ];
			this.is_plasma = sdGunClass.weapon_is_plasma[ old_class_id ];

			this.speed = sdGunClass.weapon_speed[ old_class_id ];
			this.knock_power = sdGunClass.weapon_knock_power[ old_class_id ]; // Splash damage depends on this value too, besides hp_damage
			this.hp_damage = sdGunClass.weapon_hp_damage[ old_class_id ];
			this.hp_damage_head = sdGunClass.weapon_hp_damage_head[ old_class_id ];
			this.projectile_count = sdGunClass.weapon_knock_count[ old_class_id ];
			this.projectile_spread = sdGunClass.weapon_knock_spread[ old_class_id ];
			this.spread_from_recoil = sdGunClass.weapon_spread_from_recoil[ old_class_id ];
			this.splash_radius = sdGunClass.weapon_splash_radius[ old_class_id ];
			this.spawn_shell = sdGunClass.weapon_spawn_shell[ old_class_id ];
			this.is_melee = sdGunClass.weapon_melee[ old_class_id ];
			this.has_muzzle_flash = true;
			this.is_build_tool = false;

			this.name = sdGunClass.weapon_old_gun_names[ old_class_id ];
			
			// Default animations
			this.set_fpspos = function( c )
			{
				c.cur_weapon_mesh.position.y -= Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 4 ) * 7;

				c.cur_weapon_mesh.rotation.x -= Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 ) * 1;
				c.cur_weapon_mesh.rotation.y -= Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 ) * 0.5;
				c.cur_weapon_mesh.position.x += Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 ) * 4;
			};
			
			this.change_transformations = function( c, third=false )
			{
				// No use to fill this in for now
			};
			
			// Altered animations
			if ( old_class_id === main.WEAPON_SNIPER )
			{
				this.change_transformations = function( c, third=false )
				{
					const sniper_reload_offset = -5;
					if ( c.cur_weapon_object.reload_timer + sniper_reload_offset > 0 && c.cur_weapon_object.reload_timer + sniper_reload_offset < Math.PI * 2 )
					c.cur_weapon_mesh.position.z += Math.sin( c.cur_weapon_object.reload_timer + sniper_reload_offset ) * 0.2;
				};
			}
			else
			if ( old_class_id === main.WEAPON_BUILD1 )
			{
				this.has_muzzle_flash = false;
				this.is_build_tool = true;
				
				this.change_transformations = function( c, third=false )
				{
					if ( c.cur_weapon_object.reload_timer > 0 && c.cur_weapon_object.reload_timer < Math.PI * 2 )
					{
						c.cur_weapon_mesh.position.z -= Math.sin( c.cur_weapon_object.reload_timer * 0.5 );

						c.cur_weapon_mesh.rotation.y += Math.sin( c.cur_weapon_object.reload_timer * 0.5 ) * 0.2;
						c.cur_weapon_mesh.rotation.z += Math.sin( c.cur_weapon_object.reload_timer * 0.5 ) * 0.2;
					}
				};
			}
			else
			if ( old_class_id === main.WEAPON_SAW )
			{
				this.has_muzzle_flash = false;
				
				this.change_transformations = function( c, third=false )
				{
					if ( third )
					{
						var prog = c.cur_weapon_object.reload_timer / c.cur_weapon_object.gun_class.reload_time;

						var rel;

						var mid = 0.9;

						if ( prog > mid )
						rel = ( prog - mid ) / ( 1 - mid );
						else
						{
							rel = 1 - prog / mid;
							rel *= rel;
						}
						rel = rel * 1.2 - 0.2;

						c.cur_weapon_mesh.rotation.y -= Math.PI / 4 * rel;
						c.cur_weapon_mesh.rotation.x += Math.PI / 2 * rel;
						c.cur_weapon_mesh.rotation.z -= Math.PI / 8 * rel;
					}
					else
					{
						var prog = c.cur_weapon_object.reload_timer / c.cur_weapon_object.gun_class.reload_time;

						var rel;

						var mid = 0.9;

						if ( prog > mid )
						rel = ( prog - mid ) / ( 1 - mid );
						else
						{
							rel = 1 - prog / mid;
							rel *= rel;
						}
						rel = rel * 1.2 - 0.2;

						c.cur_weapon_mesh.rotation.y -= Math.PI / 4 * rel;
						c.cur_weapon_mesh.rotation.x += Math.PI / 2 * rel;
						c.cur_weapon_mesh.rotation.z -= Math.PI / 8 * rel;


						c.cur_weapon_mesh.position.x = 0;
						c.cur_weapon_mesh.position.y = -4 * (1-rel) + (-5.25) * rel;
						c.cur_weapon_mesh.position.z = -4.5;

						c.cur_weapon_mesh.position.x += 4 * rel;
						c.cur_weapon_mesh.position.y += 4 * rel;
						c.cur_weapon_mesh.position.z += 4 * rel;
					}
				};
			}
		}
	}
}
sdGunClass.init_class();