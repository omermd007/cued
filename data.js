// Cued — Personalized Movie, Series & Anime Catalog
// DNA dimensions (1–10):
//   pace:       1 slow-burn meditative  ↔ 10 relentless momentum
//   intensity:  1 light & relaxed       ↔ 10 dark, tense, high-stakes
//   complexity: 1 straightforward ride  ↔ 10 twisty puzzle-box / layered payoff
//   warmth:     1 bleak / ruthless      ↔ 10 deeply moving / heartfelt
//   humor:      1 dead serious          ↔ 10 witty / fun / chaotic laughs
//   spectacle:  1 intimate grounded     ↔ 10 epic scale / action / magic

window.CUED_MOODS = [
  { id: 'crime',    label: 'Crime & Mystery',   sub: 'Detectives, true crime, gritty',   glyph: 'pulse' },
  { id: 'mindbend', label: 'Twisty & Smart',    sub: 'Plot twists, mind-benders',        glyph: 'prism' },
  { id: 'deep',     label: 'Deep & Emotional',  sub: 'Powerful stories, real payoff',    glyph: 'wave' },
  { id: 'hype',     label: 'Epic & High-Stakes',sub: 'Big action, fantasy, anime hype',  glyph: 'aperture' },
  { id: 'horror',   label: 'Creepy & Haunted',  sub: 'Supernatural dread, goosebumps',   glyph: 'hearth' },
  { id: 'fun',      label: 'Fun & Fast Ride',   sub: 'Adventure, dark wit, pure fun',    glyph: 'spark' }
];

window.CUED_ORIGINS = [
  { id: 'any',     label: 'Any' },
  { id: 'indian',  label: 'Indian' },
  { id: 'western', label: 'Hollywood / UK' },
  { id: 'intl',    label: 'Korean / Intl' }
];

