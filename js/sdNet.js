/*

	For some idea I thought this class will be suitable for majority of HTTP interactions with main server.

	It generates uid + pass, then requests key from server, and after than uses these uid + md5(pass+key) in order to request specific user-related info or pushing quick play requests.

*/
/* global main, sdCharacter, sdAtom, lib, sdSound, sdChain */

class sdNet
{
	static init_class()
	{
		
		sdNet.match_my_uid = -1;
		sdNet.match_dataConnections = [];
		sdNet.match_queued_dataConnections = null; // these will be assigned later, once fully connected. So we know from who messages are coming
		
		sdNet.offline_players = ( main.mobile ? 4 : 6 );
		sdNet.respawn_time = 2000;
		sdNet.GuessTeam = function( i, max_teams )
		{
			if ( main.game_mode === main.MODE_ONE_VS_ALL )
			return ( i === 0 ) ? 0 : 1;
			
			if ( main.MP_mode )
			return ( i % max_teams );
		
			return ( i % max_teams );
		};

		//sdNet.match_uid = -1;
		sdNet.match_uid = -2; // Why it was -1? -2 means it is not reset yet
		
		sdNet.peer_counter = -1; // in match, used to guess player's character ID
		
		sdNet.request_stack = [];
		setInterval( sdNet.ContentStackWorker, 100 );
		
		sdNet.peer = null;
		SpawnPeer();
		function SpawnPeer()
		{
			sdNet.peer = new Peer( undefined, { 
							//host: 'localhost', port: 9000, path: '/',
							host: 'www.gevanni.com', port: 9000, path: '/',
							debug:2, config:{ 'iceServers': [
						//{ 'url': 'stun:stun.l.google.com:19302' },
						{ url: 'stun:stun.l.google.com:19302?transport=udp' },
						{ url: 'stun:stun.services.mozilla.com' }, // Removed because Firefox says "Using five or more STUN/TURN servers causes problems"? Strange.
						//{ url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }, // Apparently they state their service is free. Actually this one breaks everything instead
						{ url: 'turn:turn.bistri.com:80', username: 'homeo', credential: 'homeo' }, // Was enough to work during 1st test
						{ url: "turn:13.250.13.83:3478?transport=udp", username: "YzYNCouZM1mhqhmseWk6", credential: "YzYNCouZM1mhqhmseWk6" } // Asia
					] } });

			sdNet.peer.on('connection', 
				function( dataConnection )
				{
					//console.warn( dataConnection );

					if ( sdNet.match_queued_dataConnections === null )
					sdNet.GotNewDataConnectionAfterStart( dataConnection );
					else
					sdNet.match_queued_dataConnections.push( dataConnection );
				}
			);
			sdNet.peer.on('disconnected', 
				function() 
				{ 
					//console.warn( 'disconnected?' );

					setTimeout( function()
					{
						if ( sdNet.peer.destroyed )
						{
							SpawnPeer();
						}
						else
						{
							sdNet.peer.reconnect();
						}
					}, 500 );
				}
			);
		}
		sdNet.uid = localStorage.getItem('stardefenders_uid');
		sdNet.pass = localStorage.getItem('stardefenders_pass');
		sdNet.key = null;
		sdNet.pass_plus_key = null;
		
		sdNet.InitiateLoginOrRegister( false );
		
		sdNet.invited_to_group = false;
		sdNet.invited_to_enemy_group = false;
	}
	
