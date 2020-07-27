/*

	Assigned to each peer-to-peer connection. Works in pair with sdSync.js
	
*/
/* global main, sdSync, sdBullet, sdCharacter, sdSprite, sdAtom, LZString, lib, sdSound, THREE */

class sdByteShifter
{
	static init_class()
	{
		sdByteShifter.message_id_delimeter = ':';
		sdByteShifter.message_delimeter = ';';
		sdByteShifter.command_delimeter = '|';
		
		//sdByteShifter.debug_sent_received_data = true;
		sdByteShifter.debug_sent_received_data = false;
		
		sdByteShifter.proximity_function = function( for_dataConnection ) // Enemy reports eye-contact or we stepped on one of his observed chunks
		{
			if ( for_dataConnection.character.team === main.my_character.team )
			return true;
		
			if ( for_dataConnection.reports_direct_visiblity )
			return true;
		
			var chunk_size = main.chunk_size;
		
			var chunk_xx = main.limit( 0, main.FastFloor( main.main_camera.position.x / chunk_size ), main.level_chunks_x-1 );
			var chunk_yy = main.limit( 0, main.FastFloor( main.main_camera.position.y / chunk_size ), main.level_chunks_y-1 );
			var chunk_zz = main.limit( 0, main.FastFloor( main.main_camera.position.z / chunk_size ), main.level_chunks_z-1 );
			
			var ch = chunk_xx * main.level_chunks_y * main.level_chunks_z + chunk_yy * main.level_chunks_z + chunk_zz;
			
			if ( for_dataConnection.visible_chunks.indexOf( ch ) !== -1 )
			return true;
		
			return false;
		};
	}
	
	constructor( p )
	{
		this.parent_dataConnection = p;
		
		this.stack_proximity = []; // These are added to stack_any once their rule works
		this.stack_any = [];
		
		this.received_ids = []; // For instant reply
		this.received_ids_storage = []; // arr of ReceivedID, ones which are getting deleted after time. Prevents duplicates.
		
		this.received_messages = []; // Some really huge array unless we find ways to shorten it?
	}
	
	AddEvent( command, ... args ) // Must be called by sdSync.MP_SendEvent
	{
		this.AddEncodeCommand( command, ... args );
	}
	
	ListIDsWithRanges( arr )
	{
		// in:  2538,2539,2540,2541,3342,3343,3344,5000,5002,5003
		// out: 2538+3,3342+2,5000,5002+1
		var r = '';
		for ( var i = 0; i < arr.length; i++ )
		{
			if ( r.length !== 0 )
			r += ',';
		
			r += arr[ i ];
			
			for ( var i2 = i + 1; i2 < arr.length; i2++ )
			if ( arr[ i2 ] !== arr[ i2 - 1 ] + 1 )
			break;
	
			i2--;
			
			if ( i2 > i )
			{
				r += '+' + ( i2 - i );
				
				i = i2;
				continue;
			}
			
		}
		return r;
	}
	IDsWithRangesToArray( s )
	{
		var arr = [];
		var parts = s.split(',');
		for ( var i = 0; i < parts.length; i++ )
		{
			var parts2 = parts[ i ].split('+');
			
			var initial_num = Number( parts2[ 0 ] );
				
			if ( parts2.length === 1 )
			arr.push( initial_num );
			else
			{
				// range
				var extra = Number( parts2[ 1 ] ) ;
				for ( var i2 = 0; i2 <= extra; i2++ )
				arr.push( initial_num + i2 );
			}
		}
		
		return arr;
	}
	
