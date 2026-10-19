'use strict';
// ============================================================
//  ELITECRAFT — game data: factions, units, buildings, tech
// ============================================================
const TILE = 32;

const FACTIONS = {
  meth: {
    key: 'meth', name: 'The Methodists', sub: 'ACS · MGS', res: 'Money', resIcon: '💰',
    color: '#1d3c8f', color2: '#f2c230', hq: 'schoolhall', worker: 'maid', supplyBld: 'bungalow',
    lore: 'The faction with the dubious honour of having the deepest coffers. A superb economy fuelled by Daddy\'s credit card, a middling start, a shaky mid game — and some of the most terrifying late-game units on the island.',
    mechanic: '<b>Daddy\'s Money</b> — ACS Boys generate Money just by standing still and phoning home. <b>Call to Prayer</b> (researched at the Chapel) doubles their income and sends every Maid into combat mode for a short time. Beware: whoever kills an ACS Boy pockets his allowance.',
    start: { units: [['maid', 3], ['acsboy', 2]], res: 300 },
  },
  hwa: {
    key: 'hwa', name: 'Mandate of Hwachung', sub: 'Hwa Chong · Nanyang', res: 'Rice', resIcon: '🍚',
    color: '#c8102e', color2: '#f5d000', hq: 'jadepagoda', worker: 'farmer', supplyBld: 'clanhouse',
    lore: 'Founded by Chinese immigrant merchants who keep the eternal flame burning. Fiercely anti-colonial, endlessly diligent, and sworn enemies of the Methodists.',
    mechanic: '<b>Horde</b> — when 10 or more Hwachung fighters gather together, all of them gain +25% damage, +1 armour and +10% speed. <b>Rice</b> — Rice Farmers harvest paddies and haul rice back to the Jade Pagoda or a Granary. Build more paddies anywhere.',
    start: { units: [['farmer', 5]], res: 300 },
  },
};

