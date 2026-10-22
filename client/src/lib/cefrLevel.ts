import { WordLevel } from '../types';
import { IRREGULAR_VERBS } from '../data/irregularVerbs';

/**
 * Estimador de nivel MCER (CEFR) para palabras y expresiones en inglés.
 *
 * Estrategia (de más fiable a menos fiable):
 *  1. Listas de vocabulario frecuente por nivel (inspiradas en English Vocabulary Profile / Oxford 3000-5000).
 *  2. Verbos irregulares del propio proyecto (cada uno tiene su nivel).
 *  3. Lematización básica (plurales, -ed, -ing, -ly, -er/-est, -ness...) y re-consulta de las listas.
 *  4. Heurística morfológica (nº de sílabas, sufijos académicos/latinos) para palabras desconocidas.
 *  5. Para expresiones de varias palabras se toma el nivel de la palabra más difícil.
 */

const A1_WORDS = `
a an the and or but if because so than then there here this that these those
i you he she it we they me him her us them my your his its our their mine yours
what who where when why how which whose
be am is are was were been have has had do does did can could will would shall should must may might
yes no not please thanks thank sorry hello hi goodbye bye ok okay
one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty hundred thousand million
first second third last next
monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
day week month year today tomorrow yesterday morning afternoon evening night time hour minute second weekend
man woman boy girl child children baby person people friend family mother father mum mom dad brother sister son daughter husband wife parent grandmother grandfather aunt uncle cousin
name age birthday
house home flat apartment room kitchen bathroom bedroom garden door window table chair bed sofa floor wall
school class classroom teacher student lesson homework book pen pencil paper desk word page question answer
food water milk tea coffee juice bread butter cheese egg meat chicken fish rice pasta pizza sandwich apple banana orange fruit vegetable potato tomato salad soup cake chocolate sugar salt breakfast lunch dinner
cat dog bird horse cow pig animal
car bus train bike bicycle plane taxi boat road street town city country village shop store market restaurant cafe hotel bank park hospital station airport cinema museum library beach sea river mountain
red blue green yellow black white brown pink purple grey gray orange colour color
big small little large long short tall old new young good bad nice beautiful pretty happy sad hot cold warm cool easy difficult hard fast slow early late great fine favourite favorite right wrong open closed free busy hungry thirsty tired
go come see look watch hear listen speak talk say tell read write learn study teach work play live like love want need know think make take give get put find have eat drink sleep wake walk run swim drive ride sit stand open close start stop finish help ask answer buy sell pay cost meet visit stay leave arrive cook clean wash dance sing draw call phone use try
very really too also only again always often sometimes usually never now soon
in on at to from with without for of about under over near next behind between up down out into
job doctor nurse police waiter office computer phone telephone television tv radio music song film movie game sport football tennis
head face eye eyes ear nose mouth hair hand arm leg foot feet body
shirt dress shoes trousers jeans skirt hat coat jacket clothes
money price ticket
sun rain snow weather wind
cup glass plate bottle bag box key clock watch photo picture letter email
thing place way
together another other something nothing anything everything someone somebody anyone nobody maybe around across along after before until while during above below inside outside away back off home
all some any many much more most less few every each both lot lots little enough same different own
well just still even almost quite already yet ever later
because although however also either neither
`;

