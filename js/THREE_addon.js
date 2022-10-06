
/* global pb2MovieClip, pb2ShaderMaterial, THREE, main */


THREE.BufferGeometry.prototype.initVertexData = function ( dynamic, chunk_size=0 )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( chunk_size ), 3 );
    this.addAttribute( 'position', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateVertexData = function ( replacement, chunk_size=1 )
{
	var buffer = this.getAttribute( 'position' );
	
	var offset = 0;
	var count;
	
	if ( main.DEBUG_NAN_CATCHES )
	for ( var i = 0; i < replacement.length; i++ )
	if ( replacement[ i ] != replacement[ i ] )
	throw new Error('NaN found');
	
	if ( replacement.length > buffer.array.length )
	{
		buffer.array = new Float32Array( Math.ceil( replacement.length / chunk_size ) * chunk_size );
	}
	buffer.count = replacement.length / buffer.itemSize;
	count = replacement.length / buffer.itemSize;

	buffer.array.set( replacement );
	
	buffer.updateRange.offset = offset;
	buffer.updateRange.count = count;
	buffer.needsUpdate = true;
};
THREE.BufferGeometry.prototype.updateVertexDataTyped = function ( replacement, custom_count=-1 )
{
	var buffer = this.getAttribute( 'position' );
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	
	if ( custom_count !== -1 )
	buffer.count = custom_count / buffer.itemSize;
	
	buffer.needsUpdate = true;
};




THREE.BufferGeometry.prototype.initUVData = function ( dynamic, chunk_size=0 )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( chunk_size ), 2 );
    this.addAttribute( 'uv', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateUVData = function ( replacement, chunk_size=1 )
{
	
	var buffer = this.getAttribute( 'uv' );
	
	var offset = 0;
	var count;
	
	if ( main.DEBUG_NAN_CATCHES )
	for ( var i = 0; i < replacement.length; i++ )
	if ( replacement[ i ] != replacement[ i ] )
	throw new Error('NaN found');
	
	if ( replacement.length > buffer.array.length )
	{
		buffer.array = new Float32Array( Math.ceil( replacement.length / chunk_size ) * chunk_size );
		
	}
	buffer.count = replacement.length / buffer.itemSize;
	count = replacement.length / buffer.itemSize;

	buffer.array.set( replacement );
	
	
	buffer.updateRange.offset = offset;
	buffer.updateRange.count = count;
	buffer.needsUpdate = true;
};
THREE.BufferGeometry.prototype.updateUVDataTyped = function ( replacement, custom_count=-1 )
{
	var buffer = this.getAttribute( 'uv' );
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	
	if ( custom_count !== -1 )
	buffer.count = custom_count / buffer.itemSize;

	buffer.needsUpdate = true;
};




THREE.BufferGeometry.prototype.initSecondaryUVData = function ( dynamic, chunk_size=0 )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( chunk_size ), 2 );

    this.addAttribute( 'uv2', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.initSecondaryUVDataOpacity = function ( dynamic, chunk_size=0 )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( chunk_size ), 1 );

    this.addAttribute( 'uv2', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateSecondaryUVData = function ( replacement, chunk_size=1 )
{
	var buffer = this.getAttribute( 'uv2' );
	
	var offset = 0;
	var count;
	
	if ( main.DEBUG_NAN_CATCHES )
	for ( var i = 0; i < replacement.length; i++ )
	if ( replacement[ i ] != replacement[ i ] )
	throw new Error('NaN found');
	
	
	if ( replacement.length > buffer.array.length )
	{
		buffer.array = new Float32Array( Math.ceil( replacement.length / chunk_size ) * chunk_size );
	}
	buffer.count = replacement.length / buffer.itemSize;
	count = replacement.length / buffer.itemSize;

	buffer.array.set( replacement );
	
	
	buffer.updateRange.offset = offset;
	buffer.updateRange.count = count;
	buffer.needsUpdate = true;
};
THREE.BufferGeometry.prototype.updateSecondaryUVDataTyped = function ( replacement, custom_count=-1 )
{
	var buffer = this.getAttribute( 'uv2' );
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	
	if ( custom_count !== -1 )
	buffer.count = custom_count / buffer.itemSize;

	buffer.needsUpdate = true;
};


THREE.BufferGeometry.prototype.initRGBAData = function ( dynamic, chunk_size=0 )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( chunk_size ), 4 );
	
    this.addAttribute( 'colo', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateRGBADataTyped = function ( replacement, custom_count=-1 )
{
	var buffer = this.getAttribute( 'colo' );
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	
	if ( custom_count !== -1 )
	buffer.count = custom_count / buffer.itemSize;

	buffer.needsUpdate = true;
};









THREE.BufferGeometry.prototype.initSizeData = function ( dynamic )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( 0 ), 1 );
	
    this.addAttribute( 'sizedata', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateSizeDataTyped = function ( replacement )
{
	var buffer = this.getAttribute( 'sizedata' );
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	buffer.needsUpdate = true;
};




THREE.BufferGeometry.prototype.initRotationData = function ( dynamic )
{
	var buffer = new THREE.BufferAttribute( new Float32Array( 0 ), 1 );
	
    this.addAttribute( 'rotationdata', buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateRotationDataTyped = function ( replacement )
{
	var buffer = this.getAttribute( 'rotationdata' );
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	buffer.needsUpdate = true;
};









THREE.BufferGeometry.prototype.initIndexData = function ( dynamic, chunk_size=0 )
{
	var buffer = new THREE.BufferAttribute( new Uint32Array( chunk_size ), 1 );
	
    this.setIndex( buffer );
	return buffer.array;
};
THREE.BufferGeometry.prototype.updateIndexData = function ( replacement, chunk_size=1 )
{
	var buffer = this.getIndex();
	
	var offset = 0;
	var count;
	
	if ( main.DEBUG_NAN_CATCHES )
	for ( var i = 0; i < replacement.length; i++ )
	if ( replacement[ i ] != replacement[ i ] )
	throw new Error('NaN found');
	
	if ( replacement.length > buffer.array.length )
	{
		buffer.array = new Uint32Array( Math.ceil( replacement.length / chunk_size ) * chunk_size );
		
	}
	buffer.count = replacement.length / buffer.itemSize;
	count = replacement.length / buffer.itemSize;

	buffer.array.set( replacement );
	
	
	buffer.updateRange.offset = offset;
	buffer.updateRange.count = count;
	buffer.needsUpdate = true;
};
THREE.BufferGeometry.prototype.updateIndexDataTyped = function ( replacement )
{
	var buffer = this.getIndex();
	if ( replacement !== buffer.array )
	{
		buffer.array = replacement;
		buffer.count = replacement.length / buffer.itemSize;
	}
	buffer.needsUpdate = true;
};


Object.defineProperty( THREE.MeshBasicMaterial.prototype, "color",
{
	set: function color( v )
	{
		if ( typeof( v ) !== 'object' )
		throw new Error('Do not set material.color as uint, use new THEE.Color(...)');
		this._color = v;
	},
	get: function color()
	{
		return this._color;
	}
});

THREE.Object3D.prototype.GetCalcBounds = function()
{
	if ( this._GetCalcBounds === undefined )
	this._GetCalcBounds = pb2MovieClip.GetBoundingBox( this );

	return this._GetCalcBounds;
};

THREE.BufferGeometry.prototype.disposable = true;
THREE.BufferGeometry.prototype._dispose = THREE.BufferGeometry.prototype.dispose;
THREE.BufferGeometry.prototype.dispose = function()
{
	if ( this.disposable )
	this._dispose();
};

Object.defineProperty( THREE.Object3D.prototype, "x",
{
	set: function x( v )
	{
		throw new Error('Do not set Object3D.x or Mesh.x, use .position.x instead');
	},
	get: function x()
	{
		throw new Error('Do not get Object3D.x or Mesh.x, use .position.x instead');
	}
});
Object.defineProperty( THREE.Object3D.prototype, "y",
{
	set: function y( v )
	{
		throw new Error('Do not set Object3D.y or Mesh.x, use .position.y instead');
	},
	get: function y()
	{
		throw new Error('Do not get Object3D.y or Mesh.x, use .position.y instead');
	}
});
Object.defineProperty( THREE.Object3D.prototype, "z",
{
	set: function z( v )
	{
		throw new Error('Do not set Object3D.z or Mesh.z, use .position.z instead');
	},
	get: function z()
	{
		throw new Error('Do not get Object3D.z or Mesh.z, use .position.z instead');
	}
});

THREE.Matrix4.prototype.appendTranslation = function( x, y, z )
{
	var m = new THREE.Matrix4();
	
	m.setPosition( new THREE.Vector3( x, y, z ) );
	
	this.premultiply( m );
};
THREE.Matrix4.prototype.appendRotation = function( ang, up, pivot=null )
{
	var m = new THREE.Matrix4();
	
	if ( pivot !== null )
		throw new Error('Pivot rotation for Matrix4 is not implemented');
	
	m.makeRotationAxis( up, ang );
	
	this.premultiply( m );
};
THREE.Matrix4.prototype.invert = function()
{
	this.getInverse( this );
};
THREE.Matrix4.prototype.transformVector = function( v )
{
	var v2 = new THREE.Vector3( v.x, v.y, v.z );
	
	v2.applyMatrix4( this ); 
	
	return v2;
};
/*Object.getOwnPropertyNames( Array.prototype ).filter(
	function ( p )
	{
		if ( typeof Array.prototype[ p ] === 'function' )
		if ( p !== 'push' )
		if ( p !== 'unshift' )
		if ( p !== 'indexOf' )
		if ( p !== 'join' )
		if ( p !== 'split' )
		if ( p !== 'splice' )
		if ( p !== 'slice' )
		if ( p !== 'shift' )
		if ( p !== 'filter' ) // THREE.JS
		if ( p !== 'sort' )
		if ( p !== 'pop' )
		if ( p !== 'reverse' )
		if ( p !== 'forEach' ) // THREE.JS
		if ( p !== 'concat' ) // THREE.JS
		if ( p !== 'constructor' ) // peer.js
		if ( p !== 'map' ) // peer.js
		if ( p !== 'some' ) // peer.js
		{
			delete Array.prototype[ p ];
		}
	}
);
Object.getOwnPropertyNames( Object.prototype ).filter(
	function ( p )
	{
		if ( typeof Object.prototype[ p ] === 'function' )
		if ( p !== 'hasOwnProperty' )
		{
			if ( p === 'toString' )
			{
				let f = Object.prototype[ p ];
				Object.prototype[ p ] = function()
				{
					console.warn('Conversion of Object to string...');
					return f();
				};
			}
			else
			delete Object.prototype[ p ];
		}
	}
);*/

var trace = console.log;
var once_traced = [];
var traceOnce = function( str )
{
	if ( once_traced.indexOf( str ) === -1 )
	{
		once_traced.push( str );
		trace( str );
	}
};
