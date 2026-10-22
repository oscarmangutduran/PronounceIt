import { WordItem, WordLevel, WordStatus, PartOfSpeech } from '../types';
import { appStorage } from './storage';
import { networkService } from './networkService';
import { IRREGULAR_VERBS } from '../data/irregularVerbs';
import { backendApi } from './apiClient';
import { estimateCefrLevel } from './cefrLevel';

const IRREGULAR_VERB_SET = new Set<string>();
const IRREGULAR_VERB_PHONETICS: Record<string, string> = {};
IRREGULAR_VERBS.forEach((v) => {
  if (v.infinitive) {
    const inf = v.infinitive.toLowerCase().trim();
    IRREGULAR_VERB_SET.add(inf);
    if (v.phonetics?.infinitive) {
      IRREGULAR_VERB_PHONETICS[inf] = v.phonetics.infinitive.trim();
    }
  }
  if (v.pastSimple) {
    const parts = v.pastSimple.split(/[\/,]/);
    const ipaParts = (v.phonetics?.pastSimple || '').split(/[\/,]|\s+-\s+/);
    parts.forEach((s, idx) => {
      const c = s.trim().toLowerCase();
      if (c) {
        IRREGULAR_VERB_SET.add(c);
        if (ipaParts[idx]?.trim() || v.phonetics?.pastSimple) {
          IRREGULAR_VERB_PHONETICS[c] = (ipaParts[idx]?.trim() || v.phonetics!.pastSimple).trim();
        }
      }
    });
  }
  if (v.pastParticiple) {
    const parts = v.pastParticiple.split(/[\/,]/);
    const ipaParts = (v.phonetics?.pastParticiple || '').split(/[\/,]|\s+-\s+/);
    parts.forEach((s, idx) => {
      const c = s.trim().toLowerCase();
      if (c) {
        IRREGULAR_VERB_SET.add(c);
        if (ipaParts[idx]?.trim() || v.phonetics?.pastParticiple) {
          IRREGULAR_VERB_PHONETICS[c] = (ipaParts[idx]?.trim() || v.phonetics!.pastParticiple).trim();
        }
      }
    });
  }
});

