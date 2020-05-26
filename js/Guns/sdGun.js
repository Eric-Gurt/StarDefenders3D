/* global sdGunClass */

// TODO: Add specific functions to gun subclasses

class sdGun extends THREE.Object3D
{
	static Guns = [];
	gun_id = -1;
	ammo = 0;
	recoil = 0;

	constructor( _id )
	{
		super();
		this.gun_id = _id;
		this.ammo = sdGunClass.weapon_ammo_per_clip[ _id ];
		this.recoil = sdGunClass.weapon_self_knockbacks[ this.gun_id ];

		// Add gun to array for later ease of access
		sdGun.Guns[ _id ] = this;
	}

	init_pos()
	{
		this.position.x = -10 - this.recoil * 0.5;
		this.position.y = 0 + this.recoil * 1;
		this.position.z = 0;

		this.rotation.x = 0;
		this.rotation.y = -sdCharacter.arm_cross_right;
		this.rotation.z = 0 - this.recoil * 0.2;
	}
}