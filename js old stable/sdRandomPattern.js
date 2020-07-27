
	class sdRandomPattern
	{
		static init_class()
		{
			sdRandomPattern.seed = 777;
			sdRandomPattern.backup_seed = 777;
		}
		
		constructor( _len )
		{
			this.values;
			this.len;
			
			// constructor code
			
			this.values = []; this.values.length = _len;
			this.len = _len;
			
			for ( var i = 0; i < _len; i++ )
			{
				this.values[ i ] = sdRandomPattern.random();
			}
		}
		
		_SolveFractal( from, to, from_val, to_val )
		{
			var mid = Math.round( ( from + to ) / 2 );
			if ( mid > from )
			if ( mid < to )
			{
				this.values[ mid ] = ( from_val + to_val ) / 2 + ( to - from ) * ( Math.random() - 0.5 ) * 2 / this.len;
				this._SolveFractal( from, mid, from_val, this.values[ mid ] );
				this._SolveFractal( mid, to, this.values[ mid ], to_val );
			}
		}
		Fractal()
		{
			for ( var i = 0; i < this.len; i++ )
			this.values[ i ] = -1;
			
			this.values[ 0 ] = 0.5;
			this._SolveFractal( 0, this.len, 0.5, 0.5 );
		
			return this;
		}
		OneZero()
		{
			for ( var i = 0; i < this.len ; i++ )
			this.values[ i ] = ( i % 2 === 0 ) ? 0 : 1;
			
			return this;
		}
		
		MinusOnePlusOne()
		{
			for ( var i = 0; i < this.len ; i++ )
			this.values[ i ] = this.values[ i ] * 2 - 1;
			
			return this;
		}
		
		FloatGet( x )
		{
			if ( x < 0 )
			{
				x += Math.ceil( -x / this.len ) * this.len;
			}
			
			var left = ~~( x );
			var right = ~~( x );
			
			var progress = x - left;
			
			left = left % this.len;
			right = right % this.len;
			
			return this.values[ left ] * ( 1 - progress ) + this.values[ right ] * progress;
		}
		
		FloatGetAverage( x, c )
		{
			var offset_x = ( c - 1 ) / 2;
			
			var sum = 0;
			
			for ( var i = 0; i < c; i++ )
			sum += this.FloatGet( x - offset_x + i );
			
			return sum / c;
		}
		
		static randomSeedable()
		{
			sdRandomPattern.seed = ( sdRandomPattern.seed * 9301 + 49297 ) % 233280;
			return ( sdRandomPattern.seed ) / 233280;
		}
		static SetSeed( _seed )
		{
			sdRandomPattern.backup_seed = sdRandomPattern.seed;
			sdRandomPattern.seed = _seed;
			
			sdRandomPattern.random = sdRandomPattern.randomSeedable;
		}
		static RestoreSeed()
		{
			sdRandomPattern.seed = sdRandomPattern.backup_seed;
			
			sdRandomPattern.random = Math.random;
		}
	}
	sdRandomPattern.init_class();
	
	sdRandomPattern.random = Math.random;