// Curated high-frequency English lexical phonetics for 0ms instant, authentic transcription
export const COMMON_ENGLISH_PHONETICS: Record<string, { ipa: string; phoneticGuide: string }> = {
  the: { ipa: '/ðiː/', phoneticGuide: '"de"' },
  a: { ipa: '/eɪ/', phoneticGuide: '"ei"' },
  an: { ipa: '/æn/', phoneticGuide: '"an"' },
  to: { ipa: '/tuː/', phoneticGuide: '"tu"' },
  of: { ipa: '/ʌv/', phoneticGuide: '"ov"' },
  and: { ipa: '/ænd/', phoneticGuide: '"and"' },
  in: { ipa: '/ɪn/', phoneticGuide: '"in"' },
  is: { ipa: '/ɪz/', phoneticGuide: '"is"' },
  it: { ipa: '/ɪt/', phoneticGuide: '"it"' },
  you: { ipa: '/juː/', phoneticGuide: '"yu"' },
  that: { ipa: '/ðæt/', phoneticGuide: '"dat"' },
  he: { ipa: '/hiː/', phoneticGuide: '"jii"' },
  was: { ipa: '/wɒz/', phoneticGuide: '"uos"' },
  for: { ipa: '/fɔːr/', phoneticGuide: '"for"' },
  on: { ipa: '/ɒn/', phoneticGuide: '"on"' },
  are: { ipa: '/ɑːr/', phoneticGuide: '"aar"' },
  as: { ipa: '/æz/', phoneticGuide: '"as"' },
  with: { ipa: '/wɪð/', phoneticGuide: '"uid"' },
  his: { ipa: '/hɪz/', phoneticGuide: '"jis"' },
  they: { ipa: '/ðeɪ/', phoneticGuide: '"dei"' },
  i: { ipa: '/aɪ/', phoneticGuide: '"ai"' },
  at: { ipa: '/æt/', phoneticGuide: '"at"' },
  be: { ipa: '/biː/', phoneticGuide: '"bii"' },
  this: { ipa: '/ðɪs/', phoneticGuide: '"dis"' },
  have: { ipa: '/hæv/', phoneticGuide: '"jav"' },
  from: { ipa: '/frɒm/', phoneticGuide: '"from"' },
  or: { ipa: '/ɔːr/', phoneticGuide: '"or"' },
  one: { ipa: '/wʌn/', phoneticGuide: '"uan"' },
  had: { ipa: '/hæd/', phoneticGuide: '"jad"' },
  by: { ipa: '/baɪ/', phoneticGuide: '"bai"' },
  word: { ipa: '/wɜːrd/', phoneticGuide: '"uerd"' },
  but: { ipa: '/bʌt/', phoneticGuide: '"bat"' },
  not: { ipa: '/nɒt/', phoneticGuide: '"not"' },
  what: { ipa: '/wɒt/', phoneticGuide: '"uot"' },
  all: { ipa: '/ɔːl/', phoneticGuide: '"ool"' },
  were: { ipa: '/wɜːr/', phoneticGuide: '"uer"' },
  we: { ipa: '/wiː/', phoneticGuide: '"uii"' },
  when: { ipa: '/wen/', phoneticGuide: '"uen"' },
  your: { ipa: '/jɔːr/', phoneticGuide: '"yor"' },
  can: { ipa: '/kæn/', phoneticGuide: '"kan"' },
  said: { ipa: '/sed/', phoneticGuide: '"sed"' },
  there: { ipa: '/ðeər/', phoneticGuide: '"der"' },
  use: { ipa: '/juːz/', phoneticGuide: '"yus"' },
  each: { ipa: '/iːtʃ/', phoneticGuide: '"iich"' },
  which: { ipa: '/wɪtʃ/', phoneticGuide: '"uich"' },
  she: { ipa: '/ʃiː/', phoneticGuide: '"shii"' },
  do: { ipa: '/duː/', phoneticGuide: '"du"' },
  how: { ipa: '/haʊ/', phoneticGuide: '"jau"' },
  their: { ipa: '/ðeər/', phoneticGuide: '"der"' },
  if: { ipa: '/ɪf/', phoneticGuide: '"if"' },
  will: { ipa: '/wɪl/', phoneticGuide: '"uil"' },
  up: { ipa: '/ʌp/', phoneticGuide: '"ap"' },
  other: { ipa: '/ˈʌð.ər/', phoneticGuide: '"á-der"' },
  about: { ipa: '/əˈbaʊt/', phoneticGuide: '"e-báut"' },
  out: { ipa: '/aʊt/', phoneticGuide: '"aut"' },
  many: { ipa: '/ˈmen.i/', phoneticGuide: '"mé-ni"' },
  then: { ipa: '/ðen/', phoneticGuide: '"den"' },
  them: { ipa: '/ðem/', phoneticGuide: '"dem"' },
  these: { ipa: '/ðiːz/', phoneticGuide: '"diis"' },
  so: { ipa: '/soʊ/', phoneticGuide: '"sou"' },
  some: { ipa: '/sʌm/', phoneticGuide: '"sam"' },
  her: { ipa: '/hɜːr/', phoneticGuide: '"jer"' },
  would: { ipa: '/wʊd/', phoneticGuide: '"uud"' },
  could: { ipa: '/kʊd/', phoneticGuide: '"kud"' },
  should: { ipa: '/ʃʊd/', phoneticGuide: '"shud"' },
  make: { ipa: '/meɪk/', phoneticGuide: '"meik"' },
  like: { ipa: '/laɪk/', phoneticGuide: '"laik"' },
  him: { ipa: '/hɪm/', phoneticGuide: '"jim"' },
  into: { ipa: '/ˈɪn.tuː/', phoneticGuide: '"ín-tu"' },
  time: { ipa: '/taɪm/', phoneticGuide: '"taim"' },
  has: { ipa: '/hæz/', phoneticGuide: '"jas"' },
  look: { ipa: '/lʊk/', phoneticGuide: '"luk"' },
  two: { ipa: '/tuː/', phoneticGuide: '"tu"' },
  more: { ipa: '/mɔːr/', phoneticGuide: '"mor"' },
  write: { ipa: '/raɪt/', phoneticGuide: '"rait"' },
  go: { ipa: '/ɡoʊ/', phoneticGuide: '"gou"' },
  see: { ipa: '/siː/', phoneticGuide: '"sii"' },
  number: { ipa: '/ˈnʌm.bər/', phoneticGuide: '"nám-ber"' },
  no: { ipa: '/noʊ/', phoneticGuide: '"nou"' },
  way: { ipa: '/weɪ/', phoneticGuide: '"uei"' },
  people: { ipa: '/ˈpiː.pəl/', phoneticGuide: '"píi-pl"' },
  my: { ipa: '/maɪ/', phoneticGuide: '"mai"' },
  than: { ipa: '/ðæn/', phoneticGuide: '"dan"' },
  first: { ipa: '/fɜːrst/', phoneticGuide: '"ferst"' },
  water: { ipa: '/ˈwɔː.tər/', phoneticGuide: '"uó-ter"' },
  been: { ipa: '/biːn/', phoneticGuide: '"biin"' },
  call: { ipa: '/kɔːl/', phoneticGuide: '"kool"' },
  who: { ipa: '/huː/', phoneticGuide: '"ju"' },
  oil: { ipa: '/ɔɪl/', phoneticGuide: '"oil"' },
  its: { ipa: '/ɪts/', phoneticGuide: '"its"' },
  now: { ipa: '/naʊ/', phoneticGuide: '"nau"' },
  find: { ipa: '/faɪnd/', phoneticGuide: '"faind"' },
  long: { ipa: '/lɒŋ/', phoneticGuide: '"long"' },
  down: { ipa: '/daʊn/', phoneticGuide: '"daun"' },
  day: { ipa: '/deɪ/', phoneticGuide: '"dei"' },
  did: { ipa: '/dɪd/', phoneticGuide: '"did"' },
  get: { ipa: '/ɡet/', phoneticGuide: '"guet"' },
  come: { ipa: '/kʌm/', phoneticGuide: '"kam"' },
  made: { ipa: '/meɪd/', phoneticGuide: '"meid"' },
  may: { ipa: '/meɪ/', phoneticGuide: '"mei"' },
  part: { ipa: '/pɑːrt/', phoneticGuide: '"paart"' },
  apple: { ipa: '/ˈæp.əl/', phoneticGuide: '"áp-l"' },
  beautiful: { ipa: '/ˈbjuː.tɪ.fəl/', phoneticGuide: '"biú-ti-ful"' },
  hello: { ipa: '/həˈloʊ/', phoneticGuide: '"je-lóu"' },
  good: { ipa: '/ɡʊd/', phoneticGuide: '"gud"' },
  morning: { ipa: '/ˈmɔːr.nɪŋ/', phoneticGuide: '"móor-ning"' },
  night: { ipa: '/naɪt/', phoneticGuide: '"nait"' },
  tomorrow: { ipa: '/təˈmɒr.oʊ/', phoneticGuide: '"tu-mó-rou"' },
  yesterday: { ipa: '/ˈjes.tər.deɪ/', phoneticGuide: '"yés-ter-dei"' },
  today: { ipa: '/təˈdeɪ/', phoneticGuide: '"tu-déi"' },
  family: { ipa: '/ˈfæm.əl.i/', phoneticGuide: '"fá-mi-li"' },
  friend: { ipa: '/frend/', phoneticGuide: '"frend"' },
  school: { ipa: '/skuːl/', phoneticGuide: '"skuul"' },
  house: { ipa: '/haʊs/', phoneticGuide: '"jaus"' },
  work: { ipa: '/wɜːrk/', phoneticGuide: '"uerk"' },
  world: { ipa: '/wɜːrld/', phoneticGuide: '"uerld"' },
  thank: { ipa: '/θæŋk/', phoneticGuide: '"zank"' },
  thanks: { ipa: '/θæŋks/', phoneticGuide: '"zanks"' },
  please: { ipa: '/pliːz/', phoneticGuide: '"pliis"' },
  sorry: { ipa: '/ˈsɒr.i/', phoneticGuide: '"só-ri"' },
  welcome: { ipa: '/ˈwel.kəm/', phoneticGuide: '"uél-kam"' },
  because: { ipa: '/bɪˈkəz/', phoneticGuide: '"bi-kóos"' },
  always: { ipa: '/ˈɔːl.weɪz/', phoneticGuide: '"óol-ueis"' },
  sometimes: { ipa: '/ˈsʌm.taɪmz/', phoneticGuide: '"sám-taims"' },
  never: { ipa: '/ˈnev.ər/', phoneticGuide: '"né-ver"' },
  together: { ipa: '/təˈɡeð.ər/', phoneticGuide: '"tu-gué-der"' },
  weather: { ipa: '/ˈweð.ər/', phoneticGuide: '"ué-der"' },
  knowledge: { ipa: '/ˈnɒl.ɪdʒ/', phoneticGuide: '"nó-lidy"' },
  language: { ipa: '/ˈlæŋ.ɡwɪdʒ/', phoneticGuide: '"láng-guedy"' },
  business: { ipa: '/ˈbɪz.nɪs/', phoneticGuide: '"bíz-nes"' },
  question: { ipa: '/ˈkwes.tʃən/', phoneticGuide: '"kués-chon"' },
  answer: { ipa: '/ˈɑːn.sər/', phoneticGuide: '"áan-ser"' },
  listen: { ipa: '/ˈlɪs.ən/', phoneticGuide: '"lís-n"' },
  talk: { ipa: '/tɔːk/', phoneticGuide: '"took"' },
  walk: { ipa: '/wɔːk/', phoneticGuide: '"uook"' },
  daughter: { ipa: '/ˈdɔː.tər/', phoneticGuide: '"dóo-ter"' },
  laugh: { ipa: '/lɑːf/', phoneticGuide: '"laaf"' },
  enough: { ipa: '/ɪˈnʌf/', phoneticGuide: '"i-náf"' },
  thought: { ipa: '/θɔːt/', phoneticGuide: '"zoot"' },
  through: { ipa: '/θruː/', phoneticGuide: '"zruu"' },
  thoughtful: { ipa: '/ˈθɔːt.fəl/', phoneticGuide: '"zóot-ful"' },
  heart: { ipa: '/hɑːrt/', phoneticGuide: '"jaart"' },
  coffee: { ipa: '/ˈkɒf.i/', phoneticGuide: '"kó-fi"' },
  orange: { ipa: '/ˈɒr.ɪndʒ/', phoneticGuide: '"ó-rindy"' },
  sugar: { ipa: '/ˈʃʊɡ.ər/', phoneticGuide: '"shú-gar"' },
  sure: { ipa: '/ʃɔːr/', phoneticGuide: '"shur"' },
  comfortable: { ipa: '/ˈkʌm.fər.tə.bəl/', phoneticGuide: '"kámf-ter-bl"' },
  chocolate: { ipa: '/ˈtʃɒk.lət/', phoneticGuide: '"chók-lit"' },
  wednesday: { ipa: '/ˈwenz.deɪ/', phoneticGuide: '"uéns-dei"' },
  tuesday: { ipa: '/ˈtjuːz.deɪ/', phoneticGuide: '"tiús-dei"' },
  thursday: { ipa: '/ˈθɜːrz.deɪ/', phoneticGuide: '"zérs-dei"' },
  saturday: { ipa: '/ˈsæt.ər.deɪ/', phoneticGuide: '"sá-ter-dei"' },
  father: { ipa: '/ˈfɑː.ðər/', phoneticGuide: '"fáa-der"' },
  mother: { ipa: '/ˈmʌð.ər/', phoneticGuide: '"má-der"' },
  brother: { ipa: '/ˈbrʌð.ər/', phoneticGuide: '"brá-der"' },
  sister: { ipa: '/ˈsɪs.tər/', phoneticGuide: '"sís-ter"' },
  love: { ipa: '/lʌv/', phoneticGuide: '"lav"' },
  live: { ipa: '/lɪv/', phoneticGuide: '"liv"' },
  life: { ipa: '/laɪf/', phoneticGuide: '"laif"' },
  dog: { ipa: '/dɒɡ/', phoneticGuide: '"dog"' },
  cat: { ipa: '/kæt/', phoneticGuide: '"kat"' },
  car: { ipa: '/kɑːr/', phoneticGuide: '"kaar"' },
  computer: { ipa: '/kəmˈpjuː.tər/', phoneticGuide: '"kam-piú-ter"' },
  phone: { ipa: '/foʊn/', phoneticGuide: '"foun"' },
  meeting: { ipa: '/ˈmiː.tɪŋ/', phoneticGuide: '"míi-ting"' },
  money: { ipa: '/ˈmʌn.i/', phoneticGuide: '"má-ni"' },
  city: { ipa: '/ˈsɪt.i/', phoneticGuide: '"sí-ti"' },
  country: { ipa: '/ˈkʌn.tri/', phoneticGuide: '"kán-tri"' },
  story: { ipa: '/ˈstɔːr.i/', phoneticGuide: '"stó-ri"' },
  music: { ipa: '/ˈmjuː.zɪk/', phoneticGuide: '"miú-zik"' },
  movie: { ipa: '/ˈmuː.vi/', phoneticGuide: '"múu-vi"' },
  book: { ipa: '/bʊk/', phoneticGuide: '"buk"' },
  food: { ipa: '/fuːd/', phoneticGuide: '"fuud"' },
  tea: { ipa: '/tiː/', phoneticGuide: '"tii"' },
  bread: { ipa: '/bred/', phoneticGuide: '"bred"' },
  cheese: { ipa: '/tʃiːz/', phoneticGuide: '"chiis"' },
  happy: { ipa: '/ˈhæp.i/', phoneticGuide: '"já-pi"' },
  ready: { ipa: '/ˈred.i/', phoneticGuide: '"ré-di"' },
  easy: { ipa: '/ˈiː.zi/', phoneticGuide: '"íi-si"' },
  hard: { ipa: '/hɑːrd/', phoneticGuide: '"jaard"' },
  great: { ipa: '/ɡreɪt/', phoneticGuide: '"greit"' },
  small: { ipa: '/smɔːl/', phoneticGuide: '"smool"' },
  big: { ipa: '/bɪɡ/', phoneticGuide: '"big"' },
  high: { ipa: '/haɪ/', phoneticGuide: '"jai"' },
  deep: { ipa: '/diːp/', phoneticGuide: '"diip"' },
  right: { ipa: '/raɪt/', phoneticGuide: '"rait"' },
  wrong: { ipa: '/rɒŋ/', phoneticGuide: '"rong"' },
  change: { ipa: '/tʃeɪndʒ/', phoneticGuide: '"cheindy"' },
  open: { ipa: '/ˈoʊ.pən/', phoneticGuide: '"óu-pen"' },
  close: { ipa: '/kloʊz/', phoneticGuide: '"klous"' },
  help: { ipa: '/help/', phoneticGuide: '"jelp"' },
  learn: { ipa: '/lɜːrn/', phoneticGuide: '"lern"' },
  study: { ipa: '/ˈstʌd.i/', phoneticGuide: '"stá-di"' },
  system: { ipa: '/ˈsɪs.təm/', phoneticGuide: '"sís-tem"' },
  develop: { ipa: '/dɪˈvel.əp/', phoneticGuide: '"di-vé-lap"' },
  development: { ipa: '/dɪˈvel.əp.mənt/', phoneticGuide: '"di-vé-lap-ment"' },
  important: { ipa: '/ɪmˈpɔːr.tənt/', phoneticGuide: '"im-póor-tant"' },
  different: { ipa: '/ˈdɪf.ər.ənt/', phoneticGuide: '"díf-rent"' },
  possible: { ipa: '/ˈpɒs.ə.bəl/', phoneticGuide: '"pó-si-bl"' },
  impossible: { ipa: '/ɪmˈpɒs.ə.bəl/', phoneticGuide: '"im-pó-si-bl"' },
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 1500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export interface AutoEnrichResult {
  word: string;
  partOfSpeech: PartOfSpeech;
  level: WordLevel;
  ipa: string;
  phoneticGuide: string;
  phoneticNote: string;
  translation: string;
  alternatives?: string[];
  definition: string;
  exampleEn: string;
  exampleEs: string;
  categoryGroup: string;
  categorySub: string;
}

interface BuiltInVocabItem extends Omit<Partial<AutoEnrichResult>, 'partOfSpeech'> {
  partOfSpeech?: string;
}

// Comprehensive built-in lexical database for instant offline and rich responses
const BUILTIN_VOCABULARY: Record<string, BuiltInVocabItem> = {
  the: {
    partOfSpeech: 'article',
    level: 'A1',
    ipa: '/ðiː/',
    phoneticGuide: '"de"',
    phoneticNote: 'Artículo definido. Suena /ðiː/ ante vocales y /ðə/ ante consonantes',
    translation: 'El / La / Los / Las',
    definition: 'Artículo determinado usado para referirse a personas o cosas específicas',
    exampleEn: 'The Little Prince lives on a small asteroid.',
    exampleEs: 'El Principito vive en un pequeño asteroide.',
  },
  a: {
    partOfSpeech: 'article',
    level: 'A1',
    ipa: '/eɪ/',
    phoneticGuide: '"ei" / "a"',
    phoneticNote: 'Artículo indefinido usado ante sonido consonante',
    translation: 'Un / Una',
    definition: 'Artículo indeterminado para sustantivos singulares contables',
    exampleEn: 'Draw me a sheep, please.',
    exampleEs: 'Dibújame una oveja, por favor.',
  },
  an: {
    partOfSpeech: 'article',
    level: 'A1',
    ipa: '/æn/',
    phoneticGuide: '"an"',
    phoneticNote: 'Artículo indefinido usado ante sonido vocal',
    translation: 'Un / Una',
    definition: 'Artículo indeterminado para sustantivos que empiezan con vocal',
    exampleEn: 'An asteroid is a celestial body.',
    exampleEs: 'Un asteroide es un cuerpo celeste.',
  },
  breakthrough: {
    partOfSpeech: 'noun/verb',
    level: 'B2',
    ipa: '/ˈbreɪk.θruː/',
    phoneticGuide: '"breik-zru"',
    phoneticNote: 'Acento: Sílaba 1 (θ fricativa)',
    translation: 'Avance decisivo',
    definition: 'Logro importante, hito trascendental',
    exampleEn: 'We achieved a major breakthrough in the contract negotiations.',
    exampleEs: 'Logramos un avance decisivo en las negociaciones del contrato.', categorySub: '',
  },
  stakeholder: {
    partOfSpeech: 'noun',
    level: 'B2',
    ipa: '/ˈsteɪkˌhoʊl.dɚ/',
    phoneticGuide: '"steik-joul-der"',
    phoneticNote: 'Diptongo /eɪ/ en primera sílaba',
    translation: 'Parte interesada / Socio clave',
    definition: 'Persona o grupo con interés legítimo en un proyecto o empresa',
    exampleEn: 'We must communicate project updates to every key stakeholder.',
    exampleEs: 'Debemos comunicar las actualizaciones del proyecto a cada parte interesada clave.', categorySub: '',
  },
  deadline: {
    partOfSpeech: 'noun',
    level: 'B1',
    ipa: '/ˈded.laɪn/',
    phoneticGuide: '"ded-lain"',
    phoneticNote: 'Acento en primera sílaba, diptongo /aɪ/',
    translation: 'Fecha límite / Plazo',
    definition: 'Momento máximo fijado para entregar un trabajo o tarea',
    exampleEn: 'The team worked overtime to meet the tight project deadline.',
    exampleEs: 'El equipo trabajó horas extras para cumplir con el ajustado plazo del proyecto.', categorySub: '',
  },
  resilience: {
    partOfSpeech: 'noun',
    level: 'C1',
    ipa: '/rɪˈzɪl.jəns/',
    phoneticGuide: '"ri-zíl-yens"',
    phoneticNote: 'Sonido /z/ sonoro en segunda sílaba',
    translation: 'Resiliencia / Capacidad de adaptación',
    definition: 'Capacidad de sobreponerse a situaciones adversas y salir fortalecido',
    exampleEn: 'Economic resilience has allowed the company to survive market shocks.',
    exampleEs: 'La resiliencia económica le ha permitido a la empresa sobrevivir a los golpes del mercado.', categorySub: '',
  },
  leverage: {
    partOfSpeech: 'verb / noun',
    level: 'C1',
    ipa: '/ˈlev.ər.ɪdʒ/',
    phoneticGuide: '"lév-ridy"',
    phoneticNote: 'UK alternativa: /ˈliː.vər.ɪdʒ/',
    translation: 'Aprovechar / Sacar ventaja',
    definition: 'Apalancamiento estratégico o maximización de recursos',
    exampleEn: 'We need to leverage our market reputation during talks.',
    exampleEs: 'Necesitamos aprovechar nuestra reputación de mercado durante las conversaciones.', categorySub: '',
  },
  insight: {
    partOfSpeech: 'noun',
    level: 'B2',
    ipa: '/ˈɪn.saɪt/',
    phoneticGuide: '"in-sait"',
    phoneticNote: 'Acento en primera sílaba',
    translation: 'Perspectiva / Conocimiento profundo',
    definition: 'Comprensión clara y reveladora sobre un asunto complejo',
    exampleEn: 'Her research provides valuable insights into customer purchasing habits.',
    exampleEs: 'Su investigación aporta valiosas perspectivas sobre los hábitos de compra del cliente.', categorySub: '',
  },
  reluctant: {
    partOfSpeech: 'adjective',
    level: 'B2',
    ipa: '/rɪˈlʌk.tənt/',
    phoneticGuide: '"ri-lák-tant"',
    phoneticNote: 'Vocal corta /ʌ/ en la sílaba media',
    translation: 'Reacio / Renuente',
    definition: 'Poco dispuesto a hacer algo o que muestra resistencia',
    exampleEn: 'Management was reluctant to make major changes before quarterly results.',
    exampleEs: 'La dirección era reacia a realizar cambios importantes antes de los resultados trimestrales.', categorySub: '',
  },
  overcome: {
    partOfSpeech: 'verb',
    level: 'B2',
    ipa: '/ˌoʊ.vɚˈkʌm/',
    phoneticGuide: '"ou-ver-kám"',
    phoneticNote: 'Acento principal en la última sílaba /kʌm/',
    translation: 'Superar / Vencer',
    definition: 'Lograr sobrepasar una dificultad o impedimento',
    exampleEn: 'She managed to overcome all technical hurdles through hard work.',
    exampleEs: 'Consiguió superar todos los obstáculos técnicos gracias a su trabajo duro.', categorySub: '',
  },
  schedule: {
    partOfSpeech: 'noun / verb',
    level: 'B1',
    ipa: '/ˈskedʒ.uːl/',
    phoneticGuide: '"skéd-yul"',
    phoneticNote: 'UK alternativa: /ˈʃed.juːl/',
    translation: 'Horario / Cronograma',
    definition: 'Lista o plan de actividades con sus horas asignadas',
    exampleEn: 'We must verify the project schedule before confirming the release.',
    exampleEs: 'Debemos verificar el cronograma del proyecto antes de confirmar el lanzamiento.', categorySub: '',
  },
  feedback: {
    partOfSpeech: 'noun',
    level: 'B1',
    ipa: '/ˈfiːd.bæk/',
    phoneticGuide: '"fiid-bak"',
    phoneticNote: 'Vocal larga /iː/ seguida de /æ/',
    translation: 'Retroalimentación / Opinión',
    definition: 'Comentarios u observaciones sobre el rendimiento o trabajo',
    exampleEn: 'Positive customer feedback motivated our development team.',
    exampleEs: 'El feedback positivo de los clientes motivó a nuestro equipo de desarrollo.', categorySub: '',
  },
  challenge: {
    partOfSpeech: 'noun / verb',
    level: 'B1',
    ipa: '/ˈtʃæl.ɪndʒ/',
    phoneticGuide: '"chál-indy"',
    phoneticNote: 'Sonido /tʃ/ inicial y /dʒ/ final',
    translation: 'Desafío / Reto',
    definition: 'Situación difícil que pone a prueba las capacidades',
    exampleEn: 'Mastering English pronunciation is an exciting challenge for students.',
    exampleEs: 'Dominar la pronunciación en inglés es un desafío emocionante para los estudiantes.', categorySub: '',
  },
  skill: {
    partOfSpeech: 'noun',
    level: 'A2',
    ipa: '/skɪl/',
    phoneticGuide: '"skil"',
    phoneticNote: 'Vocal corta /ɪ/',
    translation: 'Habilidad / Destreza',
    definition: 'Capacidad adquirida mediante la práctica o el estudio',
    exampleEn: 'Daily speaking practice will enhance your conversational skill.',
    exampleEs: 'La práctica oral diaria mejorará tu habilidad conversacional.', categorySub: '',
  },
  target: {
    partOfSpeech: 'noun / verb',
    level: 'B1',
    ipa: '/ˈtɑːr.ɡɪt/',
    phoneticGuide: '"taar-guit"',
    phoneticNote: 'Acento en la primera sílaba',
    translation: 'Objetivo / Meta',
    definition: 'Resultado específico que se pretende alcanzar',
    exampleEn: 'Our main sales target for this quarter is ten thousand active users.',
    exampleEs: 'Nuestro principal objetivo de ventas para este trimestre son diez mil usuarios activos.', categorySub: '',
  },
  achieve: {
    partOfSpeech: 'verb',
    level: 'B1',
    ipa: '/əˈtʃiːv/',
    phoneticGuide: '"e-chiiv"',
    phoneticNote: 'Vocal larga /iː/ en segunda sílaba',
    translation: 'Lograr / Alcanzar',
    definition: 'Conseguir un resultado deseado mediante esfuerzo',
    exampleEn: 'With consistent practice, you will achieve complete fluency.',
    exampleEs: 'Con práctica constante, lograrás una fluidez completa.', categorySub: '',
  },
  improve: {
    partOfSpeech: 'verb',
    level: 'A2',
    ipa: '/ɪmˈpruːv/',
    phoneticGuide: '"im-pruuv"',
    phoneticNote: 'Vocal larga /uː/ con labiodental /v/',
    translation: 'Mejorar / Perfeccionar',
    definition: 'Hacer que algo sea superior o más eficaz',
    exampleEn: 'This mobile simulator will help you improve your pronunciation.',
    exampleEs: 'Este simulador móvil te ayudará a mejorar tu pronunciación.', categorySub: '',
  },
  forecast: {
    partOfSpeech: 'noun / verb',
    level: 'B2',
    ipa: '/ˈfɔːr.kæst/',
    phoneticGuide: '"foor-kast"',
    phoneticNote: 'Vocal larga /ɔː/ en primera sílaba',
    translation: 'Pronóstico / Previsión',
    definition: 'Estimación o cálculo anticipado del futuro',
    exampleEn: 'The quarterly sales forecast indicates strong revenue growth.',
    exampleEs: 'La previsión de ventas trimestral indica un fuerte crecimiento de los ingresos.', categorySub: '',
  },
  bottleneck: {
    partOfSpeech: 'noun',
    level: 'B2',
    ipa: '/ˈbɒt.əl.nek/',
    phoneticGuide: '"bot-l-nek"',
    phoneticNote: 'Término metafórico derivado de cuello de botella',
    translation: 'Cuello de botella / Punto de bloqueo',
    definition: 'Fase o elemento que retrasa y limita la velocidad de todo un proceso',
    exampleEn: 'Quality assurance became the primary bottleneck in the release cycle.',
    exampleEs: 'El control de calidad se convirtió en el principal cuello de botella del ciclo de lanzamiento.', categorySub: '',
  },
  streamline: {
    partOfSpeech: 'verb',
    level: 'C1',
    ipa: '/ˈstriːm.laɪn/',
    phoneticGuide: '"striim-lain"',
    phoneticNote: 'Vocal larga /iː/ seguida de /laɪn/',
    translation: 'Optimizar / Simplificar procesos',
    definition: 'Mejorar la eficiencia de un sistema eliminando redundancias',
    exampleEn: 'We adopted new software to streamline invoicing and customer onboarding.',
    exampleEs: 'Adoptamos un nuevo software para agilizar la facturación y la incorporación de clientes.', categorySub: '',
  },
  feasible: {
    partOfSpeech: 'adjective',
    level: 'B2',
    ipa: '/ˈfiː.zə.bəl/',
    phoneticGuide: '"fii-zi-bl"',
    phoneticNote: 'Sonido /z/ intervocálico sonoro',
    translation: 'Viable / Factible',
    definition: 'Que se puede llevar a cabo con éxito',
    exampleEn: 'We need to evaluate if this expansion plan is financially feasible.',
    exampleEs: 'Necesitamos evaluar si este plan de expansión es financieramente viable.', categorySub: '',
  },
  consensus: {
    partOfSpeech: 'noun',
    level: 'B2',
    ipa: '/kənˈsen.səs/',
    phoneticGuide: '"kon-sén-ses"',
    phoneticNote: 'Schwa átona en primera y última sílaba',
    translation: 'Consenso / Acuerdo general',
    definition: 'Opinión unánime o ampliamente compartida por un grupo',
    exampleEn: 'The committee finally reached a consensus on the marketing budget.',
    exampleEs: 'El comité finalmente alcanzó un consenso sobre el presupuesto de marketing.', categorySub: '',
  },
  compromise: {
    partOfSpeech: 'noun / verb',
    level: 'B1',
    ipa: '/ˈkɒm.prə.maɪz/',
    phoneticGuide: '"kom-pro-mais"',
    phoneticNote: 'Diptongo /aɪ/ en la última sílaba',
    translation: 'Llegar a un término medio / Acuerdo mutuo',
    definition: 'Concesión mutua para resolver diferencias',
    exampleEn: 'Both parties had to compromise to finalize the joint venture.',
    exampleEs: 'Ambas partes tuvieron que ceder para finalizar la empresa conjunta.', categorySub: '',
  },
  deadlock: {
    partOfSpeech: 'noun',
    level: 'C1',
    ipa: '/ˈded.lɒk/',
    phoneticGuide: '"ded-lok"',
    phoneticNote: 'Oclusiva sorda final /k/',
    translation: 'Punto muerto / Estancamiento',
    definition: 'Situación en la que no se puede avanzar debido a posturas irreconciliables',
    exampleEn: 'The dispute reached a deadlock after hours of futile debate.',
    exampleEs: 'La disputa llegó a un punto muerto tras horas de debate infructuoso.', categorySub: '',
  },
  cozy: {
    partOfSpeech: 'adjective',
    level: 'B1',
    ipa: '/ˈkoʊ.zi/',
    phoneticGuide: '"kóu-zi"',
    phoneticNote: 'Sonido /z/ suave y prolongado',
    translation: 'Acogedor / Cálido',
    definition: 'Lugar agradable, cálido y reconfortante',
    exampleEn: 'We spent the rainy afternoon in a cozy coffee shop.',
    exampleEs: 'Pasamos la tarde lluviosa en una cafetería muy acogedora.', categorySub: '',
  },
};

// Translation Engine Configuration & Storage
export type TranslationProvider = 'ai';

export const GEMINI_STORAGE_KEY = 'pronounceit_gemini_api_key';
const DEFAULT_GEMINI_KEY = '';

// Reverse index for instant O(1) Spanish -> English lookup
const BUILTIN_SPANISH_INDEX = new Map<string, { enWord: string; item: BuiltInVocabItem }>();
for (const [enKey, item] of Object.entries(BUILTIN_VOCABULARY)) {
  if (item.translation) {
    const parts = item.translation
      .toLowerCase()
      .split(/[\/,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (!BUILTIN_SPANISH_INDEX.has(part)) {
        BUILTIN_SPANISH_INDEX.set(part, { enWord: enKey, item });
      }
    }
  }
}

const VALID_LEVELS: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Returns the CEFR level (A1–C2) for an English word or expression.
 * Uses the curated built-in vocabulary first, then the frequency-list estimator.
 */
export function getWordLevel(rawWord: string): WordLevel {
  const clean = (rawWord || '').trim().toLowerCase().replace(/^to\s+/, '');
  const builtin = BUILTIN_VOCABULARY[clean];
  if (builtin?.level && VALID_LEVELS.includes(builtin.level)) {
    return builtin.level;
  }
  return estimateCefrLevel(clean);
}

// In-memory cache for ultra-fast instant field auto-fill
const ENRICHMENT_CACHE = new Map<string, AutoEnrichResult>();
const TRANSLATION_CACHE = new Map<string, string>();

// ─── Preferred Provider (AI) ───────────────────────────────────────────────────
export function getPreferredTranslationProvider(): TranslationProvider {
  return 'ai';
}

export function setPreferredTranslationProvider(_provider: TranslationProvider): void {
  // AI is the dedicated translation provider
}

// ─── Gemini API Key & Helpers ──────────────────────────────────────────────────
export function getGeminiApiKey(): string {
  try {
    const local = appStorage.getItem(GEMINI_STORAGE_KEY);
    if (local && local.trim()) return local.trim();
  } catch {}
  return (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    DEFAULT_GEMINI_KEY
  ).trim();
}

export function setGeminiApiKey(key: string): void {
  try {
    const trimmed = (key || '').trim();
    if (trimmed) {
      appStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
    } else {
      appStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch {}
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export const GEMINI_AVAILABLE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

export async function testGeminiConnection(
  keyToTest?: string
): Promise<{ success: boolean; message: string; model?: string }> {
  const apiKey = (keyToTest !== undefined ? keyToTest : getGeminiApiKey()).trim();
  if (!apiKey) {
    return { success: false, message: 'No se ha proporcionado ninguna clave API.' };
  }

  const models = GEMINI_AVAILABLE_MODELS;
  let lastError = '';

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond strictly with valid JSON: {"status": "ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 50 },
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        return { success: true, message: `Conexión exitosa con ${model} de Google AI.`, model };
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `Error HTTP ${res.status}`;
        lastError = errMsg;
      }
    } catch (e: any) {
      lastError = e?.message || 'Error de red al conectar con Gemini';
    }
  }

  return { success: false, message: lastError || 'No se pudo conectar con la API de Gemini.' };
}

export async function translateWithGemini(
  text: string,
  fromLang: 'en' | 'es' | 'auto' = 'en',
  toLang: 'en' | 'es' = 'es',
  customApiKey?: string
): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  if (!networkService.isOnline()) return clean;

  const apiKey = (customApiKey !== undefined ? customApiKey : getGeminiApiKey()).trim();
  if (!apiKey) return '';

  const cacheKey = `gemini:${fromLang}:${toLang}:${clean.toLowerCase()}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey)!;
  }

  const fromLabel = fromLang === 'es' ? 'Spanish' : fromLang === 'en' ? 'English' : 'source language';
  const toLabel = toLang === 'es' ? 'Spanish' : 'English';
  const prompt = `You are a professional native translator. Translate the following text from ${fromLabel} to ${toLabel}.
Return strictly ONLY the translated text without quotes, commentary, markdown formatting, or introductory phrases:

${clean}`;

  for (const model of GEMINI_AVAILABLE_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 250,
          },
        }),
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw && typeof raw === 'string') {
          const result = raw.replace(/^["'`]|["'`]$/g, '').trim();
          if (result) {
            TRANSLATION_CACHE.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (e) {
      console.warn(`[translateWithGemini] Error with model ${model}:`, e);
    }
  }

  return '';
}

export async function translatePhrase(
  text: string,
  fromLang: 'en' | 'es' | 'auto' = 'en',
  toLang: 'en' | 'es' = 'es',
  _provider?: TranslationProvider
): Promise<{ text: string; providerUsed: TranslationProvider | 'builtin' }> {
  const clean = text.trim();
  if (!clean) return { text: '', providerUsed: 'builtin' };

  if (isGeminiConfigured()) {
    const geminiRes = await translateWithGemini(clean, fromLang, toLang);
    if (geminiRes) {
      return { text: geminiRes, providerUsed: 'ai' };
    }
  }

  const fallback = await translateText(clean, fromLang, toLang);
  return { text: fallback, providerUsed: 'builtin' };
}

// Queries Google Gemini free API for ultra-fast authentic lexical analysis (<1s)
export async function queryGeminiForWord(
  word: string,
  customApiKey?: string,
  sourceLang: 'en' | 'es' = 'en'
): Promise<AutoEnrichResult | null> {
  const clean = word.trim();
  if (!clean) return null;

  const cacheKey = `${sourceLang}:${clean.toLowerCase()}`;
  if (ENRICHMENT_CACHE.has(cacheKey)) {
    return ENRICHMENT_CACHE.get(cacheKey)!;
  }

  const apiKey = (customApiKey !== undefined ? customApiKey : getGeminiApiKey()).trim();
  if (!apiKey) return null;

  const prompt = sourceLang === 'es'
    ? `You are an expert bilingual lexicographer and English teacher.
Input Spanish word/phrase: "${clean}".
Generate a comprehensive, authentic dictionary entry in JSON format.
Requirements for sentences:
- exampleEn MUST be a natural, modern, authentic English sentence that clearly demonstrates the exact meaning and typical real-world usage of the English word.
- exampleEs MUST be a 100% natural, fluent, accurate Spanish translation of that exact English sentence (NEVER leave English words untranslated in Spanish).
- If there are other common translations or synonyms in English, provide them in the "alternatives" array.

Return ONLY a valid JSON object with NO extra text or markdown:
{
  "word": "Best single English word or short idiom (Capitalized)",
  "translation": "${clean.charAt(0).toUpperCase() + clean.slice(1)}",
  "alternatives": ["Other English translation 1", "Other English translation 2"],
  "partOfSpeech": "One of: Sustantivo, Verbo, Adjetivo, Adverbio, Preposición, Conjunción, Pronombre, Interjección, Artículo/determinante",
  "level": "CEFR: A1, A2, B1, B2, C1, or C2",
  "ipa": "/IPA phonetics for the English word/",
  "phoneticGuide": "\\"Spanish phonetic approximation for Spanish speakers\\"",
  "phoneticNote": "Short pronunciation tip in Spanish",
  "definition": "Concise Spanish definition",
  "exampleEn": "Natural modern English sentence demonstrating the word",
  "exampleEs": "Accurate, fluent Spanish translation of the sentence"
}`
    : `You are an expert bilingual lexicographer and English teacher.
Input English word/phrase: "${clean}".
Generate a comprehensive, authentic dictionary entry in JSON format.
Requirements for sentences:
- exampleEn MUST be a natural, modern, authentic English sentence that clearly demonstrates the exact meaning and typical real-world usage of "${clean}".
- exampleEs MUST be a 100% natural, fluent, accurate Spanish translation of that exact English sentence (NEVER leave English words untranslated in Spanish).
- If there are other common translations or synonyms in Spanish, provide them in the "alternatives" array.

Return ONLY a valid JSON object with NO extra text or markdown:
{
  "translation": "Best Spanish translation (Capitalized)",
  "alternatives": ["Other Spanish translation 1", "Other Spanish translation 2"],
  "partOfSpeech": "One of: Sustantivo, Verbo, Adjetivo, Adverbio, Preposición, Conjunción, Pronombre, Interjección, Artículo/determinante",
  "level": "CEFR: A1, A2, B1, B2, C1, or C2",
  "ipa": "/IPA phonetics/",
  "phoneticGuide": "\\"Spanish phonetic approximation for Spanish speakers\\"",
  "phoneticNote": "Short pronunciation tip in Spanish",
  "definition": "Concise Spanish definition",
  "exampleEn": "Natural modern English sentence demonstrating the word",
  "exampleEs": "Accurate, fluent Spanish translation of the sentence"
}`;

  const models = GEMINI_AVAILABLE_MODELS;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 500,
          },
        }),
      });
      clearTimeout(timer);

      if (!response.ok) {
        console.warn(`[Gemini API] Model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      const rawEnWord = sourceLang === 'es' ? (parsed.word || clean).trim() : clean;
      const capWord = rawEnWord.charAt(0).toUpperCase() + rawEnWord.slice(1);
      const pos = normalizePartOfSpeech(parsed.partOfSpeech || 'noun');

      const validLevels: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const level: WordLevel = validLevels.includes(parsed.level) ? parsed.level : 'B1';

      const rawTrans = (parsed.translation || clean).trim();
      const capTrans = rawTrans.charAt(0).toUpperCase() + rawTrans.slice(1);

      // Verify that exampleEn and exampleEs are natural and non-empty
      let finalExEn = (parsed.exampleEn || '').trim();
      let finalExEs = (parsed.exampleEs || '').trim();

      if (!finalExEn || finalExEn.toLowerCase().includes('is used in english')) {
        const fallbackPair = generateNaturalSentencePairSync(capWord, pos, capTrans);
        finalExEn = fallbackPair.exampleEn;
        finalExEs = fallbackPair.exampleEs;
      }

      const altsSet = new Set<string>();
      if (Array.isArray(parsed.alternatives)) {
        parsed.alternatives.forEach((a: any) => {
          if (typeof a === 'string' && a.trim()) {
            altsSet.add(a.trim().charAt(0).toUpperCase() + a.trim().slice(1));
          }
        });
      }
      if (capTrans.includes('/') || capTrans.includes(',')) {
        capTrans.split(/\s*[\/,;]\s*/).forEach((p) => {
          const cap = p.trim().charAt(0).toUpperCase() + p.trim().slice(1);
          if (cap) altsSet.add(cap);
        });
      }
      const alternatives = Array.from(altsSet);

      const result: AutoEnrichResult = {
        word: capWord,
        partOfSpeech: pos,
        level,
        ipa: (parsed.ipa || `/${rawEnWord.toLowerCase()}/`).trim(),
        phoneticGuide: (parsed.phoneticGuide || `"${rawEnWord.toLowerCase()}"`).trim(),
        phoneticNote: (parsed.phoneticNote || 'Pronunciación estándar en inglés').trim(),
        translation: capTrans,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        definition: (parsed.definition || `Término utilizado como ${pos} en inglés`).trim(),
        exampleEn: finalExEn,
        exampleEs: finalExEs,
        categoryGroup: '',
        categorySub: '',
      };

      ENRICHMENT_CACHE.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[Gemini API] Error querying ${model}:`, err);
    }
  }

  return null;
}