	SendData( GSPEED )
	{
		var data = '';
		
		for ( var i = 0; i < this.stack_proximity.length; i++ )
		{
			var p = this.stack_proximity[ i ];
			if ( p.condition( this.parent_dataConnection ) )
			{
				this.stack_any.push( p );
				
				main.RemoveElement( this.stack_proximity, i );
				i--;
				continue;
			}
		}
		
		data += this.SendArray( this.stack_any, GSPEED );
		
		data += 'rcvs' + sdByteShifter.message_id_delimeter + this.ListIDsWithRanges( this.received_ids ) + sdByteShifter.message_delimeter;
		this.received_ids.length = 0;
		
		for ( var i = 0; i < this.received_ids_storage.length; i++ )
		{
			this.received_ids_storage[ i ].timeout_in -= GSPEED;
			if ( this.received_ids_storage[ i ].timeout_in < 0 )
			{
				main.RemoveElement( this.received_ids_storage, i );
				i--;
				continue;
			}
		}
		
		var data_LZW = LZString.compressToUTF16( data );
		this.parent_dataConnection.send( data_LZW );
		//this.parent_dataConnection.send( data );
		
		if ( sdByteShifter.debug_sent_received_data )
		{
			
			console.log('SENT-LZW: '+data_LZW );
			console.log('SENT: '+data);
			
			var s = '';
			for ( var i = 0; i < data_LZW.length; i++ )
			{
				s += data_LZW.charCodeAt( i )+' / ';
			}
			console.log( s );
		}
	}
	
	TryEncode( s, voc )
	{
		//var voc_min = Math.max( 0, voc.length - 3 ); // There is no real need to look behind last packet but just in case
		
		if ( voc.length > 5 )
		for ( var w = s.length; w > 7; w -= 2 ) // Probably won't be shorter than 7 symbols. Step size isn't critical aswell
		for ( var x = 0; x < s.length - w; x++ )
		{
			var part = s.substr( x, w );
			
			var real_messages_until_break = 3;
			for ( var i = voc.length-1; i >= 0; i-- )
			if ( voc[ i ].is_sent )
			if ( !voc[ i ].self_sent )
			{
				real_messages_until_break--;
				if ( real_messages_until_break < 0 )
				break;
				
				var offset = voc[ i ].message.indexOf( part );
				
				if ( offset !== -1 )
				{
					var s2 = s.slice( 0, x ) + '#'+i+'^'+offset+'^'+w+'^' + s.slice( x+w );
					if ( s2.length < s.length )
					{
						s = s2;
						
						x--;
						break;
					}
				}
			}
		}
		
		return s;
	}
	TryDecode( s )
	{
		var voc = this.received_messages;
		
		while ( true )
		{
			var offset = s.lastIndexOf( '#' );
			
			if ( offset === -1 )
			break;
		
			var relevant_part = s.slice( offset + 1 );
			var parts = relevant_part.split('^');

			var i = Number( parts[ 0 ] );
			var x = Number( parts[ 1 ] );
			var w = Number( parts[ 2 ] );
			
			// #i^x^w^37|0.34|0.86|-0.4|-0.92|0|0|0|0|0|0|0|0|3.14
			
			var pos_x = s.indexOf( '^', offset+1 );
			
			if ( pos_x === -1 )
			throw new Error('Corrupted packet?');
		
			var pos_w = s.indexOf( '^', pos_x+1 );
			
			if ( pos_w === -1 )
			throw new Error('Corrupted packet?');
		
			var pos_end = s.indexOf( '^', pos_w+1 );
			
			if ( pos_end === -1 )
			throw new Error('Corrupted packet?');

			s = s.slice( 0, offset ) + voc[ i ].substr( x, w ) + s.slice( pos_end+1 );
		}
		return s;
	}
	
