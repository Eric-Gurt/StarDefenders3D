/* global main, sdGunClass */

class sdSaw extends sdGun
{
	change_transformations( c, third=false )
	{
		if ( third )
		{
			var prog = c.reload_timer / sdGunClass.weapon_reload_times[ main.WEAPON_SAW ];

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

			/*
			active_weapon.position.x = 0;
			active_weapon.position.y = -4 * (1-rel) + (-5.25) * rel;
			active_weapon.position.z = -4.5;

			active_weapon.position.x += 4 * rel;
			active_weapon.position.y += 4 * rel;
			active_weapon.position.z += 4 * rel;*/
		}
		else
		{
			var prog = c.reload_timer / sdGunClass.weapon_reload_times[ this.gun_id ];

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
	}
}