// Generates a natural, realistic English sentence containing the given word in proper grammatical context
export function createAuthenticEnglishSentence(word: string, pos?: string): string {
  const w = word.trim();
  const lower = w.toLowerCase();
  const p = (pos || '').toLowerCase();
  const hash = lower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // If the word contains a slash or comma, use the primary word for the sentence
  const primaryWord = w.split(/[\/,;]/)[0].trim();
  const primaryLower = primaryWord.toLowerCase();
  const cap = primaryWord.charAt(0).toUpperCase() + primaryWord.slice(1);

  if (p.includes('art')) {
    if (primaryLower === 'the') return 'The sun is shining brightly in the clear morning sky.';
    if (primaryLower === 'a') return 'She read a fascinating book about modern technology.';
    if (primaryLower === 'an') return 'He ate an apple while studying in the quiet library.';
    return `This day brought ${primaryLower} unexpected and welcome surprise.`;
  }

  if (p.includes('pron')) {
    if (['he', 'she', 'they', 'we', 'i', 'you'].includes(primaryLower)) {
      return `${cap} decided to visit the local library this afternoon.`;
    }
    return `Everyone agreed that ${primaryLower} was the best choice for the project.`;
  }

  if (p.includes('prep')) {
    const prepSentences = [
      `The important documents were placed ${primaryLower} the wooden desk.`,
      `They enjoyed a peaceful walk ${primaryLower} the quiet garden this morning.`,
      `We noticed an interesting detail ${primaryLower} the new presentation.`,
    ];
    return prepSentences[hash % prepSentences.length];
  }

  if (p.includes('conj')) {
    const conjSentences = [
      `We decided to stay inside ${primaryLower} the stormy weather intensified.`,
      `She continued to work hard ${primaryLower} she wanted to reach her goals.`,
      `They reviewed all the options ${primaryLower} they made the final choice.`,
    ];
    return conjSentences[hash % conjSentences.length];
  }

  if (p.includes('adv')) {
    const advSentences = [
      `She completed the entire project ${primaryLower} before the scheduled deadline.`,
      `He answered all the difficult questions ${primaryLower} during the interview.`,
      `We must proceed ${primaryLower} to ensure everything goes according to plan.`,
      `The team handled the unexpected situation ${primaryLower} and effectively.`,
    ];
    return advSentences[hash % advSentences.length];
  }

  if (p.includes('adj')) {
    const adjSentences = [
      `The company developed a very ${primaryLower} strategy to solve the challenge.`,
      `She gave a ${primaryLower} explanation that helped everyone understand the concept.`,
      `This is a ${primaryLower} example of how dedicated teamwork leads to success.`,
      `We noticed a ${primaryLower} improvement in overall performance this month.`,
      `Finding such a ${primaryLower} opportunity made a big difference in their careers.`,
    ];
    return adjSentences[hash % adjSentences.length];
  }

  if (p.includes('verb')) {
    const verbSentences = [
      `We need to ${primaryLower} carefully to achieve the best possible results.`,
      `They decided to ${primaryLower} together as soon as the project was approved.`,
      `It is important to ${primaryLower} consistently if you want to make steady progress.`,
      `She will ${primaryLower} with the team to ensure that every goal is met.`,
      `Before making a final choice, they took time to ${primaryLower} all details.`,
    ];
    return verbSentences[hash % verbSentences.length];
  }

  // Default / Noun
  const nounSentences = [
    `Understanding the concept of this ${primaryLower} will help us succeed.`,
    `She presented a detailed analysis of the ${primaryLower} during the meeting.`,
    `The team discussed how the ${primaryLower} could impact their upcoming plans.`,
    `He learned a lot about the ${primaryLower} through consistent practice and study.`,
    `They found a very interesting article about the ${primaryLower} online.`,
  ];
  return nounSentences[hash % nounSentences.length];
}