const A2_WORDS = `
accident address adult adventure advice afraid agree airline alone already although amazing ambulance angry ankle anywhere appear area arm armchair army arrange art article artist asleep attack attention aunt autumn available average awful
background backpack bake balcony band bandage basketball battery beard beat become begin believe belong belt below bench beside better between bill biology biscuit bit blanket blood blow board boil bone boring born borrow boss both bottom bowl brain branch brave break bridge bright bring broken brush build building burn business butterfly button
cabbage camera camp campsite candle capital captain card care careful carpet carry castle catch cause ceiling celebrate centre center century certain chain chance change channel character cheap check chef chemist chess choice choose church circle clear clever climb cloud cloudy club coach coast collect college comb comedy comfortable common company competition complete concert conversation copy corner correct cough count couple course cover crazy cream create credit crime cross crowd crowded cry culture cupboard curly customer cut cycle
damage danger dangerous dark date dead deal dear decide decision deep degree delicious dentist depend describe desert design dessert detail diary dictionary die diet different dinosaur direction dirty disappear discover dish doll double download downstairs dream drop dry during dust
each ear earn earth east edge education either electric electricity elephant else empty end enemy engine engineer enjoy enough enter entrance environment equipment escape especially even event ever everybody everyone everything everywhere exam examination example excellent except exciting excuse exercise exhibition exit expect expensive experience explain explore extra
factory fail fair fall false famous fan far farm farmer fashion fat fear feel festival fever few field fight fill final finally fire fit fix flag flight float flood flower fly fog foggy follow foreign forest forget fork form forward fresh fridge frightened front frozen full fun funny furniture future
gallery gas gate geography get gift glad glasses glove goal gold golf government grade gram grass ground group grow guess guest guide guitar gym
habit half hall hang happen hate health healthy heart heat heavy height helmet hide high hill hire history hobby hold hole holiday honey hope horrible hospital host however huge human hurry hurt
ice idea ill illness imagine important impossible improve include information injure insect inside instead instrument interest interested interesting internet interview introduce invite island
jam journey juice jump jungle
keep kill kind king kiss knee knife knock
lake lamp land language laptop laugh law lazy lead leaf least leather lecture left lend less let level lie life lift light lightning line lion list litre loud lovely low luck lucky luggage
machine magazine main make manager map mark married match matter meal mean measure medicine medium member menu message metal metre middle mind miss mistake mix modern moment monkey moon mostly motorbike mountain mouse move much mug museum mushroom must
narrow nation national natural nature neck necklace neighbour neighbor nervous nest net never news newspaper noise noisy none normal north notice novel nut
ocean offer officer oil once online opinion opposite order ordinary organise organize outside oven own owner
pack packet pain paint pair palace pan parent part partner party pass passenger passport past path patient pay peace pepper perfect perhaps period pet petrol photograph physics piano pick piece pilot pity planet plant plastic platform pleasant pocket poem point police polite pollution pool poor popular possible post postcard poster pot pound powerful practice practise prefer prepare present president press pretty prince princess prison prize probably problem produce product programme program project promise protect proud public pull pupil purse push puzzle
quality queen quick quiet quite quiz
race railway raise rarely rather reach ready real realise realize reason receive recipe recommend record recycle reduce relax remember rent repair repeat reply report rest result return rich ring rise river rock role roof round rubbish rude rule
safe sail salary sale same sand save scared scary science scientist score screen search season seat secret seem send sense sentence serious serve service several shake shape share sharp sheep shelf shine ship shock shoot shop shout shower shut shy sick side sign silver simple since singer single sink size skate ski skill skin sky slice smell smile smoke snack soap sock soft soldier solve someone somewhere sound south space special spell spend spoon spring square stadium stage stairs star steal step stomach stone storm story straight strange stranger strong subject succeed success suddenly suit suitcase summer supermarket support sure surprise sweet
tail take talent taste team tear technology teenager temperature tent terrible test text theatre theater thick thief thin throat through throw thunder tidy tie tiny toe toilet tool tooth top total touch tour tourist towel tower toy traffic travel tree trip trouble true trust truth turn twice type typical
ugly umbrella uniform universe university unusual upstairs useful usual
valley van view village violin voice volleyball
wait wake wallet war wash waste wave weak wear website wedding weight welcome west wet wheel while whisper whole wide wild win wing winner winter wish wonderful wood wool world worried worry worse worst wrap
yet young
zero zone zoo
`;

