/*

	Works in pair wiht sdByteShifter.js

	Sends commands for all sdByteShifers (they are objects used to send/receive/encode/decode data from/to peers).

	sdSync.update_delay is interesting one const, for fast stable connections and fast clients it can be 0.5, but 
	usually it will make a lot of data stacked up and shuffled (as a result enemy will be in "slow-motion" while 
	teleporting between ~3 random positions in which player have been).

	When bullets stuck in holes and are not getting removed - it is usually a symptom of data being stacked up for 
	at least 2 seconds (after that time, game depending on sdByteShifter.js command settings, might give up on resending
	such important messages).

*/

/* global sdNet, main, sdBullet */

class sdSync
{
	static init_class()
	{
		//sdSync.update_delay = 30; // hack
		//sdSync.update_delay = 0.5;
		//sdSync.update_delay = 1;
		//sdSync.update_delay = 10;
		sdSync.update_delay = 5;
		
		sdSync.update_timer = 0;
		
		
		//sdSync.keep_and_send_data_for_disconnected_players = false;
		sdSync.keep_and_send_data_for_disconnected_players_duration = 15 * 30;
		
		var codes = [];
		function UniqueTest( c )
		{
			if ( codes.indexOf( c ) === -1 )
			{
				codes.push( c );
				return c;
			}
			else
			throw new Error('sdSync: Code "'+c+'" is in use');
		}
			
		sdSync.COMMAND_CHARACTER_STATE = UniqueTest('c');
		//sdSync.COMMAND_VISIBLE_BLOCKS = UniqueTest('v');
		sdSync.COMMAND_I_SPAWN_BULLET = UniqueTest('s');
		sdSync.COMMAND_I_MOVE_BULLET = UniqueTest('b');
		sdSync.COMMAND_I_DAMAGE_PUSH_PLAYER = UniqueTest('d');
		sdSync.COMMAND_I_SPAWN_GORE = UniqueTest('g');
		sdSync.COMMAND_I_BULLET_HIT_WORLD = UniqueTest('w');
		sdSync.COMMAND_I_REMOVE_BULLET = UniqueTest('r');
		sdSync.COMMAND_I_DRAW_EXPLOSION = UniqueTest('e');
		//sdSync.COMMAND_I_KNOCK_DAMAGE_ATOM = UniqueTest('a');
		sdSync.COMMAND_I_DIRECT_HIT_ATOM = UniqueTest('h');
		sdSync.COMMAND_I_RESSURECT = UniqueTest('u');
		sdSync.COMMAND_I_SAY = UniqueTest('y');
		sdSync.COMMAND_I_RELOAD = UniqueTest('l');
		sdSync.COMMAND_I_BUILD = UniqueTest('i');
	}
	
	static MP_SendEvent( command, ... args )
	{
		for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
		if ( sdNet.match_dataConnections[ i ] !== null )
		if ( sdNet.match_dataConnections[ i ].sd_connected_timeout_timer < sdSync.keep_and_send_data_for_disconnected_players_duration || sdNet.match_dataConnections[ i ].open )
		sdNet.match_dataConnections[ i ].byte_shifter.AddEvent( command, ... args );
	}
	
	static SendMyCommands( GSPEED )
	{
		// Some update data send there. In this game's case it is for character state and bullet state
		if ( main.my_character !== null )
		if ( main.my_character.hea > 0 )
		sdSync.MP_SendEvent( sdSync.COMMAND_CHARACTER_STATE );
		
		for ( var i = 0; i < sdBullet.bullets.length; i++ )
		{
			var b = sdBullet.bullets[ i ];
			if ( b.owner === main.my_character )
			sdSync.MP_SendEvent( sdSync.COMMAND_I_MOVE_BULLET, b );
		}
		
		// Some "Player # has left the match" logic
		for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
		if ( sdNet.match_dataConnections[ i ] !== null )
		{
			if ( !sdNet.match_dataConnections[ i ].open )
			{
				if ( sdNet.match_dataConnections[ i ].sd_connected )
				{
					sdNet.match_dataConnections[ i ].sd_connected_timeout_timer += GSPEED;
					if ( sdNet.match_dataConnections[ i ].sd_connected_timeout_timer < 60 )
					{
					}
					else
					{
						sdNet.match_dataConnections[ i ].sd_connected = false;
						main.onChatMessage( '', ('Player #'+sdNet.match_dataConnections[ i ].user_uid + ' has left the match').split('<').join('&lt;').split('>').join('&gt;'), null );
					}
				}
			}
			else
			{
				sdNet.match_dataConnections[ i ].sd_connected_timeout_timer = 0;
				if ( !sdNet.match_dataConnections[ i ].sd_connected )
				{
					sdNet.match_dataConnections[ i ].sd_connected = true;
					main.onChatMessage( '', ('Player #'+sdNet.match_dataConnections[ i ].user_uid + ' has been reconnected').split('<').join('&lt;').split('>').join('&gt;'), null );
				}
			}
		}
	}
	
	static ThinkNow( GSPEED )
	{
		sdSync.update_timer -= GSPEED;
		
		if ( sdSync.update_timer <= 0 )
		{
			sdSync.update_timer = sdSync.update_delay;
			
			if ( sdSync.update_delay > GSPEED )
			GSPEED *= sdSync.update_delay;
		
			sdSync.SendMyCommands( GSPEED );
		
			for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
			if ( sdNet.match_dataConnections[ i ] !== null )
			if ( sdNet.match_dataConnections[ i ].sd_connected_timeout_timer < sdSync.keep_and_send_data_for_disconnected_players_duration || sdNet.match_dataConnections[ i ].open )
			sdNet.match_dataConnections[ i ].byte_shifter.SendData( GSPEED );
		}
	}
}
sdSync.init_class();