// Compact schema expanded cleanly to full objects:
// [id, title, year, type('movie'|'series'|'anime'), origin('indian'|'western'|'intl'|'anime'),
//  runtimeMins, runtimeLabel, creator, genres, moods, rating, lang, hook, whyTags, [bg, accent, motif], anchor, [pace, intensity, complexity, warmth, humor, spectacle]]
const RAW_CATALOG = [
  // ==================== USER'S LOVED ANCHOR TITLES (PRE-SEEDED FOR SIMILARITY ENGINE) ====================
  ['breaking-bad','Breaking Bad',2008,'series','western',49,'5 seasons (complete)','Vince Gilligan',['Crime','Thriller','Drama'],['crime','mindbend','hype'],'9.5','EN','A brilliant chemistry teacher diagnosed with cancer builds a ruthless meth empire—escalating into the tightest cat-and-mouse drama ever televised.',['Masterpiece escalation','Zero filler payoff'],['#141D15','#8BB34A','grid'],1,[9,9,8,3,4,7]],
  ['game-of-thrones','Game of Thrones',2011,'series','western',57,'8 seasons · epic fantasy','Benioff & Weiss',['Fantasy','Drama','Action'],['hype','crime','mindbend'],'9.2','EN','Noble houses wage ruthless political war and brutal battles for the Iron Throne while an ancient winter threat marches south.',['Shocking betrayals','Massive world scale'],['#171618','#C9974A','blades'],1,[8,9,8,3,3,10]],
  ['sherlock','Sherlock',2010,'series','western',88,'4 seasons · 90m mysteries','Moffat & Gatiss',['Mystery','Crime','Thriller'],['mindbend','crime','fun'],'9.1','EN','A razor-brained modern Sherlock Holmes tears through impossible London murders alongside war doctor John Watson.',['Genius deductions','Rapid-fire twists'],['#14181F','#7FA6C7','prism'],1,[9,7,10,5,7,6]],
  ['shutter-island','Shutter Island',2010,'movie','western',138,'2h 18m','Martin Scorsese',['Mystery','Thriller'],['mindbend','crime','horror'],'8.2','EN','Two U.S. Marshals arrive at a storm-lashed island asylum in 1954 to investigate a vanished patient—and reality begins to fracture.',['All-time plot twist','Gothic suspense'],['#13191E','#8FA7B5','waves'],1,[8,9,9,3,2,7]],
  ['andhadhun','Andhadhun',2018,'movie','indian',139,'2h 19m','Sriram Raghavan',['Thriller','Crime','Dark Comedy'],['mindbend','crime','fun'],'8.2','HI','A pianist pretending to be blind accidentally witnesses a murder—setting off an escalating chain of outrageous twists and double-crosses.',['Relentless plot twists','Wicked dark humor'],['#1C1914','#E09B38','bars'],1,[9,8,9,4,7,5]],
  ['hit-first-case','HIT: The First Case',2020,'movie','indian',125,'2h 05m','Sailesh Kolanu',['Crime','Thriller','Mystery'],['crime','mindbend'],'7.7','TE','A sharp homicide detective battling personal trauma races against the clock to solve a woman’s sudden highway disappearance.',['Tight police procedural','Gripping suspense'],['#1A1414','#D84C3B','beam'],1,[8,9,8,4,2,5]],
  ['gangs-of-wasseypur','Gangs of Wasseypur',2012,'movie','indian',160,'2h 40m (Part 1)','Anurag Kashyap',['Crime','Action','Drama'],['crime','hype','fun'],'8.2','HI','Across decades of coal-mafia blood feuds in Dhanbad, rival crime families wage a raw, explosive, darkly hilarious war of vengeance.',['Raw Indian crime epic','Electrifying energy'],['#211510','#DF6B34','burst'],1,[9,9,7,3,7,8]],
  ['insidious','Insidious',2010,'movie','western',103,'1h 43m','James Wan',['Horror','Mystery','Thriller'],['horror','mindbend'],'6.8','EN','When a couple’s young son falls into an unexplained coma, they realize it isn’t their house that’s haunted—it’s their son.',['Relentless jump scares','Creepy astral lore'],['#171314','#D44338','split'],1,[8,9,6,4,2,6]],
  ['the-pianist','The Pianist',2002,'movie','western',150,'2h 30m','Roman Polanski',['Drama','History','War'],['deep'],'8.5','EN','A gifted Polish-Jewish pianist fights for survival through the devastation of Warsaw during WWII in a devastating, deeply human true story.',['Unforgettable emotional weight','Masterwork performance'],['#181715','#C6A778','frames'],1,[7,9,6,9,1,7]],
  ['solo-leveling','Solo Leveling',2024,'anime','anime',24,'2 seasons · 24m eps','A-1 Pictures',['Anime','Action','Fantasy'],['hype'],'8.6','JA','The world’s weakest hunter survives a lethal double-dungeon and unlocks a secret RPG System that lets him level up without limit.',['Pure adrenaline hype','Insane boss fights'],['#121622','#5C8CE6','blades'],1,[10,8,5,4,4,10]],
  ['demon-slayer','Demon Slayer',2019,'anime','anime',24,'4 seasons · 24m eps','Ufotable',['Anime','Action','Fantasy'],['hype','deep'],'8.6','JA','After demons slaughter his family and curse his sister, a kind-hearted swordsman joins the Demon Slayer Corps in breathtaking battles.',['God-tier animation','Emotional stakes'],['#1A1416','#E05A47','burst'],1,[9,8,5,8,5,10]],
  ['harry-potter','Harry Potter & the Prisoner of Azkaban',2004,'movie','western',142,'2h 22m','Alfonso Cuarón',['Fantasy','Adventure','Mystery'],['fun','hype','mindbend'],'7.9','EN','Harry’s third year at Hogwarts turns darker when an infamous fugitive escapes Azkaban—unleashing Dementors and a brilliant time twist.',['Magical mystery twist','Pure wonder'],['#151921','#C9A14A','ring'],1,[8,6,7,8,6,9]],
  ['avengers-iw','Avengers: Infinity War',2018,'movie','western',149,'2h 29m','Russo Brothers',['Action','Sci-Fi','Adventure'],['hype','fun'],'8.4','EN','Earth’s heroes split across galaxies to stop Thanos from collecting the Infinity Stones in a breathless blockbuster with real stakes.',['Wall-to-wall spectacle','Shocking ending'],['#19141C','#D97A38','prism'],1,[10,8,6,6,7,10]],
  ['jumanji','Jumanji: Welcome to the Jungle',2017,'movie','western',119,'1h 59m','Jake Kasdan',['Adventure','Comedy','Action'],['fun','hype'],'7.0','EN','Four detention teens get sucked into a retro video game as mismatched adult avatars and must beat the jungle to survive.',['Fast crowd-pleaser','Laugh-out-loud fun'],['#161F15','#E09B38','sun'],1,[9,4,3,7,9,8]],

  // ==================== INDIAN CRIME THRILLERS & TWISTY MASTERPIECES ====================
  ['maharaja','Maharaja',2024,'movie','indian',141,'2h 21m','Nithilan Swaminathan',['Crime','Thriller','Mystery'],['mindbend','crime','deep'],'8.5','TA','A quiet barber walks into a police station insisting cops find his stolen "Lakshmi"—an ordinary iron dustbin—unraveling a jaw-dropping puzzle.',['Insane nonlinear twist','Devastating payoff'],['#1D1412','#D85438','split'],1,[8,9,10,7,2,6]],
  ['drishyam','Drishyam',2015,'movie','indian',163,'2h 43m','Nishikant Kamat',['Crime','Thriller','Mystery'],['mindbend','crime'],'8.2','HI','A movie-obsessed cable operator builds an airtight, genius alibi to shield his family from a ruthless police chief after a fateful night.',['Ultimate cat-and-mouse','All-time ending payoff'],['#161D19','#C99B48','maze'],1,[8,8,10,7,3,5]],
  ['ratsasan','Ratsasan',2018,'movie','indian',170,'2h 50m','Ram Kumar',['Crime','Thriller','Mystery'],['crime','mindbend','horror'],'8.3','TA','An aspiring filmmaker forced to become a rookie cop hunts a terrifyingly methodical psychopath targeting schoolgirls across Chennai.',['Edge-of-seat serial killer hunt','Chilling score'],['#161418','#CF4B3A','beam'],1,[9,10,9,4,2,5]],
  ['kahaani','Kahaani',2012,'movie','indian',122,'2h 02m','Sujoy Ghosh',['Mystery','Thriller','Crime'],['mindbend','crime'],'8.1','HI','A pregnant woman arrives in Kolkata during Durga Puja hunting for her vanished husband—while every clue says he never existed.',['Iconic plot twist','Zero wasted minutes'],['#211412','#E05D38','ring'],0,[8,8,9,5,2,5]],
  ['vikram-vedha','Vikram Vedha',2017,'movie','indian',147,'2h 27m','Pushkar-Gayathri',['Crime','Action','Thriller'],['crime','mindbend','hype'],'8.2','TA','A fearless encounter cop hunts a charismatic gangster who surrenders voluntarily—and forces the cop to question right and wrong through three riddles.',['Smartest gangster duel','Mass action + brains'],['#1A1612','#DF8A34','blades'],0,[9,8,9,4,5,8]],
  ['tumbbad','Tumbbad',2018,'movie','indian',104,'1h 44m','Rahi Anil Barve',['Horror','Fantasy','Thriller'],['horror','mindbend','hype'],'8.2','HI','Across generations in rain-soaked Maharashtra, a man’s obsession with an ancient cursed goddess’s gold leads him into a terrifying underground womb.',['104 mins of pure dread','Unmatched Indian horror'],['#1B1310','#D9652B','arch'],1,[8,9,7,2,1,8]],
  ['12th-fail','12th Fail',2023,'movie','indian',147,'2h 27m','Vidhu Vinod Chopra',['Drama','Biography'],['deep'],'8.8','HI','Based on a real story: a village boy who fails 12th grade risks everything in Delhi to crack India’s hardest exam without losing his soul.',['Huge emotional payoff','Gripping from minute one'],['#1B1813','#DF9E42','stairs'],0,[8,6,4,10,5,5]],
  ['paatal-lok','Paatal Lok',2020,'series','indian',45,'2 seasons · 45m eps','Sudip Sharma',['Crime','Thriller','Drama'],['crime','mindbend'],'8.1','HI','A washed-up Delhi cop lands the assassination attempt of a star journalist—and uncovers a brutal conspiracy tying four killers to India’s underworld.',['Gangs of Wasseypur grit','Razor-sharp writing'],['#1A1513','#CF5638','maze'],1,[8,9,8,3,3,6]],
  ['asur','Asur',2020,'series','indian',48,'2 seasons · 8 eps each','Gaurav Shukla',['Crime','Mystery','Thriller'],['crime','mindbend','horror'],'8.5','HI','A forensic expert and his estranged mentor race to stop a ruthless serial killer who believes he is the incarnation of a dark mythological demon.',['Forensic crime + mythology','Addictive cliffhangers'],['#181314','#D64A36','prism'],1,[9,9,9,3,1,6]],
  ['farzi','Farzi',2023,'series','indian',55,'8 episodes · 55m eps','Raj & DK',['Crime','Thriller','Dark Comedy'],['crime','fun','mindbend'],'8.4','HI','A broke, brilliant street artist starts printing undetectable counterfeit notes—pulling him into a wild clash with a fiery task-force officer.',['Indian Breaking Bad vibe','Slick, fast & funny'],['#151D17','#D6A23C','grid'],0,[9,8,8,5,7,6]],
  ['sacred-games','Sacred Games',2018,'series','indian',50,'2 seasons · 50m eps','Anurag Kashyap & Motwane',['Crime','Thriller','Mystery'],['crime','mindbend'],'8.5','HI','A troubled Mumbai cop gets an anonymous tip from a notorious gangster telling him he has 25 days to save the city from catastrophe.',['Epic underworld saga','25-day countdown hook'],['#1F1512','#DF6432','ring'],0,[8,9,8,3,4,7]],
  ['mirzapur','Mirzapur',2018,'series','indian',48,'3 seasons · 48m eps','Karan Anshuman',['Crime','Action','Thriller'],['crime','hype'],'8.4','HI','A shocking wedding shootout drags two middle-class brothers into the violent gun-and-opium empire of Purvanchal’s deadliest don.',['Raw crime power play','Explosive pacing'],['#1F1410','#E05A34','burst'],0,[9,9,6,3,5,7]],
  ['the-family-man','The Family Man',2019,'series','indian',45,'2 seasons · 45m eps','Raj & DK',['Action','Spy','Thriller','Comedy'],['crime','hype','fun'],'8.7','HI','A middle-class dad secretly works for India’s elite anti-terror agency—juggling high-stakes espionage missions and hiding them from his wife.',['Elite spy action','Hilarious & intense'],['#161A1D','#DF7E38','horizon'],0,[9,8,7,6,8,8]],
  ['suzhal','Suzhal: The Vortex',2022,'series','indian',45,'8 episodes · 45m eps','Pushkar-Gayathri',['Mystery','Crime','Thriller'],['crime','mindbend'],'8.1','TA','During a fiery 9-day Tamil festival, a young girl vanishes after a factory burns down—peeling back dark secrets in a tight-knit town.',['Twisty 8-ep mystery','Electric festival visuals'],['#211411','#E56A32','waves'],0,[8,8,9,4,2,7]],
  ['special-ops','Special OPS',2020,'series','indian',48,'8 episodes · 48m eps','Neeraj Pandey',['Spy','Action','Thriller'],['crime','hype'],'8.6','HI','A veteran RAW officer tracks the hidden mastermind behind 19 years of attacks using five undercover agents stationed across the globe.',['Dhurandhar spy energy','Slick global thriller'],['#14181E','#C98B3E','beam'],0,[9,8,8,4,3,8]],

  // ==================== HOLLYWOOD / KOREAN CRIME, TRUE-CRIME & TWISTY THRILLERS ====================
  ['se7en','Se7en',1995,'movie','western',127,'2h 07m','David Fincher',['Crime','Mystery','Thriller'],['crime','mindbend','horror'],'8.6','EN','A retiring detective and his brash replacement track a chillingly brilliant serial killer staging murders after the seven deadly sins.',['Greatest crime ending','Pure relentless tension'],['#171513','#C95A36','frames'],1,[8,10,9,2,2,6]],
  ['the-prestige','The Prestige',2006,'movie','western',130,'2h 10m','Christopher Nolan',['Mystery','Thriller','Sci-Fi'],['mindbend','hype'],'8.5','EN','Two obsessive rival magicians in 1890s London escalate from stage sabotage to lethal deception trying to build the ultimate illusion.',['Peak Nolan mind-bender','Rewarding final reveal'],['#15171F','#D9A243','prism'],1,[9,8,10,4,3,7]],
  ['gone-girl','Gone Girl',2014,'movie','western',149,'2h 29m','David Fincher',['Mystery','Thriller','Crime'],['mindbend','crime'],'8.1','EN','When his wife vanishes on their fifth anniversary, a husband becomes the prime media suspect—until the movie flips completely upside down.',['Jaw-dropping midpoint twist','Addictive razor pace'],['#16191D','#B88D56','split'],1,[9,9,9,2,5,5]],
  ['prisoners','Prisoners',2013,'movie','western',153,'2h 33m','Denis Villeneuve',['Crime','Thriller','Mystery'],['crime','mindbend'],'8.2','EN','When two young girls vanish on Thanksgiving, a desperate father crosses moral lines while a relentless detective closes in on a chilling puzzle.',['White-knuckle suspense','Zero wasted scenes'],['#14191B','#9BA8A5','maze'],0,[8,10,9,3,1,5]],
  ['parasite','Parasite',2019,'movie','intl',132,'2h 12m','Bong Joon-ho',['Thriller','Dark Comedy','Crime'],['mindbend','crime','fun'],'8.5','KO','A scrappy family infiltrates a billionaire household one job at a time—until a hidden basement turns the movie inside out.',['Andhadhun-level turns','Zero dull moments'],['#162019','#C8A24A','stairs'],1,[9,8,9,3,6,6]],
  ['invisible-guest','The Invisible Guest',2016,'movie','intl',106,'1h 46m','Oriol Paulo',['Mystery','Crime','Thriller'],['mindbend','crime'],'8.0','ES','A wealthy businessman wakes up locked in a hotel room next to his dead lover—and has three hours with a fierce defense lawyer to untangle the truth.',['Non-stop twist machine','Tight 106-min chess match'],['#15181C','#C99754','frames'],1,[9,8,10,2,1,4]],
  ['memories-of-murder','Memories of Murder',2003,'movie','intl',131,'2h 11m','Bong Joon-ho',['Crime','Mystery','Thriller'],['crime','deep'],'8.1','KO','Based on South Korea’s first serial murders: two clashing detectives chase a phantom killer through rainy rural towns in 1986.',['Masterclass true-crime','Gripping & haunting'],['#181814','#B89B5E','horizon'],0,[7,9,8,4,4,5]],
  ['oldboy','Oldboy',2003,'movie','intl',120,'2h 00m','Park Chan-wook',['Thriller','Mystery','Action'],['mindbend','crime','hype'],'8.3','KO','Imprisoned in a mysterious room for 15 years with no reason, a man is suddenly freed with five days to learn who did it—and why.',['Iconic hallway fight','Shocking dark reveal'],['#1E1414','#C94735','maze'],0,[9,10,10,2,3,7]],
  ['memento','Memento',2000,'movie','western',113,'1h 53m','Christopher Nolan',['Mystery','Thriller'],['mindbend','crime'],'8.4','EN','A man who loses his memory every fifteen minutes hunts his wife’s killer using Polaroids and tattoos—told backward so every scene flips meaning.',['Ultimate puzzle thriller','Zero hand-holding'],['#1B1A18','#D9C6A3','frames'],0,[8,8,10,2,2,4]],
  ['knives-out','Knives Out',2019,'movie','western',130,'2h 10m','Rian Johnson',['Mystery','Comedy','Crime'],['mindbend','fun','crime'],'7.9','EN','A flamboyant detective unravels a scheming billionaire family’s alibis after their patriarch dies on his 85th birthday.',['Sherlock energy + laughs','Clever whodunit'],['#211812','#D89B3C','blades'],0,[8,5,8,6,8,5]],
  ['inception','Inception',2010,'movie','western',148,'2h 28m','Christopher Nolan',['Sci-Fi','Action','Thriller'],['mindbend','hype'],'8.8','EN','A master thief who steals secrets inside dreams accepts one impossible job: planting an idea deep inside an heir’s subconscious.',['Heist inside a dream','High-octane spectacle'],['#141920','#D68F3C','stairs'],1,[9,8,9,5,3,10]],
  ['mindhunter','Mindhunter',2017,'series','western',54,'2 seasons · 54m eps','David Fincher',['Crime','Thriller','Drama'],['crime','mindbend'],'8.6','EN','In the late 1970s, two FBI agents invent criminal profiling by sitting across from real serial killers to decode how their minds work.',['Dahmer fans’ #1 pick','Chillingly addictive'],['#141717','#A69572','bars'],1,[7,9,8,2,2,4]],
  ['black-bird','Black Bird',2022,'series','western',58,'6 episodes (miniseries)','Dennis Lehane',['Crime','Thriller','True Crime'],['crime','mindbend'],'8.1','EN','True story: a charismatic convict takes a deal to transfer to a maximum-security asylum and befriend a suspected serial killer to get a confession.',['Taut 6-ep true crime','Electrifying performances'],['#171615','#C95A3A','bars'],0,[8,9,8,4,2,5]],
  ['true-detective-s1','True Detective (Season 1)',2014,'series','western',58,'8 episodes (complete)','Nic Pizzolatto',['Crime','Mystery','Thriller'],['crime','mindbend','deep'],'8.9','EN','Over 17 years in haunted Louisiana bayous, two unforgettable detectives track a ritualistic killer that consumes both their lives.',['8-episode perfection','Southern gothic mystery'],['#171713','#B89B5E','maze'],1,[7,10,9,3,3,6]],
  ['dark','Dark',2017,'series','intl',55,'3 seasons (complete)','Baran bo Odar',['Sci-Fi','Mystery','Thriller'],['mindbend','crime'],'8.7','DE','When kids vanish in a German town, four families uncover a mind-melting time conspiracy—planned brilliantly from episode one to the final scene.',['Greatest twist series','Air-tight payoff'],['#151715','#D8A938','ring'],1,[7,9,10,3,1,6]],
  ['severance','Severance',2022,'series','western',50,'2 seasons · 50m eps','Dan Erickson & Ben Stiller',['Sci-Fi','Mystery','Thriller'],['mindbend','crime'],'8.7','EN','Employees surgically split their work and personal memories—until their trapped "work selves" start uncovering what the company is really hiding.',['Obsession-worthy mystery','Jaw-drop season finale'],['#131C1A','#75A89B','grid'],0,[7,8,10,4,5,6]],
  ['ozark','Ozark',2017,'series','western',58,'4 seasons (complete)','Bill Dubuque',['Crime','Thriller','Drama'],['crime','mindbend'],'8.5','EN','A mild-mannered financial advisor moves his family to the Missouri Ozarks to launder $500 million for a ruthless Mexican cartel.',['Breaking Bad DNA','Non-stop crisis tension'],['#121A1E','#6E9BB5','waves'],0,[9,9,8,3,3,6]],
  ['money-heist','Money Heist',2017,'series','intl',48,'5 parts (complete)','Álex Pina',['Crime','Thriller','Action'],['crime','mindbend','hype'],'8.2','ES','A genius mastermind called The Professor recruits eight specialists to pull off an audacious multi-day heist inside Spain’s Royal Mint.',['Addictive cliffhangers','Sherlock-style schemes'],['#221212','#E04338','bars'],0,[10,8,8,6,5,8]],
  ['luther','Luther',2010,'series','western',58,'5 seasons · 4–6 eps','Neil Cross',['Crime','Thriller','Mystery'],['crime','mindbend'],'8.4','EN','A brilliant, obsessive London homicide detective plays high-stakes psychological chess with the city’s most twisted killers.',['Sherlock’s darker twin','Fast British crime'],['#191414','#D64A38','beam'],0,[9,9,8,3,3,5]],
  ['dexter','Dexter',2006,'series','western',52,'8 seasons · 52m eps','James Manos Jr.',['Crime','Mystery','Thriller'],['crime','mindbend'],'8.6','EN','By day he’s Miami’s sharpest blood-spatter analyst; by night he’s a methodical vigilante hunting killers who slip through the law.',['Dahmer + Breaking Bad hook','Addictive cat-and-mouse'],['#211413','#DF4E3A','blades'],0,[8,9,7,4,5,5]],

  // ==================== DEEP & EMOTIONAL WITH REAL PAYOFF (THE PIANIST ENERGY) ====================
  ['incendies','Incendies',2010,'movie','intl',131,'2h 11m','Denis Villeneuve',['Drama','Mystery','War'],['deep','mindbend'],'8.3','FR','After their mother’s death, twins travel to the Middle East to deliver two sealed letters—unearthing a war-torn secret that changes everything.',['The Pianist emotion + Shutter Island twist','Unforgettable ending'],['#1F1712','#D67A3C','horizon'],1,[7,9,9,8,1,6]],
  ['schindlers-list','Schindler’s List',1993,'movie','western',195,'3h 15m','Steven Spielberg',['Drama','History','War'],['deep'],'9.0','EN','A shrewd German industrialist arrives in Nazi-occupied Krakow to profit from the war—and ends up risking his fortune and life to save over 1,100 people.',['The Pianist’s companion masterpiece','Devastating & triumphant'],['#151515','#D44338','frames'],0,[7,9,6,10,1,8]],
  ['life-is-beautiful','Life Is Beautiful',1997,'movie','intl',116,'1h 56m','Roberto Benigni',['Drama','Comedy','War'],['deep','fun'],'8.6','IT','When a joyful Jewish bookshop owner and his young son are sent to a WWII camp, he uses humor and imagination to convince his son it’s all an elaborate game.',['Laugh then cry hard','Deeply unforgettable'],['#1D1914','#D9A244','sun'],0,[7,8,5,10,8,5]],
  ['shawshank','The Shawshank Redemption',1994,'movie','western',142,'2h 22m','Frank Darabont',['Drama','Crime'],['deep','crime'],'9.3','EN','Wrongfully imprisoned for murder, a quiet banker spends two decades forging an unbreakable friendship—and executing the greatest comeback in cinema.',['Most satisfying ending ever','Zero wasted moments'],['#151A1E','#C99754','bars'],0,[7,7,7,10,4,6]],
  ['green-mile','The Green Mile',1999,'movie','western',189,'3h 09m','Frank Darabont',['Drama','Fantasy','Crime'],['deep','crime'],'8.6','EN','A 1930s death-row guard discovers that a gentle giant accused of a terrible crime possesses an extraordinary miraculous gift.',['Massive emotional payoff','Gripping mystery core'],['#161C17','#B59A5B','beam'],0,[7,8,6,10,4,6]],
  ['whiplash','Whiplash',2014,'movie','western',106,'1h 46m','Damien Chazelle',['Drama','Music','Thriller'],['deep','crime','hype'],'8.5','EN','An obsessive young jazz drummer collides with a terrifyingly ruthless conservatory conductor in an electrifying duel for greatness.',['Edited like an action movie','All-time final 10 mins'],['#19140E','#E29E2B','bars'],1,[10,9,6,3,2,6]],
  ['chernobyl','Chernobyl',2019,'series','western',62,'5 episodes (miniseries)','Craig Mazin',['Drama','History','Thriller'],['deep','crime'],'9.3','EN','The gripping, horrifying true story of the 1986 nuclear meltdown—and the scientists and ordinary heroes who fought both radiation and lies.',['Only 5 towering episodes','Relentless tension'],['#151817','#C95A3A','beam'],1,[8,10,7,6,1,8]],

  // ==================== ELITE FAST-PACED ANIME (SOLO LEVELING / DEMON SLAYER / NARUTO / BLEACH) ====================
  ['attack-on-titan','Attack on Titan',2013,'anime','anime',24,'4 seasons (complete)','Wit / MAPPA',['Anime','Action','Mystery','Dark Fantasy'],['hype','mindbend','deep'],'9.1','JA','Humanity hides behind giant walls from man-eating Titans—until a breach kicks off a war filled with Game-of-Thrones-level twists and brutal stakes.',['GoT + Demon Slayer energy','Mind-blowing lore twists'],['#1E1513','#D85436','arch'],1,[10,10,10,6,2,10]],
  ['death-note','Death Note',2006,'anime','anime',23,'37 episodes (complete)','Madhouse',['Anime','Mystery','Thriller','Crime'],['mindbend','crime'],'8.9','JA','A genius high-schooler finds a supernatural notebook that kills anyone whose name is written in it—sparking an iconic mental war with master detective L.',['Sherlock + Breaking Bad anime','Zero filler suspense'],['#141416','#C94338','split'],1,[9,9,10,2,3,6]],
  ['jujutsu-kaisen','Jujutsu Kaisen',2020,'anime','anime',24,'2 seasons · 24m eps','MAPPA',['Anime','Action','Dark Fantasy'],['hype','horror'],'8.5','JA','A superhuman teen swallows a cursed demon finger and enters a secret school of sorcerers—leading straight into the wildest modern anime fights.',['Bleach + Demon Slayer DNA','Insane choreography'],['#14161F','#DF4E42','burst'],1,[10,8,6,5,7,10]],
  ['vinland-saga','Vinland Saga',2019,'anime','anime',24,'2 seasons · 24m eps','Wit / MAPPA',['Anime','Action','Historical','Drama'],['hype','deep'],'8.8','JA','A Viking boy vows revenge against his father’s cunning killer—evolving from ferocious battlefield action into a deeply moving epic.',['Game of Thrones brutality','The Pianist-level soul'],['#181A1C','#C98B44','blades'],0,[8,9,7,8,2,9]],
  ['code-geass','Code Geass',2006,'anime','anime',24,'50 episodes (complete)','Sunrise',['Anime','Sci-Fi','Action','Thriller'],['mindbend','hype'],'8.7','JA','An exiled prince gains the power of absolute obedience and leads a masked rebellion against a superpower—featuring the best ending in anime.',['Genius chess-master hero','All-time finale payoff'],['#191319','#E0563B','prism'],0,[9,8,9,5,4,9]],
  ['chainsaw-man','Chainsaw Man',2022,'anime','anime',24,'12 episodes · 24m eps','MAPPA',['Anime','Action','Horror'],['hype','horror','fun'],'8.4','JA','A dirt-poor teen merges with his pet chainsaw devil and gets recruited by ruthless devil hunters in a wild, cinematic, zero-filler gorefest.',['Fast 12-ep binge','Dark, chaotic & stylish'],['#1F1312','#E65A2B','blades'],0,[10,9,6,4,7,9]],
  ['hunter-x-hunter','Hunter x Hunter',2011,'anime','anime',24,'148 episodes · elite arcs','Madhouse',['Anime','Adventure','Action'],['hype','mindbend'],'9.0','JA','What starts as a bright adventure to become a licensed Hunter evolves into anime’s smartest power system and darkest, most gripping arcs.',['Naruto + Bleach fans’ crown jewel','Smartest battles ever'],['#151D17','#D9A23C','ring'],0,[8,8,8,7,6,9]],
  ['monster-anime','Monster',2004,'anime','anime',24,'74 episodes (complete)','Madhouse',['Anime','Crime','Mystery','Thriller'],['crime','mindbend','deep'],'8.7','JA','A brilliant brain surgeon saves a young boy’s life over a mayor’s—only to learn nine years later that the boy grew into a charismatic sociopathic killer.',['Dahmer + Mindhunter in anime','Masterpiece villain'],['#151618','#A8946E','maze'],0,[7,9,9,5,1,5]],
  ['kaiju-no-8','Kaiju No. 8',2024,'anime','anime',24,'12 episodes · 24m eps','Production I.G',['Anime','Action','Sci-Fi'],['hype','fun'],'8.3','JA','A 32-year-old monster-corpse cleaner accidentally gains the power to transform into an unstoppable Kaiju right as he joins the Defense Force.',['Solo Leveling hype energy','Fast, funny & punchy'],['#131A22','#4FA3D9','burst'],0,[10,7,4,7,7,10]],

  // ==================== CREEPY SUPERNATURAL HORROR (INSIDIOUS ENERGY) ====================
  ['the-conjuring','The Conjuring',2013,'movie','western',112,'1h 52m','James Wan',['Horror','Mystery','Thriller'],['horror','crime'],'7.5','EN','Paranormal investigators Ed and Lorraine Warren race to help a terrified family trapped in a secluded farmhouse with a dark presence.',['Same director as Insidious','Masterclass scares'],['#161414','#C95A3A','arch'],1,[8,10,6,5,2,6]],
  ['sinister','Sinister',2012,'movie','western',110,'1h 50m','Scott Derrickson',['Horror','Mystery','Thriller'],['horror','crime','mindbend'],'6.8','EN','A true-crime writer moves into a murder house and discovers a box of Super 8 home movies hiding an ancient, terrifying entity.',['Genuinely terrifying mystery','Insidious-grade chills'],['#141312','#D64A32','frames'],0,[8,10,7,2,1,5]],
  ['talk-to-me','Talk to Me',2022,'movie','western',95,'1h 35m','Danny & Michael Philippou',['Horror','Thriller'],['horror'],'7.1','EN','Teens discover how to conjure spirits using an embalmed hand—until a viral party dare goes way too far and opens the wrong door.',['Lean 95-min adrenaline','Fresh, brutal scares'],['#171419','#D95642','split'],0,[9,10,6,3,3,6]],
  ['haunting-hill-house','The Haunting of Hill House',2018,'series','western',55,'10 episodes (complete)','Mike Flanagan',['Horror','Drama','Mystery'],['horror','deep','mindbend'],'8.5','EN','Five grown siblings haunted by memories of the infamous mansion they fled as children are forced back together by a new tragedy.',['Scary + deeply emotional','Hidden ghosts everywhere'],['#14171A','#8FA3B0','arch'],0,[8,9,8,8,2,7]],

  // ==================== EPIC ACTION, SCI-FI & FUN ADVENTURE (AVENGERS / HARRY POTTER / JUMANJI) ====================
  ['dark-knight','The Dark Knight',2008,'movie','western',152,'2h 32m','Christopher Nolan',['Action','Crime','Thriller'],['hype','crime'],'9.0','EN','Batman, Jim Gordon, and Harvey Dent push Gotham’s mob to the brink—until an anarchic mastermind called the Joker turns the city into chaos.',['Greatest comic crime thriller','Relentless from frame 1'],['#13151A','#7F9BB8','beam'],1,[9,9,7,4,3,10]],
  ['edge-of-tomorrow','Edge of Tomorrow',2014,'movie','western',113,'1h 53m','Doug Liman',['Action','Sci-Fi'],['hype','mindbend','fun'],'7.9','EN','A slick military officer gets dropped onto a losing alien beach—and relives the same lethal day every time he dies, leveling up like a video game.',['Live-action Solo Leveling feel','Brisk, smart & fun'],['#17191C','#D67B39','ring'],0,[10,7,7,5,7,9]],
  ['dune-part-two','Dune: Part Two',2024,'movie','western',166,'2h 46m','Denis Villeneuve',['Sci-Fi','Action','Adventure'],['hype','deep'],'8.5','EN','Paul Atreides unites with the desert Fremen for a mythic uprising against the Empire—while confronting the dark cost of his vengeance.',['Game of Thrones in space','Jaw-dropping scale'],['#21160F','#DF7F32','horizon'],0,[8,8,7,4,2,10]],
  ['shogun','Shōgun',2024,'series','intl',60,'10 episodes · 60m eps','Kondo & Marks',['Drama','Action','History'],['hype','crime','mindbend'],'8.6','JA','In 1600 feudal Japan, a shipwrecked navigator becomes a pawn in a brilliant warlord’s high-stakes political chess match.',['Peak Game of Thrones intrigue','Breathtaking craft'],['#171718','#C8563A','blades'],0,[7,8,9,4,2,10]],
  ['squid-game','Squid Game',2021,'series','intl',55,'2 seasons · 55m eps','Hwang Dong-hyuk',['Thriller','Action','Drama'],['crime','hype'],'8.0','KO','Cash-strapped players compete in lethal childhood games for an astronomical fortune—forcing ruthless alliances and shocking betrayals.',['Instant episode-1 hook','High-wire suspense'],['#1E1316','#E04B62','prism'],0,[9,10,6,4,2,8]],
  ['dnd-honor','Dungeons & Dragons: Honor Among Thieves',2023,'movie','western',134,'2h 14m','Daley & Goldstein',['Adventure','Fantasy','Comedy'],['fun','hype'],'7.2','EN','A charming bard and a ragtag crew of thieves pull off a magical heist that accidentally unleashes the wrong relic—and have to fix it fast.',['Jumanji + Harry Potter fun','Zero boredom'],['#1E1612','#DF8A38','burst'],0,[9,5,4,8,9,9]],
  ['ready-player-one','Ready Player One',2018,'movie','western',140,'2h 20m','Steven Spielberg',['Sci-Fi','Action','Adventure'],['fun','hype'],'7.4','EN','In 2045, a teenager races rival players and a ruthless corporation through a massive VR universe to solve three pop-culture riddles for total control.',['Jumanji + Solo Leveling vibe','Pure kinetic fun'],['#141A24','#E07A3A','grid'],0,[9,6,6,7,7,10]],
  ['spider-verse','Spider-Man: Into the Spider-Verse',2018,'movie','western',117,'1h 57m','Persichetti, Ramsey & Rothman',['Animation','Action','Adventure'],['hype','fun'],'8.4','EN','Brooklyn teen Miles Morales teams up with five Spider-heroes from colliding dimensions to stop a collider from tearing reality apart.',['Avengers energy + elite art','Huge heart & hype'],['#1B1316','#E54B3C','prism'],0,[9,6,6,9,8,10]],
  ['arcane','Arcane',2021,'series','western',42,'2 seasons (complete)','Linke & Yee',['Animation','Action','Drama'],['hype','deep'],'9.0','EN','Zero game knowledge needed: two orphaned sisters land on opposite sides of a shimmering steampunk city tearing itself apart.',['Demon Slayer-tier visuals','Gut-punch story'],['#151921','#DF6D3D','prism'],0,[9,9,7,6,3,10]],
  ['mad-max','Mad Max: Fury Road',2015,'movie','western',120,'2h 00m','George Miller',['Action','Sci-Fi'],['hype'],'8.1','EN','A rebel war-rig driver and a haunted drifter bolt across a scorching wasteland in a two-hour operatic chase powered by practical stunts.',['Zero slow minutes','Pure kinetic adrenaline'],['#24140D','#E8652B','burst'],0,[10,9,4,4,3,10]],
  ['game-night','Game Night',2018,'movie','western',100,'1h 40m','Daley & Goldstein',['Comedy','Mystery','Action'],['fun','mindbend'],'6.9','EN','A hyper-competitive couple’s weekly game night turns into a real kidnapping mystery—except nobody realizes the danger is real.',['100 mins of pure laughs','Clever twisty caper'],['#191513','#DF5D38','grid'],0,[9,5,6,7,9,5]],
  ['the-bear','The Bear',2022,'series','western',32,'3 seasons · 30m eps','Christopher Storer',['Drama','Comedy'],['deep','hype'],'8.6','EN','A world-class chef returns to Chicago to run his late brother’s chaotic sandwich shop alongside a fiercely proud crew.',['High-voltage 30m episodes','Raw heart & momentum'],['#191714','#D8633A','blades'],0,[9,8,6,7,6,4]],
  ['fallout','Fallout',2024,'series','western',55,'8 episodes · 55m eps','Robertson-Dworet & Wagner',['Sci-Fi','Action','Dark Comedy'],['hype','fun'],'8.3','EN','An upbeat bunker dweller ventures onto a retro-futuristic wasteland and collides with a sarcastic undead bounty hunter.',['Wickedly fun apocalypse','Breezy 8-ep binge'],['#171C22','#E0AA3A','sun'],0,[9,7,6,5,8,9]],
  ['interstellar','Interstellar',2014,'movie','western',169,'2h 49m','Christopher Nolan',['Sci-Fi','Drama','Adventure'],['deep','mindbend','hype'],'8.7','EN','With Earth dying, a former pilot leaves his daughter behind to journey through a wormhole in search of a new home for humanity.',['Epic scale + big cry','Mind-bending time payoff'],['#12161E','#D99F4A','ring'],0,[8,8,9,9,2,10]],
  ['kaithi','Kaithi',2019,'movie','indian',145,'2h 25m','Lokesh Kanagaraj',['Action','Crime','Thriller'],['hype','crime'],'8.4','TA','Fresh out of prison and trying to meet his daughter for the first time, an ex-con drives a truck full of poisoned cops through an army of cartel killers in one single night.',['One-night non-stop siege','Zero songs, pure adrenaline'],['#191512','#E06A32','beam'],0,[10,9,5,7,2,9]],
  ['talaash','Talaash',2012,'movie','indian',140,'2h 20m','Reema Kagti',['Crime','Mystery','Thriller'],['crime','mindbend','horror'],'7.2','HI','A grieving Mumbai inspector investigates a movie star’s mysterious car crash—leading him down a haunting trail of secrets and an eerie twist.',['Crime mystery + supernatural twist','Gripping Aamir Khan'],['#14181F','#8BA6BD','waves'],0,[8,8,9,6,2,5]],

  // ==================== INDIAN FUN & CROWD-PLEASERS (MOVIE / INDIAN / FUN) ====================
  ['3-idiots','3 Idiots',2009,'movie','indian',170,'2h 50m','Rajkumar Hirani',['Comedy','Drama'],['fun','deep'],'8.4','HI','Two friends race across India hunting for their vanished college roommate—the mischievous genius who turned their cutthroat engineering campus upside down.',['All-time crowd-pleaser','Big laughs & huge heart'],['#181A14','#E0A838','sun'],0,[8,5,6,10,9,6]],
  ['stree','Stree',2018,'movie','indian',128,'2h 08m','Amar Kaushik',['Horror','Comedy','Mystery'],['fun','horror','mindbend'],'7.5','HI','During a four-day festival in a small town, a female spirit abducts men who wander out alone at night—until a lovestruck tailor suspects his mysterious new crush.',['Wicked horror-comedy twist','Sharp, breezy 2-hour ride'],['#1D1316','#DF543E','arch'],0,[9,7,7,6,9,6]],
  ['znmd','Zindagi Na Milegi Dobara',2011,'movie','indian',155,'2h 35m','Zoya Akhtar',['Adventure','Comedy','Drama'],['fun','deep'],'8.2','HI','Three childhood friends reunite for a bachelor road trip across Spain where each picks one extreme sport—forcing buried resentments and fears into the open.',['Electric road-trip escape','Feel-good emotional payoff'],['#1B1612','#E28638','horizon'],0,[8,5,5,9,8,8]],
  ['delhi-belly','Delhi Belly',2011,'movie','indian',103,'1h 43m','Abhinay Deo',['Dark Comedy','Crime','Action'],['fun','crime'],'7.6','HI','Three broke Delhi roommates accidentally swap a stool sample with a mob boss’s smuggled diamonds—sparking a frantic, filthy, non-stop chase across the city.',['Chaotic 103-min dark caper','Zero-filter cult comedy'],['#1F1510','#E59A2E','burst'],0,[10,7,6,4,10,6]],

  // ==================== INDIAN PRESTIGE & HEARTFELT SERIES (SERIES / INDIAN / DEEP) ====================
  ['scam-1992','Scam 1992: The Harshad Mehta Story',2020,'series','indian',54,'10 episodes (complete)','Hansal Mehta',['Crime','Drama','Biography'],['crime','deep','mindbend'],'9.3','HI','From a cramped chawl to ruling Dalal Street, ambitious stockbroker Harshad Mehta exploits India’s banking loopholes—triggering a seismic financial thriller.',['Electrifying rise-and-fall','Iconic score & taut drama'],['#151A16','#DFAC38','stairs'],0,[9,8,9,6,5,7]],
  ['panchayat','Panchayat',2020,'series','indian',35,'3 seasons · 35m eps','Deepak Kumar Mishra',['Comedy','Drama'],['deep','fun'],'9.0','HI','Stuck taking a lowly village secretary job in rural Uttar Pradesh, an engineering graduate gets pulled into eccentric local politics and unexpectedly deep bonds.',['Bingeable 35m gems','Warmest wit & real soul'],['#171D15','#D4A646','horizon'],0,[8,5,5,10,9,4]],
  ['rocket-boys','Rocket Boys',2022,'series','indian',48,'2 seasons · 48m eps','Abhay Pannu',['Drama','History'],['deep','hype'],'8.9','HI','Visionary physicists Homi Bhabha and Vikram Sarabhai battle global espionage, politics, and impossible odds to launch newly independent India into the space and nuclear age.',['Goosebump true-story triumph','Gripping historical momentum'],['#131722','#E08E3B','beam'],0,[8,8,7,9,4,8]],

  // ==================== INTERNATIONAL HORROR, THRILLERS & FUN SERIES ====================
  ['train-to-busan','Train to Busan',2016,'movie','intl',118,'1h 58m','Yeon Sang-ho',['Horror','Action','Thriller'],['horror','hype','deep'],'7.6','KO','When a sudden zombie outbreak traps passengers aboard a speeding bullet train to Busan, a workaholic dad must fight car-by-car to keep his young daughter alive.',['Relentless bullet-train siege','Gut-wrenching emotional climax'],['#15181E','#D9483B','bars'],0,[10,10,5,9,2,9]],
  ['the-wailing','The Wailing',2016,'movie','intl',156,'2h 36m','Na Hong-jin',['Horror','Mystery','Thriller'],['horror','mindbend'],'7.4','KO','When a gruesome plague drives a rainy Korean mountain village mad after a stranger arrives, a small-town cop races against an ancient evil to save his daughter.',['Unforgettable folklore dread','Mind-bending final act'],['#141916','#C8523A','maze'],0,[7,10,10,5,3,7]],
  ['kingdom-kr','Kingdom',2019,'series','intl',50,'2 seasons · 50m eps','Kim Eun-hee',['Horror','Action','History'],['horror','hype','crime'],'8.3','KO','In feudal Korea, a framed Crown Prince investigates his father’s secret illness—uncovering a lethal palace conspiracy and a plague that raises the dead.',['Feudal intrigue meets undead siege','Zero-filler 6-ep seasons'],['#17151A','#D94C38','blades'],0,[9,10,8,5,2,10]],
  ['alice-in-borderland','Alice in Borderland',2020,'series','intl',48,'2 seasons · 48m eps','Shinsuke Sato',['Sci-Fi','Thriller','Horror'],['mindbend','hype','horror'],'7.7','JA','An obsessive gamer and his friends wake up in an empty Tokyo—forced to outsmart lethal playing-card death games to earn another day alive.',['Twisted death-game puzzles','Breathless anime-grade action'],['#14151E','#E04654','grid'],0,[10,10,9,5,3,9]],
  ['vincenzo','Vincenzo',2021,'series','intl',80,'20 episodes (complete)','Kim Hee-won',['Crime','Dark Comedy','Action'],['fun','crime','hype'],'8.4','KO','A ruthless Korean-Italian Mafia consigliere returns to Seoul for hidden gold—and teams up with a razor-tongued lawyer to burn down a corrupt conglomerate Mafia-style.',['Stylish antihero swagger','Wicked dark comedy + revenge'],['#191414','#D9A03C','split'],0,[8,8,8,6,9,8]],
  ['lupin','Lupin',2021,'series','intl',45,'3 parts · 45m eps','George Kay',['Crime','Mystery','Adventure'],['fun','mindbend','crime'],'7.5','FR','Inspired by gentleman thief Arsène Lupin, a master of disguise hits the Louvre to avenge his framed father—staying three clever moves ahead of Paris police.',['Slick master-of-disguise heists','Clever gentleman-thief twists'],['#141821','#D4A042','prism'],0,[9,6,9,7,8,7]],
  ['moving-kr','Moving',2023,'series','intl',50,'20 episodes (complete)','Park In-je',['Action','Sci-Fi','Drama'],['deep','hype','fun'],'8.4','KO','Three Seoul teenagers hiding inherited superpowers try to live normal lives—until a ruthless foreign assassin starts hunting their ex-black-ops parents one by one.',['Big-budget superhero soul','Jaw-dropping action + heart'],['#131922','#E0953A','ring'],0,[8,8,7,10,7,10]]
];

