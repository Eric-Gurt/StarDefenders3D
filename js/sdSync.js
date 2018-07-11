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
	}
	
	static MP_SendEvent( command, ... args )
	{
		for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
		if ( sdNet.match_dataConnections[ i ] !== null )
		sdNet.match_dataConnections[ i ].byte_shifter.AddEvent( command, ... args );
	}
	
	static SendMyCommands()
	{
		// Some update data send there
		if ( main.my_character !== null )
		if ( main.my_character.hea > 0 )
		sdSync.MP_SendEvent( sdSync.COMMAND_CHARACTER_STATE );
		
		for ( var i = 0; i < sdBullet.bullets.length; i++ )
		{
			var b = sdBullet.bullets[ i ];
			if ( b.owner === main.my_character )
			sdSync.MP_SendEvent( sdSync.COMMAND_I_MOVE_BULLET, b );
		}
	}
	
	static ThinkNow( GSPEED )
	{
		sdSync.update_timer -= GSPEED;
		
		if ( sdSync.update_timer <= 0 )
		{
			sdSync.update_timer = sdSync.update_delay;
		
			sdSync.SendMyCommands();
		
			for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
			if ( sdNet.match_dataConnections[ i ] !== null )
			sdNet.match_dataConnections[ i ].byte_shifter.SendData( GSPEED );
		}
	}
}
sdSync.init_class();
