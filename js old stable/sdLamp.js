
class sdLamp
{
	static init_class()
	{
		sdLamp.lamps = [];
	}
	
	static CreateLamp( params )
	{
		var c = new sdLamp( params );
		sdLamp.lamps.push( c );
		return c;
	}
	
	constructor( params )
	{
		this.x = params.x;
		this.y = params.y;
		this.z = params.z;
		this.collision_radius = params.collision_radius;
		this.glow_radius = params.glow_radius;
		
		if ( params.ceiling )
		{
			this.any_distance_y_scale = 0.25; // Lower values increase vertical range, but not really influence brightness recalc logic since it is through whole map vertically anyway
			this.any_distance_y_scale_above = 8; // For entities only

			// These are only for world bounds (they will be shortened on start if needed)
			this.minx = ~~( this.x - this.glow_radius );
			this.maxx = ~~( this.x + this.glow_radius );
			this.miny = ~~( this.y - this.glow_radius / this.any_distance_y_scale );
			
			//this.maxy = ~~( this.y + this.glow_radius / this.any_distance_y_scale );
			this.maxy = ~~( this.y + 2 );
			
			this.minz = ~~( this.z - this.glow_radius );
			this.maxz = ~~( this.z + this.glow_radius );
		}
		else
		{
			this.any_distance_y_scale = 1;
			this.any_distance_y_scale_above = 1; // For entities only

			// These are only for world bounds (they will be shortened on start if needed)
			this.minx = ~~( this.x - this.glow_radius );
			this.maxx = ~~( this.x + this.glow_radius );
			this.miny = ~~( this.y - this.glow_radius );
			this.maxy = ~~( this.y + this.glow_radius );
			this.minz = ~~( this.z - this.glow_radius );
			this.maxz = ~~( this.z + this.glow_radius );
		}
	}
}
sdLamp.init_class();