	static InitiateLoginOrRegister( forceful )
	{
		if ( sdNet.InitiateLoginOrRegister_block )
		return;
		sdNet.InitiateLoginOrRegister_block = true;

		if ( forceful )
		sdNet.uid = null;
		
		if ( sdNet.uid === null )
		{
			function password_generator( len )
			{
				var length = (len)?(len):(20+Math.random()*20);
				var string = "abcdefghijklmnopqrstuvwxyz"; //to upper 
				var numeric = '0123456789';
				var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
				var password = "";
				var character = "";
				while( password.length<length ) {
					var entity1 = Math.ceil(string.length * Math.random()*Math.random());
					var entity2 = Math.ceil(numeric.length * Math.random()*Math.random());
					var entity3 = Math.ceil(punctuation.length * Math.random()*Math.random());
					var hold = string.charAt( entity1 );
					hold = (entity1%2===0)?(hold.toUpperCase()):(hold);
					character += hold;
					character += numeric.charAt( entity2 );
					character += punctuation.charAt( entity3 );
					password = character;
				}
				return password;
			}

			sdNet.pass = password_generator();
			
			sdNet.httpGetContent({ request:'quick_register', pass:sdNet.pass }, function( v )
			{
				var parts = v.split('|');
				if ( parts[ 0 ] !== 'done' )
				{
					sdNet.GotServerError( v );
					return;
				}
			
				sdNet.uid = ~~parts[ 1 ];
				
				document.getElementById('status_field').innerHTML = 'Quick register done';
				localStorage.setItem('stardefenders_uid', sdNet.uid );
				localStorage.setItem('stardefenders_pass', sdNet.pass );
				
				GetKey();

			}, true );
		}
		else
		{
			sdNet.uid = ~~sdNet.uid;
			
			GetKey();
		}
		
		function GetKey()
		{
			sdNet.httpGetContent({ request:'login_request_key' }, function( v )
			{
				var parts = v.split('|');
				if ( parts[ 0 ] !== 'done' )
				{
					sdNet.GotServerError( v );
					return;
				}
			
				sdNet.key = parts[ 1 ];
				
				function Salty( pass )
				{
					return hex_md5( pass + '**SDsv_-vva8923~-&?' );
				}
				
				
				sdNet.ResetConnection();
		
				sdNet.pass_plus_key = hex_md5( Salty( sdNet.pass ) + sdNet.key );
				document.getElementById('status_field').innerHTML = 'Pass_plus_key received';
				
				sdNet.SendLeaveQuickPlayCommand();

				sdNet.InitiateLoginOrRegister_block = false;
				
			}, true );
		}
		
	}
	