// Dedicated AI contextual sentence generator for any English or Spanish word
export async function generateExampleSentencesWithAI(
  word: string,
  translation?: string,
  pos?: string,
  customApiKey?: string
): Promise<{ exampleEn: string; exampleEs: string } | null> {
  const cleanWord = (word || '').trim();
  if (!cleanWord) return null;
  if (!networkService.isOnline()) return null;

  const cacheKey = `ai_sentence:${cleanWord.toLowerCase()}:${(translation || '').toLowerCase()}`;
  if (SENTENCE_PAIR_CACHE.has(cacheKey)) {
    return SENTENCE_PAIR_CACHE.get(cacheKey)!;
  }

  const apiKey = (customApiKey !== undefined ? customApiKey : getGeminiApiKey()).trim();

  if (apiKey) {
    const prompt = `You are an expert bilingual English-Spanish lexicographer and teacher.
Generate a modern, natural, authentic example sentence in English demonstrating the typical real-world usage of the word "${cleanWord}"${translation ? ` (Spanish translation: "${translation}")` : ''}${pos ? ` as a ${pos}` : ''}.
Then provide an accurate, fluent, and completely natural Spanish translation of that exact sentence.

Requirements:
1. The English sentence must naturally feature "${cleanWord}" in clear grammatical context.
2. The sentence should be modern, clear, practical, and helpful for language learners.
3. The Spanish translation MUST BE THE EXACT, FAITHFUL SPANISH TRANSLATION of the English sentence. Every word and meaning must correspond accurately between both languages.
4. Return ONLY a valid JSON object with NO extra text or markdown:
{
  "exampleEn": "Natural English sentence containing ${cleanWord}",
  "exampleEs": "Traducción exacta y natural al español"
}`;

    for (const model of GEMINI_AVAILABLE_MODELS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3800);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 350,
            },
          }),
        });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.exampleEn && parsed.exampleEs) {
              const pair = {
                exampleEn: parsed.exampleEn.trim(),
                exampleEs: parsed.exampleEs.trim(),
              };
              SENTENCE_PAIR_CACHE.set(cacheKey, pair);
              return pair;
            }
          }
        }
      } catch (e) {
        console.warn(`[generateExampleSentencesWithAI] Error with model ${model}:`, e);
      }
    }
  }

  // High-accuracy fallback: generate a grammatically correct sentence featuring cleanWord and translate it
  const fallbackEn = createAuthenticEnglishSentence(cleanWord, pos);
  const fallbackEs = await translateText(fallbackEn, 'en', 'es');
  const pair = {
    exampleEn: fallbackEn,
    exampleEs: fallbackEs || generateNaturalSentencePairSync(cleanWord, pos || 'Sustantivo', translation).exampleEs,
  };
  SENTENCE_PAIR_CACHE.set(cacheKey, pair);
  return pair;
}