// tags: bio / mech / light / heavy / massive
const UNITS = {
  // ---------------- METHODISTS ----------------
  maid: {
    faction: 'meth', name: 'Maid', role: 'Builder', hp: 55, armor: 0, speed: 72, r: 9, cost: 50, supply: 1, time: 12, sight: 7,
    worker: true, builder: true, tags: ['bio', 'light'], artH: 30,
    combat: { dmg: 10, range: 14, cd: 0.7, proj: 'broom' },
    abilities: ['calltoprayer'],
    desc: 'Keeps the estate spotless and builds everything. During a Call to Prayer she straps on the children\'s school bags and fights with her broom — but only for a short time.',
    quote: 'Come here boi boi!',
    lines: {
      select: ['Yes Sir!', 'Yes Mam!', 'Come here boi boi!', 'Ma\'am, you call me?'],
      move: ['Ok Mam!', 'Coming, Sir!', 'Yes Sir!', 'Ok ok!'],
      build: ['Yes Mam, I build!', 'Clean first, then build.', 'Ok Sir, can!'],
      attack: ['Come here boi boi!!', 'Eat my broom!', 'Bag also I carry ah!', 'Go home now!'],
    },
  },
  acsboy: {
    faction: 'meth', name: 'ACS Boy', role: 'Economy', hp: 40, armor: 0, speed: 66, r: 8, cost: 75, supply: 1, time: 18, sight: 6,
    tags: ['bio', 'light'], income: 1.4, bounty: 100, artH: 30,
    desc: 'Produces Money simply by existing. Stand him still and he rings up his father for funds. Income doubles under Call to Prayer. If an enemy kills him, they collect his allowance.',
    quote: 'Pa, can transfer?',
    lines: {
      select: ['Pa, can transfer?', 'The best is yet to be.', 'Ya Daddy?', 'Bro, chill.'],
      move: ['Driver can fetch me?', 'Sure, whatever.', 'Walk? Seriously?'],
      harvest: ['Daddy, need $$ for Fun-O-Rama.', 'Pa, card got declined...', 'Mum, can top up?', 'Thanks Pa!', 'Ya Pa, studying hard.', 'Need new rugby boots.'],
    },
  },
  rugger: {
    faction: 'meth', name: 'Rugger', role: 'Anti-vehicle', hp: 190, armor: 1, speed: 82, r: 12, cost: 125, supply: 2, time: 22, sight: 7,
    tags: ['bio', 'heavy'], artH: 38,
    attack: { dmg: 14, range: 14, cd: 1.0, proj: 'punch', bonus: { mech: 3 } },
    desc: 'The famous ACS rugby players: large, loud and suspiciously muscular. They punch vehicles until they explode. Deals triple damage to mechanical units.',
    quote: 'ACS ORANGE!',
    lines: {
      select: ['ACS ORANGE!', 'Hold my protein shake.', 'Who wants to ruck?', 'Leg day was yesterday.'],
      move: ['Running!', 'Coming through!', 'Ok captain!'],
      attack: ['PUNCH THE BUS!', 'RUCK IT!', 'TACKLE!', 'Scrum down!'],
    },
  },
  mgsgirl: {
    faction: 'meth', name: 'MGS Girl', role: 'Healer / Support', hp: 60, armor: 0, speed: 72, r: 9, cost: 100, supply: 2, time: 22, sight: 8,
    tags: ['bio', 'light'], artH: 30, energy: 100, startEnergy: 50, heal: 8,
    attack: { dmg: 7, range: 150, cd: 1.1, proj: 'bell' },
    abilities: ['pray'],
    desc: 'Heals nearby wounded allies automatically. Can Pray to temporarily boost the strength of nearby allies. Attacks with a ranged sonic blast from her ringing handbell.',
    quote: 'Let us pray.',
    lines: {
      select: ['Let us pray.', 'Ding ding!', 'God bless.', 'Hello!'],
      move: ['Okay!', 'On my way!', 'Coming~'],
      attack: ['Hear the bells!', 'Ding dong!', 'Repent!'],
    },
  },
  float: {
    faction: 'meth', name: 'Fun-O-Rama Float', role: 'Siege / Splash', hp: 360, armor: 1, speed: 58, r: 22, cost: 200, supply: 3, time: 30, sight: 8,
    tags: ['mech', 'heavy'], artH: 60, vehicle: true,
    attack: { dmg: 18, range: 180, cd: 1.4, proj: 'confetti', splash: 50 },
    desc: 'The backbone of the Methodist forces. A giant carnival float packed with cheering ACS and MGS students, firing confetti cannons that burst over a wide area.',
    quote: 'FUN-O-RAMA!',
    lines: {
      select: ['FUN-O-RAMA!', 'Wheee!', 'Best carnival ever!', 'Beep beep!'],
      move: ['Float moving!', 'Make way!'],
      attack: ['CONFETTI CANNON!', 'Party time!', 'Surprise!'],
    },
  },
  polorider: {
    faction: 'meth', name: 'Polo Rider', role: 'Anti-infantry Cavalry', hp: 210, armor: 1, speed: 105, r: 13, cost: 150, supply: 3, time: 26, sight: 8,
    tags: ['bio', 'heavy'], artH: 46,
    attack: { dmg: 12, range: 18, cd: 0.9, proj: 'mallet', splash: 34, bonus: { light: 1.5 } },
    desc: 'Rich kids on extremely expensive horses. Fast cavalry whose sweeping mallet hits every enemy around the target. +50% damage against light infantry — the answer to a Hwachung horde.',
    quote: 'Daddy bought me this horse.',
    lines: {
      select: ['Daddy bought me this horse.', 'Tally-ho!', 'Chukka time!', 'My horse has a passport.'],
      move: ['Giddy up!', 'Canter on!', 'Make way, make way!'],
      attack: ['Out of my way, peasants!', 'TALLY-HO!', 'Mallet time!', 'Charge!'],
    },
  },
  chimera: {
    faction: 'meth', name: 'Chimera', role: 'Late-game Monster', hp: 1600, armor: 3, speed: 55, r: 30, cost: 750, supply: 8, time: 60, sight: 10,
    tags: ['massive'], artH: 70, limit: 2,
    attack: { dmg: 42, range: 130, cd: 1.6, proj: 'dragonfire', cone: true, splash: 60 },
    desc: 'A mythical beast willed into being by the god Mr. Oldham: a Chinese dragon with the face of a lion and the claws of an eagle. Breathes fire in a wide cone. Max 2.',
    quote: '*ROAAAR*',
    lines: {
      select: ['*ROAAAR*', 'Mr. Oldham wills it.', '*rumbling growl*'],
      move: ['*stomp stomp*', '*snort*'],
      attack: ['*FWOOOOSH*', 'BURN, HEATHENS!'],
    },
  },

  // ---------------- HWACHUNG ----------------
  farmer: {
    faction: 'hwa', name: 'Rice Farmer', role: 'Worker', hp: 45, armor: 0, speed: 72, r: 9, cost: 50, supply: 1, time: 12, sight: 7,
    worker: true, builder: true, gatherer: true, tags: ['bio', 'light'], artH: 34,
    attack: { dmg: 4, range: 14, cd: 1.2, proj: 'melee' },
    desc: 'Harvests rice from paddies and carries it back to the Jade Pagoda or a Granary. Also builds every Hwachung structure. Plant new paddies when the old ones run dry.',
    quote: 'Rice is life.',
    lines: {
      select: ['Rice is life.', 'Yes boss?', 'Harvest time!', 'One grain, one sweat.'],
      move: ['Going!', 'Ok boss.', 'On the way.'],
      build: ['Build strong!', 'Brick by brick.', 'Like the Great Wall!'],
      attack: ['Hiyah!', 'Go away!'],
    },
  },
  hwachie: {
    faction: 'hwa', name: 'Hwachie', role: 'Flamethrower', hp: 75, armor: 0, speed: 78, r: 9, cost: 60, supply: 1, time: 14, sight: 7,
    tags: ['bio', 'light'], artH: 34,
    attack: { dmg: 8, range: 70, cd: 0.6, proj: 'flame', splash: 26, bonus: { light: 1.5 } },
    desc: 'Fire-worshipping boys carrying blazing torches. Short-ranged flamethrowers that roast clumps of light infantry. Cheap, fast, and best in a horde.',
    quote: 'The flame never dies!',
    lines: {
      select: ['The flame never dies!', 'Burn bright!', 'Self-strengthening!', 'Ready.'],
      move: ['Moving out!', 'Torch lit!', 'Go go go!'],
      attack: ['BURN!', 'FEEL THE FLAME!', 'Roast them!'],
    },
  },
  wushu: {
    faction: 'hwa', name: 'Wushu Practitioner', role: 'Melee', hp: 135, armor: 1, speed: 88, r: 10, cost: 100, supply: 2, time: 18, sight: 7,
    tags: ['bio', 'light'], artH: 36,
    attack: { dmg: 15, range: 16, cd: 0.9, proj: 'slash' },
    desc: 'Hwa Chong boys in red silk wielding enormous wushu broadswords. Fast, tough melee fighters that carve through infantry.',
    quote: 'Hai-YAH!',
    lines: {
      select: ['Hai-YAH!', 'My blade is ready.', 'Discipline!', 'Stance!'],
      move: ['Swiftly!', 'Like the wind!'],
      attack: ['HAI-YAH!', 'Dragon strike!', 'Taste my dao!'],
    },
  },
  nanyang: {
    faction: 'hwa', name: 'Nanyang Girl', role: 'Spellcaster', hp: 55, armor: 0, speed: 72, r: 9, cost: 125, supply: 2, time: 25, sight: 8,
    tags: ['bio', 'light'], artH: 30, energy: 200, startEnergy: 60,
    attack: { dmg: 6, range: 140, cd: 1.2, proj: 'qibolt' },
    abilities: ['diligence', 'prudence', 'respectability', 'summonstudent', 'fuse'],
    desc: 'Spellcasters drawing on the four virtues: Diligence, Prudence, Respectability and Simplicity. Two Nanyang Girls can focus their inner qi to fuse into a Qi Archon.',
    quote: '勤慎端朴!',
    lines: {
      select: ['Diligence!', 'Prudence first.', 'Simple, yet effective.', '勤慎端朴!'],
      move: ['Okay.', 'Moving.', 'Be prudent.'],
      attack: ['Focus!', 'Qi strike!'],
      cast: ['By Diligence!', 'With Prudence!', 'Have some respect!', 'Simplicity!'],
    },
  },
  exchange: {
    faction: 'hwa', name: 'Exchange Student', role: 'Summon', hp: 200, armor: 0, speed: 96, r: 10, cost: 0, supply: 0, time: 0, sight: 7,
    tags: ['bio'], artH: 32, invuln: true, life: 15, summoned: true,
    attack: { dmg: 20, range: 16, cd: 0.6, proj: 'slash' },
    desc: 'An ethereal scholarship student summoned by a Nanyang Girl. Cannot be harmed. Cannot be beaten. Only stays as long as the Student Pass allows — 15 seconds.',
    quote: 'Student pass still valid.',
    lines: {
      select: ['Student pass still valid.', 'I top the class.', 'Cannot touch me.'],
      move: ['Okay.', 'Efficiently.'],
      attack: ['Too easy.', 'Full marks!'],
    },
  },
  archon: {
    faction: 'hwa', name: 'Qi Archon', role: 'Fused Caster', hp: 380, armor: 1, speed: 70, r: 16, cost: 0, supply: 4, time: 0, sight: 9,
    tags: ['massive'], artH: 50, summoned: true,
    attack: { dmg: 28, range: 110, cd: 1.3, proj: 'qiblast', splash: 36 },
    desc: 'Two Nanyang Girls united by focused inner qi. Hurls devastating blasts of energy that splash across groups.',
    quote: 'Two minds. One qi.',
    lines: {
      select: ['Two minds. One qi.', 'We are in balance.', 'Simplicity.'],
      move: ['We glide.', 'Onward.'],
      attack: ['FEEL OUR QI!', 'Harmony... and destruction!'],
    },
  },
  riotbus: {
    faction: 'hwa', name: 'Riot Bus', role: 'Ranged Vehicle', hp: 320, armor: 1, speed: 62, r: 22, cost: 175, supply: 3, time: 28, sight: 8,
    tags: ['mech', 'heavy'], artH: 50, vehicle: true,
    attack: { dmg: 18, range: 175, cd: 1.4, proj: 'ghost' },
    desc: 'The resurrected buses of the 1950s, over which the early students rioted for workers\' rights. The basic Hwachung vehicle. It shoots ghosts.',
    quote: 'Workers of the world...',
    lines: {
      select: ['*ghostly horn*', 'Workers, unite!', 'Next stop: justice.'],
      move: ['*rattling engine*', 'All aboard!'],
      attack: ['BOOOO!', 'Haunt them!', 'Fair wages!'],
    },
  },
  tankahkee: {
    faction: 'hwa', name: 'Tan Kah Kee', role: 'Hero', hp: 950, armor: 2, speed: 82, r: 18, cost: 500, supply: 5, time: 45, sight: 10,
    tags: ['bio', 'heavy'], artH: 52, hero: true, limit: 1,
    attack: { dmg: 22, range: 170, cd: 0.65, proj: 'bullet' },
    aura: { radius: 220, dmg: 0.15 },
    abilities: ['pandaslam'],
    desc: 'Hero of the glorious war of independence against the imperialists. Rides into battle on a panda, armed with a gun. Nearby allies deal +15% damage. Only one may exist.',
    quote: 'Build schools, not empires!',
    lines: {
      select: ['Build schools, not empires!', 'For Nanyang!', 'My panda is ready.'],
      move: ['Onward, panda!', 'Forward!'],
      attack: ['Down with the imperialists!', 'Fire!', 'For the people!'],
    },
  },
};