// Authentic public consensus & audience reception highlights
const PUBLIC_BUZZ = {
  'maharaja': {
    audiencePct: 95,
    overview: 'After a quiet barber named Maharaja reports a bizarre burglary of his prized metal dustbin to skeptical police, timelines weave backward and forward to reveal a calculated, heartbreaking vendetta.',
    publicSays: 'Audiences call it one of the cleverest non-linear screenplays in recent Indian cinema—widely praised for Vijay Sethupathi’s restrained performance and a gut-punch final twist that makes every earlier clue click.'
  },
  'drishyam': {
    audiencePct: 93,
    overview: 'When an unexpected incident threatens to destroy his family, a sharp fourth-grade-educated father uses everything he has learned from thriller movies to outsmart an entire police force.',
    publicSays: 'Universally loved for its airtight cat-and-mouse plotting. Viewers say the first 25 minutes build family stakes before locking into one of the most satisfying, rewatchable endings ever written.'
  },
  'ratsasan': {
    audiencePct: 92,
    overview: 'Armed with obsessive research he once compiled for a crime script, a rookie sub-inspector tracks a chilling serial killer targeting schoolgirls while his superiors dismiss his theories.',
    publicSays: 'Frequently ranked among India’s scariest, tightest investigative thrillers. Public reviews rave about the haunting background score and relentless nail-biting tension from start to finish.'
  },
  'vikram-vedha': {
    audiencePct: 94,
    overview: 'Inspired by the folklore of Vikram and Betaal, an uncompromising encounter cop is forced to rethink every assumption when a notorious gangster surrenders and tells him three morally grey stories.',
    publicSays: 'Huge crowd favorite—praised for combining mass-action charisma with razor-sharp writing. Viewers love Madhavan and Vijay Sethupathi’s electric face-offs and the constant perspective flips.'
  },
  'kahaani': {
    audiencePct: 90,
    overview: 'Seven months pregnant and alone in the bustling streets of Kolkata, Vidya Bagchi hunts for her vanished husband while intelligence officers and local cops insist the man never existed.',
    publicSays: 'Celebrated as a modern Bollywood thriller benchmark. Audiences praise Vidya Balan’s commanding lead turn, the immersive Kolkata atmosphere, and a jaw-dropping finale nobody sees coming.'
  },
  'tumbbad': {
    audiencePct: 91,
    overview: 'Across early 20th-century Maharashtra, Vinayak discovers his decaying ancestral mansion hides a mythological secret—a cursed demon-god guarding endless gold coins that exact a terrifying price.',
    publicSays: 'Cult masterpiece status among horror fans. Viewers marvel at its moody rain-drenched cinematography, folklore originality, and brisk 104-minute pacing with zero filler.'
  },
  'paatal-lok': {
    audiencePct: 91,
    overview: 'Assigned the high-profile attempted assassination of a famous news anchor, cynical inspector Hathiram Chaudhary digs into the four suspects’ pasts—uncovering a web reaching the highest levels of power.',
    publicSays: 'Widely considered top-tier Indian crime television alongside Sacred Games. Public consensus praises Jaideep Ahlawat’s unforgettable performance and gritty, uncompromising storytelling.'
  },
  'asur': {
    audiencePct: 92,
    overview: 'Set against the backdrop of Varanasi and modern forensic labs, a brilliant profiler is pulled back into the CBI to hunt a ruthless serial killer who leaves behind mythological clues.',
    publicSays: 'Loved by thriller binge-watchers for blending Dexter/Mindhunter forensics with Indian mythology. Viewers note it’s super addictive and hooks you within the first episode.'
  },
  'farzi': {
    audiencePct: 90,
    overview: 'When his grandfather’s struggling printing press faces bankruptcy, a gifted young artist designs a near-perfect counterfeit note—attracting both a deadly crime lord and an obsessed task-force officer.',
    publicSays: 'Frequently compared to an Indian Breaking Bad with sharper humor. Audiences love the slick pacing, Shahid Kapoor and Vijay Sethupathi’s rivalry, and zero boring episodes.'
  },
  'sacred-games': {
    audiencePct: 89,
    overview: 'An honest Mumbai cop receives a cryptic late-night phone call from fugitive gangster Ganesh Gaitonde, who warns him he has 25 days to save the city before a massive catastrophe hits.',
    publicSays: 'Hailed as the show that transformed Indian streaming dramas. Viewers rave about Nawazuddin Siddiqui’s iconic gangster narration, raw underworld grit, and gripping mystery.'
  },
  'special-ops': {
    audiencePct: 91,
    overview: 'Convinced a single shadowy mastermind orchestrated 19 years of attacks on India, veteran RAW officer Himmat Singh runs five deep-cover agents across the globe to finally expose him.',
    publicSays: 'A big favorite for spy-thriller fans—audiences praise Kay Kay Menon’s commanding performance, slick globe-trotting espionage, and fast, bingeable eight-episode pacing.'
  },
  'the-family-man': {
    audiencePct: 94,
    overview: 'Srikant Tiwari works secretly for an elite intelligence cell stopping national threats—while trying to explain late nights, missed anniversaries, and a modest salary to his clueless family.',
    publicSays: 'One of the highest-rated Indian series ever. Viewers love how effortlessly it jumps between laugh-out-loud domestic comedy and nail-biting tactical action.'
  },
  'the-prestige': {
    audiencePct: 92,
    overview: 'In turn-of-the-century London, two former magician partners turn into bitter enemies after a stage trick ends in tragedy—pushing both men into dangerous obsession to invent the ultimate teleportation illusion.',
    publicSays: 'Widely regarded as Christopher Nolan’s tightest puzzle-box movie. Audiences say it’s even better on a second watch once you see how cleanly the final twist was hidden in plain sight.'
  },
  'se7en': {
    audiencePct: 95,
    overview: 'During seven rain-soaked days in a grim unnamed city, a weary veteran detective and his hot-headed partner hunt a methodical killer staging horrific crimes around the seven deadly sins.',
    publicSays: 'The gold standard of dark serial-killer mysteries. Public reviews praise the suffocating dread, Brad Pitt & Morgan Freeman’s chemistry, and one of cinema’s most haunting endings.'
  },
  'gone-girl': {
    audiencePct: 87,
    overview: 'When Amy Dunne disappears on her fifth wedding anniversary, every piece of forensic evidence points straight at her husband Nick—until a shocking shift reframes the entire marriage.',
    publicSays: 'Audiences love how wickedly entertaining and unpredictable it is. Rosamund Pike’s chilling performance and David Fincher’s razor-sharp pacing keep viewers hooked for all 149 minutes.'
  },
  'inception': {
    audiencePct: 91,
    overview: 'Dom Cobb extracts corporate secrets by entering targets’ dreams, but to return home to his kids he must attempt the impossible reverse: planting a new idea deep inside a billionaire heir’s mind.',
    publicSays: 'A universal blockbuster favorite. Viewers rave about the rotating hallway fight, Hans Zimmer’s iconic score, and the endlessly debated spinning-top ending.'
  },
  'parasite': {
    audiencePct: 93,
    overview: 'Living in a cramped semi-basement, the clever Kim family schemes their way into working for the ultra-wealthy Park household—until a rainy-night discovery turns dark comedy into breathless thriller.',
    publicSays: 'Unanimously acclaimed as a modern masterpiece. Audiences love that you genuinely cannot predict where the second half goes, and every single scene pays off.'
  },
  'invisible-guest': {
    audiencePct: 90,
    overview: 'Accused of murdering his lover in a locked hotel room, a tech executive has just three hours with Spain’s sharpest defense attorney to reconstruct what really happened—before a surprise witness arrives.',
    publicSays: 'A massive word-of-mouth cult hit among mystery fans. Viewers say it plays like a live chess match packed with rapid-fire plot reversals right up to the final 60 seconds.'
  },
  'mindhunter': {
    audiencePct: 95,
    overview: 'Before the term "serial killer" even existed, two FBI agents and a psychologist travel prison-to-prison interviewing infamous murderers like Ed Kemper to decode their minds and solve active cases.',
    publicSays: 'Considered essential viewing for Dahmer and true-crime fans. Audiences praise the eerily accurate killer portrayals and hypnotic, deeply unsettling dialogue.'
  },
  'black-bird': {
    audiencePct: 95,
    overview: 'Facing ten years in prison, charming ex-football star Jimmy Keene gets an extraordinary offer from the FBI: transfer into a maximum-security asylum and coax a confession out of suspected serial killer Larry Hall.',
    publicSays: 'Praised as one of the tensest true-crime miniseries of the decade. Viewers rave about Paul Walter Hauser’s chilling, Emmy-winning turn and the taut 6-episode pacing.'
  },
  'true-detective-s1': {
    audiencePct: 96,
    overview: 'Told across two timelines in eerie Louisiana, philosophical loner Rust Cohle and family man Marty Hart revisit a disturbing occult murder case they thought they closed seventeen years earlier.',
    publicSays: 'Regularly voted the greatest single season of television ever made. Public consensus highlights McConaughey and Harrelson’s electric dynamic and the legendary 6-minute single-take raid.'
  },
  'dark': {
    audiencePct: 94,
    overview: 'After a boy vanishes near a German nuclear plant, four intertwined families uncover a hidden cave passage spanning generations—turning a missing-persons mystery into an astonishing time-loop labyrinth.',
    publicSays: 'Worshipped by mind-bender fans because the creators planned every twist across all 3 seasons from day one, delivering an emotional, airtight ending with zero loose ends.'
  },
  'incendies': {
    audiencePct: 92,
    overview: 'Following their mother’s will, Canadian twins travel to the war-scarred Middle East to find a father they thought was dead and a brother they never knew existed.',
    publicSays: 'Viewers warn it will leave you staring at the credits in stunned silence. Praised for pairing The Pianist-level emotional gravity with one of the most devastating plot reveals in film history.'
  },
  'whiplash': {
    audiencePct: 94,
    overview: 'Determined to become a jazz legend, 19-year-old drummer Andrew joins an elite conservatory band led by Terence Fletcher—a terrifying mentor who pushes students past every physical and mental limit.',
    publicSays: 'Audiences call it "more intense than most action movies." J.K. Simmons’s ferocious performance and the electric final 10-minute drum duel make it an instant favorite.'
  },
  'chernobyl': {
    audiencePct: 97,
    overview: 'Over five gripping hours, scientists Valery Legasov and Ulana Khomyuk race to stop an invisible nuclear catastrophe after the 1986 Chernobyl explosion while battling a regime obsessed with covering it up.',
    publicSays: 'One of the highest-rated miniseries in history. Public reviews call it as terrifying as any horror film, deeply moving, and impossible to stop watching once you start.'
  },
  'attack-on-titan': {
    audiencePct: 96,
    overview: 'After colossal man-eating Titans smash through the walls protecting humanity, Eren Yeager vows revenge—slowly uncovering a staggering geopolitical conspiracy that flips the entire story upside down.',
    publicSays: 'Widely hailed as the "Game of Thrones of anime." Viewers rave about the relentless mystery reveals, jaw-dropping battles, and foreshadowing that pays off years later.'
  },
  'death-note': {
    audiencePct: 96,
    overview: 'Genius student Light Yagami discovers a supernatural notebook that kills anyone whose name is written inside it—launching a global vigilante crusade hunted by the eccentric master detective known only as L.',
    publicSays: 'The ultimate gateway anime for Sherlock and Breaking Bad fans. Audiences love the breathless intellectual cat-and-mouse mind games and non-stop episode cliffhangers.'
  },
  'jujutsu-kaisen': {
    audiencePct: 94,
    overview: 'To save his friends from cursed spirits, athletic teen Yuji Itadori swallows a legendary demon’s finger—becoming its vessel and training alongside charismatic powerhouse Satoru Gojo.',
    publicSays: 'Huge hit with Demon Slayer and Bleach fans. Public consensus raves about MAPPA’s jaw-dropping fight choreography, cool power system, and zero-filler intensity (especially Season 2).'
  },
  'hunter-x-hunter': {
    audiencePct: 96,
    overview: 'Young Gon sets out to become a licensed Hunter to find his legendary father, teaming up with assassin-heir Killua through brutal exams, underworld mafia wars, and an unforgettable dark evolutionary threat.',
    publicSays: 'Considered a crown jewel by Naruto and Bleach fans. Viewers praise Nen as anime’s smartest combat system and call the Phantom Troupe and Chimera Ant arcs all-time masterpieces.'
  },
  'code-geass': {
    audiencePct: 95,
    overview: 'Exiled prince Lelouch gains a mysterious eye power that forces anyone to obey a single command—and uses it as masked rebel strategist Zero to topple a ruthless empire from within.',
    publicSays: 'Famous among anime fans for blending Death Note-style genius scheming with high-stakes rebellion—and widely credited with having one of the greatest, most satisfying endings ever.'
  },
  'the-conjuring': {
    audiencePct: 83,
    overview: 'Based on a real 1971 case file, paranormal investigators Ed and Lorraine Warren are summoned to a remote Rhode Island farmhouse where a dark entity is tormenting a mother and her five daughters.',
    publicSays: 'Directed by Insidious creator James Wan and hailed as one of the best modern haunted-house films. Viewers love its old-school craft, escalating dread, and genuinely earned scares.'
  },
  'haunting-hill-house': {
    audiencePct: 91,
    overview: 'Cutting seamlessly between a haunted summer in 1992 and the fractured lives of five adult siblings today, the Crain family is drawn back to the cursed mansion that broke them.',
    publicSays: 'Praised by horror and drama fans alike—audiences rave about the hidden background ghosts, astonishing single-take Episode 6, and a deeply moving family payoff.'
  },
  'dark-knight': {
    audiencePct: 94,
    overview: 'Just as Batman, Lieutenant Gordon, and DA Harvey Dent begin dismantling Gotham’s crime syndicate, a chaotic criminal genius called the Joker forces the city into impossible moral tests.',
    publicSays: 'Universally ranked among the greatest action-crime films ever made. Heath Ledger’s electric Joker and the relentless heist-to-climax pace leave zero dull moments.'
  },
  'kaithi': {
    audiencePct: 92,
    overview: 'Released after ten years in prison and desperate to meet his daughter at sunrise, ex-convict Dilli is forced to drive a lorry of poisoned cops through an army of ruthless drug-cartel killers across one dark night.',
    publicSays: 'Massive fan favorite in Tamil action cinema—audiences love that it has zero songs, zero romance filler, and 145 minutes of pure Mad Max-level nocturnal survival adrenaline.'
  },
  '12th-fail': {
    audiencePct: 97,
    overview: 'Following the real journey of Manoj Kumar Sharma from a tiny Chambal village to Delhi’s grueling UPSC coaching streets, he refuses to quit despite poverty, rejection, and brutal odds.',
    publicSays: 'One of the highest audience-rated Indian films in years. Viewers say it’s deeply inspiring without feeling cheesy—emotional, fast-paced, and genuinely uplifting by the credits.'
  },
  '3-idiots': {
    audiencePct: 95,
    overview: 'Ten years after graduation, Farhan and Raju follow a sudden lead to find Rancho—the brilliant, rule-breaking friend who taught them to chase excellence instead of grades.',
    publicSays: 'One of the most universally beloved Indian films ever made. Viewers praise how seamlessly it swings from iconic slapstick comedy to genuinely tear-jerking emotional payoff without ever dragging.'
  },
  'stree': {
    audiencePct: 89,
    overview: 'Every year during Chanderi’s annual festival, men paint protective warnings on their walls to ward off a legendary ghost—forcing a quirky local tailor and his friends to crack the curse.',
    publicSays: 'Widely celebrated for reinventing Indian horror-comedy. Audiences rave about Rajkummar Rao and Pankaj Tripathi’s deadpan comic timing, real jump scares, and a clever folklore twist.'
  },
  'znmd': {
    audiencePct: 94,
    overview: 'Before Kabir’s wedding, three old friends embark on a pact-bound road trip across Spain, confronting scuba depths, skydiving, and long-buried truths that reshape their lives.',
    publicSays: 'The gold standard of modern Hindi friendship dramas. Viewers love its effortless humor, gorgeous Spanish cinematography, and how genuinely inspiring and rewatchable the journey feels.'
  },
  'delhi-belly': {
    audiencePct: 88,
    overview: 'When a routine courier favor goes catastrophically wrong, three slacker roommates find themselves hunted by a ruthless gangster and his bumbling henchmen over a missing bag of diamonds.',
    publicSays: 'Hailed as a fearless cult classic in Indian cinema—frequently likened to Guy Ritchie’s crime capers. Audiences love its tight 103-minute runtime, outrageous gags, and killer soundtrack.'
  },
  'scam-1992': {
    audiencePct: 97,
    overview: 'Set in 1980s and 1990s Mumbai, this gripping true story tracks charismatic stockbroker Harshad Mehta’s meteoric rise from jobber to "Big Bull" and the fearless journalist who exposed his ₹5,000-crore scam.',
    publicSays: 'Widely ranked as India’s greatest streaming series alongside Breaking Bad in sheer rise-and-fall tension. Audiences rave about Pratik Gandhi’s magnetic lead performance, razor-sharp dialogues, and the unforgettable theme music.'
  },
  'panchayat': {
    audiencePct: 96,
    overview: 'Reluctantly posted to the remote village of Phulera while studying to escape it, young Abhishek navigates quirky colleagues, village rivalries, and small crises that quietly win him over.',
    publicSays: 'Adored across generations as India’s ultimate comfort drama with genuine stakes. Viewers praise Jitendra Kumar, Raghubir Yadav, and Neena Gupta’s effortless ensemble chemistry and deeply moving season finales.'
  },
  'rocket-boys': {
    audiencePct: 95,
    overview: 'Spanning three pivotal decades after independence, two brilliant friends—flamboyant nuclear pioneer Homi Bhabha and idealistic space visionary Vikram Sarabhai—build India’s scientific future against relentless global pressure.',
    publicSays: 'Acclaimed as prestige Indian television at its peak. Audiences rave about Jim Sarbh and Ishwak Singh’s electric chemistry, thriller-grade Cold War tension, and deeply stirring moments of national pride.'
  },
  'train-to-busan': {
    audiencePct: 93,
    overview: 'A cynical fund manager boards the KTX express from Seoul to Busan with his estranged daughter just as a viral outbreak erupts—turning every train car into a desperate fight for survival.',
    publicSays: 'Universally hailed as one of the greatest modern zombie thrillers ever made. Viewers rave about the blistering action choreography, Ma Dong-seok’s scene-stealing heroics, and an ending that leaves hardened horror fans in tears.'
  },
  'the-wailing': {
    audiencePct: 89,
    overview: 'As violent, unexplained murders sweep a misty mountain village, panicked policeman Jong-goo follows clues linking a reclusive outsider, a ghostly woman, and a charismatic shaman in a battle for his daughter’s soul.',
    publicSays: 'Revered by horror and thriller fans as a towering masterpiece of dread. Audiences praise its unforgettable dual-ritual sequence and a jaw-dropping final 20 minutes that sparks endless debate.'
  },
  'kingdom-kr': {
    audiencePct: 94,
    overview: 'Branded a traitor by a ruthless court clan keeping the ailing King locked away, Crown Prince Lee Chang flees south and discovers a horrific famine-fueled resurrection plague sweeping the kingdom.',
    publicSays: 'Frequently described as "Game of Thrones meets Train to Busan." Viewers rave about its lavish historical cinematography, tight 6-episode seasons with zero filler, and heart-stopping undead set pieces.'
  },
  'alice-in-borderland': {
    audiencePct: 91,
    overview: 'After a strange burst of fireworks empties all of Tokyo in an instant, quick-thinking gamer Arisu teams up with fearless climber Usagi to crack sadistic logic, physical, and psychological games.',
    publicSays: 'A massive favorite for Squid Game and anime thriller fans. Audiences praise its wildly inventive death-game rules, ruthless twists, and a surprisingly satisfying Season 2 mystery payoff.'
  },
  'vincenzo': {
    audiencePct: 94,
    overview: 'Returning from Italy to recover a secret vault buried under a rundown Seoul plaza, sleek Mafia lawyer Vincenzo Cassano declares ruthless war on an untouchable pharmaceutical empire.',
    publicSays: 'Wildly popular for blending badass crime swagger with laugh-out-loud dark comedy. Viewers rave about Song Joong-ki’s ice-cold antihero charm, unhinged villains, and deeply cathartic revenge payoffs.'
  },
  'lupin': {
    audiencePct: 88,
    overview: 'Twenty-five years after his immigrant father was framed for stealing a priceless diamond necklace, charismatic con artist Assane Diop uses classic Arsène Lupin tricks to expose a billionaire family.',
    publicSays: 'A breezy global crowd-pleaser for Sherlock and Money Heist fans. Viewers love Omar Sy’s effortless charm, clever reveal flashbacks, and fast-paced Parisian heist energy with zero sluggish episodes.'
  },
  'moving-kr': {
    audiencePct: 95,
    overview: 'Quietly raising kids who can fly, heal, or move at superhuman speed, former covert agents are forced out of hiding when a mysterious killer begins targeting retired operatives across South Korea.',
    publicSays: 'Celebrated as one of the finest superhero series ever made. Audiences adore how it pairs blockbuster-grade fights with deeply moving romance and parent-child devotion that earns every tear.'
  }
};