const B1_WORDS = `
ability abroad absolutely academic accept access accommodation accompany account accurate achieve achievement act action active activity actor actually add addition admire admit adopt advance advanced advantage advertise advertisement affect afford aged agency agent aim alarm alive allow almost alternative amount amusing ancient announce annoy annual anxious apart apologise apologize application apply appointment appreciate approach appropriate approve argue argument arrest arrival assistant atmosphere attach attempt attend attitude attract attractive audience author automatic avoid aware awake award
balance ban basic basis bear behave behaviour behavior benefit bet beyond bitter blame blind block bomb bond border bother brand breath breathe brief broad budget burst
calculate calm campaign cancel capable career cash category cell challenge champion chapter charge charity chart chat cheat chemical childhood claim classic client climate code colleague combine comfort comment commercial communicate communication community compare comparison compete complain complaint complex complicated concentrate concern conclusion condition conference confidence confident confirm confuse confused connect connection consider consist constant construct contact contain content contest context continue contract contrast contribute control convenient convince cooperate cope cost cottage council court crash create creative crew criminal crisis criticise criticize crop cruel curious current currently custom
daily data deadline debate decade declare decline decorate defend define definite definitely delay deliver delivery demand deny department departure deposit depressed deserve desire despite destination destroy determine develop development device devote diet differ difficulty digital direct directly director disabled disadvantage disagree disappoint disappointed disaster discount discussion disease dislike display distance distant divide document domestic donate doubt drama dramatic due
eager economic economy edition effect effective efficient effort elect election element elsewhere embarrassed emergency emotion emotional employ employee employer employment encourage energy engaged enormous ensure entertain entertainment enthusiastic entire environmental equal error essay essential establish estimate evaluate eventually evidence exact exactly examine exchange exist existence expand expedition expert explanation express expression extreme extremely
facility fact fairly familiar fault favour favor feature fee female fiction figure file finance financial firm flat flexible focus fold force forecast former fortunately fortune found frank freedom frequent frequently friendship fuel function fund further
gain gap gather general generally generation generous gentle genuine giant global goods gradually graduate grateful grocery growth guarantee guard guilty
handle hardly harm headline heat heavily highlight historic honest honour horror household housing humour humor hunt hurricane
ideal identify identity ignore image imagination immediate immediately impact impress impression impressive income increase incredible indeed independent indicate individual industry influence inform initial injury innocent insist inspire install instance instruction insurance intelligent intend intention international interrupt invent invention invest investigate involve issue item
jealous join joke journalist judge
knowledge
label labour labor lack latest launch layer leader leadership league leisure length license licence likely limit link literature local locate location logical long-term loss
mad mainly maintain major majority male manage manner mass master material mature maximum meanwhile media memory mental mention method military minimum minor minority mission mood moral motivate motor multiple murder mystery
naked negative network nevertheless nightmare nobody nor note nuclear
obey object obvious obviously occasion occupy occur odd offence offensive official operate operation opportunity oppose option organisation organization origin original otherwise outcome output overall overcome owe
participate particular particularly passion patience pattern peak percentage performance permanent permission permit personality persuade phase phenomenon philosophy pile pleasure plenty plot policy politics pollute population portion position positive possess possibility potential poverty power practical precise predict prediction pregnant presence pressure prevent previous previously pride primary principle priority private procedure process produce profession professional profit progress promote proof proper property proportion proposal propose prospect protest provide psychology publish punish purchase purpose pursue
qualification qualify quantity quarter quote
range rank rapid rate raw reaction react realistic reasonable recent recently recognise recognize recover reflect refuse regard region regular regularly relate relationship relative release relevant reliable relief rely remain remark remote remove replace represent reputation request require research reserve resident resource respect respond response responsibility responsible restore retire reveal review revolution reward risk rough route routine
sample satisfy scene schedule scheme section sector secure security select selection senior sensible separate sequence series session settle severe shift shortage signal significant similar site situation slightly social society solution source species specific spirit split sponsor staff standard statement status steady stock strategy strength stress stretch strict structure struggle style substance suffer suggest suggestion suitable sum supply surface survey survive suspect sympathy symptom system
tackle target task tax technique temporary tend tension term theme theory therefore threat tight tip tough tradition traditional train transfer transport treat treatment trend trial tribe trick typical
unemployed unemployment unfortunately unique unit unless upset urban urgent
valuable value variety various vehicle version victim violence violent virtual visible vision volume volunteer vote
warn warning wealth weapon welfare whatever whereas wherever widely willing wise withdraw witness worth
youth
`;

