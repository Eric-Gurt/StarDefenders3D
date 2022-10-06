/*

	Some basic AI which should catch some of player's attention.

*/
/* global sdCharacter, main, THREE */

class sdAI
{
	static init_class()
	{
		sdAI.attack_walls_randomly_when_nobody_is_visible = false;
		sdAI.use_brain_js = false;
		
		//sdAI.learn_speed = 0.01; // 0.6
		//sdAI.next_train = main.ticks_passed;
		
		sdAI.brain_js_model = new brain.NeuralNetwork(); // Moved to worker
		
		/*new brain.NeuralNetwork({
		//sdAI.brain_js_model = new brain.NeuralNetworkGPU({
			//activation: 'sigmoid', // activation function
			//hiddenLayers: [4],
			//learningRate: 0.6, // global learning rate, useful when training using streams
			activation: 'sigmoid',
			//activation: 'relu',
			//activation: 'tanh',
			//hiddenLayers: [ 16, 32, 16 ],
			//hiddenLayers: [ 128, 64, 32 ],
			//hiddenLayers: [ 32 ], // Alright-ish but still no proper combat, sigmoid
			hiddenLayers: [ 8, 4 ], // Randomly shots in case of rifle, sigmoid
			//hiddenLayers: [ 3, 4 ], // Noting at all it seems, at least with shotgun, sigmoid
			learningRate: sdAI.learn_speed,
			
		});
		sdAI.brain_js_model.errorCheckInterval = Infinity;*/
		//sdAI.brain_js_model.errorCheckInterval = 50;
		
		sdAI.worker = new Worker( 
			'./js/sdAI_webworker.js', 
			//{ type:"module" } 
		);
		let network_evolutions = 1;
		sdAI.worker.onmessage = function(e) 
		{
			let command_and_data = e.data;
			let command = command_and_data[ 0 ];
			let data = command_and_data[ 1 ];
			if ( command === 'update_network' )
			{
				sdAI.brain_js_model.fromJSON( data );
				
				main.onChatMessage( '', 'Applying new neural network (version '+( network_evolutions++ )+')', null, '255,255,255' );
				main.onChatMessage( '', 'Preparing new neural network...', null, '255,255,255' );
			}
			if ( command === 'status' )
			{
				main.onChatMessage( '', '...divergence: '+( data ), null, '255,255,255' );
			}
		};
		sdAI.worker.onerror = function(e) 
		{
			console.log("Error: ", e);
		};
		//sdAI.worker.postMessage("hello"); // Start the worker.
		
		//sdAI.brain_js_model2 = null;
		//sdAI.brain_js_model3 = null;
		
		//sdAI.brain_js_training_busy = false;
		
		sdAI.brain_js_outputs = [
			'act_x',
			'act_y',
			'act_jump',
			'act_sit',
			'act_sprint',
			'act_fire',
			'act_weapon',
			'look_direction.x',
			'look_direction.y',
			'look_direction.z'
		];
		sdAI.brain_js_output_compress_functions = [
			( v )=> v * 0.5 + 0.5,
			( v )=> v * 0.5 + 0.5,
			( v )=> v,
			( v )=> v,
			( v )=> v,
			( v )=> v,
			( v )=> v / 10,
			( v )=> v * 0.5 + 0.5,
			( v )=> v * 0.5 + 0.5,
			( v )=> v * 0.5 + 0.5
		];
		sdAI.brain_js_output_decompress_functions = [
			( v )=> Math.round( ( v - 0.5 ) * 2 ),
			( v )=> Math.round( ( v - 0.5 ) * 2 ),
			( v )=> Math.round( v ),
			( v )=> Math.round( v ),
			( v )=> Math.round( v ),
			( v )=> Math.round( v ),
			( v )=> Math.round( v * 10 ),
			( v )=> ( v - 0.5 ) * 2,
			( v )=> ( v - 0.5 ) * 2,
			( v )=> ( v - 0.5 ) * 2
		];
		//sdAI.brain_js_model_last_output = null;
		sdAI.input_output_history = [];
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
	
	static GetInputsForPlayerAndOpponent( c, e )
	{
		const include_each = 30; // 3 in total? Once input per second
		
		// For AI to better understand velocity and acceleration
		if ( c.last_neural_input_time !== main.ticks_passed )
		{
			c.last_neural_input_time = main.ticks_passed;
			
			let new_part = sdAI.GenerateNeuralInputsForPlayerAndOpponent( c, e );
			
			c.neural_input_size = new_part.length;
			
			c.previous_neural_inputs.push( ...new_part );
			
			// Cut at the start if too long, remember approximately 3 seconds
			if ( c.previous_neural_inputs.length > 90 * c.neural_input_size )
			c.previous_neural_inputs.splice( 0, c.neural_input_size );
		}
		
		let part = [];
		
		if ( c.previous_neural_inputs.length >= 90 * c.neural_input_size )
		{
			for ( let i = c.previous_neural_inputs.length - 1 - c.neural_input_size; i >= 0; i -= c.neural_input_size * include_each )
			{
				part.push( ...c.previous_neural_inputs.slice( i, i + c.neural_input_size ) );
			}

			if ( part.length % c.neural_input_size !== 0 )
			throw new Error();
		}
		
		return part;
	}
	
	static GenerateNeuralInputsForPlayerAndOpponent( c, e )
	{
		//let e_lx = e.last_positions[ 0 ] || 0;
		//let e_ly = e.last_positions[ 1 ] || 0;
		//let e_lz = e.last_positions[ 2 ] || 0;
		
		//let c_lx = c.last_positions[ 0 ] || 0;
		//let c_ly = c.last_positions[ 1 ] || 0;
		//let c_lz = c.last_positions[ 2 ] || 0;
		
		let di =  Math.max( 1, main.Dist3D( e.x, e.y, e.z, c.x, c.y, c.z ) );
		//let ldi = Math.max( 1,main.Dist3D( e_lx, e_ly, e_lz, c_lx, c_ly, c_lz ) );
		
		let dx = ( e.x - c.x ) / di;
		let dy = ( e.y - c.y ) / di;
		let dz = ( e.z - c.z ) / di;
		
		//let ldx = ( e_lx - c_lx ) / ldi;
		//let ldy = ( e_ly - c_ly ) / ldi;
		//let ldz = ( e_lz - c_lz ) / ldi;
		
		var targ = new THREE.Vector3( e.x - c.x, e.y - c.y, e.z - c.z );

		targ.negate(); // look_direction is reversed...
		
		var an = ( c.look_direction.angleTo( targ ) < Math.PI / 2 * 0.75 ) ? 1 : 0; // Simulate angular visiblity
		
		targ.negate();
		
		var an2 = ( e.look_direction.angleTo( targ ) < Math.PI / 2 * 0.75 ) ? 1 : 0; // Simulate knowledge of angular visiblity for oponent
		
		let los = ( main.TraceLine( e.x, e.y, e.z, c.x, c.y, c.z, null, 3, 0 ) < 1 ) * 1;
						
		let input = [
			dx * 0.5 + 0.5,
			dy * 0.5 + 0.5,
			dz * 0.5 + 0.5,
			
			( e.x - c.x ) / 1000 + 0.5,
			( e.y - c.y ) / 1000 + 0.5,
			( e.z - c.z ) / 1000 + 0.5,
			di / 1000,
			Math.max( 0, c.hea ) / 1000,
			Math.min( 1, c.regen_timer / 90 ),
			Math.max( 0, e.hea ) / 1000,
			Math.min( 1, e.regen_timer / 90 ),
			c.x / 1000 + 0.5,
			c.y / 1000 + 0.5,
			c.z / 1000 + 0.5,
			c.act_fire,
			e.act_fire,
			e.cur_weapon_slot / 10,
			c.cur_weapon_slot / 10,
			e.weapon_change_tim / sdGunClass.weapon_switch_time,
			c.weapon_change_tim / sdGunClass.weapon_switch_time,
			e.recoil / 100,
			c.recoil / 100,
			Math.max( 0, c.time_to_reload ) / Math.PI / 2,
			Math.max( 0, e.time_to_reload ) / Math.PI / 2,
			e.stand * 1,
			c.stand * 1,
			e.look_direction.x * 0.5 + 0.5,
			e.look_direction.y * 0.5 + 0.5,
			e.look_direction.z * 0.5 + 0.5,
			c.look_direction.x * 0.5 + 0.5,
			c.look_direction.y * 0.5 + 0.5,
			c.look_direction.z * 0.5 + 0.5,
		];
		
		for ( let i = 0; i < 2; i++ )
		for ( let x = -32; x <= 32; x += 8 )
		for ( let y = -32; y <= 32; y += 8 )
		for ( let z = -32; z <= 32; z += 8 )
		if ( x === -32 || x === 32 )
		if ( y === -32 || y === 32 )
		if ( z === -32 || z === 32 )
		{
			let p = ( i === 0 ) ? c : e;
			var prog_last = main.TraceLine( p.x, 
											 p.y, 
											 p.z, 
											 p.x + x, 
											 p.y + y, 
											 p.z + z, 
											 null, 3, 0 );
											 
			input.push( prog_last );
		}
		
		return input;
	}
	
	static TrainAIWithPlayerBehavior( c )
	{
		if ( sdAI.use_brain_js )
		if ( sdCharacter.characters.length >= 2 )
		{
			let e = sdCharacter.characters[ 1 ]; // Opponent
			
			if ( !document.hasFocus() || main.last_activity < main.ticks_passed - 3000 ) // Do not save inactive inputs
			return;
			
			if ( e === main.my_character )
			{
				return; // When player dies
				//throw new Error();
			}
			
			if ( c !== main.my_character )
			throw new Error();
			
			if ( e === c )
			throw new Error();
		
			/*if ( c.act_x === 0 )
			if ( c.act_y === 0 )
			if ( c.act_fire === 0 )
			if ( c.act_jump === 0 )
			if ( c.act_sit === 0 )
			if ( c.act_sprint === 0 )
			return;*/
			
			let input = sdAI.GetInputsForPlayerAndOpponent( c, e );
			
			if ( input.length === 0 )
			return;
			
			let output = [];
			for ( let i = 0; i < sdAI.brain_js_outputs.length; i++ )
			{
				let parts = sdAI.brain_js_outputs[ i ].split( '.' );
				
				let value;
				
				if ( parts.length === 1 )
				value = c[ parts[ 0 ] ];
				else
				value = c[ parts[ 0 ] ][ parts[ 1 ] ];
			
				value = sdAI.brain_js_output_compress_functions[ i ]( value );
				
				if ( value < -1 || value > 1 )
				throw new Error();
			
				output.push( value );
			}
			
			let new_train_data = { input: input, output: output };
			/*
			// Randomly forget if known too much?
			if ( sdAI.input_output_history.length > 512 )
			{
				let i = ~~( Math.random() * sdAI.input_output_history.length );
				sdAI.input_output_history.splice( i, 1 );
			}
			*/
		   
			if ( 1 )
			{
				if ( 0 )
				{
					let current_samples = [ new_train_data ];

					// Remember old cases and train on them too
					if ( sdAI.input_output_history.length > 10 )
					for ( let i = 0; i < 5; i++ )
					{
						let i2;

						//if ( i2 < 5 )
						i2 = ~~( Math.random() * sdAI.input_output_history.length );
						//else
						//i2 = Math.max( 0, sdAI.input_output_history.length - 1 - ~~( Math.random() * 256 ) );

						current_samples.push( sdAI.input_output_history[ i2 ] );
					}
				}

				sdAI.input_output_history.push( new_train_data );

				if ( 0 )
				{
					sdAI.brain_js_model.train(
						//sdAI.input_output_history,
						current_samples,
						{
							// Defaults values --> expected validation
							/*iterations: 20000, // the maximum times to iterate the training data --> number greater than 0
							errorThresh: 0.005, // the acceptable error percentage from training data --> number between 0 and 1
							log: false, // true to use console.log, when a function is supplied it is used --> Either true or a function
							logPeriod: 10, // iterations between logging out --> number greater than 0
							learningRate: 0.3, // scales with delta to effect training rate --> number between 0 and 1
							momentum: 0.1, // scales with next layer's change value --> number between 0 and 1
							callback: null, // a periodic call back that can be triggered while training --> null or function
							callbackPeriod: 10, // the number of iterations through the training data between callback calls --> number greater than 0
							timeout: Infinity // the max number of milliseconds to train for --> number greater than 0. Default --> Infinity
							*/
							iterations: 5,
							learningRate: sdAI.learn_speed,
						}
					);
				}

				if ( 0 )
				if ( main.ticks_passed > sdAI.next_train )
				{
					sdAI.next_train = main.ticks_passed + 5 * 1000;
					
					function shuffle(array) 
					{
						let currentIndex = array.length,  randomIndex;

						// While there remain elements to shuffle.
						while (currentIndex != 0) 
						{

							// Pick a remaining element.
							randomIndex = Math.floor(Math.random() * currentIndex);
							currentIndex--;

							// And swap it with the current element.
							[array[currentIndex], array[randomIndex]] = [
							array[randomIndex], array[currentIndex]];
						}

						return array;
					}
					
					shuffle( sdAI.input_output_history );

					//while ( sdAI.input_output_history.length > 3000 )
					while ( sdAI.input_output_history.length > 1000 )
					{
						let i2 = ~~( Math.random() * sdAI.input_output_history.length );
						sdAI.input_output_history.splice( i2, 1 );
					}
					
					/*if ( !sdAI.brain_js_model )
					{
						sdAI.brain_js_model = new brain.recurrent.LSTM({
							
							//inputSize: input.length,
							//inputRange: input.length,
							//outputSize: output.length,
							
							hiddenLayers: [ 20 ]
							
						});
					}*/

					sdAI.brain_js_model.train( 
						sdAI.input_output_history,
						{
							//timeout: 16
							//timeout: 32,
							iterations: 1000,
							//errorThresh: 0,
							//errorCheckInterval: Infinity,//Math.floor( sdAI.input_output_history * 0.01 ) // Ignore error checks (faster?)
							//errorCheckInterval
							/*callback: ( params )=>
							{
								globalThis.train_error = params.error;
							}*/
						}
					);
				}
			}
			else
			if ( 0 )
			{
				if ( !sdAI.brain_js_model2 )
				{
					/*var inputLayer = new synaptic.Layer( new_train_data.input.length );
					var hiddenLayer1 = new synaptic.Layer( 64 );
					var hiddenLayer2 = new synaptic.Layer( 64 );
					var hiddenLayer3 = new synaptic.Layer( 64 );
					var outputLayer = new synaptic.Layer( new_train_data.output.length );
					inputLayer.project( hiddenLayer1 );
					hiddenLayer1.project( hiddenLayer2 );
					hiddenLayer2.project( hiddenLayer3 );
					hiddenLayer3.project( outputLayer );*/
					
					//sdAI.brain_js_model2 = new synaptic.Architect.LSTM( 2, 6, 1 );
					//sdAI.brain_js_model2 = new synaptic.Architect.LSTM( new_train_data.input.length, 4, new_train_data.output.length );
					//sdAI.brain_js_model2 = new synaptic.Architect.Perceptron( new_train_data.input.length, 8, 8, new_train_data.output.length );
					
					let input = new_train_data.input.length;
					let pool = 5;
					let output = new_train_data.output.length;
					let connections = 10;
					let gates = 2;

					sdAI.brain_js_model2 = new synaptic.Architect.Liquid( input, pool, output, connections, gates );
					
					/*sdAI.brain_js_model2 = new synaptic.Network({
						input: inputLayer,
						hidden: [ hiddenLayer1, hiddenLayer2, hiddenLayer3 ],
						output: outputLayer
					});*/
				}
				
				let current_samples = [ new_train_data ];

				// Remember old cases and train on them too
				/*if ( sdAI.input_output_history.length > 10 )
				for ( let i = 0; i < 20; i++ )
				{
					let i2;

					i2 = ~~( Math.random() * sdAI.input_output_history.length );

					current_samples.push( sdAI.input_output_history[ i2 ] );
				}*/
				
				// Randomly forget if known too much?
				/*if ( sdAI.input_output_history.length > 50000 )
				{
					let i = ~~( ( 1 - Math.pow( Math.random(), 2 ) ) * sdAI.input_output_history.length ); // Forget most recent ones
					sdAI.input_output_history.splice( i, 1 );
				}
				
				sdAI.input_output_history.push( new_train_data );
				
				//let from = 0;
				//let to = sdAI.input_output_history.length;
				
				let samples = [];
				
				
				if ( sdAI.input_output_history.length > 50 )
				for ( let i = 0; i < 50; i++ )
				{
					samples.push( sdAI.input_output_history.length - 1 - i );
				}
				for ( let i = 0; i < 50; i++ )
				{
					samples.push( ~~( Math.random() * ( sdAI.input_output_history.length ) ) );
				}

				for ( let t = 0; t < 20; t++ )
				//for ( let i2 = 0; i2 < sdAI.input_output_history.length; i2++ )
				//for ( let i2 = 0; i2 < ( to - from ); i2++ )
				for ( let i2 = 0; i2 < samples.length; i2++ )
				//for ( let i = sdAI.input_output_history.length - 1; i >= 0; i-- )
				{
					//let i = ( i2 % 2 === 0 ) ? i2 : sdAI.input_output_history.length - 1 - i2;
					//let i = from + ~~( ( 1 + Math.sin( i2 ) ) / 2 * ( ( to - from ) - 1 ) );
					let i = samples[ i2 ];
					
					sdAI.brain_js_model2.activate( sdAI.input_output_history[ i ].input );
					sdAI.brain_js_model2.propagate( 0.1, sdAI.input_output_history[ i ].output );
				}*/

				
				sdAI.input_output_history.push( new_train_data );
				
				/*for ( let t = 0; t < 1000; t++ )
				{
					sdAI.brain_js_model2.activate( new_train_data.input );
					sdAI.brain_js_model2.propagate( 0.001, new_train_data.output );
				}*/
				
				//if ( main.ticks_passed > sdAI.next_train )
				{
					//sdAI.next_train = main.ticks_passed + 50;
					
					
					//for ( let t = 10000 / sdAI.input_output_history.length; t >= 0; t-- )
					//for ( let i2 = 0; i2 < sdAI.input_output_history.length; i2++ )
					//for ( let i2 = sdAI.input_output_history.length - 1; i2 >= 0; i2-- )
					let i2 = 0;
					
					let dir = 1;
					
					let pong = 0;
					
					while ( true )
					{
						sdAI.brain_js_model2.activate( sdAI.input_output_history[ i2 ].input );
						sdAI.brain_js_model2.propagate( 0.5, sdAI.input_output_history[ i2 ].output );
						//sdAI.brain_js_model2.propagate( 0.001, sdAI.input_output_history[ i2 ].output );
						
						i2 += dir;
						
						if ( dir > 0 )
						{
							if ( i2 + dir < sdAI.input_output_history.length )
							{
							}
							else
							{
								i2 = sdAI.input_output_history.length - 1;
								dir = -1;
							}
						}
						else
						{
							if ( i2 + dir >= 0 )
							{
							}
							else
							{
								i2 = 0;
								dir = 1;
								pong++;
								
								if ( pong >= 1 )
								break;
							}
						}
					}
				}
			}
			else
			{
				if ( !sdAI.brain_js_model3 )
				{
					sdAI.brain_js_model3 = ml5.neuralNetwork({
						inputs: input.length,
						outputs: output.length,
						learningRate: 0.25,
						task: "regression",
						//debug: true,
						// hiddenUnits: 2
					});
				}
				trace( input, output );
				sdAI.brain_js_model3.addData( input, output );
				
				if ( !sdAI.brain_js_training_busy )
				{
					sdAI.brain_js_training_busy = true;
					sdAI.brain_js_model3.train({ epochs: 50 }, whileTraining, finishedTraining);
				}


				function whileTraining(epoch, logs) 
				{
					console.log(`Epoch: ${epoch} - loss: ${logs.loss.toFixed(2)}`);
				}

				function finishedTraining() 
				{
					sdAI.brain_js_training_busy = false;
				}
			}
		}
	}
	
	static RunTraining()
	{
		if ( sdAI.input_output_history.length === 0 )
		return;
	
		sdAI.worker.postMessage( [ 'new_train_data', sdAI.input_output_history ] );
		
		sdAI.input_output_history = [];
		
		/*
		function shuffle(array) 
		{
			let currentIndex = array.length,  randomIndex;

			// While there remain elements to shuffle.
			while (currentIndex !== 0) 
			{
				// Pick a remaining element.
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex--;

				// And swap it with the current element.
				[array[currentIndex], array[randomIndex]] = [
				array[randomIndex], array[currentIndex]];
			}

			return array;
		}

		shuffle( sdAI.input_output_history );

		while ( sdAI.input_output_history.length > 3000 )
		{
			let i2 = ~~( Math.random() * sdAI.input_output_history.length );
			sdAI.input_output_history.splice( i2, 1 );
		}

		sdAI.brain_js_model.train( 
			sdAI.input_output_history,
			{
				timeout: 1000
				//timeout: 16
				//timeout: 32,
				//iterations: 1000,
				//errorThresh: 0,
				//errorCheckInterval: Infinity,//Math.floor( sdAI.input_output_history * 0.01 ) // Ignore error checks (faster?)
				//errorCheckInterval
			}
		);*/
	}
	
	ApplyLogic( GSPEED ) // Never return early, because .look_direction must be normalized (or else shots will throw AI into sky)
	{
		var c = this.ai;
		
		if ( sdAI.use_brain_js )
		{
			let e = main.my_character;
			
			if ( e )
			{
				let input = sdAI.GetInputsForPlayerAndOpponent( c, e );

				let output;
						
				if ( sdAI.brain_js_model )
				{
					if ( sdAI.brain_js_model.isRunnable )
					output = sdAI.brain_js_model.run( input );
					else
					return;
				}		
				else
				if ( sdAI.brain_js_model2 )
				{
					output = sdAI.brain_js_model2.activate( input );
				}
				else
				if ( sdAI.brain_js_model3 )
				{
					sdAI.brain_js_model3.predict( input, ( error, results )=>
					{
						output = [];
						for ( let i = 0; i < results.length; i++ )
						output.push( results[ i ].value );
						//debugger;
						Next();
					});
					return;
				}
				else
				{
					return;
				}
				
				if ( output.length > 0 )
				Next();
				else
				debugger;
				
				function Next()
				{
					//sdAI.brain_js_model_last_output = output;

					for ( let i = 0; i < sdAI.brain_js_outputs.length; i++ )
					{
						let part = sdAI.brain_js_outputs[ i ];
						let parts = part.split( '.' );

						let value = output[ i ];

						/*if ( parts.length === 1 )
						{
							value = Math.round( value );
						}*/

						value = sdAI.brain_js_output_decompress_functions[ i ]( value );

						if ( parts.length === 1 )
						c[ parts[ 0 ] ] = value;
						else
						c[ parts[ 0 ] ][ parts[ 1 ] ] = value;
					}

					c.look_direction.normalize();

					c.walk_vector_xz.x = -c.look_direction.x;
					c.walk_vector_xz.y = -c.look_direction.z;
					c.walk_vector_xz.normalize();
				}
			}
		}
		else
		{
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
	}
	
	static ThinkNow( GSPEED )
	{
	}
}
sdAI.init_class();