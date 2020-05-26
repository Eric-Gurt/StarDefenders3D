/*

	Some basic AI which should catch some of player's attention.

*/
/* global sdCharacter, main, THREE */

class sdAI
{
	static init_class()
	{
		sdAI.attack_walls_randomly_when_nobody_is_visible = false;
	}
	
	constructor( c )
	{
		this.ai = c;
		
		//this.fav_gun = ~~( Math.random() * 2 );
		this.ResetFavGun();
		//this.fav_fire_mode = 1 + ~~( Math.random() * 2 );
		this.fav_fire_mode = 1;
		
		this.control_change_tim = 0;
		
		this.fire_probability = 0;
		this.fire_wish = 0;
		
		this.look_vector = new THREE.Vector3( 1, 0, 0 ); // Zero value will cause NaN during lerp
	}
	
	ResetFavGun()
	{
		//this.fav_gun = ~~( Math.random() * 5 );
		this.fav_gun = main.allowed_ai_guns[ ~~( Math.random() * main.allowed_ai_guns.length ) ];
	}
	
	ApplyLogic( GSPEED ) // Never return early, because .look_direction must be normalized (or else shots will throw AI into sky)
	{
		var c = this.ai;
		
		if ( main.ai_difficulty <= 0 )
		{
			c.act_x = 0;
			c.act_y = 0;
			c.act_fire = 0;
			c.act_jump = 0;
			return;
		}
		
		if ( main.mobile )
		GSPEED *= 0.5;
		
		
		var skill_mult = main.ai_difficulty * 2;
	
		// Skill boost
		/*var max_score = 1;
		for ( var i = 0; i < main.team_scores.length; i++ )
		max_score = Math.max( max_score, main.team_scores[ i ] );
	
		skill_mult *= ( 1 + Math.max( 0, max_score - main.team_scores[ c.team ] ) / 100 );
		*/
		GSPEED *= skill_mult;
		
		this.control_change_tim -= GSPEED;
		if ( this.control_change_tim < 0 )
		{
			if ( main.ai_difficulty > 0.2 )
			c.act_x = ~~( Math.random() * 3 ) - 1;
			else
			c.act_x = 0;
			
			if ( Math.random() < 0.5 )
			c.act_y = ~~( Math.random() * 3 ) - 1;
			else
			c.act_y = -1;
		
			if ( this.fav_gun === main.WEAPON_SAW )
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

		function SetAsRandom3D( v )
		{
			var omega = Math.random() * Math.PI * 2;
			var z = Math.random() * 2 - 1;

			var one_minus_sqr_z = Math.sqrt(1-z*z);

			v.x = one_minus_sqr_z * Math.cos(omega);
			v.y = one_minus_sqr_z * Math.sin(omega);
			v.z = z;

			return v;
		}
		
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
					
					targ.x += ( c2.tox - c.tox ) / sdGunClass.weapon_speed[ this.fav_gun + ( this.fav_fire_mode - 1 ) * 2 ];
					targ.y += ( c2.toy - c.toy ) / sdGunClass.weapon_speed[ this.fav_gun + ( this.fav_fire_mode - 1 ) * 2 ];
					targ.z += ( c2.toz - c.toz ) / sdGunClass.weapon_speed[ this.fav_gun + ( this.fav_fire_mode - 1 ) * 2 ];
					
					var di = main.Dist3D( targ.x, targ.y, targ.z, 0, 0, 0 );
					var spread = { x:0, y:0, z:0 };
					SetAsRandom3D( spread );
					targ.x += spread.x * di * 0.3 / Math.max( 1, skill_mult );
					targ.y += spread.y * di * 0.3 / Math.max( 1, skill_mult );
					targ.z += spread.z * di * 0.3 / Math.max( 1, skill_mult );
					
					var an = this.look_vector.angleTo( targ );
					
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
			
				//this.look_vector.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.995, GSPEED ) );
				this.look_vector.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.7, GSPEED ) );
				
				if ( sdAI.attack_walls_randomly_when_nobody_is_visible )
				{
					fire_prepare = true;
					force_rocket = true;
				}
			}
		}
		else
		{

			var targ = best_targ;

			if ( best_an > Math.PI * 0.666 )
			//this.look_vector.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.999, GSPEED ) );
			this.look_vector.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.9, GSPEED ) );
			else
			{
				//this.look_vector.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.995, GSPEED ) );
				this.look_vector.lerp( targ, main.MorphWithTimeScale( 0, 1, 0.7, GSPEED ) );
				
				fire_prepare = true;
			}

			c.walk_vector_xz.x = this.look_vector.x;
			c.walk_vector_xz.y = this.look_vector.z;
			c.walk_vector_xz.normalize();
		}
		
		if ( fire_prepare && !force_rocket )
		{
			this.fire_probability = Math.min( 1, this.fire_probability + GSPEED * 0.001 ); // 0.0025
		}
		else
		{
			this.fire_probability = Math.max( 0, this.fire_probability - GSPEED * 0.1 );
		}
		//console.log( this.fire_probability );
		
		if ( fire_prepare && !force_rocket )
		this.fire_wish += this.fire_probability * GSPEED;
	
		//if ( force_rocket || ( fire_prepare && this.fire_probability >= Math.random() ) )
		if ( force_rocket || ( fire_prepare && this.fire_wish >= 1 ) )
		{
			this.fire_wish = 0;
			
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
		
		
		if ( main.ai_difficulty < 0.333 )
		if ( c.hurt_anim > 0 )
		{
			c.act_fire = 0;
			//return;
		}
		
		c.look_direction.x = this.look_vector.x;
		c.look_direction.y = this.look_vector.y;
		c.look_direction.z = this.look_vector.z;
		c.look_direction.normalize();
	}
	
	static ThinkNow( GSPEED )
	{
	}
}
sdAI.init_class();