const B2_WORDS = `
abandon absorb abstract abuse academy acceptable accumulate accusation accuse acknowledge acquire adapt adequate adjust administration adolescent advocate aesthetic affordable aggressive agenda agriculture allegation allocate alter ambiguous ambition ambitious amend analyse analyze analysis anticipate apparent appeal applicant arbitrary architecture arise artificial aspect assemble assert assess assessment asset assign assist assume assumption assure attain authority awareness
bankrupt barrier bias bizarre boost bound boundary breakthrough bureaucracy
candidate capacity casual cautious cease certainty chaos characteristic circumstance cite civil clarify coherent collapse commission commit commitment commodity compensate compensation competent compile comprehensive compromise conceive concept conduct confront consent consequence conservative considerable consistent constitute consult consumer contemporary controversial controversy conventional conviction coordinate core corporate correspond counter crucial cultivate cynical
debris deceive deduce defect deficit delegate deliberate democracy demonstrate dense depict deprive derive designate detect deteriorate devastate dilemma dimension diminish discipline disclose discourse discrimination dispute distinct distinguish distort distribute diverse dominate draft drought dynamic
eliminate embrace emerge emphasis emphasise emphasize empire enable encounter endure enforce enhance enterprise equivalent erode evolve exceed exclude exhibit expenditure explicit exploit expose extensive
facilitate feasible fierce fluctuate formula foundation fragile framework fraud frustrate fundamental
gender genre gesture govern grant guideline
halt harsh hazard hence hierarchy hostile hypothesis
ideology illusion illustrate imply impose incentive incident incorporate inevitable infrastructure inherent inhibit initiative innovation innovative insight inspect integrate integrity interfere interpret intervene intervention intrinsic invasion isolate
justify
legislation legitimate leverage liberal likewise literacy loyalty
mandatory manipulate margin mechanism mediate merge migrate mode modify monitor
negotiate neutral nonetheless norm notion
objective obligation obscure obstacle obtain offset ongoing orient outline outstanding overlook
paradox parameter perceive perception persist perspective pharmaceutical pose precede predominant preliminary premise prescribe preserve presume prevail prior proceed prohibit prominent prompt prone prosecute provoke
radical rational rebel reconcile recruit refine reform regime reinforce reluctant render resemble resent residue resign resolve restrain restrict retain retrieve revenue reverse rigid
sanction scenario scope scrutiny segment sensitive sentiment shareholder skeptical sceptical solely sophisticated specify speculate sphere stable stakeholder stimulate straightforward subsequent subsidy substitute subtle sufficient superficial supplement suppress sustain sustainable
tangible tendency terminate testify thorough threshold tolerate trait transform transition transmit transparent trigger
undergo undermine underlying unprecedented utilise utilize
vague valid verify viable vital vulnerable
welfare whereby widespread
yield
`;

const C1_WORDS = `
aberration abolish abundant acclaim acumen adamant adept adhere admonish adverse affluent aggravate alleviate allude altruism ambivalent ameliorate amenable anecdote anomaly antagonise antagonize apathy appease arduous articulate ascertain aspire assiduous astute audacious augment austere authentic
benchmark benevolent benign bolster brevity buoyant
candid capricious catalyst caveat circumvent clandestine coerce cognitive cohesion collateral commence commensurate compelling complacent concede concise condone conducive confer conjecture conscientious consensus consolidate conspicuous contend contingent conundrum corroborate covert credible criterion culminate cumbersome
daunting dearth debilitate decipher deem deference deficiency delineate delve demeanour demeanor denounce deplete deploy deter detrimental deviate dexterity diligent discern discrepancy disdain disparity disseminate dissent divergent dubious
elicit eloquent elusive emanate embark empirical emulate encompass endeavour endeavor enigma entail entrepreneur ephemeral epitome eradicate erratic escalate esoteric evoke exacerbate exemplify exempt exhaustive exorbitant expedite extrapolate
fallacy fervent flourish fluctuation foster frugal futile
galvanise galvanize garner gratuitous gregarious
hamper haphazard hinder holistic hypocrisy
idiosyncrasy impeccable impede imperative impetus implicit inadvertent incessant incumbent indigenous indispensable induce inept inertia infer ingenious inherently innate insatiable instigate insurmountable intricate intrinsically invoke irrevocable
jeopardise jeopardize juxtapose
lament latent lucrative
magnanimous malleable mitigate meticulous mundane
nebulous negligent nuance
obsolete onerous opaque ostensibly overt
palpable paradigm paramount pertinent pervasive plausible poignant pragmatic precarious preclude predicament proficient profound proliferate propensity prudent
quell
rampant ramification rationale recapitulate rectify redundant relentless reminiscent replicate repudiate resilience resilient resolute retaliate rhetoric robust
salient scrupulous serendipity spurious stagnant stringent substantiate succinct supersede surmount susceptible
tacit tantamount tenacious tentative tenuous trajectory transient
ubiquitous unequivocal unilateral
venerable versatile vindicate volatile
warrant
zealous
`;

