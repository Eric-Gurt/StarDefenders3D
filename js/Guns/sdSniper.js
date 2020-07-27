class sdSniper extends sdGun
{
	change_transformations( c, third=false )
	{
		const sniper_reload_offset = -5;
		if ( c.reload_timer + sniper_reload_offset > 0 && c.reload_timer + sniper_reload_offset < Math.PI * 2 )
		c.cur_weapon_mesh.position.z += Math.sin( c.reload_timer + sniper_reload_offset ) * 0.2;
	}
}