const BUILDINGS = {
  // ---------------- METHODISTS ----------------
  schoolhall: {
    faction: 'meth', name: 'Founders\' Hall', w: 4, h: 4, hp: 1600, armor: 1, cost: 400, time: 60, supply: 10, sight: 10,
    trains: ['maid', 'acsboy'], hq: true,
    desc: 'The colonial-era heart of the school. Trains Maids and ACS Boys. Provides 10 supply.',
  },
  bungalow: {
    faction: 'meth', name: 'Good Class Bungalow', w: 3, h: 3, hp: 450, armor: 0, cost: 100, time: 25, supply: 8, sight: 7,
    trains: ['acsboy'],
    desc: 'A $40 million landed estate with pool and supercar. Provides 8 supply and raises more ACS Boys.',
  },
  rugbypitch: {
    faction: 'meth', name: 'Rugby Pitch', w: 4, h: 3, hp: 850, armor: 1, cost: 150, time: 35, sight: 7,
    trains: ['rugger'], research: ['proteinshakes'], req: ['schoolhall'],
    desc: 'Where boys become Ruggers. Trains Ruggers.',
  },
  chapel: {
    faction: 'meth', name: 'Chapel', w: 3, h: 3, hp: 750, armor: 1, cost: 150, time: 35, sight: 8,
    trains: ['mgsgirl'], research: ['calltoprayer'], abilities: ['calltoprayer'], req: ['schoolhall'],
    desc: 'Morning devotions every day. Trains MGS Girls and researches the Call to Prayer.',
  },
  carnival: {
    faction: 'meth', name: 'Fun-O-Rama Grounds', w: 4, h: 3, hp: 1000, armor: 1, cost: 200, time: 45, sight: 7,
    trains: ['float'], req: ['rugbypitch'],
    desc: 'The annual carnival, now a permanent war factory. Builds Fun-O-Rama Floats.',
  },
  familyoffice: {
    faction: 'meth', name: 'Family Office', w: 3, h: 3, hp: 650, armor: 1, cost: 200, time: 40, sight: 7,
    research: ['trustfund', 'handbellchoir'], req: ['chapel'],
    desc: 'Manages generational wealth across seven tax jurisdictions. Researches economic and choir upgrades.',
  },
  cathedral: {
    faction: 'meth', name: 'Cathedral of Mr. Oldham', w: 4, h: 4, hp: 1600, armor: 2, cost: 400, time: 70, sight: 9,
    trains: ['chimera'], req: ['familyoffice', 'carnival'],
    desc: 'A golden cathedral to the god Mr. Oldham, who wills the Chimera into being.',
  },
  poloclub: {
    faction: 'meth', name: 'Polo Club', w: 4, h: 3, hp: 850, armor: 1, cost: 175, time: 40, sight: 7,
    trains: ['polorider'], research: ['thoroughbreds'], req: ['rugbypitch'],
    desc: 'An exclusive members-only polo club. Annual fee: one Good Class Bungalow. Trains Polo Riders.',
  },
  guardhouse: {
    faction: 'meth', name: 'Condo Guardhouse', w: 2, h: 2, hp: 450, armor: 1, cost: 125, time: 25, sight: 9,
    attack: { dmg: 12, range: 210, cd: 1.0, proj: 'bullet' }, req: ['rugbypitch'],
    desc: 'A 24-hour security booth with a boom gate. Shoots intruders who did not register at the lobby.',
  },

  // ---------------- HWACHUNG ----------------
  jadepagoda: {
    faction: 'hwa', name: 'Jade Pagoda', w: 4, h: 4, hp: 1600, armor: 1, cost: 400, time: 60, supply: 10, sight: 10,
    trains: ['farmer'], research: ['ironricebowl'], hq: true, dropoff: true,
    desc: 'A towering pagoda of polished jade. Trains Rice Farmers, accepts rice, provides 10 supply.',
  },
  ricepaddy: {
    faction: 'hwa', name: 'Rice Paddy', w: 3, h: 2, hp: 300, armor: 0, cost: 75, time: 15, sight: 4,
    resource: 1200,
    desc: 'A flooded field of rice. Farmers harvest it until it runs dry (1200 rice).',
  },
  granary: {
    faction: 'hwa', name: 'Granary', w: 2, h: 2, hp: 400, armor: 0, cost: 100, time: 20, sight: 6,
    dropoff: true, req: ['jadepagoda'],
    desc: 'A rice storehouse. Farmers can drop off rice here.',
  },
  clanhouse: {
    faction: 'hwa', name: 'Clan Association', w: 3, h: 3, hp: 450, armor: 0, cost: 100, time: 25, supply: 8, sight: 7,
    req: ['jadepagoda'],
    desc: 'A clan hall full of uncles playing xiangqi. Provides 8 supply.',
  },
  wushustadium: {
    faction: 'hwa', name: 'Wushu Stadium', w: 4, h: 3, hp: 850, armor: 1, cost: 150, time: 35, sight: 7,
    trains: ['hwachie', 'wushu'], req: ['jadepagoda'],
    desc: 'Trains Hwachies and Wushu Practitioners.',
  },
  flametemple: {
    faction: 'hwa', name: 'Temple of Eternal Flame', w: 3, h: 3, hp: 750, armor: 1, cost: 150, time: 35, sight: 7,
    research: ['eternalflame', 'tenthousand'], req: ['wushustadium'],
    desc: 'The sacred flame of the founders burns here forever. Researches fire and horde upgrades.',
  },
  busdepot: {
    faction: 'hwa', name: 'Depot of Martyred Buses', w: 4, h: 3, hp: 1000, armor: 1, cost: 200, time: 45, sight: 7,
    trains: ['riotbus'], req: ['wushustadium'],
    desc: 'A haunted bus depot. Resurrects Riot Buses.',
  },
  pavilion: {
    faction: 'hwa', name: 'Nanyang Pavilion', w: 3, h: 3, hp: 700, armor: 1, cost: 175, time: 40, sight: 8,
    trains: ['nanyang'], research: ['fourvirtues'], req: ['flametemple'],
    desc: 'A serene pavilion over a lotus pond. Trains Nanyang Girls.',
  },
  pandasanctuary: {
    faction: 'hwa', name: 'Panda Sanctuary', w: 4, h: 4, hp: 1400, armor: 2, cost: 350, time: 60, sight: 8,
    trains: ['tankahkee'], req: ['pavilion', 'busdepot'],
    desc: 'Bamboo groves and a grand gate. Summons the hero Tan Kah Kee on his panda.',
  },
  greatwall: {
    faction: 'hwa', name: 'Great Wall', w: 1, h: 1, hp: 500, armor: 3, cost: 10, time: 4, sight: 3,
    wall: true, req: ['jadepagoda'],
    desc: 'One segment of the Great Wall. Cheap, tough, blocks movement. Hold Shift to keep placing.',
  },
  dragongate: {
    faction: 'hwa', name: 'Dragon Gate Tower', w: 2, h: 2, hp: 450, armor: 1, cost: 125, time: 25, sight: 9,
    attack: { dmg: 12, range: 210, cd: 1.0, proj: 'firework', splash: 24 }, req: ['wushustadium'],
    desc: 'A red gate tower that launches fireworks at intruders.',
  },
};

