
	
	/* global sdRandomPattern, THREE */

class pb2HighRangeColor
	{
		constructor( u = 0xffffff )
		{
			// constructor code
			if ( u === 0xffffff )
			{
				this.r = 1;
				this.g = 1;
				this.b = 1;
				return;
			}
			
			this.r = ( u >> 16 ) & 0xFF;
			this.g = ( u >> 8 ) & 0xFF;
			this.b =   u & 0xFF;
			
			this.multiply( 1 / 255 );
		}
		clone()
		{
			return new pb2HighRangeColor().setRGB( this.r, this.g, this.b );
		}
		from_uint( u = 0xffffff )
		{
			this.r = ( u >> 16 ) & 0xFF;
			this.g = ( u >> 8 ) & 0xFF;
			this.b =   u & 0xFF;
			
			this.multiply( 1 / 255 );
			
			return this;
		}
		from_rgba( rgba ) // Result of BitmapData.getPixel32()
		{
			this.r = rgba.r;
			this.g = rgba.g;
			this.b = rgba.b;
			
			this.multiply( 1 / 255 );
			return this;
		}
		get _uint()
		{
			if ( this.r < 0 || this.r > 1 )
			console.warn('pb2HighRangeColor._uint: Red is out of range. Red = '+this.r);
			if ( this.g < 0 || this.g > 1 )
			console.warn('pb2HighRangeColor._uint: Green is out of range. Green = '+this.g);
			if ( this.b < 0 || this.b > 1 )
			console.warn('pb2HighRangeColor._uint: Blue is out of range. Blue = '+this.b);
			
			var _r = ~~( this.r * 255 );
			var _g = ~~( this.g * 255 );
			var _b = ~~( this.b * 255 );
			
			return _r << 16 | _g << 8 | _b;
		}
		limit()
		{
			this.r = Math.min( 1, Math.max( 0, this.r ) );
			this.g = Math.min( 1, Math.max( 0, this.g ) );
			this.b = Math.min( 1, Math.max( 0, this.b ) );
			return this;
		}
		get _uint_dither()
		{
			if ( this.r < 0 || this.r > 1 )
			trace('pb2HighRangeColor._uint: Red is out of range. Red = '+this.r);
			if ( this.g < 0 || this.g > 1 )
			trace('pb2HighRangeColor._uint: Green is out of range. Green = '+this.g);
			if ( this.b < 0 || this.b > 1 )
			trace('pb2HighRangeColor._uint: Blue is out of range. Blue = '+this.b);
			
			var _r0 = ( this.r * 255 );
			var _g0 = ( this.g * 255 );
			var _b0 = ( this.b * 255 );
			
			_r0 = Math.floor( _r0 ) + ( ( Math.random() > (_r0-Math.floor(_r0)) ) ? 0 : 1 );
			_g0 = Math.floor( _g0 ) + ( ( Math.random() > (_g0-Math.floor(_g0)) ) ? 0 : 1 );
			_b0 = Math.floor( _b0 ) + ( ( Math.random() > (_b0-Math.floor(_b0)) ) ? 0 : 1 );
			
			var _r = parseInt( _r0 );
			var _g = parseInt( _g0 );
			var _b = parseInt( _b0 );
			
			return _r << 16 | _g << 8 | _b;
		}
		multiply( num )
		{
			this.r *= num;
			this.g *= num;
			this.b *= num;
			return this;
		}
		multiplyColor( c ) // can actually work with THREE.Color
		{
			this.r *= c.r;
			this.g *= c.g;
			this.b *= c.b;
			return this;
		}
		add( num )
		{
			this.r += num;
			this.g += num;
			this.b += num;
			return this;
		}
		addColor( c )
		{
			this.r += c.r;
			this.g += c.g;
			this.b += c.b;
			return this;
		}
		addRGB( _r, _g, _b )
		{
			this.r += _r;
			this.g += _g;
			this.b += _b;
			return this;
		}
		average()
		{
			this.r = this.g = this.b = ( this.r + this.g + this.b ) / 3;
			return this;
		}
		GetAverageValue()
		{
			return ( this.r + this.g + this.b ) / 3;
		}
		multUpToMin( min )
		{
			var h = Math.min( this.r, Math.min( this.g, this.b ) );
			if ( h < min )
			{
				h = min / h;
				this.r *= h;
				this.g *= h;
				this.b *= h;
			}
			return this;
		}
		multUpToMax( max )
		{
			var h = Math.max( this.r, Math.max( this.g, this.b ) );
			if ( h < max )
			{
				h = max / h;
				this.r *= h;
				this.g *= h;
				this.b *= h;
			}
			return this;
		}
		rand()
		{
			this.r = Math.random();
			this.g = Math.random();
			this.b = Math.random();
			return this;
		}
		rand_pattern()
		{
			this.r = sdRandomPattern.random();
			this.g = sdRandomPattern.random();
			this.b = sdRandomPattern.random();
			return this;
		}
		toColorTransform()
		{
			return new ColorTransform( this.r, this.g, this.b );
		}
		
		fromColorTransformMultiplayer( ctr )
		{
			this.r = ctr.redMultiplier;
			this.g = ctr.greenMultiplier;
			this.b = ctr.blueMultiplier;
			return this;
		}
		
		setRGB( _r, _g, _b )
		{
			this.r = _r;
			this.g = _g;
			this.b = _b;
			return this;
		}
		
		toThreeColor()
		{
			return new THREE.Color( this.r, this.g, this.b );
		}
		
		toString()
		{
			return '{ r:'+this.r+', g:'+this.g+', b:'+this.b+' }';
		}
		NormalizeAndGetMultiplier()
		{
			var h = Math.max( this.r, Math.max( this.g, this.b ) );
			if ( h > 1 )
			{
				this.r /= h;
				this.g /= h;
				this.b /= h;
				return h;
			}
			return 1;
		}
	}
	
