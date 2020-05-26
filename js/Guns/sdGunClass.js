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
        sdGunClass.weapon_switch_time = 7; // 15
    }
}
sdGunClass.init_class();