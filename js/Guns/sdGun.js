/* global sdCharacter, sdGunClass */

// TODO: Add specific functions to gun subclasses

class sdGun /*extends THREE.Object3D*/ // EG: Would be best to not depend on graphics library here? Multiplayer netcode eventually will need time nudges and speculative positions - thus could cause need to maybe even have few visual objects rather than one attached.
{
	static Guns = [];
	//gun_id = -1;
	//ammo = 0;
	//recoil = 0;
	
	static CreateGun( gun_class_str )
	{
		var obj = new sdGun( gun_class_str );
		sdGun.Guns.push( obj );
		return obj;
	}

	get gun_id()
	{
		debugger;
	}
	get recoil()
	{
		debugger;
	}
	//constructor( _id )
	constructor( gun_class_str )
	{
		//super();
		//this.gun_id = _id;
		
		this.gun_class = null;
		// Check if gun class with such name exists. In else case error needs to be thrown, but not needed yet.
		for ( var i = 0; i < sdGunClass.gun_classes.length; i++ )
		if ( sdGunClass.gun_classes[ i ].name === gun_class_str )
		{
			this.gun_class = sdGunClass.gun_classes[ i ];
			break;
		}
		
		this.ammo = this.gun_class.ammo_per_clip;//sdGunClass.weapon_ammo_per_clip[ _id ];
		//this.recoil = sdGunClass.weapon_self_knockbacks[ this.gun_id ];
		
		this.reload_timer = 0;
		
		this.mesh = new THREE.Object3D();
		
		//this.set_fpspos = null;
		//this.change_transformations = null;

		// Add gun to array for later ease of access
		//sdGun.Guns[ _id ] = this; // EG: sdGun is an instance of a weapon (according to how it used to extend THREE.Object3D), not an instance of weapon class. This caused players to shoot from the position of other players' weapon while not being able to hold weapon in arms since it was instantly moved to another player in every character logic.
	}
	
	remove()
	{
		// TODO
	}

	init_pos( recoil )
	{
		// EG: Not sure about .recoil usage here
		
		this.mesh.position.x = -10 - recoil * 0.5;
		this.mesh.position.y = 0 + recoil * 1;
		this.mesh.position.z = 0;

		this.mesh.rotation.x = 0;
		this.mesh.rotation.y = -sdCharacter.arm_cross_right;
		this.mesh.rotation.z = 0 - recoil * 0.2;
	}
	/*
	set_fpspos( c )
	{
		this.mesh.position.y -= Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 4 ) * 7;

		this.mesh.rotation.x -= Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 ) * 1;
		this.mesh.rotation.y -= Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 ) * 0.5;
		this.mesh.position.x += Math.pow( c.weapon_change_tim / sdGunClass.weapon_switch_time, 2 ) * 4;
	}
	
	change_transformations( c, third=false )
	{
	    //	No use to fill this in for now
	}*/
}