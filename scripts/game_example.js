RocketBoots.loadComponents([
	"coords",
	"sound_cannon",
	"image_overseer",
	"state_machine",
	//"data_delivery",
	"dice",
	"looper",
	//"entity",
	//"world",
	"time_count",
	"incrementer",
	"stage"
]);

window.g = {};
RocketBoots.ready(function(){
	g = new RocketBoots.Game("Clicker");

	g.state.transition("preload");

	g.upgradeData = {
		"lasereye": {
			name: "Laser Eye"
			,dpc: 1.1
			,cost: 1.5
			,level: 1
		}
		,"lefttentacle": {
			name: "Left Tentacle Arm"
			,dps: 1.1
			,cost: 2
			,level: 0
		}
		,"righttentacle": {
			name: "Right Tentacle Arm"
			,dps: 2
			,cost: 3
			,level: 0
		}
		,"lefthook": {
			name: "Left Hook Arm"
			,dps: 3
			,cost: 5
			,level: 0
		}
		,"rightclaw": {
			name: "Right Claw Arm"
			,dps: 5
			,cost: 8
			,level: 0
		}
		,"leftclamp": {
			name: "Left Clamp Arm"
			,dps: 8
			,cost: 13
			,level: 0
		}
		,"rightsaw": {
			name: "Right Saw Arm"
			,dps: 13
			,cost: 21
			,level: 0
		}
	};

	g.progress = {
		_num: 1
		,skulls: 0
		,getStage: function(){
			return Math.ceil(this._num / 10);
		}
		,getChallenge: function(){
			return (this._num % 11);
		}
		,isAtLastChallenge: function(){
			return (this.getChallenge() == 10) ? true : false;
		}
		,increment: function(){
			this._num++;
			this.setGameViewClasses();
			return this;
		}
		,setGameViewClasses: function(){
			var $gameView = g.state.get("game").$view;
			if (this.isAtLastChallenge()) {
				if (g.opponent.isBoss) {
					$gameView.addClass("is-boss").removeClass("is-grinding");
				} else {
					$gameView.addClass("is-grinding").removeClass("is-boss");
				}
			} else {
				$gameView.removeClass("is-grinding").removeClass("is-boss");
			}
			return this;
		}
		,gainSkulls: function(n){
			this.skulls += n;
			$('.upgradeList')
		}
	};

	g.shop = {
		buy: function(what){
			if (this.canAfford(what)) {
				g.progress.skulls -= this.getNextCost(what);
				g.monster.upgrades[what].level += 1;
				return true;
			} else {
				return false;
			}
		}
		,canAfford: function(what) {
			return (this.getNextCost(what) <= g.progress.skulls) ? true : false;
		}
		,getNextLevel: function(what){
			return g.monster.upgrades[what].level + 1;
		}
		,getNextCost: function(what){
			return this.getCost(what, this.getNextLevel(what));
		}
		,getCost: function(what, level){
			//console.log(what, g.upgradeData[what]);
			return _getCostByLevel(level, g.upgradeData[what].cost);
		}
	};

	//==== Exponential Functions --- These will need to be tweaked!

	function _getCostByLevel(level, costMultiplier){
		return Math.ceil( Math.pow(10, level/3.6) * (Math.pow(costMultiplier, 2.5)) );
	};
	function _getPowerByLevel(upgradeStat, level){
		return Math.ceil( (Math.pow(10, level/4) - 1) * (Math.pow(upgradeStat, 2.5)) );
		//Math.round(Math.pow(1 + upgradeStat, level) - 1);
	};
	function _getHitPointsByStage(stage){
		return Math.ceil(7 + Math.pow(25, stage/3.6));
	};
 	function _getSkullsByStage(stage){
 		return Math.floor(Math.pow(9, stage/4.1));
 	};
 	function _getDPSByStage(stage){
 		return stage - 1;
 	};


	//======== Monster and opponent =========
	//==== Generic Functions

	function damage(dmg) {
		if (!this.exists) { return 0; }
		var realDamage = Math.min(this.hp, dmg);
		this.hp -= realDamage;
		//console.log("Damage", realDamage, this.hp);
		if (this.hp <= 0) {
			this.die();
		}
		return realDamage;
	}

	function heal(dmg) {
		if (!this.exists) { return 0; }
		var realHeal = Math.min(dmg, (this.getMaxHP() - this.hp));
		this.hp += realHeal;
		return realHeal;
	}

	function _loopOverUpgrades(fn){
		var u, upgrade;
		for (u in g.monster.upgrades) {
			upgrade = g.monster.upgrades[u];
			fn(upgrade, u);
		}
	};

	g.monster = {
		location: "Dimension 1I"
		,exists: true
		,upgrades: g.upgradeData
		,hp: 2000
		,maxHp: 2000
		,dpc: 0
		,dps: 0
		,getDPC: function(){
			var dpc = 0;
			_loopOverUpgrades(function(upgrade, u){
				if (typeof upgrade.dpc == 'number') {
					dpc += _getPowerByLevel(upgrade.dpc, upgrade.level);
				}
			});
			dpc = dpc + (dpc * (this.prestige/10)); 
			this.dpc = dpc;
			return dpc;
		}
		,getDPS: function(seconds){
			var dps = 0;
			_loopOverUpgrades(function(upgrade, u){
				if (typeof upgrade.dps == 'number') {
					//console.log(u, upgrade.level);
					dps += _getPowerByLevel(upgrade.dps, upgrade.level);
				}
			});
			dps = dps + (dps * (this.prestige/10));
			this.dps = dps;
			//console.log(dps);
			if (typeof seconds == 'undefined') {
				seconds = 1;
			}
			return (dps * seconds);
		}
		,getMaxHP: function(){
			return (2000 + ((g.progress.getStage() - 1) * 200));
		}
		,setDPS: function(val){
			if (typeof val == 'undefined') {
				this.dps = this.getDPS();
			} else {
				this.dps = val;
			}
			return this.dps;
		}
		,damage: damage
		,heal: heal
		,clickHeal: function(){
			var healAmount = Math.min(Math.max(1, (this.getDPS()/4)), (this.maxHp/40));
			//console.log(healAmount);
			healAmount = this.heal(healAmount);
			g.floatText("+" + _formatInteger(healAmount), null, this.$target,"heal");
			return healAmount;
		}
		,autoAttack: false
		,charge: 0
		,attack: function(opponent){

			if (this.autoAttack) {
				this.charge++;
			} else {
				this.charge = 0;
			}
			//console.log(this.charge);
			if (opponent.exists) {
				g.animateLaser();
				var dmg = this.getDPC();
				if (this.charge >= 10) {
					dmg = dmg * 10;
					this.charge = 0;
				} else if (this.charge == 9) {
					dmg = dmg * 5;
				}
				dmg = opponent.damage(dmg);
				g.floatText("-" + _formatInteger(dmg), opponent.$target, g.mousePos, "laser");
			}
			return this;
		}
		,die: function(){
			g.state.transition("dimension");
		}
		,prestige: 0
		// graphics
		,$target: $('.monster .eye')
		,$body: $('.monster .body')
		,$eye: $('.monster .eye')
		,$iris: $('.monster .iris')
		,irisTimer: 0
		,isEyeOpen: true
		,emWidth: 16
		,emHeight: 24
	};

	g.opponent = {
		name: 'Opponent'
		,dps: 1
		,hp: 10
		,maxHp: 10
		,damage: damage
		,heal: heal
		,skulls: 0
		,isBoss: false
		,exists: false
		,getDPS: function(seconds){
			if (!this.exists) {	return 0; }
			if (typeof seconds == 'undefined') {
				seconds = 1;
			}			
			return (this.dps * seconds);
		}
		,getMaxHP: function(){
			return this.maxHp;
		}
		,die: function(){
			if (!this.exists) { return false; }
			var lastRotation = this.$elt.data('lastRotation');
			var rotation = (lastRotation) ? 0 : 360;
			this.$elt.css({ 
				bottom: "-10%", 
				opacity: 0,
				transform: "rotate(" + rotation + "deg)"
			}).data('lastRotation', rotation);
			this.exists = false;
			g.floatText("+" + this.skulls + " skulls", this.$target, $('.skulls'));
			g.progress.gainSkulls(this.skulls);
			if (g.progress.isAtLastChallenge() && !this.isBoss) {
				// don't increment
				this.makeNew();
			} else { // either beat a boss or beat a normal stage
				g.progress.increment();
				// If we just got to the last area
				if (g.progress.isAtLastChallenge()) {
					this.makeNew(true);
				} else {
					this.makeNew();
				}
			}
		}
		,retreat: function(){
			this.$elt.css({ 
				bottom: "-10%", 
				opacity: 0,
			});
			this.exists = false;
			return this;			
		}
		,makeNew: function(isBoss){
			var o = this;
			o.exists = false;
			setTimeout(function(){
				var stage = g.progress.getStage();
				o.isBoss 	= isBoss || false;
				o.dps 		= _getDPSByStage(stage);
				o.skulls 	= _getSkullsByStage(stage);
				o.maxHp 	= _getHitPointsByStage(stage);
				if (o.isBoss) {
					o.maxHp = o.maxHp * 2;
					o.dps 	= o.dps * 5;
					o.skulls = o.skulls * 2;
				}
				o.hp 		= o.maxHp;	
				o.exists = true;
				//console.log("Making opponent", stage, typeof stage, o.dps, o.hp, o);
				o.$elt.show().css({ 
					bottom: "10%", 
					opacity: 1.0
				});
				g.progress.setGameViewClasses();
				g.draw();
			}, 1000);
			return this;
		}
		// graphics/animation
		,$elt: $('.opponent')
		,$target: $('.opponent')
	};

	//======== Arm Control



	//======== Events

	function _clearClick() {
		$('.game').off("click").off("mousedown").off("mouseup").removeClass("clickable");
	}
	function _setupEarthClick(){
		_clearClick();
		$('.game').on("click", function(e){
			_setMousePos(e);		
		}).on("mousedown", function(e){
			g.monster.autoAttack = true;
		}).on("mouseup", function(e){
			g.monster.autoAttack = false;
			g.monster.attack(g.opponent);
		}).addClass("clickable");
	}

	function _setupDimensionClick(){
		_clearClick();
		$('.game').on("click", function(e){
			_setMousePos(e);
			g.monster.clickHeal();
		}).addClass("clickable");	
	}

	function _setupButtons(){
		$('.layer.upgrade').click(function(e){
			e.stopPropagation();
		}).on('click', 'button', function(e){
			var $li = $(e.target).closest('li')
			if ($li.length > 0) {
				var upgradeKey = $li.data('upgrade');
				var bought = g.shop.buy(upgradeKey);
				if (bought) {
					g.drawUpgradeList();
				}
			}
		});
		$('button.fightBoss').click(function(e){
			g.opponent.retreat().makeNew(true);
		});
		$('button.leaveBoss').click(function(e){
			g.opponent.retreat().makeNew();
		});
		$('button.upgrade').click(function(e){
			g.drawUpgradeList();
			$('.layer.upgrade').slideDown();
		});
		$('.close').click(function(e){
			$(this).parent().slideUp();
		});
	}

	g.mousePos = { "x" : 0, "y" : 0 };
	function _setMousePos(e){
		g.mousePos.x = e.pageX;
		g.mousePos.y = e.pageY;		
	}
	$(document).mousemove(function(e) {
		_setMousePos(e);
	});

	//======== Loops and Timing

	g.timing = {
		lastTime: 0
		,setNew: function(){
			this.lastTime = Date.now()
		}
		,getElapsedSeconds: function(andSet){
			var now = Date.now();
			var esec = (now - this.lastTime)/1000;
			if (typeof andSet == 'boolean') {
				this.lastTime = now;
			}
			//console.log(esec);
			return esec;
		}
	};

	function _setupLoops() {
		g.earthLoop = new rb.Looper(function(){
			var seconds = g.timing.getElapsedSeconds(true);
			g.opponent.damage( g.monster.getDPS(seconds) );
			g.monster.damage( g.opponent.getDPS(seconds) );
			g.animateLook();
			g.draw();
		}, 500);
		g.earthLoop.addModulusAction(0.25, function(){
			g.setBlobs();
		});
		g.earthLoop.addModulusAction(1, function(){
			g.animateLife();
			g.animateOpponent();
			var oppDPS = g.opponent.getDPS();
			if (oppDPS > 0.5) {
				g.floatText("-" + oppDPS, g.monster.$target, g.$elts.monsterHP, "neg");
			}
			var monDPS = g.monster.getDPS();
			if (monDPS > 0.5) {
				g.floatText("-" + monDPS, g.opponent.$target, g.$elts.opponentHP);
			}
			if (g.monster.autoAttack) {
				g.monster.attack(g.opponent);
			}
			g.drawUpgradeList();
		});
		g.dimensionLoop = new rb.Looper(function(){
			var seconds = g.timing.getElapsedSeconds(true);
			g.monster.heal( 1 * seconds );
			g.animateLook();
			g.draw();
		}, 500);
		g.dimensionLoop.addModulusAction(0.1, function(){
			g.setBlobs();
		});
		g.dimensionLoop.addModulusAction(1, function(){
			g.animateLife();
			g.animateDimensionBackground();
			g.drawUpgradeList();
		});		
	}


	//======== States

	g.state.add("dimension", {
		start: function(){
			var $dimView = this.$view;
			var $monster = $('.monster');
			$dimView.show();
			$monster.hide().fadeIn(1000, function(){
				$dimView.addClass('is-dimension').removeClass('is-earth');
				_setupDimensionClick();
			});
			g.dimensionLoop.start();
		},
		end: function(){
			this.$view.hide().removeClass('is-dimension');
			_clearClick();
			g.dimensionLoop.stop();
			g.clearFX();
		}
	});

	g.state.get("game").setStart(function(){
		this.$view.show().addClass('is-earth').removeClass('is-dimension');;
		_setupEarthClick();
		g.opponent.makeNew();
		g.earthLoop.start();
	}).setEnd(function(){
		this.$view.hide().removeClass('is-earth');
		_clearClick();
		g.earthLoop.stop();
		g.clearFX();
	}).setUpdate(function(){
		g.draw();
	});

	//======== Draw / Animation

	function _formatInteger(n){
		if (n > 500000) { // 500k or higher
			if (n > 9999999) { // 9.99M or higher
				n = parseInt((n / 1000000), 10);
				return n.toLocaleString() + "M";
			} else {
				n = parseInt((n / 1000), 10);
				return n.toLocaleString() + "k";
			}
		} else {
			return parseInt(n, 10).toLocaleString();
		}
	}
	g.elements = {};

	g.draw = function(){
		g.elements.stageNum.innerHTML 		= _formatInteger(g.progress.getStage());
		g.elements.challenge.innerHTML 		= g.progress.getChallenge();
		g.elements.monsterDPS.innerHTML 	= _formatInteger(g.monster.getDPS());
		g.elements.monsterHP.innerHTML 		= _formatInteger(g.monster.hp);
		g.elements.monsterMaxHP.innerHTML 	= _formatInteger(g.monster.getMaxHP());
		g.elements.skulls.innerHTML 		= _formatInteger(g.progress.skulls);
		g.elements.opponentDPS.innerHTML	= _formatInteger(g.opponent.getDPS());
		g.elements.opponentName.innerHTML 	= g.opponent.name;
		g.elements.opponentHP.innerHTML 	= _formatInteger(g.opponent.hp);
		g.elements.opponentMaxHP.innerHTML 	= _formatInteger(g.opponent.getMaxHP());
	};

	g.drawUpgradeList = function(){
		var listHTML = '';
		_loopOverUpgrades(function(upgrade, u){
			var damageHTML = '';
			var benefitHTML = '';
			var nextLevel = upgrade.level + 1;
			var html = '';
			var dmg = 0;
			if (typeof upgrade.dpc == 'number') {
				dmg = _getPowerByLevel(upgrade.dpc, upgrade.level);
				damageHTML += (
					'DPC: <span class="value">' 
					+ _formatInteger(dmg)
					+ '</span>'
				);
				benefitHTML += (
					'+<span class="value">' 
					+ _formatInteger(_getPowerByLevel(upgrade.dpc, nextLevel) - dmg)
					+ '</span> damage/click'
				);
			}
			if (typeof upgrade.dps == 'number') {
				dmg = _getPowerByLevel(upgrade.dps, upgrade.level);
				damageHTML += (
					'DPS: <span class="value">' 
					+ _formatInteger(dmg) 
					+ '</span>'
				);
				benefitHTML += (
					'+<span class="value">' 
					+ _formatInteger(_getPowerByLevel(upgrade.dps, nextLevel) - dmg)
					+ '</span> damage/second'
				);				
			}
			html += (
				'<div class="name">' + upgrade.name + '</div>'
				+ '<div class="level">Lv. <span class="value">' + upgrade.level + '</span>'
				+ '</div>'
				+ '<div class="damage">'
					+ damageHTML			
				+ '</div>'
				+ '<button type="button" class="buy '
				+ ((g.shop.canAfford(u)) ? 'can-afford' : 'cannot-afford')
				+ '">'
					+ '<div class="cost">'
						+ '<span class="value">' + _formatInteger(g.shop.getNextCost(u)) + '</span>'
						+ ' Skulls'
					+ '</div>'
					+ '<div class="benefit">'
						+ benefitHTML
					+ '</div>'
				+ '</button>'
			);
			listHTML += '<li class="' + u + '" data-upgrade="' + u + '">' + html + '</li>';
		});
		$('.upgradeList').html(listHTML);
	};

	g.clearFX = function(){
		$('.floatText').add('.laserbeam').remove();
	}

	g.resize = function(){
		g.emSize = 16;
		$('.game').css({ fontSize: g.emSize + "px" });
	};

	var floatTextContainer = $('.layer.effects');
	g.floatText = function(t, $start, $target, myClass){
		var $ft = $('<div class="floatText">' + t + '</div>');
		var animObj = {
			"top" : 0,
			"opacity" : 0
		};
		var startX = 0; 
		var startY = 0;
		var offset;
		var $container = floatTextContainer || $('body');

		if (myClass) {
			$ft.addClass(myClass);
		}
		if ($target) {
			if (typeof $target.offset == 'function') {
				offset = $target.offset();
				animObj.left = offset.left;
				animObj.top = offset.top;
			} else if (typeof $target.x == 'number') {
				animObj.left = $target.x;
				animObj.top = $target.y;
			}
		}
		if ($start) {
			offset = $start.offset();
			startY =  offset.top - 70 + g.dice.roll1d(30);
			startX = offset.left - 50 - g.dice.roll1d(40);
		} else {
			startY =  g.mousePos.y - 70 + g.dice.roll1d(30);
			startX = g.mousePos.x - 50 - g.dice.roll1d(40);
		}
		$ft.css({
			"top" : startY,
			"left" : startX
		});
		$container.append($ft);
		$ft.animate({ "top": startY - (10 + g.dice.roll1d(40)) }, 500, function(){
			$ft.animate(animObj, 1000, function(){
				$ft.remove();
			});
		});
	};
	

	g.setBlob = function(n){
		var w = (2 + g.dice.roll1d(10));
		var h = w + g.dice.roll1d(3) - 1;
		$('.blob' + n).css({ 
			top: 	(g.dice.roll1d(g.monster.emHeight) - (h/2) + 1) + "em"
			,left: 	(g.dice.roll1d(g.monster.emWidth) - (w/2)) + "em"
			,width:  w + "em"
			,height: h + "em"
			,transform: "rotate(" + g.dice.roll1d(360) + "deg)"
		});			
	};

	g.setAllBlobs = function(){
		for (var i = 1; i <= 8; i++) {
			g.setBlob(i);
		}
	};

	g.setBlobs = function(){
		g.setBlob( g.dice.roll1d(8) );
	};

	g.animateBreathing = function(){
		if (g.dice.roll1d(2) == 1) {
			var deltaH = g.dice.getRandomAround(2);
			var h = (g.monster.emHeight + deltaH);
			//w = (g.monster.emWidth + g.dice.getRandomAround(2));
			g.monster.$body.css({ 
				height: h + "em"
				//,width: w + "em"
				,top: 25 + deltaH + "em"
			});
		}
	}

	g.animateLook = function(){
		if (g.monster.isEyeOpen) {
			var irisOffset = g.monster.$iris.offset();
			var buffer = 200;
			if (g.mousePos.x < (irisOffset.left - buffer)) {
				g.monster.$iris.css({ "left": "0.5em" });
			} else {
				var irisRight = irisOffset.left + g.monster.$iris.width();
				if (g.mousePos.x > (irisRight + buffer)) {
					g.monster.$iris.css({ "left": "2.0em" });
				} else {
					g.monster.$iris.css({ "left": "1.25em" });
				}
			}
		}
	};

	g.animateBlink = function(forceOpen){
		function openEye(){
			g.monster.isEyeOpen = true;
			g.monster.$eye.css({
				height: "4em"
			});			
		}
		if (forceOpen) {
			openEye();
		} else if (g.monster.isEyeOpen) {
			if (g.dice.roll1d(4) == 1) {
				g.monster.isEyeOpen = false;
				g.monster.$eye.css({
					height: "0em"
				});
				setTimeout(function(){ openEye(); }, 200);
			}
		} else { // if eye is closed, then open it
			openEye();
		}
	};

	g.animateOpponentMove = function(){
		var roll = g.dice.roll1d(3);
		if (roll == 1) {
			g.opponent.$elt.css({
				left: 		(25 + g.dice.roll1d(50)) + "%" 
				,bottom: 	(g.dice.roll1d(20)) + "%"
			}).find('.arm').removeClass('swipe');
		} else {
			if (roll == 2) {
				var $arm = g.opponent.$elt.find('.arm.right').addClass('swipe');
				
			} else if (roll == 3) {
				var $arm = g.opponent.$elt.find('.arm.left').addClass('swipe');
			}
			g.floatText("*", $arm, g.monster.$target, "rock");
		}
	};

	g.animateOpponent = function(){
		g.animateOpponentMove();
	};

	g.animateLife = function(){
		g.animateBreathing();
		g.animateBlink();
	};

	g.animateLaser = function(){
		// Color the eye
		g.monster.$iris.addClass("laser");
		clearTimeout(g.monster.irisTimer);
		g.monster.irisTimer = setTimeout(function(){
			g.monster.$iris.removeClass("laser");
		}, 500);
		// Keep eye open
		g.animateBlink(true);
		// Draw the laser beam
		var midEyeOffsetX = g.emSize * 3; // half the eye width
		var midEyeOffsetY = g.emSize * 2; // half the eye height
		var eyeOffset = g.monster.$eye.offset();
		var opponentOffset = g.opponent.$target.offset();
		var a = eyeOffset.top - opponentOffset.top;
		var b = eyeOffset.left - opponentOffset.left;
		var c = Math.sqrt( Math.pow(a, 2) + Math.pow(b, 2) );
		var theta = Math.asin( b/c );
		//console.log(a, b, c, theta);
		var $laserBeam = $('<div class="laserbeam"></div>').css({
			top: 	(eyeOffset.top + midEyeOffsetY)
			,left: 	Math.min(eyeOffset.left, opponentOffset.left) + (Math.abs(b) / 2) + midEyeOffsetX
			,width: 20
			,height: c
			,transform: "rotate(" + theta + "rad)"
		});
		$('.midground').append($laserBeam); //.append($laserBlast);
		$laserBeam.animate({ opacity: 0 }, 200, function(){
			$laserBeam.remove();
		});
	};

	g.animateDimensionBackground = function(){
		$('.layer.background').removeClass('dim1').removeClass('dim2').removeClass('dim3')
			.addClass('dim' + g.dice.roll1d(3));

	};

	//======== START IT UP

	g.start = function(){

		_setupLoops();
		g.$elts = {
			stageNum: 		$('.stageNum.value') 		
			,challenge: 	$('.challenge.value') 		
			,monsterDPS: 	$('.monsterDPS.value') 	
			,monsterHP: 	$('.monsterHP.value') 		
			,monsterMaxHP: 	$('.monsterMaxHP.value') 	
			,skulls: 		$('.skulls.value') 
			,opponentDPS: 	$('.opponentDPS.value')
			,opponentName: 	$('.opponentName') 		
			,opponentHP: 	$('.opponentHP.value') 	
			,opponentMaxHP: $('.opponentMaxHP.value') 	
		};
		for (var z in g.$elts) {
			g.elements[z] = g.$elts[z][0];
		}
		g.resize();
		g.setAllBlobs();
		_setupButtons();

		g.timing.setNew();
		//g.state.transition("game");
		g.state.transition("dimension");

	}

	g.start();


});