const BUILD_MENUS = {
  meth: ['schoolhall', 'bungalow', 'rugbypitch', 'chapel', 'poloclub', 'carnival', 'familyoffice', 'cathedral', 'guardhouse'],
  hwa: ['jadepagoda', 'ricepaddy', 'granary', 'clanhouse', 'wushustadium', 'flametemple', 'busdepot', 'pavilion', 'pandasanctuary', 'greatwall', 'dragongate'],
};

const RESEARCH = {
  thoroughbreds: { name: 'Thoroughbreds', cost: 150, time: 40, icon: '🐎', desc: 'Polo Riders gain +40 max HP and +20 speed. Imported from England, naturally.' },
  calltoprayer: { name: 'Call to Prayer', cost: 150, time: 40, icon: '🔔', desc: 'Unlocks the Call to Prayer: for 20s all Maids enter combat mode and ACS Boys earn double. 75s cooldown.' },
  proteinshakes: { name: 'Protein Shakes', cost: 150, time: 40, icon: '🥤', desc: 'Ruggers gain +50 max HP and +3 damage. Totally legal supplements.' },
  trustfund: { name: 'Trust Fund', cost: 200, time: 45, icon: '🏦', desc: 'ACS Boys generate +50% Money.' },
  handbellchoir: { name: 'Handbell Choir', cost: 150, time: 40, icon: '🎶', desc: 'MGS Girls gain +30 range and Pray lasts 15s instead of 10s.' },
  ironricebowl: { name: 'Iron Rice Bowl', cost: 100, time: 30, icon: '🥣', desc: 'Rice Farmers carry +2 rice per trip.' },
  eternalflame: { name: 'Eternal Flame', cost: 150, time: 40, icon: '🔥', desc: 'Hwachies gain +4 damage and +15 range.' },
  tenthousand: { name: 'Ten Thousand Strong', cost: 200, time: 45, icon: '🐉', desc: 'Horde triggers with 7 fighters instead of 10 and grants +35% damage.' },
  fourvirtues: { name: 'The Four Virtues', cost: 150, time: 40, icon: '☯️', desc: 'Nanyang Girls regenerate energy 50% faster.' },
};

