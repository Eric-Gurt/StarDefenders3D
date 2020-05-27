class sdBuild extends sdGun
{
	change_transformations( c )
	{
		if ( c.reload_timer > 0 && c.reload_timer < Math.PI * 2 )
		{
			c.cur_weapon.position.z -= Math.sin( c.reload_timer * 0.5 );

			c.cur_weapon.rotation.y += Math.sin( c.reload_timer * 0.5 ) * 0.2;
			c.cur_weapon.rotation.z += Math.sin( c.reload_timer * 0.5 ) * 0.2;
		}
	}
}