// Ultra-fast translation helper with multi-tier caching and parallel/fallback providers (<100ms)
export async function translateText(
  text: string,
  fromLang: 'en' | 'es' | 'auto' = 'en',
  toLang: 'en' | 'es' = 'es'
): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  if (!networkService.isOnline()) return clean;

  const cacheKey = `${fromLang}:${toLang}:${clean.toLowerCase()}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey)!;
  }

  // 1. Instant check in local built-in dictionary (0ms)
  if (fromLang === 'en' && toLang === 'es' && BUILTIN_VOCABULARY[clean.toLowerCase()]) {
    const res = BUILTIN_VOCABULARY[clean.toLowerCase()].translation;
    if (res) {
      TRANSLATION_CACHE.set(cacheKey, res);
      return res;
    }
  }
  if (fromLang === 'es' && toLang === 'en' && BUILTIN_SPANISH_INDEX.has(clean.toLowerCase())) {
    const enKey = BUILTIN_SPANISH_INDEX.get(clean.toLowerCase())!.enWord;
    const capitalized = enKey.charAt(0).toUpperCase() + enKey.slice(1);
    TRANSLATION_CACHE.set(cacheKey, capitalized);
    return capitalized;
  }

  // 2. Ultra-fast Google Clients5 API (typically 40ms - 80ms)
  try {
    const sl = fromLang === 'auto' ? 'auto' : fromLang;
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${toLang}&q=${encodeURIComponent(clean)}`;
    const res = await fetchWithTimeout(url, {}, 850);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && typeof data[0] === 'string' && data[0].trim()) {
        const trans = data[0].trim();
        TRANSLATION_CACHE.set(cacheKey, trans);
        return trans;
      }
    }
  } catch (e) {}

  // 3. Fallback: MyMemory API (typically 120ms - 250ms)
  try {
    const pair = fromLang === 'es' ? 'es|en' : 'en|es';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${pair}`;
    const res = await fetchWithTimeout(url, {}, 1000);
    if (res.ok) {
      const data = await res.json();
      const txt = data?.responseData?.translatedText;
      if (txt && !txt.includes('MYMEMORY WARNING')) {
        const cleaned = txt.split(/[,;\/]/)[0].replace(/[.!]$/, '').trim();
        if (cleaned) {
          TRANSLATION_CACHE.set(cacheKey, cleaned);
          return cleaned;
        }
      }
    }
  } catch (e) {}

  // 4. Secondary fallback: Google Translate single endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetchWithTimeout(url, {}, 900);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.[0])) {
        const translated = data[0].map((item: any) => item[0]).join('').trim();
        if (translated) {
          TRANSLATION_CACHE.set(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (e) {}

  return clean;
}

// Retrieves accurate dictionary translation and part of speech from Google Translate Dictionary endpoint
export async function fetchGoogleDictionary(
  word: string,
  fromLang: 'en' | 'es' | 'auto' = 'en',
  toLang: 'en' | 'es' = 'es'
): Promise<{ translation: string; partOfSpeech?: string; alternatives?: string[]; detectedLang?: string }> {
  const clean = word.trim().toLowerCase();
  if (!networkService.isOnline()) return { translation: '' };

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&dt=bd&q=${encodeURIComponent(clean)}`;
    const res = await fetchWithTimeout(url, {}, 1800);
    if (res.ok) {
      const data = await res.json();
      let translation = '';
      let partOfSpeech: string | undefined = undefined;
      const alternatives: string[] = [];
      const detectedLang = typeof data?.[2] === 'string' ? data[2] : undefined;

      if (Array.isArray(data?.[0])) {
        translation = data[0].map((x: any) => x[0]).join('').trim();
      }

      if (Array.isArray(data?.[1]) && data[1].length > 0) {
        data[1].forEach((block: any) => {
          if (!partOfSpeech && block?.[0]) {
            partOfSpeech = normalizePartOfSpeech(block[0]);
          }
          if (Array.isArray(block?.[1])) {
            block[1].forEach((t: string) => {
              if (t && typeof t === 'string') {
                const trimmed = t.trim();
                const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                if (cap && !alternatives.includes(cap)) {
                  alternatives.push(cap);
                }
              }
            });
          }
        });
      }

      return { translation, partOfSpeech, alternatives, detectedLang };
    }
  } catch (e) {
    console.warn('[fetchGoogleDictionary] Error:', e);
  }
  return { translation: '' };
}

// Check if a given text is likely Spanish
export function isLikelySpanish(text: string): boolean {
  const clean = text.trim().toLowerCase();
  if (!clean) return false;
  if (/[áéíóúñü¿¡]/.test(clean)) return true;
  const spanishMarkers = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'en', 'para', 'por', 'con', 'sin', 'sobre',
    'pero', 'que', 'como', 'cuando', 'donde', 'porque',
    'casa', 'tiempo', 'año', 'día', 'vida', 'trabajo', 'hacer',
    'desarrollo', 'compromiso', 'reunión', 'manzana', 'perro', 'gato'
  ]);
  const words = clean.split(/\s+/);
  return words.some((w) => spanishMarkers.has(w));
}

// Normalized part of speech mapping with precedence order into the 9 Spanish categories
export function normalizePartOfSpeech(pos: string): PartOfSpeech {
  const p = (pos || '').toLowerCase().trim();
  if (!p) return 'Sustantivo';
  if (p.includes('art') || p.includes('determ')) return 'Artículo/determinante';
  if (p.includes('adv')) return 'Adverbio';
  if (p.includes('adj')) return 'Adjetivo';
  if (p.includes('pron')) return 'Pronombre';
  if (p.includes('prep')) return 'Preposición';
  if (p.includes('conj')) return 'Conjunción';
  if (p.includes('interj') || p.includes('exclam')) return 'Interjección';
  if (p.includes('phrasal') || p.includes('verb')) return 'Verbo';
  if (p.includes('noun') || p.includes('sustantiv')) return 'Sustantivo';
  return 'Sustantivo';
}

export function detectQuickPartOfSpeech(word: string): PartOfSpeech | null {
  const w = word.toLowerCase().trim();
  if (!w) return null;

  // 1. Determiners & Articles
  if (['the', 'a', 'an', 'this', 'that', 'these', 'those', 'every', 'each', 'some', 'any', 'no', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'much', 'many', 'several', 'few', 'little', 'all', 'both', 'either', 'neither', 'another', 'such'].includes(w)) {
    return 'Artículo/determinante';
  }

  // 2. Pronouns
  if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'mine', 'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'who', 'whom', 'whose', 'which', 'what', 'anyone', 'someone', 'everyone', 'nobody', 'anything', 'something', 'everything', 'nothing', 'somebody', 'anybody', 'everybody', 'no one'].includes(w)) {
    return 'Pronombre';
  }

  // 3. Prepositions
  if (['in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'off', 'over', 'under', 'toward', 'towards', 'behind', 'across', 'without', 'within', 'along', 'among', 'around', 'beneath', 'beside', 'besides', 'beyond', 'inside', 'outside', 'near', 'upon', 'throughout', 'despite', 'except'].includes(w)) {
    return 'Preposición';
  }

  // 4. Conjunctions
  if (['and', 'but', 'or', 'so', 'because', 'although', 'since', 'unless', 'while', 'whereas', 'if', 'nor', 'yet', 'either', 'neither', 'whether', 'though', 'even though', 'provided'].includes(w)) {
    return 'Conjunción';
  }

  // 5. Interjections
  if (['wow', 'oh', 'hey', 'hello', 'hi', 'oops', 'ouch', 'alas', 'yay', 'hurray', 'ah', 'aha', 'bravo', 'bingo', 'hooray', 'gosh', 'yeah', 'yep', 'nope'].includes(w)) {
    return 'Interjección';
  }

  // 6. Irregular verbs from catalog
  if (IRREGULAR_VERB_SET.has(w)) {
    return 'Verbo';
  }

  // Common verbs and auxiliaries/modals
  if (['be', 'is', 'am', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'done', 'doing', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'ought', 'go', 'make', 'take', 'see', 'come', 'get', 'give', 'know', 'think', 'say', 'look', 'want', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'run', 'read', 'write', 'learn', 'play', 'eat', 'drink', 'walk', 'speak', 'talk', 'listen', 'watch', 'stand', 'sit', 'buy', 'sell', 'pay', 'meet', 'send', 'build', 'understand', 'remember', 'love', 'like', 'hate', 'need', 'believe', 'live', 'die', 'open', 'close', 'start', 'begin', 'stop', 'finish', 'end', 'help', 'keep', 'put', 'set', 'turn', 'move', 'change', 'follow', 'decide', 'show', 'hear', 'allow', 'create', 'carry'].includes(w)) {
    return 'Verbo';
  }

  // Verbs ending in -ize, -ise, -ify, -ate
  if (w.length > 5 && (w.endsWith('ize') || w.endsWith('ise') || w.endsWith('ify') || w.endsWith('ate'))) {
    return 'Verbo';
  }

  // 7. Adverbs
  const nonAdverbsEndingInLy = ['friendly', 'lovely', 'lonely', 'silly', 'ugly', 'likely', 'deadly', 'lively', 'elderly', 'costly', 'orderly', 'timely', 'holy', 'fly', 'rely', 'apply', 'supply', 'jelly', 'belly'];
  if (w.length > 3 && w.endsWith('ly') && !nonAdverbsEndingInLy.includes(w)) {
    return 'Adverbio';
  }

  if (['quickly', 'slowly', 'always', 'never', 'often', 'sometimes', 'usually', 'seldom', 'rarely', 'hardly', 'scarcely', 'barely', 'already', 'soon', 'late', 'early', 'now', 'then', 'today', 'tomorrow', 'yesterday', 'tonight', 'here', 'there', 'everywhere', 'nowhere', 'somewhere', 'anywhere', 'very', 'quite', 'rather', 'pretty', 'extremely', 'fairly', 'too', 'almost', 'nearly', 'just', 'only', 'even', 'also', 'together', 'apart', 'instead', 'perhaps', 'maybe', 'probably', 'possibly', 'certainly', 'definitely', 'actually', 'really', 'indeed'].includes(w)) {
    return 'Adverbio';
  }

  // 8. Adjectives
  if (['good', 'bad', 'big', 'small', 'great', 'new', 'old', 'young', 'important', 'beautiful', 'happy', 'sad', 'fast', 'slow', 'hard', 'easy', 'different', 'same', 'high', 'low', 'early', 'late', 'strong', 'weak', 'rich', 'poor', 'long', 'short', 'hot', 'cold', 'warm', 'cool', 'clean', 'dirty', 'dark', 'bright', 'tired', 'safe', 'dangerous', 'right', 'wrong', 'true', 'false', 'simple', 'complex', 'special', 'common', 'rare', 'clear', 'ready', 'sure', 'certain', 'possible', 'impossible'].includes(w)) {
    return 'Adjetivo';
  }

  if (w.length > 4 && (w.endsWith('able') || w.endsWith('ible') || w.endsWith('ful') || w.endsWith('less') || w.endsWith('ous') || w.endsWith('ious') || w.endsWith('ic') || w.endsWith('ive') || w.endsWith('ish'))) {
    return 'Adjetivo';
  }

  // 9. Nouns by suffix
  if (w.length > 5 && (w.endsWith('tion') || w.endsWith('sion') || w.endsWith('ment') || w.endsWith('ness') || w.endsWith('ity') || w.endsWith('ance') || w.endsWith('ence') || w.endsWith('ship') || w.endsWith('hood') || w.endsWith('ism') || w.endsWith('ist'))) {
    return 'Sustantivo';
  }

  return null;
}