const ABILITIES = {
  calltoprayer: { name: 'Call to Prayer', key: 'C', icon: '⛪', global: true, cd: 75, dur: 20, needs: 'calltoprayer',
    desc: 'For 20s, all your Maids enter combat mode and ACS Boys earn double Money. 75s cooldown.' },
  pray: { name: 'Pray', key: 'Q', icon: '🙏', energy: 50, radius: 170, dur: 10,
    desc: 'Nearby allies deal +50% damage for 10s.' },
  diligence: { name: 'Diligence 勤', key: 'Q', icon: '📚', energy: 40, radius: 130, dur: 10,
    desc: 'Homework never sleeps. Nearby allies attack 50% faster for 10s.' },
  prudence: { name: 'Prudence 慎', key: 'W', icon: '🛡️', energy: 60, radius: 130, shield: 60, dur: 15,
    desc: 'Nearby allies gain a 60-point shield that absorbs damage for 15s.' },
  respectability: { name: 'Respectability 端', key: 'E', icon: '😤', energy: 75, radius: 90, range: 240, stun: 3, target: 'point',
    desc: 'A withering stare of disapproval. Enemies in the target area are stunned with shame for 3s.' },
  summonstudent: { name: 'Summon Exchange Student', key: 'R', icon: '🎓', energy: 100,
    desc: 'Summon an invincible Chinese foreign exchange student who lasts as long as the student pass allows: 15s.' },
  fuse: { name: 'Simplicity 朴: Fuse Qi', key: 'F', icon: '☯️', fuse: true,
    desc: 'Simplicity: two become one. Two selected Nanyang Girls focus their inner qi and fuse into a Qi Archon.' },
  pandaslam: { name: 'Panda Slam', key: 'Q', icon: '🐼', cd: 20, radius: 110, dmg: 30, stun: 2,
    desc: 'The panda slams the ground, dealing 30 damage and stunning nearby enemies for 2s. 20s cooldown.' },
};