	SendArray( arr, GSPEED )
	{
		var data = '';
		for ( var i = 0; i < arr.length; i++ )
		if ( !arr[ i ].is_sent )
		{
			if ( arr[ i ].self_sent_in > 0 )
			{
				arr[ i ].self_sent_in -= GSPEED;
				if ( arr[ i ].self_sent_in <= 0 )
				{
					arr[ i ].is_sent = true;
					arr[ i ].self_sent = true;
				}
			}
			else
			{
				arr[ i ].is_sent = true;
				arr[ i ].self_sent = true;
			}
			data += i + sdByteShifter.message_id_delimeter + this.TryEncode( arr[ i ].message, arr ) + sdByteShifter.message_delimeter;
			
			// No need to stack up way too much stuff only because remote peer is not responding currently
			if ( data.length > 6000 )
			return data;
		}

		return data;
	}
	DataReceived( data_LZW)
	{
		var data = LZString.decompressFromUTF16( data_LZW );
		
		if ( sdByteShifter.debug_sent_received_data )
		{
			console.log('RECEIVED-LZW: '+data_LZW );
			console.log('RECEIVED: '+data );
		}
		
		var messages = data.split( sdByteShifter.message_delimeter );
		for ( var i = 0; i < messages.length; i++ )
		{
			// Empty command, might happen
			if ( messages[ i ] === '' )
			continue;
			
			var parts = messages[ i ].split( sdByteShifter.message_id_delimeter );
			var event_id = parts[ 0 ];
			
			if ( event_id === 'rcvs' )
			{
				if ( parts[ 1 ].length > 0 )
				{
					var received_ids = this.IDsWithRangesToArray( parts[ 1 ] );
					for ( var i2 = 0; i2 < received_ids.length; i2++ )
					{
						var id = ~~received_ids[ i2 ];
						if ( this.stack_any[ id ] === undefined )
						throw new Error('rcvs value sent by peer makes no sense');

						this.stack_any[ id ].is_sent = true;
						this.stack_any[ id ].self_sent = false;
					}
				}
			}
			else
			{
				var id = ~~parts[ 0 ];
				
				// Anti-duplicate measure
				var ok = true;
				for ( var i2 = 0; i2 < this.received_ids_storage.length; i2++ )
				if ( this.received_ids_storage[ i2 ].id === id )
				{
					ok = false;
					break;
				}

				
				if ( ok )
				{
					parts[ 1 ] = this.TryDecode( parts[ 1 ] );
					if ( this.DecodeCommand( parts[ 1 ] ) )
					{
						this.received_ids.push( id );
						this.received_ids_storage.push( new ReceivedID( id ) );

						this.received_messages[ id ] = parts[ 1 ];
					}
				}
			}
		}
	}
	static approx( x )
	{
		return Math.round( x * 100 ) / 100;
	}
	approx( x )
	{
		return sdByteShifter.approx( x );
	}
	AddEncodeCommand( command, ... args )
	{
		var _ = sdByteShifter.command_delimeter;
		
		var message = 'ERROR?';
		
		var visibility_function = null;
		
		var self_sent_in = -1;
		
		if ( command === sdSync.COMMAND_CHARACTER_STATE )
		{
			let c = main.my_character;
			
			//visibility_function = sdByteShifter.proximity_function;
			
			message = 
				command + _ + 
				this.approx( c.x ) + _ + 
				this.approx( c.y ) + _ + 
				this.approx( c.z ) + _ + 
				this.approx( c.tox ) + _ + 
				this.approx( c.toy ) + _ + 
				this.approx( c.toz ) + _ + 
				this.approx( c.look_direction.x ) + _ + 
				this.approx( c.look_direction.y ) + _ + 
				this.approx( c.look_direction.z ) + _ + 
				this.approx( c.walk_vector_xz.x ) + _ + 
				this.approx( c.walk_vector_xz.y ) + _ + 
				this.approx( c.act_fire ) + _ + 
				this.approx( c.act_jump ) + _ + 
				this.approx( c.act_sit ) + _ + 
				this.approx( c.act_sprint ) + _ + 
				this.approx( c.act_weapon ) + _ + 
				this.approx( c.act_x ) + _ + 
				this.approx( c.act_y ) + _ + 
				this.approx( c.sit ) + _ + 
				this.approx( c.walk_phase ) + _ + 
				this.approx( c.hook_enabled ? 1 : 0 ) + _ + 
				this.approx( c.hook_pos.x ) + _ + 
				this.approx( c.hook_pos.y ) + _ + 
				this.approx( c.hook_pos.z );
		}
		else
		/*if ( command === sdSync.COMMAND_VISIBLE_BLOCKS )
		{
			message = 
				command;
		
			for ( var i = 0; i < main.voxel_static.length; i++ )
			{
				var chunk = main.voxel_static[ i ];
				
				if ( chunk.mesh.visible )
				message += _ + i;
			}
		}
		else*/
		if ( command === sdSync.COMMAND_I_SPAWN_BULLET )
		{
			let b = args[ 0 ];
			
			message = 
				command + _ + 
				this.approx( b.x ) + _ + 
				this.approx( b.y ) + _ + 
				this.approx( b.z ) + _ + 
				//this.approx( 0 ) + _ + 
				//this.approx( 0 ) + _ + 
				//this.approx( 0 ) + _ + 
				this.approx( b.tox ) + _ + 
				this.approx( b.toy ) + _ + 
				this.approx( b.toz ) + _ + 
				this.approx( b.dx ) + _ + 
				this.approx( b.dy ) + _ + 
				this.approx( b.dz ) + _ + 
				this.approx( args[ 1 ] ) + _ +
				this.approx( b.local_peer_uid ) + _ +
				this.approx( args[ 2 ] );
		
			self_sent_in = 60;
		}
		else
		if ( command === sdSync.COMMAND_I_MOVE_BULLET )
		{
			let b = args[ 0 ];
			message = 
				command + _ + 
				this.approx( b.local_peer_uid ) + _ + 
				this.approx( b.x ) + _ + 
				this.approx( b.y ) + _ + 
				this.approx( b.z ) + _ + 
				this.approx( b.tox ) + _ + 
				this.approx( b.toy ) + _ + 
				this.approx( b.toz );
		}
		else
		if ( command === sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER )
		{
			let c = args[ 0 ];			
			let dmg = args[ 1 ];
			let tox = args[ 2 ];
			let toy = args[ 3 ];
			let toz = args[ 4 ];
			let hit_x = args[ 5 ];
			let hit_y = args[ 6 ];
			let hit_z = args[ 7 ];
			
			if ( dmg !== this.approx( dmg ) )
			throw new Error('Damage is not rounded - might be source of alive/dead desync (dmg = '+dmg+')');
			
			message = 
				command + _ + 
				this.approx( c.uid ) + _ + 
				this.approx( dmg ) + _ + 
				this.approx( tox ) + _ + 
				this.approx( toy ) + _ + 
				this.approx( toz ) + _ + 
				this.approx( hit_x ) + _ + 
				this.approx( hit_y ) + _ + 
				this.approx( hit_z );
		
			//self_sent_in = 60;
			self_sent_in = 120;
		}
		else
		if ( command === sdSync.COMMAND_I_SPAWN_GORE || 
			 command === sdSync.COMMAND_I_BULLET_HIT_WORLD || 
			 command === sdSync.COMMAND_I_DIRECT_HIT_ATOM ||
			 command === sdSync.COMMAND_I_RESSURECT ||
			 command === sdSync.COMMAND_I_RELOAD ||
			 command === sdSync.COMMAND_I_BUILD )
		{
			message = 
				command;
		
			for ( var i = 0; i < args.length; i++ )
			message += _ + this.approx( args[ i ] );
		
			self_sent_in = 120;
		}
		else
		if ( command === sdSync.COMMAND_I_SAY )
		{
			message = 
				command;
		
			for ( var i = 0; i < args.length; i++ )
			message += _ + args[ i ];
		
			self_sent_in = 60;
		}
		else
		if ( command === sdSync.COMMAND_I_REMOVE_BULLET )
		{
			let b = args[ 0 ];
			message = 
				command + _ + this.approx( b.local_peer_uid );
		
			self_sent_in = 60;
		}
		else
		if ( command === sdSync.COMMAND_I_DRAW_EXPLOSION )
		{
			let b = args[ 0 ];
			message = 
				command + _ + 
				this.approx( b.x ) + _ + 
				this.approx( b.y ) + _ + 
				this.approx( b.z ) + _ + 
				this.approx( b.local_peer_uid );
		
			self_sent_in = 60;
		}
		
		var packet = new Packet( message, visibility_function );
		
		packet.self_sent_in = self_sent_in;
		
		( visibility_function !== null ? this.stack_proximity : this.stack_any ).push( packet );
	}
	DecodeCommand( m )
	{
		if ( m === undefined )
		{
			console.log('Corrupted command? Ignoring for now: '+m);
			return false;
		}
		
		var _ = sdByteShifter.command_delimeter;
		
		var parts = m.split( _ );
		var command = parts[ 0 ];
		
		if ( command === sdSync.COMMAND_CHARACTER_STATE )
		{
			var c = this.parent_dataConnection.character;
			
			let i = 1;
			c.x = Number( parts[ i++ ] );
			c.y = Number( parts[ i++ ] );
			c.z = Number( parts[ i++ ] );
			c.tox = Number( parts[ i++ ] );
			c.toy = Number( parts[ i++ ] );
			c.toz = Number( parts[ i++ ] );
			c.look_direction.x = Number( parts[ i++ ] );
			c.look_direction.y = Number( parts[ i++ ] );
			c.look_direction.z = Number( parts[ i++ ] );
			c.walk_vector_xz.x = Number( parts[ i++ ] );
			c.walk_vector_xz.y = Number( parts[ i++ ] );
			c.act_fire = Number( parts[ i++ ] );
			c.act_jump = Number( parts[ i++ ] );
			c.act_sit = Number( parts[ i++ ] );
			c.act_sprint = Number( parts[ i++ ] );
			c.act_weapon = Number( parts[ i++ ] );
			c.act_x = Number( parts[ i++ ] );
			c.act_y = Number( parts[ i++ ] );
			c.sit = Number( parts[ i++ ] );
			c.walk_phase = Number( parts[ i++ ] );
			var hook_enabled = ( Number( parts[ i++ ] ) === 1 );
			var hook_pos_x = Number( parts[ i++ ] );
			var hook_pos_y = Number( parts[ i++ ] );
			var hook_pos_z = Number( parts[ i++ ] );
			
			if ( c.hook_enabled )
			{
				if ( !hook_enabled )
				c.hook_enabled = false;
			}
			if ( hook_enabled )
			c.HookHere( hook_pos_x, hook_pos_y, hook_pos_z );

			return true;
		}
		else
		/*if ( command === sdSync.COMMAND_VISIBLE_BLOCKS )
		{
			var dc = this.parent_dataConnection;
			
			for ( var i = 1; i < parts.length; i++ )
			dc.visible_chunks[ i - 1 ] = Number( parts[ i ] );
		
			dc.visible_chunks.length = parts.length - 1;
			
			return true;
		}*/
		if ( command === sdSync.COMMAND_I_SPAWN_BULLET )
		{
			let c = this.parent_dataConnection.character;
			let gun_id = Number( parts[ 10 ] );
			let local_peer_uid = Number( parts[ 11 ] );
			let i = 1;
			
			if ( Number( parts[ 12 ] ) === 0 ) // spawn sound for 1st bullet only
			c.PlayShotSound( gun_id );
			
			let active_weapon = ( c.cur_weapon_mesh.gun_id === 0 ) ? c.rifle : c.rocket;
			let visual = active_weapon.children[ 0 ].getWorldPosition();
			
			let bullet = sdBullet.CreateBullet({ 
				x: Number( parts[ i++ ] ), 
				y: Number( parts[ i++ ] ), 
				z: Number( parts[ i++ ] ),
				visual_x: visual.x,
				visual_y: visual.y,
				visual_z: visual.z,
				tox: Number( parts[ i++ ] ),
				toy: Number( parts[ i++ ] ),
				toz: Number( parts[ i++ ] ),
				dx: Number( parts[ i++ ] ),
				dy: Number( parts[ i++ ] ),
				dz: Number( parts[ i++ ] ),
				owner: c,
				knock_power: sdGunClass.gun_classes[ gun_id ].knock_power,
				hp_damage: sdGunClass.gun_classes[ gun_id ].hp_damage,
				hp_damage_head: sdGunClass.gun_classes[ gun_id ].hp_damage_head,
				is_rocket: sdGunClass.gun_classes[ gun_id ].is_rocket,
				is_sniper: sdGunClass.gun_classes[ gun_id ].is_sniper,
				is_plasma: sdGunClass.gun_classes[ gun_id ].is_plasma,
				is_melee: sdGunClass.gun_classes[ gun_id ].is_melee,
				splash_radius: sdGunClass.gun_classes[ gun_id ].splash_radius
			});
			bullet.local_peer_uid = local_peer_uid;
			
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_MOVE_BULLET )
		{
			let c = this.parent_dataConnection.character;
			
			let local_peer_uid = Number( parts[ 1 ] );
			
			for ( let i = 0; i < sdBullet.bullets.length; i++ )
			{
				let b = sdBullet.bullets[ i ];
				if ( b.owner === c )
				if ( b.local_peer_uid === local_peer_uid )
				{
					b.x = Number( parts[ 2 ] );
					b.y = Number( parts[ 3 ] );
					b.z = Number( parts[ 4 ] );
					b.tox = Number( parts[ 5 ] );
					b.toy = Number( parts[ 6 ] );
					b.toz = Number( parts[ 7 ] );
					
					break;
				}
			}
			
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER )
		{
			let uid = Number( parts[ 1 ] );
			
			for ( let i = 0; i < sdCharacter.characters.length; i++ )
			{
				let c = sdCharacter.characters[ i ];
				if ( c.uid === uid )
				{
					c.DealDamage( Number( parts[ 2 ] ), this.parent_dataConnection.character, Number( parts[ 6 ] ), Number( parts[ 7 ] ), Number( parts[ 8 ] ) );
					c.tox += Number( parts[ 3 ] );
					c.toy += Number( parts[ 4 ] );
					c.toz += Number( parts[ 5 ] );
					break;
				}
			}
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_SPAWN_GORE )
		{
			sdSprite.CreateSprite({ type: sdSprite.TYPE_BLOOD, 
				x:Number( parts[ 1 ] ), y:Number( parts[ 2 ] ), z:Number( parts[ 3 ] ), 
				tox:Number( parts[ 4 ] ), toy:Number( parts[ 5 ] ), toz:Number( parts[ 6 ] ) });
			
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_BULLET_HIT_WORLD )
		{
			let tx = Number( parts[ 1 ] );
			let ty = Number( parts[ 2 ] );
			let tz = Number( parts[ 3 ] );
			let is_sniper = ( parts[ 4 ] === '1' );
			let vol = Number( parts[ 5 ] );
			
			
			sdSound.PlaySound({ sound: lib.wall_hit, position: new THREE.Vector3( tx, ty, tz ), volume: 1 * vol });
			
			if ( is_sniper )
			main.WorldPaintDamage( tx, ty, tz, 4.5 );
			else
			main.WorldPaintDamage( tx, ty, tz, 1.5 );
		
			sdSprite.CreateSprite({ type: is_sniper ? sdSprite.TYPE_SNIPER_HIT : sdSprite.TYPE_SPARK, x:tx, y:ty, z:tz });
			
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_BUILD )
		{
			let new_x = Number( parts[ 1 ] );
			let new_y = Number( parts[ 2 ] );
			let new_z = Number( parts[ 3 ] );
			let rad = Number( parts[ 4 ] );
			let r = Number( parts[ 5 ] );
			let g = Number( parts[ 6 ] );
			let b = Number( parts[ 7 ] );
			
			main.WorldPaintDamage( new_x, new_y, new_z, rad, 2, r,g,b );
		}
		else
		if ( command === sdSync.COMMAND_I_REMOVE_BULLET )
		{
			var found = false;
			let c = this.parent_dataConnection.character;
			
			let local_peer_uid = Number( parts[ 1 ] );
			
			for ( let i = 0; i < sdBullet.bullets.length; i++ )
			{
				let b = sdBullet.bullets[ i ];
				if ( b.owner === c )
				if ( b.local_peer_uid === local_peer_uid )
				{
					b.peer_removed = true;
					
					found = true;
					break;
				}
			}
			
			if ( found )
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_DRAW_EXPLOSION )
		{
			let found = false;
			let c = this.parent_dataConnection.character;
			
			let local_peer_uid = Number( parts[ 4 ] );
			
			for ( let i = 0; i < sdBullet.bullets.length; i++ )
			{
				let b = sdBullet.bullets[ i ];
				if ( b.owner === c )
				if ( b.local_peer_uid === local_peer_uid )
				{
					b.x = Number( parts[ 1 ] );
					b.y = Number( parts[ 2 ] );
					b.z = Number( parts[ 3 ] );
					sdBullet.DrawExplosion( b.x, b.y, b.z, b.knock_power, b.hp_damage, b );
					
					found = true;
					break;
				}
			}
			
			if ( found )
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_DIRECT_HIT_ATOM )
		{
			let c = this.parent_dataConnection.character;
			let best_hit = sdAtom.atoms[ Number( parts[ 1 ] ) ];
			let tox = Number( parts[ 2 ] );
			let toy = Number( parts[ 3 ] );
			let toz = Number( parts[ 4 ] );
			let local_peer_uid = Number( parts[ 5 ] );
			
			let hp_damage = Number( parts[ 6 ] );
			let hp_damage_head = Number( parts[ 7 ] );
			
			let bullet = null;
			
			for ( let i = 0; i < sdBullet.bullets.length; i++ )
			{
				let b = sdBullet.bullets[ i ];
				if ( b.owner === c )
				if ( b.local_peer_uid === local_peer_uid )
				{
					bullet = b;
					break;
				}
			}
			if ( bullet !== null )
			{
				sdBullet.DrawPlayerDamageAround( best_hit, tox, toy, toz, bullet, hp_damage, hp_damage_head );
			
				return true;
			}
		}
		else
		if ( command === sdSync.COMMAND_I_RESSURECT )
		{
			let c = this.parent_dataConnection.character;
			c.Ressurect( false );
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_RELOAD )
		{
			let c = this.parent_dataConnection.character;
			c.ReloadIfPossible();
			return true;
		}
		else
		if ( command === sdSync.COMMAND_I_SAY )
		{
			main.onChatMessage( 'Player #'+this.parent_dataConnection.user_uid, parts[ 1 ].split('<').join('&lt;').split('>').join('&gt;'), this.parent_dataConnection.character );
			return true;
		}
		
		console.warn('Command makes no sense at this moment, possibly due to packet order shuffling that can happen by itself. Not telling sender it was received yet...');
		console.warn('This one: '+m);
		return false;
	}
}
sdByteShifter.init_class();

class Packet
{
	constructor( message, condition )
	{
		this.message = message;
		this.is_sent = false;
		this.condition = condition;
		this.self_sent_in = -1; // Retry duration. Negative value will make messages non-resendable.
		this.self_sent = false; // When true, packet can't be used for decoding.
	}
}
class ReceivedID
{
	constructor( id )
	{
		this.id = id;
		this.timeout_in = 90;
	}
}