	/* global self, globalThis */

	globalThis.trace = console.log;

	//import { brain } from 'libs/brain.js';
	importScripts( './libs/brain.js' );

	let sdAI = {};

	sdAI.input_output_history = [];

	sdAI.learn_speed = 0.1; // 0.6
	sdAI.brain_js_model = new brain.NeuralNetwork({
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
		//hiddenLayers: [ 8, 4 ], // Randomly shots in case of rifle, sigmoid
		//hiddenLayers: [ 16, 8, 4 ], // Occasionally aims at player but doesn't shoot
		//hiddenLayers: [ 32 ], // Just shoots at air
		//hiddenLayers: [ 4, 4, 4 ], // Can't understand the concept of aiming at player somehow
		//hiddenLayers: [ 16, 16 ], // Still look at issues
		//hiddenLayers: [ 3, 4 ], // Noting at all it seems, at least with shotgun, sigmoid
		hiddenLayers: [ 16, 8 ], // 
		learningRate: sdAI.learn_speed,

	});
	sdAI.brain_js_model.errorCheckInterval = 1000;//Infinity;
	//sdAI.brain_js_model.errorCheckInterval = 50;

	//trace('Hello!', brain );
	
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

	function TrainSequence()
	{
		if ( sdAI.input_output_history.length > 0 )
		{
			shuffle( sdAI.input_output_history );

			while ( sdAI.input_output_history.length > 3000 )
			//while ( sdAI.input_output_history.length > 100 )
			{
				let i2 = ~~( Math.random() * sdAI.input_output_history.length );
				sdAI.input_output_history.splice( i2, 1 );
			}

			sdAI.brain_js_model.train( 
				sdAI.input_output_history,
				{
					//timeout: 1000
					//timeout: 16
					//timeout: 32,
					iterations: 1000,
					//iterations: 1000,
					//errorThresh: 0,
					//errorCheckInterval: Infinity,//Math.floor( sdAI.input_output_history * 0.01 ) // Ignore error checks (faster?)
					//errorCheckInterval
					errorThresh: 0.0001,
					callback: ( status )=>
					{
						self.postMessage( [ 'status', status.error ] );
					},
					callbackPeriod: 500,
					//timeout: 10000, // 10 sec
					//momentum: 0.5 // 0.1
				}
			);

			self.postMessage( [ 'update_network', sdAI.brain_js_model.toJSON() ] );
		}
		setTimeout( TrainSequence, 50 );
	}
	setTimeout( TrainSequence, 50 );

	self.onmessage = function( e ) 
	{
		let command_and_data = e.data;
		let command = command_and_data[ 0 ];
		let data = command_and_data[ 1 ];
		if ( command === 'new_train_data' )
		{
			sdAI.input_output_history.push( ...data );
		}
		//debugger;
		//self.postMessage('msg from worker');
	};