const C2_WORDS = `
abstruse acerbic anachronism antithesis apocryphal assuage
bellicose bombastic
cacophony capitulate castigate chicanery circumlocution
deleterious diatribe didactic disingenuous
effrontery egregious enervate equanimity equivocate erudite exculpate
fastidious obfuscate
grandiloquent
iconoclast ignominious impecunious inchoate ineffable inimical insidious intransigent inveterate
laconic loquacious
mendacious munificent
nefarious
obdurate obsequious obstreperous
parsimonious perfidious perfunctory perspicacious pusillanimous
quixotic
recalcitrant recondite
sanguine sycophant
truculent
vicissitude vituperate
`;

const LEVEL_ORDER: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LEVEL_INDEX = new Map<string, WordLevel>();

function registerList(list: string, level: WordLevel) {
  list
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
    .forEach((w) => {
      // Keep the easiest level if a word appears in more than one list
      const existing = LEVEL_INDEX.get(w);
      if (!existing || LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(existing)) {
        LEVEL_INDEX.set(w, level);
      }
    });
}

registerList(A1_WORDS, 'A1');
registerList(A2_WORDS, 'A2');
registerList(B1_WORDS, 'B1');
registerList(B2_WORDS, 'B2');
registerList(C1_WORDS, 'C1');
registerList(C2_WORDS, 'C2');

// Irregular verbs (all their forms) carry the level of the verb
IRREGULAR_VERBS.forEach((v) => {
  const forms = [v.infinitive, v.pastSimple, v.pastParticiple]
    .filter(Boolean)
    .flatMap((f) => f.split(/[\/,]/))
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  forms.forEach((f) => {
    const existing = LEVEL_INDEX.get(f);
    if (!existing || LEVEL_ORDER.indexOf(v.level) < LEVEL_ORDER.indexOf(existing)) {
      LEVEL_INDEX.set(f, v.level);
    }
  });
});

function harder(a: WordLevel, b: WordLevel): WordLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

function bump(level: WordLevel, steps = 1): WordLevel {
  const idx = Math.min(LEVEL_ORDER.length - 1, LEVEL_ORDER.indexOf(level) + steps);
  return LEVEL_ORDER[idx];
}

/** Generates plausible base forms (lemmas) for an inflected/derived English word. */
function candidateLemmas(word: string): string[] {
  const c: string[] = [];
  const add = (s: string) => {
    if (s && s.length >= 2 && s !== word) c.push(s);
  };

  if (word.endsWith('ies')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('es')) add(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1));

  if (word.endsWith('ied')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('ed')) {
    add(word.slice(0, -2));
    add(word.slice(0, -1));
    if (word.length > 4 && word[word.length - 3] === word[word.length - 4]) add(word.slice(0, -3));
  }

  if (word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    add(stem);
    add(stem + 'e');
    if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) add(stem.slice(0, -1));
    if (stem.endsWith('y')) add(stem.slice(0, -1) + 'ie');
  }

  if (word.endsWith('ily')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('ally')) add(word.slice(0, -4));
  if (word.endsWith('ly')) {
    add(word.slice(0, -2));
    add(word.slice(0, -2) + 'e');
  }

  if (word.endsWith('ier')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('iest')) add(word.slice(0, -4) + 'y');
  if (word.endsWith('er')) {
    add(word.slice(0, -2));
    add(word.slice(0, -1));
  }
  if (word.endsWith('est')) {
    add(word.slice(0, -3));
    add(word.slice(0, -2));
  }

  if (word.endsWith('iness')) add(word.slice(0, -5) + 'y');
  if (word.endsWith('ness')) add(word.slice(0, -4));
  if (word.endsWith('ful')) add(word.slice(0, -3));
  if (word.endsWith('less')) add(word.slice(0, -4));
  if (word.startsWith('un')) add(word.slice(2));
  if (word.startsWith('re')) add(word.slice(2));

  return c;
}