	static SendLeaveQuickPlayCommand()
	{
		if ( sdNet.uid !== null )
		sdNet.httpGetContent({ request:'leave_quick_play', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );

			if ( sdNet.match_uid === -2 )
			sdNet.match_uid = -1;

		}, true );
	}
	
	static EndGame()
	{
		sdNet.SendLeaveQuickPlayCommand();
				
		sdNet.ResetConnection();
		
		document.getElementById('lobby_ui').style.display = 'inherit';
		document.getElementById('ingame_hud').style.display = 'none';
		
		main.DestroyLevel();
	}
	
	static ResetConnection()
	{
		if ( main.MP_mode )
		{
			main.MP_mode = false;
		}
	
		for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
		if ( sdNet.match_dataConnections[ i ] !== null )
		{
			sdNet.match_dataConnections[ i ].close();
			
			sdNet.match_dataConnections[ i ].dataChannel.close();
			
		}
		sdNet.match_dataConnections = [];

		sdNet.match_queued_dataConnections = [];
	}
	static FillWithPlayerList( e, arr, hide )
	{
		var any_not_me = false;
		
		var t = '';
		for ( var i = 0; i < arr.length; i++ )
		{
			if ( arr[ i ].charAt( 0 ) === '>' )
			{
				var user_uid = Number( arr[ i ].substr( 1 ) );
				
				t += '<a href="javascript:" onclick="sdNet.AcceptUsersGroup('+user_uid+')" class="listplayer_invite">Accept Player #'+user_uid+'\'s group</a>';
				any_not_me = true;
			}
			else
			{
				var user_uid = Number( arr[ i ] );

				if ( user_uid === sdNet.uid )
				t += '<a href="javascript:" onclick="sdNet.OpenUserMenuFor('+user_uid+',this)" class="listplayer listplayer_me">Player #'+user_uid+' ( You )</a>';
				else
				{
					t += '<a href="javascript:" onclick="sdNet.OpenUserMenuFor('+user_uid+',this)" class="listplayer">Player #'+user_uid+'</a>';
					any_not_me = true;
				}
			}
		}
		
		if ( e.innerHTML.length < t.length || ( e.innerHTML.length === t.length && e.innerHTML !== t ) )
		{
			sdSound.PlayInterfaceSound({ sound: lib.ui_down, volume: 1 });
		}
		e.innerHTML = t;
		
		if ( hide )
		{
			if ( any_not_me )
			{
				if ( e.parentElement.style.display !== 'inherit' )
				e.parentElement.style.display = 'inherit';
			}
			else
			{
				if ( e.parentElement.style.display !== 'none' )
				e.parentElement.style.display = 'none';
			}
		}
	}
	static OpenUserMenuFor( user_uid, that )
	{
		document.getElementById('floating_user_info_bg').style.display = 'inherit';
		//console.log( that );
		var pos = that.getBoundingClientRect();
		
		document.getElementById('floating_user_info').style.left = pos.left + 'px';
		document.getElementById('floating_user_info').style.top = ( pos.top + pos.height ) + 'px';
		
		if ( user_uid !== sdNet.uid )
		document.getElementById('floating_user_info').innerHTML = `
			
			<a href="javascript:sdNet.InviteToGroup(`+user_uid+`);sdNet.CloseUserMenu();" class="listplayer">Invite to my teammate group</a>
			<a href="javascript:sdNet.InviteAsOpponent(`+user_uid+`);sdNet.CloseUserMenu();" class="listplayer">Invite as opponent group leader</a>
			
		`;
		else
		document.getElementById('floating_user_info').innerHTML = `
			
			<a href="javascript:sdNet.AcceptUsersGroup(-1);sdNet.CloseUserMenu();" class="listplayer">Reset my teammate group</a>
			<a href="javascript:sdNet.AcceptUsersGroup(-2);sdNet.CloseUserMenu();" class="listplayer">Reset opponent group</a>
			
		`;
	}
	static CloseUserMenu()
	{
		document.getElementById('floating_user_info_bg').style.display = 'none';
	}
	static InviteToGroup( user_uid )
	{
		sdNet.httpGetContent({ request:'invite_to_group', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key, to_uid:user_uid, is_enemy_request:0 }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		}, true );
	}
	static InviteAsOpponent( user_uid )
	{
		sdNet.httpGetContent({ request:'invite_to_group', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key, to_uid:user_uid, is_enemy_request:1 }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		}, true );
	}
	static AcceptUsersGroup( user_uid )
	{
		sdNet.httpGetContent({ request:'accept_group_invite', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key, from_uid:user_uid }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		}, true );
	}
	static UpdateOnlinePlayers()
	{
		sdNet.httpGetContent({ request:'get_online_players', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		
			sdNet.FillWithPlayerList( document.getElementById('online_players'), parts[ 1 ] !== '' ? parts[ 1 ].split(',') : [], false );
		}, false );
	}
	static UpdateGroupPlayers()
	{
		sdNet.httpGetContent({ request:'get_group_players', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		
			if ( parts[ 1 ].indexOf( '>' ) !== -1 )
			{
				if ( !sdNet.invited_to_group )
				{
					sdNet.invited_to_group = true;
					sdSound.PlayInterfaceSound({ sound: lib.ui_notification, volume: 1 });
				}
			}
			else
			{
				sdNet.invited_to_group = false;
			}
			
			sdNet.FillWithPlayerList( document.getElementById('group_players'), parts[ 1 ] !== '' ? parts[ 1 ].split(',') : [], true );
		}, false );
	}
	static UpdateEnemyGroupPlayers()
	{
		sdNet.httpGetContent({ request:'get_enemy_group_players', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key }, function( v )
		{
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		
			if ( parts[ 1 ].indexOf( '>' ) !== -1 )
			{
				if ( !sdNet.invited_to_enemy_group )
				{
					sdNet.invited_to_enemy_group = true;
					sdSound.PlayInterfaceSound({ sound: lib.ui_notification, volume: 1 });
				}
			}
			else
			{
				sdNet.invited_to_enemy_group = false;
			}
			
			sdNet.FillWithPlayerList( document.getElementById('enemy_group_players'), parts[ 1 ] !== '' ? parts[ 1 ].split(',') : [], true );
		}, false );
	}
	static httpGetContent( param_obj, callback, retry )
	{
		for ( var i = 0; i < sdNet.request_stack.length; i++ )
		//if ( sdNet.request_stack[ i ][ 1 ] === callback )
		if ( sdNet.request_stack[ i ][ 0 ].request === param_obj.request )
		{
			//console.warn('Same callback');
			//console.warn('Same callback for request: '+param_obj.request);
			return;
		}
		sdNet.request_stack.push([ param_obj, callback, retry ]);
		//console.log( 'Scheduled request:' + sdNet.request_stack[ sdNet.request_stack.length - 1 ][ 0 ].request );
	}
	static ContentStackWorker()
	{
		if ( sdNet.request_stack.length > 0 )
		{
			//console.log( 'Request being executed:' + sdNet.request_stack[ 0 ][ 0 ].request );
			
			var a = sdNet.request_stack.shift();
			var i = 0;
			sdNet._httpGetContent( a[ i++ ], a[ i++ ], a[ i++ ] );
		}
	}
	static _httpGetContent( param_obj, callback, retry )
	{
		if ( retry === true )
		retry = true;
		else
		retry = false;
	
		let theUrl;

		//var theUrl = 'server.php';
		if ( window.location.href.indexOf( 'https://' ) === 0 )
		theUrl = 'https://www.gevanni.com/projects/StarDefenders3D/server.php';
		else
		theUrl = 'http://www.gevanni.com/projects/StarDefenders3D/server.php';

		let xmlHttp = null;
		
		let timeout_time = 7000;
		//let timeouterrors = 0;
		let retry_time = 2000;

		xmlHttp = new XMLHttpRequest();
		xmlHttp.timeout = timeout_time;
		xmlHttp.open( "POST", theUrl, true );
		xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		let timed_out = false;

		let parameters = '';
		let first = true;
		for ( let propertyName in param_obj )
		{
			if ( first )
			first = false;
			else
			parameters += '&';

			parameters += encodeURIComponent( propertyName ) + '=' + encodeURIComponent( param_obj[propertyName] );
		}

		xmlHttp.onreadystatechange = function()
		{
			if ( !timed_out ) // So ignore timed out
			if ( xmlHttp.readyState === 4 )
			{
				if ( xmlHttp.status === 200 ) // ok
				{
					//timeouterrors = 0; // reset timeout errors

					sdNet.ClearAlertIfContains('Connection problem');

					timed_out = true;
					//show_next_connection_error = true;
					callback( xmlHttp.responseText );
				}
				else
				{
					timed_out = true;
					sdNet.ConnectionError( xmlHttp.status, xmlHttp.statusText );

					if ( retry )
					setTimeout( sdNet.httpGetContent( param_obj, callback, retry ), retry_time );
				}
			}
		};
		xmlHttp.ontimeout = function()
		{
			if ( !timed_out )
			{
				timed_out = true;
				sdNet.ConnectionError( 0, 'Timeout' );

				if ( retry )
				setTimeout( sdNet.httpGetContent( param_obj, callback, retry ), retry_time );
			}
		};
		
		xmlHttp.onerror = function()
		{
		};

		xmlHttp.send( parameters );
	}
	static ClearAlertIfContains( t )
	{
		// TODO
	}
	static ConnectionError( n, t )
	{
		if ( n === 0 )
		{
			t = 'Connection lost';
		}
		
		//console.warn( t );
		
		//alert( t );
	}
	static OfflineTraining( enemies )
	{
		sdNet.match_queued_dataConnections = [];
		
		sdNet.match_my_uid = 0;
		
		let max_players = sdNet.offline_players;
		let mode = main.MODE_FFA;
		
		if ( enemies === 2 )
		{
			max_players = 16;
			mode = main.MODE_ONE_VS_ALL;
		}
		if ( enemies === 0 )
		{
			max_players = 1;
		}
		
		sdNet.StartMatch({
			
			max_players: max_players,
			
			max_teams: 2,
			
			world_seed: Math.floor( Math.random()*10000000 ),
			
			map_uid: 0,
			
			mode: mode
			
		}, then );
		
		function then()
		{
			main.MP_mode = false;

			main.run();
		}
	}
	static QuickPlay( mode )
	{
		sdNet.EndGame();
					
		if ( sdNet.pass_plus_key === null )
		{
			document.getElementById('status_field').innerHTML = 'Error: Pass plus key is not ready yet';
			throw new Error('Pass plus key is not ready yet');
		}
		
		if ( sdNet.peer.id === undefined )
		{
			document.getElementById('status_field').innerHTML = 'Error: Peer ID is not ready yet';
			throw new Error('Peer ID is not ready yet');
		}
	
		sdNet.httpGetContent({ request:'quick_play_start', uid:sdNet.uid, key:sdNet.key, pass_plus_key:sdNet.pass_plus_key, peer_id:sdNet.peer.id, mode:mode }, 
		function( v ) {
			var parts = v.split('|');
			if ( parts[ 0 ] !== 'done' )
			sdNet.GotServerError( v );
		}, true );
	}
	
	static GotServerError( v )
	{
		var parts = v.split('|');
		
		if ( parts[ 1 ] === 'Bad login.' || parts[ 1 ] === 'Outdated hash.' || parts[ 1 ] === 'Outdated key.' )
		{
			if ( ~~parts[ 2 ] === sdNet.uid ) // Related to our uid?
			{
				//sdNet.uid = null;
				sdNet.InitiateLoginOrRegister( true );
			}
		}
		else
		throw new Error( v );
	}
	
	static QuickPlaySeeker()
	{
		if ( sdNet.uid === null )
		{
			document.getElementById('status_field').innerHTML = 'Awaiting uid to be not null...';
			return;
		}
		
		if ( sdNet.pass_plus_key === null )
		{
			document.getElementById('status_field').innerHTML = 'Awaiting pass_plus_key...';
			return;
		}
	
		if ( sdNet.peer.id === undefined )
		{
			document.getElementById('status_field').innerHTML = 'Awaiting peer.id...';
			return;
		}
	
		if ( sdNet.match_uid !== -2 ) // initial state, means not reset on first run yet
		sdNet.httpGetContent({ request:'quick_play_ping', key:sdNet.key, uid:sdNet.uid, pass_plus_key:sdNet.pass_plus_key, peer_id:sdNet.peer.id }, 
			function( v )
			{
				var parts = v.split('|');
				if ( parts[ 0 ] !== 'done' && parts[ 0 ] !== 'wait' )
				{
					document.getElementById('status_field').innerHTML = 'Server responds message: '+v;
					
					sdNet.GotServerError( v );
					return;
				}

				if ( parts[ 0 ] === 'wait' )
				{
					if ( parts[ 1 ].length !== 0 )
					{
						console.log('waiting... ' + parts[ 1 ] );
						document.getElementById('status_field').innerHTML = 'Waiting on quickplay resolve [ '+parts[ 1 ]+' ]';
					}
					else
					{
						// No quick play task found on server
						document.getElementById('status_field').innerHTML = 'Doing literally nothing.';
					}
				}
				else
				{
					var match_uid = ~~parts[ 1 ];

					if ( sdNet.match_uid !== match_uid )
					{
						if ( main.game_loop_started )
						{
							document.getElementById('status_field').innerHTML = 'Match was found, but was unable to connect while playing';
						}
						else
						{
							sdNet.match_uid = match_uid;

							document.getElementById('status_field').innerHTML = 'Match found, requesting match info...';

							sdNet.httpGetContent({ request:'get_match_info', key:sdNet.key, uid:sdNet.uid, pass_plus_key:sdNet.pass_plus_key, peer_id:sdNet.peer.id, match_uid:match_uid }, 
								function( v )
								{
									let parts = v.split('|');

									if ( parts[ 0 ] !== 'done' )
									{
										sdNet.GotServerError( v );
										return;
									}

									function MakingSurePeerIsConnectedToSocketServerThenEval()
									{
										if ( sdNet.peer.disconnected )
										setTimeout( MakingSurePeerIsConnectedToSocketServerThenEval, 500 );
										else
										{
											document.getElementById('status_field').innerHTML = 'Everything seems to be done, might throw an error in console if any of peers is unreachable';
											eval( parts[ 1 ] );
										}
									}
									document.getElementById('status_field').innerHTML = 'Match info found, waiting on peer server connection...';
									MakingSurePeerIsConnectedToSocketServerThenEval();
								},
							true );
						}
					}
					else
					{
						if ( document.getElementById('status_field').innerHTML.indexOf( 'error' ) === -1 )
						document.getElementById('status_field').innerHTML = 'Idle or waiting for other players to load match';
					}
				}
			},
		false );

	}

	
	static PeersAddStart()
	{
		console.log( 'PeersAddStart' );
		sdNet.peer_counter = 0;
	}
	static AddPeer( params )
	{
		/*
		
		.uid
		.peer_id
		.username
		.clan_uid
		
		*/
		//console.log( 'AddPeer' );
		//console.log( params );
		
		if ( params.uid === sdNet.uid )
		{
			sdNet.match_my_uid = sdNet.peer_counter;
			
			//console.log( 'is me' );
			
			sdNet.match_dataConnections.push( null );
		}
		else
		{
			var new_dataConnection = sdNet.peer.connect( params.peer_id, { serialization:'none'} );
			
			if ( new_dataConnection === undefined )
			{
				console.log( 'failed, there is no socket connection to peer server' );
				
			}
			else
			{
			
				sdNet.match_dataConnections.push( new_dataConnection );

				//new_dataConnection.character = sdCharacter.characters[ sdNet.peer_counter ];
				new_dataConnection.byte_shifter = new sdByteShifter( sdNet.match_dataConnections[ sdNet.peer_counter ] );
				new_dataConnection.visible_chunks = [];
				new_dataConnection.reports_direct_visiblity = false;
				new_dataConnection.user_uid = ~~params.uid;
				new_dataConnection.sd_connected = true;
				new_dataConnection.sd_connected_timeout_timer = 0;
			}
		}
		
		sdNet.peer_counter++;
	}
	static PeersAddEnd()
	{
		//console.log( 'PeersAddEnd' );
		
		if ( sdNet.peer_counter <= 1 )
		throw new Error('Why there is only '+sdNet.peer_counter+' peers?');
	}
	static StartMatch( params, then=null )
	{
		/*
		
		.max_players
		.max_teams
		.world_seed
		.map_uid
		.mode
		
		*/
	   
	    sdSound.PlayInterfaceSound({ sound: lib.game_start, volume: 1 });
		
	   
		main.DestroyLevel();
		
		document.getElementById('loading_screen').style.display = 'inherit';
		
		let retries = 0;
		
		setTimeout( Retry_function, 50 );
		
		function Retry_function()
		{
			if ( sdNet.match_queued_dataConnections === null )
			{
				if ( retries < 3 )
				{
					retries++;
					setTimeout( Retry_function, 500 );
					document.getElementById('status_field').innerHTML = 'Trying to start match, but there are no signs of sdNet.match_queued_dataConnections found. Previous match start failed and then this one initiated? Retying...';
				}
				else
				{
					document.getElementById('status_field').innerHTML = 'Trying to start match, but there are no signs of sdNet.match_queued_dataConnections found. Previous match start failed and then this one initiated? Stopped trying.';
				}
				return;
			}
			
			main.game_mode = params.mode;
			
			main.BuildLevel( Number( params.world_seed ) );
			
			document.getElementById('loading_screen').style.display = 'none';

			sdChain.enable_reuse = false;

			var max_players = ~~params.max_players;
			var max_teams = ~~params.max_teams;

			main.team_scores = [];
			for ( var i = 0; i < max_teams; i++ )
			main.team_scores[ i ] = 0;
			main.ScoreForTeam( 0, 0 ); // just update

			main.max_players = max_players;
			main.max_teams = max_teams;

			for ( var i = 0; i < max_players; i++ )
			{
				var c = sdCharacter.CreateCharacter({ x:5, y:main.level_chunks_y*main.chunk_size + 20, z:5, bmp:sdAtom.character_bitmap, team:sdNet.GuessTeam( i, max_teams ) });
				c.Respawn();
			}

			sdChain.enable_reuse = sdChain.enable_reuse_persistent; // true
			sdChain.initial_length = sdChain.chains.length;

			main.SetActiveCharacter( sdCharacter.characters[ sdNet.match_my_uid ] );
			main.mp_character = sdCharacter.characters[ sdNet.match_my_uid ];

			for ( var i = 0; i < sdNet.match_queued_dataConnections.length; i++ )
			sdNet.GotNewDataConnectionAfterStart( sdNet.match_queued_dataConnections[ i ] );
			sdNet.match_queued_dataConnections = null;
			
			if ( then !== null )
			then();
		
		}
	    
	}
	static StartOnceGotAllConnections()
	{
		document.getElementById('status_field').innerHTML = 'Everyone is connected. Starting...';
		main.MP_mode = true;
	    main.run();
		
		main.flush_fps();
	}
	static GotNewDataConnectionAfterStart( d )
	{
		var found = false;
		
		var found_tot = 0;
		
		for ( var i = 0; i < sdNet.match_dataConnections.length; i++ )
		if ( sdNet.match_dataConnections[ i ] !== null )
		{
			if ( sdNet.match_dataConnections[ i ].peer === d.peer )
			{
				
				d.reverse_dataConnection = sdNet.match_dataConnections[ i ];
				
				sdNet.match_dataConnections[ i ].character = sdCharacter.characters[ i ];
				sdCharacter.characters[ i ].dataConnection = sdNet.match_dataConnections[ i ];
				
				let bysh = sdNet.match_dataConnections[ i ].byte_shifter;
				
				d.on('data', function( data ){ bysh.DataReceived( data ); } );
				
				d.on('error', function( err ){ alert('Peer-to-peer connection error: If this error happens then it must be one or more players in match had not configured their firewall/network connection/router/ISP for peer-to-peer connection being possible? Error: '+err); } );
				
				found = true;
			}
			
			found_tot++;
		}
		if ( !found )
		throw new Error('dataConnection was not found?');
		
		if ( found_tot === sdNet.match_dataConnections.length - 1 )
		sdNet.StartOnceGotAllConnections();
	}
}
sdNet.init_class();