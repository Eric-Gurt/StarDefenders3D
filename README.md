# dev: TODO

- Randomly generated stars of various brightness. I'd pick them from spread algorithm shotgun is using, probably put them into separate mesh that is always visible. Since it is better to exclude transparency (unless it is done with some dither visibility shader), they are better to have additive blending (three.js supports it).
- If there will be signs of game becoming popular - few more classes for weaponry should be added: sdGunClass.js and sdGun.js. 1st keeps info like gun names, slot, spread, default stats etc and sdGun.js should be more like gun instances in shared pool. In addition to that sdCharacter could use some array like inventory_guns elements of which will point towards sdGun instances. They also might be inventory_guns2 if we will be going the route of PB2.5/3 where players can dual wield.
- Real 3D physics for each limb instead of atoms+chains system which I actually don't like for bad performance and disability to remove them from their pools here. These are at sdAtom.js file.
- Improve network connection quality. At least it should be more obvious why some players will have problems with connection establish. Maybe once it will be getting more popular - server should be aware of these limits and keep information on connection problems across players?
- More gameplay elements needs to be added in future if this will be getting more of a serious turn.
- Network side cheat/hack/abusement fixes should be probably delayed to the latest stage, they might slow down other updates in my opinion.
- Storymode could take in place and as a side-effect also bring more people to multiplayer. But it is better to make sure core mechanics such as multiplayer do work and work in stable way. Maybe even switch to server-oriented mode where players can host their own customizable servers.
- In future more entity types should be supported. Perhaps Starship Troopers-like mode? Something like "team vs horde of aliens". Originally I've seen this game as team of players in cooperative mode that is trying to capture randomly generated planet with randomized creatures (to some extent) that have randomized attacks, properties etc. Not sure how it will work with destructible physics, but seems possible once stable model destruction, shape rebuilding into smaller bodies and their physics are working well together.
- Level Editor needs to be done at some point. Would be best to let it have random-based conditional world generation as well.

# dev: Short feature/class description FAQ

- sdAtom.js - class that solves simple physics (yet expensive, replace physics solving with bullet-physics-like implementation) and renders "Atoms" with bullets using same point cloud object.

# StarDefenders3D
Free-to-play peer-to-peer game based around idead of destructible world, relative projectile velocities and "freely" camera rotation.

Current stable release version will usually appear here:
http://www.gevanni.com/projects/StarDefenders3D

I made this game just to see how my custom camera movement algorithm can work and feel.
Also I was testing P2P multiplayer and some other stuff. Should work best in Chrome web browser.

It intentionally keeps no identification nor other personal info just in case if you'd like to stay incognito when connecting directly to other people (it is easy to discover connected player's IP address).
There are few game modes:
- Free for all - you are against everyone else;
- Team vs Team - your team against enemy team;
- As One - multiple teams that contain only 2 players.

All game modes are endless, have timer and 2 weapons:
- Rifle - shoots team-colored lasers on primary fire, shotgun pellets on alternate fire;
- Rocket Launcher - shoots rockets on primary fire, sniper shots on alternate fire.

Weapons have different stats such as knockback, self-knockback, damage, speed, count and spread which are, to be honest, are very easy to change. Would not wonder if somebody will start playing with them.

Anyway this game was built in ~6 days using Star Defender assets from my long-ago-never-released game which you probably already heard about by now (if you're happened to check <a href='https://www.plazmaburst2.com'>Plazma Burst 2</a> website from time to time).

So that is pretty much it - I'm <a href='http://www.gevanni.com'>Eric Gurt</a> and this is a test project. I don't think I'm ever going to continue work on it, if you want to - you can even continue it.

Other than that - feel free to check it out, maybe you'll find some of it's mechanics cool and must have for today's gaming in general (such as this very important mechanic easily described as motion sickness for example. It's intention was to make a rare case of vertical combats into somewhat more intuitive. Actually would probably never be able to test how it works without project like this).

Don't expect there to be much improvements, ban lists or anti-hack detections - it most probably will stay as is. Have fun, even if you'll need some cheating for that.

Might require special network/firewall/ISP configuration in order to be able to connect with other players (it is peer-to-peer and there is no TURN server). In else case it should give you an error message, through I have never been able to catch this yet.

Also it might take some time while it is building world and quick play has no indication of server making match. FFA is quickest one once at least 2 players are looking for match with this mode.

Also make sure that it will search forever if you'll add players to your group while searching in mode that has no teammates like FFA, or if you have more temmates than allowed (usually 4 in TvT and 2 in As One).

Keys: W, S, A, D, 1, 2, Left Mouse Button, Right Mouse Button, Space, Ctrl, Esc, Enter and Tab.

It does use <a href='https://threejs.org'>three.js</a>, <a href='https://peerjs.com'>peer.js</a>, <a href='https://www.bfxr.net/'>bfxr.net</a>, <a href='http://pieroxy.net/blog/pages/lz-string/index.html'>lz-string.js</a> and <a href='https://github.com/ftlabs/ftscroller'>ftscroller.js</a>.
