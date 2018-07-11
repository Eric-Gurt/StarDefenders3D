/* 

	Looks like it was stripped right from those 16%

*/
	
	class BitmapData
	{
		constructor( w, h, trans, bg )
		{
			if ( w === 0 )
			return;
			
			var ctx;
				
			ctx = document.createElement("canvas").getContext("2d");
			
			ctx.canvas.width = w;
			ctx.canvas.height = h;

			if ( trans )
			{
				// leave as is
			}
			else
			{
				ctx.fillStyle = bg;
				ctx.fillRect( 0, 0, w, h );
			}
			
			this.ctx = ctx;
			this.width = w;
			this.height = h;
			this.pixel_data = null;
			this.rgba = null; // reusable getPixel result
			
			this.sleep_timeout = null;
		}
		
		Resize( w, h )
		{
			var ctx = this.ctx;
			
			ctx.canvas.width = w;
			ctx.canvas.height = h;
			
			this.width = w;
			this.height = h;
		}
		
		get rect()
		{
			return new Rectangle( 0, 0, this.width, this.height );
		}
		
		static fromTexture( tex )
		{
			var can = tex.image;
			var ctx = can.getContext("2d");
			
			var b = new BitmapData( 0 );
			
			b.ctx = ctx;
			b.width = can.width;
			b.height = can.height;
			b.pixel_data = null;
			b.rgba = null;
			
			return b;
		}
		
		getPixel32( x, y )
		{
			var ctx = this.ctx;
			
			this._WakeUpPixelDataArray();
			
			var pixel_data = this.pixel_data;
			var rgba = this.rgba;
			
			var i = ( y * this.width + x ) * 4;
			
			rgba.r = pixel_data.data[ i++ ];
			rgba.g = pixel_data.data[ i++ ];
			rgba.b = pixel_data.data[ i++ ];
			rgba.a = pixel_data.data[ i ];
			return rgba;
		}
		DrawRandomStuff()
		{
			var len = this.width * this.height;
			var rr = [];
			var gg = [];
			var bb = [];
			for ( var i = 0; i < len; i++ )
			{
				rr[ i ] = Math.random();
				gg[ i ] = Math.random();
				bb[ i ] = Math.random();
			}
			this.setPixelsFromNormalizedRGBArrays( rr, gg, bb );
		}
		
		_WakeUpPixelDataArray( keep_current_image = true, auto_make_sleep_timer=true )
		{
			var ctx = this.ctx;
			
			if ( this.pixel_data === null )
			{
				if ( keep_current_image )
				this.pixel_data = ctx.getImageData( 0, 0, this.width, this.height ); // load, can be slower
				else
				this.pixel_data = ctx.createImageData( this.width, this.height ); // do not load, just create
				this.rgba = new RGBA();
				
				if ( auto_make_sleep_timer )
				{
					if ( this.sleep_timeout !== null )
					clearTimeout( this.sleep_timeout );

					let dis = this;
					this.sleep_timeout = setTimeout( function() { dis._DisposePixelData(); }, 1000 );
				}
			}
		}
		_DisposePixelData()
		{
			this.pixel_data = null;
			this.rgba = null;
			this.sleep_timeout = null;
		}
		
		setPixelC( x, y, c, alpha=255 )
		{
			this._WakeUpPixelDataArray();
			
			var i = ( y * this.width + x ) * 4;
			
			var pixel_data = this.pixel_data;
		
			pixel_data.data[ i++ ] = parseInt( c.r * 255 );
			pixel_data.data[ i++ ] = parseInt( c.g * 255 );
			pixel_data.data[ i++ ] = parseInt( c.b * 255 );
			
			pixel_data.data[ i ] = alpha;
		}
		setPixelsDone()
		{
			var ctx = this.ctx;
			var pixel_data = this.pixel_data;
			ctx.putImageData( pixel_data, 0, 0, 0, 0, this.width, this.height );
		}
		getRawPixelData()
		{
			this._WakeUpPixelDataArray();
			return this.pixel_data;
		}
		setRawPixelData( v )
		{
			this._WakeUpPixelDataArray( false );
			this.pixel_data.data.set( v );
			this.setPixelsDone();
		}
	
		setPixelsFromNormalizedRGBArrays( rr, gg, bb )
		{
			var ctx = this.ctx;
			
			this._WakeUpPixelDataArray( false );
		
			var pixel_data = this.pixel_data;
			
			var a = 0;
			for ( var i = 0; i < pixel_data.data.length; i += 4 )
			{
				pixel_data.data[ i   ] = rr[ a ] * 255;
				pixel_data.data[ i+1 ] = gg[ a ] * 255;
				pixel_data.data[ i+2 ] = bb[ a ] * 255;
				pixel_data.data[ i+3 ] = 255;
				a++;
			}
			ctx.putImageData( pixel_data, 0, 0, 0, 0, this.width, this.height );
		}
		
		static getSafeBounds( mc, safe_border, custom_bounds=null )
		{
			if ( custom_bounds !== null )
			{
				return { x: custom_bounds.x - safe_border, 
						 y: custom_bounds.y - safe_border, 
						 width: custom_bounds.width + safe_border * 2, 
						 height: custom_bounds.height + safe_border * 2 };
			}
			else
			{
				var rect = mc.nominalBounds.clone();

				rect.x -= safe_border;
				rect.y -= safe_border;
				rect.width += safe_border * 2;
				rect.height += safe_border * 2;

				return rect;
			}
		}
		
		draw( mc, x, y, scaleX, scaleY )
		{
			var ctx = this.ctx;
			
			ctx.setTransform( scaleX, 0, 0, scaleY, x, y );
			mc.draw( ctx, false );
		}
		drawBitmapData( b )
		{
			var ctx = this.ctx;
			ctx.drawImage( b.ctx.canvas, 0, 0 );
		}
		drawBitmapDataScaled( b, s )
		{
			var ctx = this.ctx;
			ctx.drawImage( b.ctx.canvas, 0, 0, b.width * s, b.height * s );
		}
		drawBitmapDataAdditive( b )
		{
			var ctx = this.ctx;
			ctx.globalCompositeOperation = "lighter";
			ctx.drawImage( b.ctx.canvas, 0, 0 );
			ctx.globalCompositeOperation = "source-over";
		}
		drawBitmapDataSubtract( b )
		{
			var ctx = this.ctx;
			ctx.globalCompositeOperation = 'destination-out';
			ctx.drawImage( b.ctx.canvas, 0, 0 );
			ctx.globalCompositeOperation = 'source-over';
		}	
		drawBitmapDataLightenOffset( b, x, y )
		{
			var ctx = this.ctx;
			ctx.globalCompositeOperation = "lighten";
			ctx.drawImage( b.ctx.canvas, x, y );
			ctx.globalCompositeOperation = "source-over";
		}
		
		dispose()
		{
			this.ctx = null;
			this.width = 0;
			this.height = 0;
			this.pixel_data = null;
			this.rgba = null;
		}
		
		Write( x, y, text, size=10, color='#ff0000', add_x=1, add_y=1 )
		{
			var ctx = this.ctx;
			
			ctx.font = size+'px DejaVuSansMonoBoldZeroFix';
			ctx.fillStyle = color;
			
			ctx.textBaseline = 'middle';
			y += size * 0.6;
			
			if ( add_x !== 1 || add_y !== 1 )
			{
				var m = ctx.measureText( text );
				m.height = size;
				
				x = x - m.width / 2 + m.width * add_x;
				y = y - m.height / 2 + m.height * add_y;
			}
			
			ctx.fillText( text, x, y );
		}
		
		debugPreview( scale=1 )
		{
			if ( BitmapData.debug_offset === undefined )
			BitmapData.debug_offset = 0;
			
			this.ctx.canvas.style = 'position:fixed;left:'+BitmapData.debug_offset+'px;top:0px;transform:scale('+scale+','+scale+');transform-origin: 0% 0%;border:1px solid rgba(0,0,0,0.15)';
			document.body.appendChild( this.ctx.canvas );
			
			BitmapData.debug_offset += Math.ceil( this.width * scale );
		}
		static debugPreviewCanvas( canvas, scale=1 )
		{
			if ( BitmapData.debug_offset === undefined )
			BitmapData.debug_offset = 0;
			
			canvas.style = 'position:fixed;left:'+BitmapData.debug_offset+'px;top:0px;transform:scale('+scale+','+scale+');transform-origin: 0% 0%;border:1px solid rgba(0,0,0,0.15)';
			document.body.appendChild( canvas );
			
			BitmapData.debug_offset += Math.ceil( canvas.width * scale );
		}
		
		get canvas()
		{
			return this.ctx.canvas;
		}
		
		static FromLib( lib_src )
		{
			var pose = new lib_src();
			
			var bmp = new BitmapData( pose.nominalBounds.width, pose.nominalBounds.height, true, 0x000000 );
			
			bmp.draw( pose, 0, 0, 1, 1 );
			
			return bmp;
		}
	
		highRangeColorTransform( high_range_color )
		{
			var ctx = this.ctx;
			
			var img = ctx.getImageData( 0, 0, ctx.canvas.width, ctx.canvas.height );
			
			var data = img.data;
			var len = data.length;
			
			var r = high_range_color.r;
			var g = high_range_color.g;
			var b = high_range_color.b;
			
			var i = 0;
			while ( i < len )
			{
				data[ i ] = data[ i++ ] * r;
				data[ i ] = data[ i++ ] * g;
				data[ i ] = data[ i++ ] * b;
				i++;
			}
			
			ctx.putImageData( img, 0, 0 );
		}
		fillRectCSS( x, y, w, h, CSS_color )
		{
			var ctx = this.ctx;
			
			ctx.fillStyle = CSS_color;
			ctx.fillRect( x, y, w, h );
		}
		fillWithRectangleCSS( r, CSS_color )
		{
			var ctx = this.ctx;
			
			ctx.fillStyle = CSS_color;
			ctx.fillRect( r.x, r.y, r.width, r.height );
		}
		beginFill( CSS_color )
		{
			this.ctx.fillStyle = CSS_color;
			this.ctx.beginPath();
		}
		moveTo( x, y )
		{
			this.ctx.moveTo( x, y );
		}
		lineTo( x, y )
		{
			this.ctx.lineTo( x, y );
		}
		moveToR( x, y )
		{
			this.ctx.moveTo( Math.round(x), Math.round(y) );
		}
		lineToR( x, y )
		{
			this.ctx.lineTo( Math.round(x), Math.round(y) );
		}
		endFill()
		{
			this.ctx.fill();
		}
	}

	class RGBA
	{
		constructor()
		{
			this.r = 0;
			this.g = 0;
			this.b = 0;
			this.a = 0;
		}
	}