function defaultAudiencePct(rating) {
  return Math.min(97, Math.max(76, Math.round(parseFloat(rating) * 10.6)));
}

function defaultPublicSays(title, genres, whyTags, dna) {
  const vibe =
    dna.complexity >= 8 ? 'razor-sharp twists and satisfying payoff'
    : dna.pace >= 9 ? 'relentless momentum with zero boring stretches'
    : dna.warmth >= 8 ? 'deep emotional weight that lingers after the credits'
    : 'gripping storytelling and strong performances';
  const extra = whyTags && whyTags[1] ? ` Viewers especially call out its ${whyTags[1].toLowerCase()}.` : '';
  return `Strongly rated by audiences for its ${vibe}.${extra}`;
}

window.CUED_CATALOG = RAW_CATALOG.map(([
  id, title, year, type, origin, runtime, runtimeLabel, creator, genres, moods, rating, language, hook, whyTags, poster, anchor, dna
]) => {
  const buzz = PUBLIC_BUZZ[id] || {};
  const dnaObj = {
    pace: dna[0],
    intensity: dna[1],
    complexity: dna[2],
    warmth: dna[3],
    humor: dna[4],
    spectacle: dna[5]
  };
  return {
    id,
    title,
    year,
    type,
    origin,
    runtime,
    runtimeLabel,
    creator,
    genres,
    moods,
    rating,
    audiencePct: buzz.audiencePct || defaultAudiencePct(rating),
    language,
    hook,
    overview: buzz.overview || hook,
    publicSays: buzz.publicSays || defaultPublicSays(title, genres, whyTags, dnaObj),
    whyTags,
    poster: { bg: poster[0], accent: poster[1], ink: '#F5F0E8', motif: poster[2] },
    anchor: !!anchor,
    dna: dnaObj
  };
});

