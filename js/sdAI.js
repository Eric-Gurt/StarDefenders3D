/*

	Some basic AI which should catch some of player's attention.

*/
/* global sdCharacter, main, THREE */

class sdAI
{
	static init_class()
	{
	}
	
	constructor( c )
	{
		this.ai = c;
		
		this.fav_gun = ~~( Math.random() * 2 );
		this.fav_fire_mode = 1 + ~~( Math.random() * 2 );
		
		this.control_change_tim = 0;
		
		this.fire_probability = 0;
	}
	
	ApplyLogic( GSPEED )
	{
		var c = this.ai;
		
		this.control_change_tim -= GSPEED;
		if ( this.control_change_tim < 0 )
		{
			c.act_x = ~~( Math.random() * 3 ) - 1;
			
			if ( Math.random() < 0.5 )
			c.act_y = ~~( Math.random() * 3 ) - 1;
			else
			c.act_y = -1;
		
			c.act_sprint = ~~( Math.random() * 2 );
			c.act_sit = ~~( Math.random() * 2 );
			c.act_jump = ~~( Math.random() * 2 );
			
			this.control_change_tim = 10 + Math.random() * 20;
		}
		
		c.act_weapon = this.fav_gun;
		
		//var no_targets = true;
		var best_c = null;
		var best_an = 100;
		var best_targ = null;
		
		var any_enemy = null;
		
		for ( var i = 0; i < sdCharacter.characters.length; i++ )
		{
			var c2 = sdCharacter.characters[ i ];
			
			if ( c.team !== c2.team )
			{
				if ( any_enemy === null )
				any_enemy = c2;
				
				var morph = main.TraceLine( c.x, c.y + sdCharacter.shoot_offset_y, c.z, c2.x, c2.y + sdCharacter.shoot_offset_y, c2.z, null, 5, 0 );
				
				if ( morph === 1 )
				{
					var targ = new THREE.Vector3( c.x-c2.x, c.y-c2.y, c.z-c2.z );
					
					targ.x += ( c2.tox - c.tox ) / sdCharacter.weapon_speed[ this.fav_gun + ( this.fav_fire_mode - 1 ) * 2 ];
					targ.y += ( c2.toy - c.toy ) / sdCharacter.weapon_speed[ this.fav_gun + ( this.fav_fire_mode - 1 ) * 2 ];
					targ.z += ( c2.toz - c.toz ) / sdCharacter.weapon_speed[ this.fav_gun + ( this.fav_fire_mode - 1 ) * 2 ];
					
					var an = c.look_direction.angleTo( targ );
					
					if ( an < best_an )
					{
						best_c = c2;
						best_an = an;
						best_targ = targ;
					}
				}
			}
		}
		var fire_prepare = false;
		var force_rocket = false;
		
		if ( best_c === null )
		{
			if ( any_enemy )
			{
				var targ = new THREE.Vector3( c.x-any_enemy.x, c.y-any_enemy.y, c.z-any_enemy.z );
			
				c.look_direction.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.995, GSPEED ) );
				
				fire_prepare = true;
				force_rocket = true;
			}
		}
		else
		{

			var targ = best_targ;

			if ( best_an > Math.PI * 0.666 )
			c.look_direction.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.999, GSPEED ) );
			else
			{
				c.look_direction.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.995, GSPEED ) );
				
				fire_prepare = true;
			}
			
			c.look_direction.normalize();

			c.walk_vector_xz.x = c.look_direction.x;
			c.walk_vector_xz.y = c.look_direction.z;
			c.walk_vector_xz.normalize();
		}
		
		if ( fire_prepare && !force_rocket )
		{
			this.fire_probability = Math.min( 1, this.fire_probability + GSPEED * 0.01 );
		}
		else
		{
			this.fire_probability = Math.max( 0, this.fire_probability - GSPEED * 0.02 );
		}
		//console.log( this.fire_probability );
		
		if ( force_rocket || ( fire_prepare && this.fire_probability >= Math.random() ) )
		{
			if ( force_rocket )
			{
				c.act_weapon = 1;
				c.act_fire = 1;
			}
			else
			c.act_fire = this.fav_fire_mode;
		}
		else
		{
			c.act_fire = 0;
		}
	}
	
	static ThinkNow( GSPEED )
	{
	}
}
sdAI.init_class();