// Searches Tatoeba for authentic bilingual human-reviewed sentences
async function fetchTatoebaSentence(word: string): Promise<{ exampleEn: string; exampleEs?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    const res = await fetch(
      `https://tatoeba.org/en/api_v0/search?from=eng&to=spa&query=${encodeURIComponent(word.toLowerCase().trim())}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.results) && data.results.length > 0) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        const match = data.results.find((r: any) => r.text && regex.test(r.text));
        if (match) {
          const trans = match.translations?.[0]?.[0]?.text;
          return { exampleEn: match.text, exampleEs: trans };
        }
      }
    }
  } catch {}
  return null;
}

const SENTENCE_PAIR_CACHE = new Map<string, { exampleEn: string; exampleEs: string }>();

// Generates an authentic, grammatically correct contextual sentence pair instantly in 0ms synchronously
export function generateNaturalSentencePairSync(
  word: string,
  pos: string,
  translationFallback?: string
): { exampleEn: string; exampleEs: string } {
  const w = word.trim().toLowerCase();
  const cap = w.charAt(0).toUpperCase() + w.slice(1);
  const p = (pos || '').toLowerCase();

  // Determine a proper Spanish term for the word
  const spanishTerm = (translationFallback || BUILTIN_VOCABULARY[w]?.translation || '').trim();
  const esWord = spanishTerm ? spanishTerm.toLowerCase() : '';
  const capEs = esWord ? esWord.charAt(0).toUpperCase() + esWord.slice(1) : '';

  const cacheKey = `${w}:${p}:${esWord}`;
  if (SENTENCE_PAIR_CACHE.has(cacheKey)) {
    return SENTENCE_PAIR_CACHE.get(cacheKey)!;
  }

  const hash = w.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let pair: { exampleEn: string; exampleEs: string };

  if (p.includes('art')) {
    if (w === 'the') {
      pair = { exampleEn: 'The sun rises in the morning and sets in the evening.', exampleEs: 'El sol sale por la mañana y se pone por la tarde.' };
    } else if (w === 'a') {
      pair = { exampleEn: 'I read a wonderful book about global history.', exampleEs: 'Leí un libro maravilloso sobre historia universal.' };
    } else if (w === 'an') {
      pair = { exampleEn: 'She ate an apple while studying in the quiet library.', exampleEs: 'Ella comió una manzana mientras estudiaba en la tranquila biblioteca.' };
    } else {
      pair = { exampleEn: `${cap} day is shining brightly today.`, exampleEs: `Este día brilla con intensidad hoy.` };
    }
  } else if (p.includes('adv')) {
    const tEn = [
      `She spoke ${w} to ensure everyone understood the message.`,
      `He completed the project ${w} before the final deadline.`,
      `We must act ${w} to achieve our long-term goals.`,
    ];
    const tEs = esWord ? [
      `Ella habló ${esWord} para asegurarse de que todos entendieran el mensaje.`,
      `Él completó el proyecto ${esWord} antes de la fecha límite final.`,
      `Debemos actuar ${esWord} para alcanzar nuestras metas a largo plazo.`,
    ] : [
      `Ella se expresó con claridad para que todos entendieran el mensaje.`,
      `Él completó el proyecto a tiempo antes de la fecha límite final.`,
      `Debemos actuar con rapidez para alcanzar nuestras metas a largo plazo.`,
    ];
    const idx = hash % tEn.length;
    pair = { exampleEn: tEn[idx], exampleEs: tEs[idx] };
  } else if (p.includes('adj')) {
    const tEn = [
      `The team proposed a ${w} solution to solve the challenge.`,
      `It was a ${w} opportunity to acquire new valuable skills.`,
      `They observed a ${w} difference in overall performance.`,
    ];
    const tEs = esWord ? [
      `El equipo propuso una solución ${esWord} para resolver el desafío.`,
      `Fue una oportunidad ${esWord} para adquirir nuevas habilidades valiosas.`,
      `Observaron una diferencia ${esWord} en el rendimiento general.`,
    ] : [
      `El equipo propuso una solución eficaz para resolver el desafío.`,
      `Fue una oportunidad excelente para adquirir nuevas habilidades valiosas.`,
      `Observaron una diferencia notable en el rendimiento general.`,
    ];
    const idx = hash % tEn.length;
    pair = { exampleEn: tEn[idx], exampleEs: tEs[idx] };
  } else if (p.includes('verb')) {
    const tEn = [
      `I always ${w} in the morning to prepare for my day.`,
      `They decided to ${w} together on the important project.`,
      `You should ${w} consistently to make great progress.`,
      `We plan to ${w} our results at the annual conference.`,
    ];
    const tEs = esWord ? [
      `Siempre suelo ${esWord} por la mañana para prepararme para el día.`,
      `Decidieron ${esWord} juntos en este importante proyecto.`,
      `Deberías ${esWord} con constancia para lograr un gran progreso.`,
      `Planeamos ${esWord} nuestros resultados en la conferencia anual.`,
    ] : [
      `Siempre dedico tiempo por la mañana a prepararme para el día.`,
      `Decidieron trabajar juntos en este importante proyecto.`,
      `Deberías practicar con constancia para lograr un gran progreso.`,
      `Planeamos presentar nuestros resultados en la conferencia anual.`,
    ];
    const idx = hash % tEn.length;
    pair = { exampleEn: tEn[idx], exampleEs: tEs[idx] };
  } else if (p.includes('prep')) {
    const tEn = [
      `The notebook was placed ${w} the wooden study desk.`,
      `We walked ${w} the quiet path near the forest.`,
    ];
    const tEs = esWord ? [
      `El cuaderno estaba colocado ${esWord} el escritorio de estudio de madera.`,
      `Caminamos ${esWord} el sendero tranquilo cerca del bosque.`,
    ] : [
      `El cuaderno estaba colocado sobre el escritorio de estudio de madera.`,
      `Caminamos por el sendero tranquilo cerca del bosque.`,
    ];
    const idx = hash % tEn.length;
    pair = { exampleEn: tEn[idx], exampleEs: tEs[idx] };
  } else if (p.includes('conj')) {
    pair = {
      exampleEn: `We stayed inside ${w} the stormy weather intensified.`,
      exampleEs: esWord
        ? `Nos quedamos adentro ${esWord} el clima tormentoso se intensificó.`
        : `Nos quedamos adentro porque el clima tormentoso se intensificó.`,
    };
  } else if (p.includes('pron')) {
    pair = {
      exampleEn: `${cap} decided to visit the local library today.`,
      exampleEs: capEs
        ? `${capEs} decidió visitar la biblioteca local hoy.`
        : `Decidió visitar la biblioteca local hoy.`,
    };
  } else if (p.includes('phrasal') || p.includes('idiom') || w.includes(' ')) {
    pair = {
      exampleEn: `We need to ${w} as soon as we finish this task.`,
      exampleEs: esWord
        ? `Necesitamos ${esWord} tan pronto como terminemos esta tarea.`
        : `Necesitamos llevarlo a cabo tan pronto como terminemos esta tarea.`,
    };
  } else {
    // Nouns
    const primaryEs = esWord ? esWord.split(/[\/,;]/)[0].trim() : '';
    const tEn = [
      `She found a very interesting book about the ${w}.`,
      `The team analyzed the importance of the ${w} in detail.`,
      `We need to examine this ${w} carefully to understand how it works.`,
      `Understanding the concept of this ${w} will help us succeed.`,
    ];
    const tEs = primaryEs ? [
      `Ella encontró un libro muy interesante sobre el tema (${primaryEs}).`,
      `El equipo analizó la importancia de este aspecto (${primaryEs}) en detalle.`,
      `Necesitamos examinar esto (${primaryEs}) detenidamente para entender cómo funciona.`,
      `Comprender el concepto de esto (${primaryEs}) nos ayudará a tener éxito.`,
    ] : [
      `Ella encontró un libro muy interesante sobre este tema.`,
      `El equipo analizó la importancia de este aspecto en detalle.`,
      `Necesitamos examinar este asunto detenidamente para entender cómo funciona.`,
      `Comprender este concepto nos ayudará a tener éxito.`,
    ];
    const idx = hash % tEn.length;
    pair = { exampleEn: tEn[idx], exampleEs: tEs[idx] };
  }

  SENTENCE_PAIR_CACHE.set(cacheKey, pair);
  return pair;
}

// Asynchronous authentic sentence pair generator: translates English sentence faithfully into Spanish
export async function generateNaturalSentencePair(
  word: string,
  pos: string,
  translationFallback?: string
): Promise<{ exampleEn: string; exampleEs: string }> {
  const sentenceEn = createAuthenticEnglishSentence(word, pos);
  const sentenceEs = await translateText(sentenceEn, 'en', 'es');
  if (sentenceEs && sentenceEs.toLowerCase() !== sentenceEn.toLowerCase()) {
    return { exampleEn: sentenceEn, exampleEs: sentenceEs };
  }
  return generateNaturalSentencePairSync(word, pos, translationFallback);
}

// Robust converter: Turns English IPA transcriptions into natural Spanish phonetic guides
// (how a Spanish speaker reads it to pronounce natural English)
export function ipaToPhoneticGuide(ipa: string, wordFallback?: string): string {
  if (!ipa || typeof ipa !== 'string') {
    return wordFallback ? generatePhoneticGuide(wordFallback) : '""';
  }

  // Clean outer brackets and slashes
  const clean = ipa.replace(/[\/\[\]]/g, '').trim();
  if (!clean) {
    return wordFallback ? generatePhoneticGuide(wordFallback) : '""';
  }

  // Handle multi-word expressions
  const words = clean.split(/\s+/);

  const processWordIpa = (wIpa: string): string => {
    // Break into syllables if periods or hyphens exist
    const rawSyllables = wIpa.split(/[.\-]/);
    const convertedSyllables = rawSyllables.map((syl) => {
      const isStressed = syl.includes('ˈ') || syl.includes('ˌ');
      let s = syl.replace(/[ˈˌ]/g, '');

      // Multi-character vowels & diphthongs first
      s = s
        .replace(/aɪər|aɪə/g, 'aier')
        .replace(/aʊər|aʊə/g, 'auer')
        .replace(/eɪ/g, 'ei')
        .replace(/aɪ/g, 'ai')
        .replace(/ɔɪ/g, 'oi')
        .replace(/aʊ/g, 'au')
        .replace(/oʊ|əʊ/g, 'ou')
        .replace(/iː/g, 'ii')
        .replace(/uː/g, 'uu')
        .replace(/ɜːr|ɝ|ɜː|ɜr/g, 'er')
        .replace(/ɔːr|ɔr/g, 'oor')
        .replace(/ɑːr|ɑr/g, 'aar')
        .replace(/ɪər|iər/g, 'ier')
        .replace(/eər|ɛər/g, 'er')
        .replace(/ʊər/g, 'uer')
        .replace(/ər|ɚ/g, 'er')
        .replace(/ɑː|ɑ/g, 'aa')
        .replace(/ɔː|ɔ/g, 'oo')
        .replace(/ɪ/g, 'i')
        .replace(/ʊ/g, 'u')
        .replace(/ɛ|e/g, 'e')
        .replace(/æ/g, 'a')
        .replace(/ʌ/g, 'a')
        .replace(/ɒ/g, 'o')
        .replace(/əl/g, 'l')
        .replace(/ən/g, 'n')
        .replace(/əm/g, 'm')
        .replace(/ə/g, 'e');

      // Consonants
      s = s
        .replace(/tʃ/g, 'ch')
        .replace(/dʒ/g, 'dy')
        .replace(/θ/g, 'z')
        .replace(/ð/g, 'd')
        .replace(/ʃ/g, 'sh')
        .replace(/ʒ/g, 'zh')
        .replace(/ŋ/g, 'ng')
        .replace(/j/g, 'y')
        .replace(/w/g, 'u')
        .replace(/h/g, 'j')
        .replace(/ɡ/g, 'g')
        .replace(/ɹ/g, 'r');

      // Spanish pronunciation safeguard: hard G before e or i must be written 'gu' (e.g. "guit", "guet")
      s = s.replace(/g([ei])/g, 'gu$1');

      // Add accent mark on primary vowel if syllable is stressed and word has multiple syllables
      if (isStressed && rawSyllables.length > 1) {
        if (s.includes('ei')) s = s.replace('ei', 'éi');
        else if (s.includes('ai')) s = s.replace('ai', 'ái');
        else if (s.includes('ou')) s = s.replace('ou', 'óu');
        else if (s.includes('au')) s = s.replace('au', 'áu');
        else if (s.includes('oi')) s = s.replace('oi', 'ói');
        else if (s.includes('ii')) s = s.replace('ii', 'íi');
        else if (s.includes('uu')) s = s.replace('uu', 'úu');
        else if (s.includes('aa')) s = s.replace('aa', 'áa');
        else if (s.includes('oo')) s = s.replace('oo', 'óo');
        else if (s.includes('iu')) s = s.replace('iu', 'iú');
        else if (s.includes('a')) s = s.replace('a', 'á');
        else if (s.includes('e')) s = s.replace('e', 'é');
        else if (s.includes('i')) s = s.replace('i', 'í');
        else if (s.includes('o')) s = s.replace('o', 'ó');
        else if (s.includes('u')) s = s.replace('u', 'ú');
      }

      return s;
    });

    return convertedSyllables.filter(Boolean).join('-');
  };

  const result = words.map(processWordIpa).join(' ').trim();
  return result ? `"${result}"` : (wordFallback ? generatePhoneticGuide(wordFallback) : '""');
}

// Algorithmic English-to-IPA generator (0ms fallback when offline or novel words)
export function estimateIpa(word: string): string {
  const clean = word.toLowerCase().trim();
  if (!clean) return '';

  // Direct lookup in our lexical stores
  if (BUILTIN_VOCABULARY[clean]?.ipa) return BUILTIN_VOCABULARY[clean].ipa!;
  if (COMMON_ENGLISH_PHONETICS[clean]?.ipa) return COMMON_ENGLISH_PHONETICS[clean].ipa;
  if (IRREGULAR_VERB_PHONETICS[clean]) return IRREGULAR_VERB_PHONETICS[clean];

  let ipa = clean;

  // 1. Silent letters & consonant combinations
  ipa = ipa
    .replace(/^kn/, 'n')
    .replace(/^wr/, 'r')
    .replace(/^ps/, 's')
    .replace(/^gn/, 'n')
    .replace(/mb$/, 'm')
    .replace(/mn$/, 'm')
    .replace(/bt$/, 't')
    .replace(/alk\b/g, 'ɔːk')
    .replace(/alf\b/g, 'ɑːf')
    .replace(/alm\b/g, 'ɑːm')
    .replace(/ould\b/g, 'ʊd');

  // 2. Common suffixes & digraphs
  ipa = ipa
    .replace(/tion\b/g, '.ʃən')
    .replace(/sion\b/g, '.ʒən')
    .replace(/ture\b/g, '.tʃər')
    .replace(/sure\b/g, '.ʒər')
    .replace(/cious\b|tious\b/g, '.ʃəs')
    .replace(/cial\b|tial\b/g, '.ʃəl')
    .replace(/ought\b|aught\b/g, 'ɔːt')
    .replace(/ight\b/g, 'aɪt')
    .replace(/igh\b/g, 'aɪ')
    .replace(/ing\b/g, '.ɪŋ')
    .replace(/ness\b/g, '.nɪs')
    .replace(/ment\b/g, '.mənt')
    .replace(/able\b/g, '.ə.bəl')
    .replace(/ible\b/g, '.ɪ.bəl')
    .replace(/ful\b/g, '.fʊl')
    .replace(/less\b/g, '.lɪs')
    .replace(/ly\b/g, '.li')
    .replace(/ity\b/g, '.ɪ.ti');

  // 3. Vowel patterns
  ipa = ipa
    .replace(/ee|ea/g, 'iː')
    .replace(/oo/g, 'uː')
    .replace(/all\b/g, 'ɔːl')
    .replace(/ar\b/g, 'ɑːr')
    .replace(/or\b/g, 'ɔːr')
    .replace(/er\b|ir\b|ur\b/g, 'ɜːr')
    .replace(/ay\b|ai/g, 'eɪ')
    .replace(/oy\b|oi/g, 'ɔɪ')
    .replace(/ow\b|ou/g, 'aʊ')
    .replace(/au|aw/g, 'ɔː');

  // 4. Magic-e rule: vowel + consonant + e at word boundary
  ipa = ipa
    .replace(/([bcdfghjklmnpqrstvwxyz])a([bcdfghjklmnpqrstvwxyz])e\b/g, '$1eɪ$2')
    .replace(/([bcdfghjklmnpqrstvwxyz])i([bcdfghjklmnpqrstvwxyz])e\b/g, '$1aɪ$2')
    .replace(/([bcdfghjklmnpqrstvwxyz])o([bcdfghjklmnpqrstvwxyz])e\b/g, '$1oʊ$2')
    .replace(/([bcdfghjklmnpqrstvwxyz])u([bcdfghjklmnpqrstvwxyz])e\b/g, '$1juː$2');

  // 5. Consonants
  ipa = ipa
    .replace(/th/g, 'θ')
    .replace(/sh/g, 'ʃ')
    .replace(/ch/g, 'tʃ')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'kw')
    .replace(/wh/g, 'w')
    .replace(/x/g, 'ks')
    .replace(/c([eiy])/g, 's$1')
    .replace(/c/g, 'k');

  // Add primary stress mark on the first syllable if not already present
  if (!ipa.includes('ˈ') && !ipa.includes('ˌ')) {
    ipa = 'ˈ' + ipa;
  }

  return `/${ipa}/`;
}

// Algorithmic phonetic approximation generator (0ms)
export function generatePhoneticGuide(word: string, ipaHint?: string): string {
  const clean = word.toLowerCase().trim();
  if (!clean) return '""';

  // 1. Direct lexical lookup
  if (BUILTIN_VOCABULARY[clean]?.phoneticGuide) return BUILTIN_VOCABULARY[clean].phoneticGuide!;
  if (COMMON_ENGLISH_PHONETICS[clean]?.phoneticGuide) return COMMON_ENGLISH_PHONETICS[clean].phoneticGuide;
  if (IRREGULAR_VERB_PHONETICS[clean]) {
    return ipaToPhoneticGuide(IRREGULAR_VERB_PHONETICS[clean], clean);
  }

  // 2. If IPA hint is provided, derive from it
  if (ipaHint) {
    return ipaToPhoneticGuide(ipaHint, clean);
  }

  // 3. Fallback: generate via estimated IPA
  const estimated = estimateIpa(clean);
  return ipaToPhoneticGuide(estimated, clean);
}

// Unified synchronous phonetic getter: returns both IPA and Spanish phonetic guide
export function getPhoneticsForEnglishWord(rawWord: string): { ipa: string; phoneticGuide: string } {
  const clean = (rawWord || '').trim().toLowerCase();
  if (!clean) {
    return { ipa: '', phoneticGuide: '' };
  }

  // 1. Built-in vocabulary
  if (BUILTIN_VOCABULARY[clean]) {
    const item = BUILTIN_VOCABULARY[clean];
    const ipa = item.ipa || estimateIpa(clean);
    const phoneticGuide = item.phoneticGuide || ipaToPhoneticGuide(ipa, clean);
    return { ipa, phoneticGuide };
  }

  // 2. Common English phonetics map
  if (COMMON_ENGLISH_PHONETICS[clean]) {
    const item = COMMON_ENGLISH_PHONETICS[clean];
    return { ipa: item.ipa, phoneticGuide: item.phoneticGuide };
  }

  // 3. Irregular verbs
  if (IRREGULAR_VERB_PHONETICS[clean]) {
    const ipa = IRREGULAR_VERB_PHONETICS[clean];
    const phoneticGuide = ipaToPhoneticGuide(ipa, clean);
    return { ipa, phoneticGuide };
  }

  // 4. Algorithmic estimation
  const ipa = estimateIpa(clean);
  const phoneticGuide = ipaToPhoneticGuide(ipa, clean);
  return { ipa, phoneticGuide };
}

// Synchronous instant predictor for 0ms immediate UI auto-fill while typing
export function getInstantEnrichmentSync(
  rawWord: string,
  sourceLang: 'en' | 'es' = 'en'
): Partial<AutoEnrichResult> | null {
  const clean = rawWord.trim().toLowerCase();
  if (!clean || clean.length < 2) return null;

  const effectiveLang: 'en' | 'es' = sourceLang === 'en' && isLikelySpanish(clean) ? 'es' : sourceLang;
  const cacheKey = `${effectiveLang}:${clean}`;

  if (ENRICHMENT_CACHE.has(cacheKey)) {
    return ENRICHMENT_CACHE.get(cacheKey)!;
  }

  if (effectiveLang === 'es') {
    if (BUILTIN_SPANISH_INDEX.has(clean)) {
      const match = BUILTIN_SPANISH_INDEX.get(clean)!;
      const enKey = match.enWord;
      const item = match.item;
      const pos = normalizePartOfSpeech(item.partOfSpeech || 'noun');
      const pair = generateNaturalSentencePairSync(enKey, pos, rawWord.trim());
      const phon = getPhoneticsForEnglishWord(enKey);
      return {
        word: enKey.charAt(0).toUpperCase() + enKey.slice(1),
        partOfSpeech: pos,
        level: item.level || getWordLevel(enKey),
        ipa: phon.ipa,
        phoneticGuide: phon.phoneticGuide,
        phoneticNote: item.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
        translation: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
        definition: item.definition || `Término utilizado como ${pos} en inglés`,
        exampleEn: item.exampleEn || pair.exampleEn,
        exampleEs: item.exampleEs || pair.exampleEs,
      };
    }
    return null;
  }

  // English:
  const phon = getPhoneticsForEnglishWord(clean);
  if (BUILTIN_VOCABULARY[clean]) {
    const item = BUILTIN_VOCABULARY[clean];
    const pos = normalizePartOfSpeech(item.partOfSpeech || 'noun');
    const pair = generateNaturalSentencePairSync(clean, pos, item.translation);
    const alts = item.translation && (item.translation.includes('/') || item.translation.includes(','))
      ? item.translation.split(/\s*[\/,;]\s*/).map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)).filter(Boolean)
      : undefined;
    return {
      word: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
      partOfSpeech: pos,
      level: item.level || getWordLevel(clean),
      ipa: phon.ipa,
      phoneticGuide: phon.phoneticGuide,
      phoneticNote: item.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
      translation: item.translation || '',
      alternatives: alts,
      definition: item.definition || `Término utilizado como ${pos} en inglés`,
      exampleEn: item.exampleEn || pair.exampleEn,
      exampleEs: item.exampleEs || pair.exampleEs,
    };
  }

  // Instant structural estimates for novel English words (0ms)
  const pos = detectQuickPartOfSpeech(clean) || 'Sustantivo';
  const pair = generateNaturalSentencePairSync(clean, pos);
  return {
    word: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
    partOfSpeech: pos,
    ipa: phon.ipa,
    phoneticGuide: phon.phoneticGuide,
    exampleEn: pair.exampleEn,
    exampleEs: pair.exampleEs,
  };
}

// Main auto-enrich function supporting English and Spanish input languages (Lightning fast <100ms)
export async function autoEnrichWord(
  rawWord: string,
  sourceLang: 'en' | 'es' = 'en',
  useAi: boolean = true,
  _provider?: TranslationProvider
): Promise<AutoEnrichResult> {
  const clean = rawWord.trim().toLowerCase();
  if (!clean) {
    throw new Error('La palabra no puede estar vacía');
  }

  // Auto-detect: if language is 'en' but text contains Spanish-specific characters, switch to 'es'
  const effectiveLang: 'en' | 'es' = sourceLang === 'en' && isLikelySpanish(clean) ? 'es' : sourceLang;
  const cacheKey = `ai:${effectiveLang}:${clean}`;

  // 0. Instant Cache check (0ms)
  if (ENRICHMENT_CACHE.has(cacheKey)) {
    return ENRICHMENT_CACHE.get(cacheKey)!;
  }

  // 1. Explicit AI (Gemini) suggestion (when configured and requested)
  if (useAi && isGeminiConfigured()) {
    try {
      const geminiResult = await queryGeminiForWord(clean, undefined, effectiveLang);
      if (geminiResult) {
        ENRICHMENT_CACHE.set(cacheKey, geminiResult);
        return geminiResult;
      }
    } catch (e) {
      console.warn('[autoEnrichWord] Explicit Gemini query failed, continuing with fast fallback:', e);
    }
  }

  // ----------------------------------------------------
  // PATH A: Input word is in SPANISH (Español -> Inglés)
  // ----------------------------------------------------
  if (effectiveLang === 'es') {
    // 1. Instant check in Built-in Spanish reverse index (0ms O(1))
    if (BUILTIN_SPANISH_INDEX.has(clean)) {
      const match = BUILTIN_SPANISH_INDEX.get(clean)!;
      const enKey = match.enWord;
      const item = match.item;
      const capitalizedEn = enKey.charAt(0).toUpperCase() + enKey.slice(1);
      const capitalizedEs = rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1);
      const pos = normalizePartOfSpeech(item.partOfSpeech || 'noun');
      const pair = generateNaturalSentencePairSync(enKey, pos, capitalizedEs);
      const phon = getPhoneticsForEnglishWord(enKey);

      const altsSet = new Set<string>();
      if (item.translation && (item.translation.includes('/') || item.translation.includes(','))) {
        item.translation.split(/\s*[\/,;]\s*/).forEach((p) => {
          const cap = p.trim().charAt(0).toUpperCase() + p.trim().slice(1);
          if (cap) altsSet.add(cap);
        });
      }
      const alternatives = Array.from(altsSet);

      const result: AutoEnrichResult = {
        word: capitalizedEn,
        partOfSpeech: pos,
        level: item.level || getWordLevel(enKey),
        ipa: item.ipa || phon.ipa,
        phoneticGuide: item.phoneticGuide || phon.phoneticGuide,
        phoneticNote: item.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
        translation: capitalizedEs,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        definition: item.definition || `Término utilizado como ${pos} en inglés`,
        exampleEn: item.exampleEn || pair.exampleEn,
        exampleEs: item.exampleEs || pair.exampleEs,
        categoryGroup: item.categoryGroup || '',
        categorySub: item.categorySub || '',
      };
      ENRICHMENT_CACHE.set(cacheKey, result);
      return result;
    }

    // 2. Fast Concurrent Translation (40ms - 80ms)
    const [translatedEn, googleDict] = await Promise.all([
      translateText(clean, 'es', 'en'),
      fetchGoogleDictionary(clean, 'es', 'en').catch(() => null),
    ]);
    const cleanEn = (translatedEn || googleDict?.translation || clean).replace(/^to\s+/i, '').replace(/[.!,?]$/, '').trim().toLowerCase();
    const finalEnWord = cleanEn || clean;
    const capitalizedEn = finalEnWord.charAt(0).toUpperCase() + finalEnWord.slice(1);
    const capitalizedEs = rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1);

    const finalPos: PartOfSpeech = googleDict?.partOfSpeech
      ? normalizePartOfSpeech(googleDict.partOfSpeech)
      : (detectQuickPartOfSpeech(finalEnWord) || 'Sustantivo');
    const phon = getPhoneticsForEnglishWord(finalEnWord);
    const finalIpa = phon.ipa;
    const finalGuide = phon.phoneticGuide;
    // Generate an authentic English sentence featuring the word, and its exact Spanish translation
    let pair: { exampleEn: string; exampleEs: string } | null = null;
    try {
      pair = await generateExampleSentencesWithAI(finalEnWord, capitalizedEs, finalPos);
    } catch (e) {}

    if (!pair || !pair.exampleEn || !pair.exampleEs) {
      const sentenceEn = createAuthenticEnglishSentence(finalEnWord, finalPos);
      const sentenceEs = await translateText(sentenceEn, 'en', 'es');
      pair = {
        exampleEn: sentenceEn,
        exampleEs: sentenceEs || generateNaturalSentencePairSync(finalEnWord, finalPos, capitalizedEs).exampleEs,
      };
    }

    const level: WordLevel = getWordLevel(finalEnWord);

    const altsSet = new Set<string>();
    if (googleDict?.alternatives && Array.isArray(googleDict.alternatives)) {
      googleDict.alternatives.forEach((a) => {
        const cap = a.trim().charAt(0).toUpperCase() + a.trim().slice(1);
        if (cap) altsSet.add(cap);
      });
    }
    const alternatives = Array.from(altsSet);

    const result: AutoEnrichResult = {
      word: capitalizedEn,
      partOfSpeech: finalPos,
      level,
      ipa: finalIpa,
      phoneticGuide: finalGuide,
      phoneticNote: 'Sílaba tónica destacada / Fonética estándar',
      translation: capitalizedEs,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      definition: `Término utilizado como ${finalPos} en inglés`,
      exampleEn: pair.exampleEn,
      exampleEs: pair.exampleEs,
      categoryGroup: '',
      categorySub: '',
    };
    ENRICHMENT_CACHE.set(cacheKey, result);
    return result;
  }

  // ----------------------------------------------------
  // PATH B: Input word is in ENGLISH (Inglés -> Español)
  // ----------------------------------------------------

  // 1. Instant check in Built-in database (0ms O(1))
  if (BUILTIN_VOCABULARY[clean]) {
    const data = BUILTIN_VOCABULARY[clean];
    const capitalizedWord = rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1);
    const pos = normalizePartOfSpeech(data.partOfSpeech || 'noun');
    const pair = generateNaturalSentencePairSync(clean, pos, data.translation);
    const phon = getPhoneticsForEnglishWord(clean);

    const altsSet = new Set<string>();
    if (data.translation && (data.translation.includes('/') || data.translation.includes(','))) {
      data.translation.split(/\s*[\/,;]\s*/).forEach((p) => {
        const cap = p.trim().charAt(0).toUpperCase() + p.trim().slice(1);
        if (cap) altsSet.add(cap);
      });
    }
    const alternatives = Array.from(altsSet);

    const result: AutoEnrichResult = {
      word: capitalizedWord,
      partOfSpeech: pos,
      level: data.level || getWordLevel(clean),
      ipa: data.ipa || phon.ipa,
      phoneticGuide: data.phoneticGuide || phon.phoneticGuide,
      phoneticNote: data.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
      translation: data.translation || clean,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      definition: data.definition || '',
      exampleEn: data.exampleEn || pair.exampleEn,
      exampleEs: data.exampleEs || pair.exampleEs,
      categoryGroup: data.categoryGroup || '',
      categorySub: data.categorySub || '',
    };
    ENRICHMENT_CACHE.set(cacheKey, result);
    return result;
  }

  // 2. Fast Concurrent Translation & Phonetics (<100ms)
  let foundIpa = '';
  let foundPos: PartOfSpeech | null = detectQuickPartOfSpeech(clean);
  let foundDef = '';

  const [translationRes, dictData, googleDict] = await Promise.all([
    translateText(clean, 'en', 'es'),
    networkService.isOnline()
      ? fetchWithTimeout(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`,
          {},
          650
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null),
    fetchGoogleDictionary(clean, 'en', 'es').catch(() => null),
  ]);

  if (Array.isArray(dictData) && dictData.length > 0) {
    const item = dictData[0];
    if (item.phonetic) {
      foundIpa = item.phonetic;
    } else if (item.phonetics && Array.isArray(item.phonetics)) {
      const withText = item.phonetics.find((p: any) => p.text);
      if (withText) foundIpa = withText.text;
    }

    if (item.meanings && Array.isArray(item.meanings) && item.meanings.length > 0) {
      const firstMeaning = item.meanings[0];
      if (firstMeaning.partOfSpeech && !foundPos) {
        foundPos = normalizePartOfSpeech(firstMeaning.partOfSpeech);
      }
      if (firstMeaning.definitions && firstMeaning.definitions[0]) {
        foundDef = firstMeaning.definitions[0].definition || '';
      }
    }
  }

  if (googleDict?.partOfSpeech && !foundPos) {
    foundPos = normalizePartOfSpeech(googleDict.partOfSpeech);
  }

  const finalPos: PartOfSpeech = foundPos ? normalizePartOfSpeech(foundPos) : 'Sustantivo';
  const rawTranslation = googleDict?.translation || translationRes || clean;
  const finalTranslation = rawTranslation.charAt(0).toUpperCase() + rawTranslation.slice(1);

  const phon = getPhoneticsForEnglishWord(clean);
  const finalIpa = foundIpa || phon.ipa;
  const finalGuide = foundIpa ? ipaToPhoneticGuide(foundIpa, clean) : phon.phoneticGuide;

  // Generate authentic sentence pair: check dictionary examples first, then generate & translate
  let pair: { exampleEn: string; exampleEs: string } | null = null;

  let foundDictExample = '';
  if (Array.isArray(dictData) && dictData.length > 0) {
    for (const item of dictData) {
      if (Array.isArray(item.meanings)) {
        for (const m of item.meanings) {
          if (Array.isArray(m.definitions)) {
            for (const def of m.definitions) {
              if (def.example && typeof def.example === 'string' && def.example.trim()) {
                const ex = def.example.trim();
                if (new RegExp(`\\b${clean}\\b`, 'i').test(ex)) {
                  foundDictExample = ex.charAt(0).toUpperCase() + ex.slice(1);
                  break;
                }
              }
            }
          }
          if (foundDictExample) break;
        }
      }
      if (foundDictExample) break;
    }
  }

  if (foundDictExample) {
    const transEs = await translateText(foundDictExample, 'en', 'es');
    if (transEs && transEs.toLowerCase() !== foundDictExample.toLowerCase()) {
      pair = { exampleEn: foundDictExample, exampleEs: transEs };
    }
  }

  if (!pair) {
    try {
      pair = await generateExampleSentencesWithAI(clean, finalTranslation, finalPos);
    } catch (e) {}
  }

  if (!pair || !pair.exampleEn || !pair.exampleEs) {
    const sentenceEn = createAuthenticEnglishSentence(clean, finalPos);
    const sentenceEs = await translateText(sentenceEn, 'en', 'es');
    pair = {
      exampleEn: sentenceEn,
      exampleEs: sentenceEs || generateNaturalSentencePairSync(clean, finalPos, finalTranslation).exampleEs,
    };
  }

  const level: WordLevel = getWordLevel(clean);

  const altsSet = new Set<string>();
  if (googleDict?.alternatives && Array.isArray(googleDict.alternatives)) {
    googleDict.alternatives.forEach((a) => {
      const cap = a.trim().charAt(0).toUpperCase() + a.trim().slice(1);
      if (cap) altsSet.add(cap);
    });
  }
  if (finalTranslation.includes('/') || finalTranslation.includes(',')) {
    finalTranslation.split(/\s*[\/,;]\s*/).forEach((p) => {
      const cap = p.trim().charAt(0).toUpperCase() + p.trim().slice(1);
      if (cap) altsSet.add(cap);
    });
  }
  const alternatives = Array.from(altsSet);

  const result: AutoEnrichResult = {
    word: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
    partOfSpeech: finalPos,
    level,
    ipa: finalIpa,
    phoneticGuide: finalGuide,
    phoneticNote: 'Sílaba tónica destacada / Fonética estándar',
    translation: finalTranslation,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
    definition: foundDef || `Término utilizado como ${finalPos} en inglés`,
    exampleEn: pair.exampleEn,
    exampleEs: pair.exampleEs,
    categoryGroup: '',
    categorySub: '',
  };

  ENRICHMENT_CACHE.set(cacheKey, result);
  return result;
}