/** Rough syllable counter for English words. */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

const C1_SUFFIXES = /(ous|ious|eous|uous|esque|itude|acious|ocity|escent|escence|iferous|aneous)$/;
const B2_SUFFIXES = /(tion|sion|ment|ity|ance|ence|ancy|ency|ism|ist|ize|ise|ify|ology|ative|itive|ible|able|ical|ship|hood|ure)$/;
const DERIVATIONAL_SUFFIXES = /(ness|ment|less|ful|able|ible|ity|ize|ise|tion|sion)$/;

/** Looks up a single word (no spaces), applying lemmatisation. Returns null if unknown. */
function lookupSingle(word: string): WordLevel | null {
  const direct = LEVEL_INDEX.get(word);
  if (direct) return direct;

  for (const lemma of candidateLemmas(word)) {
    const lvl = LEVEL_INDEX.get(lemma);
    if (lvl) {
      // Derived forms (e.g. "careless", "happiness") are usually one level above their base
      if (DERIVATIONAL_SUFFIXES.test(word) && !DERIVATIONAL_SUFFIXES.test(lemma)) {
        return bump(lvl, lvl === 'A1' ? 1 : 0);
      }
      return lvl;
    }
  }
  return null;
}

/** Splits closed compounds ("notebook", "headline") into two known words. */
function compoundLevel(word: string): WordLevel | null {
  if (word.length < 6) return null;
  for (let i = 3; i <= word.length - 3; i++) {
    const left = LEVEL_INDEX.get(word.slice(0, i));
    const right = lookupSingle(word.slice(i));
    if (left && right) {
      return harder(harder(left, right), 'A2');
    }
  }
  return null;
}

/** Heuristic estimate for words not found in any list. */
function heuristicLevel(word: string): WordLevel {
  const syllables = countSyllables(word);

  if (C1_SUFFIXES.test(word) && syllables >= 3) return 'C1';
  if (syllables >= 5) return 'C1';
  if (B2_SUFFIXES.test(word)) return syllables >= 4 ? 'C1' : 'B2';
  if (syllables >= 4) return 'C1';
  if (syllables === 3) return 'B2';
  // Short words that are NOT in the frequent-word lists are usually less common vocabulary
  return 'B2';
}

/**
 * Returns the estimated CEFR level (A1–C2) of an English word or expression.
 */
export function estimateCefrLevel(rawWord: string): WordLevel {
  const clean = (rawWord || '')
    .toLowerCase()
    .replace(/^to\s+/, '')
    .replace(/[^a-z\s'-]/g, ' ')
    .trim();

  if (!clean) return 'A2';

  const tokens = clean.split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return 'A2';

  if (tokens.length === 1) {
    const token = tokens[0].replace(/'s$/, '').replace(/'/g, '');
    return lookupSingle(token) || compoundLevel(token) || heuristicLevel(token);
  }

  // Multi-word expressions / phrasal verbs: hardest component word decides,
  // phrasal verbs made only of basic words are typically B1.
  const compound = LEVEL_INDEX.get(clean.replace(/\s+/g, '-')) || LEVEL_INDEX.get(clean.replace(/\s+/g, ''));
  if (compound) return compound;

  let level: WordLevel = 'A1';
  tokens.forEach((t) => {
    const tok = t.replace(/'/g, '');
    level = harder(level, lookupSingle(tok) || heuristicLevel(tok));
  });

  const contentTokens = tokens.filter((t) => t.length > 3);
  if (tokens.length >= 2 && LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf('B1') && contentTokens.length <= 1) {
    // e.g. "give up", "look after", "take off" → idiomatic meaning, usually A2/B1
    level = harder(level, 'A2');
  }
  return level;
}
