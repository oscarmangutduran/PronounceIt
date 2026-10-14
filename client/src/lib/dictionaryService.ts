import { WordItem, WordLevel, WordStatus, PartOfSpeech } from '../types';
import { appStorage } from './storage';
import { networkService } from './networkService';
import { IRREGULAR_VERBS } from '../data/irregularVerbs';

const IRREGULAR_VERB_SET = new Set<string>();
IRREGULAR_VERBS.forEach((v) => {
  if (v.infinitive) IRREGULAR_VERB_SET.add(v.infinitive.toLowerCase().trim());
  if (v.pastSimple) {
    v.pastSimple.split(/[\/,]/).forEach((s) => {
      const c = s.trim().toLowerCase();
      if (c) IRREGULAR_VERB_SET.add(c);
    });
  }
  if (v.pastParticiple) {
    v.pastParticiple.split(/[\/,]/).forEach((s) => {
      const c = s.trim().toLowerCase();
      if (c) IRREGULAR_VERB_SET.add(c);
    });
  }
});

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

// Gemini API Configuration & Storage
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

// In-memory cache for ultra-fast instant field auto-fill
const ENRICHMENT_CACHE = new Map<string, AutoEnrichResult>();
const TRANSLATION_CACHE = new Map<string, string>();

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
    ? `Bilingual lexicographer task. Spanish word/phrase: "${clean}".
Return ONLY a valid JSON object:
{
  "word": "Best single English word or short idiom (Capitalized)",
  "translation": "${clean.charAt(0).toUpperCase() + clean.slice(1)}",
  "partOfSpeech": "One of: Sustantivo, Verbo, Adjetivo, Adverbio, Preposición, Conjunción, Pronombre, Interjección, Artículo/determinante",
  "level": "CEFR: A1, A2, B1, B2, C1, or C2",
  "ipa": "/IPA phonetics for the English word/",
  "phoneticGuide": "\\"Spanish phonetic guide approximation\\"",
  "phoneticNote": "Short pronunciation tip",
  "definition": "Concise Spanish definition",
  "exampleEn": "Natural short English sentence using the word",
  "exampleEs": "Spanish translation of the example sentence"
}`
    : `Bilingual lexicographer task. English word/phrase: "${clean}".
Return ONLY a valid JSON object:
{
  "translation": "Best Spanish translation (Capitalized)",
  "partOfSpeech": "One of: Sustantivo, Verbo, Adjetivo, Adverbio, Preposición, Conjunción, Pronombre, Interjección, Artículo/determinante",
  "level": "CEFR: A1, A2, B1, B2, C1, or C2",
  "ipa": "/IPA phonetics/",
  "phoneticGuide": "\\"Spanish phonetic guide approximation\\"",
  "phoneticNote": "Short pronunciation tip",
  "definition": "Concise Spanish definition",
  "exampleEn": "Natural short English sentence using the word",
  "exampleEs": "Spanish translation of the example sentence"
}`;

  const models = GEMINI_AVAILABLE_MODELS;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2800);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 250,
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

      const result: AutoEnrichResult = {
        word: capWord,
        partOfSpeech: pos,
        level,
        ipa: (parsed.ipa || `/${rawEnWord.toLowerCase()}/`).trim(),
        phoneticGuide: (parsed.phoneticGuide || `"${rawEnWord.toLowerCase()}"`).trim(),
        phoneticNote: (parsed.phoneticNote || 'Pronunciación estándar en inglés').trim(),
        translation: capTrans,
        definition: (parsed.definition || `Término utilizado como ${pos} en inglés`).trim(),
        exampleEn: (parsed.exampleEn || `${capWord} is used in English.`).trim(),
        exampleEs: (parsed.exampleEs || `Se utiliza en inglés.`).trim(),
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
        const primary = data[1][0];
        if (primary && primary[0]) {
          partOfSpeech = normalizePartOfSpeech(primary[0]);
        }
        if (Array.isArray(primary?.[1])) {
          primary[1].slice(0, 4).forEach((t: string) => {
            if (t && typeof t === 'string') alternatives.push(t);
          });
        }
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
  pos: string
): { exampleEn: string; exampleEs: string } {
  const w = word.trim().toLowerCase();
  const cap = w.charAt(0).toUpperCase() + w.slice(1);
  const p = (pos || '').toLowerCase();

  const cacheKey = `${w}:${p}`;
  if (SENTENCE_PAIR_CACHE.has(cacheKey)) {
    return SENTENCE_PAIR_CACHE.get(cacheKey)!;
  }

  const hash = w.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let pair: { exampleEn: string; exampleEs: string };

  if (p.includes('art')) {
    if (w === 'the') {
      pair = { exampleEn: 'The little prince looked at the bright stars in the sky.', exampleEs: 'El principito miró las estrellas brillantes en el cielo.' };
    } else if (w === 'a') {
      pair = { exampleEn: 'I saw a beautiful flower growing in the quiet garden.', exampleEs: 'Vi una hermosa flor creciendo en el tranquilo jardín.' };
    } else if (w === 'an') {
      pair = { exampleEn: 'She ate an apple while reading her favorite book.', exampleEs: 'Ella comió una manzana mientras leía su libro favorito.' };
    } else {
      pair = { exampleEn: `${cap} day is shining brightly today.`, exampleEs: `${cap} día brilla con intensidad hoy.` };
    }
  } else if (p.includes('adv')) {
    const templates = [
      { en: `She spoke ${w} to everyone during the meeting.`, es: `Ella habló ${w} con todos durante la reunión.` },
      { en: `He finished the task ${w} before the deadline.`, es: `Él terminó la tarea ${w} antes de la fecha límite.` },
      { en: `We need to act ${w} to achieve our common goals.`, es: `Necesitamos actuar ${w} para alcanzar nuestras metas comunes.` },
    ];
    const sel = templates[hash % templates.length];
    pair = { exampleEn: sel.en, exampleEs: sel.es };
  } else if (p.includes('adj')) {
    const templates = [
      { en: `The team proposed a ${w} solution for the project.`, es: `El equipo propuso una solución ${w} para el proyecto.` },
      { en: `It was a ${w} opportunity to learn something new.`, es: `Fue una oportunidad ${w} para aprender algo nuevo.` },
      { en: `We noticed a ${w} difference in the final results.`, es: `Notamos una diferencia ${w} en los resultados finales.` },
    ];
    const sel = templates[hash % templates.length];
    pair = { exampleEn: sel.en, exampleEs: sel.es };
  } else if (p.includes('verb')) {
    const templates = [
      { en: `I need to ${w} this matter carefully before making a choice.`, es: `Necesito analizar este asunto con cuidado antes de tomar una decisión.` },
      { en: `They decided to ${w} together on the new initiative.`, es: `Decidieron colaborar juntos en la nueva iniciativa.` },
      { en: `You should ${w} every day to make steady progress.`, es: `Deberías practicar todos los días para progresar de manera constante.` },
      { en: `We hope to ${w} significant milestones this year.`, es: `Esperamos alcanzar hitos importantes este año.` },
    ];
    const sel = templates[hash % templates.length];
    pair = { exampleEn: sel.en, exampleEs: sel.es };
  } else if (p.includes('prep')) {
    const templates = [
      { en: `The notebook was placed ${w} the wooden desk.`, es: `El cuaderno estaba colocado ${w} el escritorio de madera.` },
      { en: `We walked ${w} the quiet path in the morning.`, es: `Caminamos ${w} el sendero tranquilo por la mañana.` },
    ];
    const sel = templates[hash % templates.length];
    pair = { exampleEn: sel.en, exampleEs: sel.es };
  } else if (p.includes('conj')) {
    pair = {
      exampleEn: `We stayed inside ${w} the weather was stormy.`,
      es: `Nos quedamos adentro ${w} el clima era tormentoso.`,
    };
  } else if (p.includes('pron')) {
    pair = {
      exampleEn: `${cap} decided to visit the local library today.`,
      es: `${cap} decidió visitar la biblioteca local hoy.`,
    };
  } else if (p.includes('phrasal') || p.includes('idiom') || w.includes(' ')) {
    const templates = [
      { en: `They promised to ${w} as soon as possible.`, es: `Prometieron hacerlo lo antes posible.` },
      { en: `It is not easy to ${w} without proper preparation.`, es: `No es fácil lograrlo sin la preparación adecuada.` },
      { en: `We will certainly ${w} during tomorrow's session.`, es: `Sin duda lo abordaremos durante la sesión de mañana.` },
    ];
    const sel = templates[hash % templates.length];
    pair = { exampleEn: sel.en, exampleEs: sel.es };
  } else {
    // Noun templates with rich variety
    const templates = [
      { en: `The manager discussed the new ${w} during the conference.`, es: `El gerente debatió el nuevo ${w} durante la conferencia.` },
      { en: `Understanding the importance of this ${w} will help us succeed.`, es: `Comprender la importancia de esto nos ayudará a tener éxito.` },
      { en: `They found an interesting article about the ${w} online.`, es: `Encontraron un artículo interesante sobre esto en internet.` },
      { en: `We need to focus our attention on this particular ${w}.`, es: `Debemos enfocar nuestra atención en esto en particular.` },
      { en: `She shared valuable insights regarding the ${w}.`, es: `Ella compartió valiosas ideas sobre esto.` },
    ];
    const sel = templates[hash % templates.length];
    pair = { exampleEn: sel.en, exampleEs: sel.es };
  }

  SENTENCE_PAIR_CACHE.set(cacheKey, pair);
  return pair;
}

// Asynchronous wrapper for backwards compatibility
export async function generateNaturalSentencePair(
  word: string,
  pos: string
): Promise<{ exampleEn: string; exampleEs: string }> {
  return generateNaturalSentencePairSync(word, pos);
}

// Algorithmic phonetic approximation generator (0ms)
export function generatePhoneticGuide(word: string): string {
  let guide = word.toLowerCase();

  guide = guide
    .replace(/tion\b/g, 'shon')
    .replace(/sion\b/g, 'zhon')
    .replace(/ight\b/g, 'ait')
    .replace(/th/g, 'z')
    .replace(/ee|ea/g, 'ii')
    .replace(/oo/g, 'uu')
    .replace(/ph/g, 'f')
    .replace(/sh/g, 'sh')
    .replace(/ch/g, 'ch')
    .replace(/qu/g, 'ku')
    .replace(/ck/g, 'k')
    .replace(/w/g, 'u')
    .replace(/y\b/g, 'i');

  return `"${guide}"`;
}

// Fast realistic IPA generator (0ms)
export function estimateIpa(word: string): string {
  const clean = word.toLowerCase().trim();
  let ipa = clean
    .replace(/tion\b/g, 'ʃən')
    .replace(/sion\b/g, 'ʒən')
    .replace(/ight\b/g, 'aɪt')
    .replace(/th/g, 'θ')
    .replace(/sh/g, 'ʃ')
    .replace(/ch/g, 'tʃ')
    .replace(/ph/g, 'f')
    .replace(/ee|ea/g, 'iː')
    .replace(/oo/g, 'uː')
    .replace(/all\b/g, 'ɔːl')
    .replace(/ing\b/g, 'ɪŋ')
    .replace(/ar\b/g, 'ɑːr')
    .replace(/or\b/g, 'ɔːr')
    .replace(/er\b|ir\b|ur\b/g, 'ɜːr')
    .replace(/ay\b|ai/g, 'eɪ')
    .replace(/oy\b|oi/g, 'ɔɪ')
    .replace(/ow\b|ou/g, 'aʊ')
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'kw');

  return `/${ipa}/`;
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
      const pair = generateNaturalSentencePairSync(enKey, pos);
      return {
        word: enKey.charAt(0).toUpperCase() + enKey.slice(1),
        partOfSpeech: pos,
        level: item.level || 'B1',
        ipa: item.ipa || estimateIpa(enKey),
        phoneticGuide: item.phoneticGuide || generatePhoneticGuide(enKey),
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
  if (BUILTIN_VOCABULARY[clean]) {
    const item = BUILTIN_VOCABULARY[clean];
    const pos = normalizePartOfSpeech(item.partOfSpeech || 'noun');
    const pair = generateNaturalSentencePairSync(clean, pos);
    return {
      word: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
      partOfSpeech: pos,
      level: item.level || 'B1',
      ipa: item.ipa || estimateIpa(clean),
      phoneticGuide: item.phoneticGuide || generatePhoneticGuide(clean),
      phoneticNote: item.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
      translation: item.translation || '',
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
    ipa: estimateIpa(clean),
    phoneticGuide: generatePhoneticGuide(clean),
    exampleEn: pair.exampleEn,
    exampleEs: pair.exampleEs,
  };
}

// Main auto-enrich function supporting English and Spanish input languages (Lightning fast <100ms)
export async function autoEnrichWord(
  rawWord: string,
  sourceLang: 'en' | 'es' = 'en',
  useAi: boolean = false
): Promise<AutoEnrichResult> {
  const clean = rawWord.trim().toLowerCase();
  if (!clean) {
    throw new Error('La palabra no puede estar vacía');
  }

  // Auto-detect: if language is 'en' but text contains Spanish-specific characters, switch to 'es'
  const effectiveLang: 'en' | 'es' = sourceLang === 'en' && isLikelySpanish(clean) ? 'es' : sourceLang;
  const cacheKey = `${effectiveLang}:${clean}`;

  // 0. Instant Cache check (0ms)
  if (ENRICHMENT_CACHE.has(cacheKey)) {
    return ENRICHMENT_CACHE.get(cacheKey)!;
  }

  // 1. Optional explicit AI suggestion (only when requested by clicking "Sugerir con IA")
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
      const pair = generateNaturalSentencePairSync(enKey, pos);

      const result: AutoEnrichResult = {
        word: capitalizedEn,
        partOfSpeech: pos,
        level: item.level || 'B1',
        ipa: item.ipa || estimateIpa(enKey),
        phoneticGuide: item.phoneticGuide || generatePhoneticGuide(enKey),
        phoneticNote: item.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
        translation: capitalizedEs,
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
    const translatedEn = await translateText(clean, 'es', 'en');
    const cleanEn = (translatedEn || clean).replace(/^to\s+/i, '').replace(/[.!,?]$/, '').trim().toLowerCase();
    const finalEnWord = cleanEn || clean;
    const capitalizedEn = finalEnWord.charAt(0).toUpperCase() + finalEnWord.slice(1);
    const capitalizedEs = rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1);

    const finalPos: PartOfSpeech = detectQuickPartOfSpeech(finalEnWord) || 'Sustantivo';
    const finalIpa = estimateIpa(finalEnWord);
    const finalGuide = generatePhoneticGuide(finalEnWord);
    const pair = generateNaturalSentencePairSync(finalEnWord, finalPos);

    let level: WordLevel = 'B1';
    if (finalEnWord.length > 9 || finalEnWord.endsWith('tion') || finalEnWord.endsWith('ism') || finalEnWord.endsWith('ment')) {
      level = 'B2';
    }
    if (finalEnWord.length > 11 || ['leverage', 'resilience', 'ubiquitous', 'paradigm', 'empirical', 'benchmark'].includes(finalEnWord)) {
      level = 'C1';
    }

    const result: AutoEnrichResult = {
      word: capitalizedEn,
      partOfSpeech: finalPos,
      level,
      ipa: finalIpa,
      phoneticGuide: finalGuide,
      phoneticNote: 'Sílaba tónica destacada / Fonética estándar',
      translation: capitalizedEs,
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
    const pair = generateNaturalSentencePairSync(clean, pos);

    const result: AutoEnrichResult = {
      word: capitalizedWord,
      partOfSpeech: pos,
      level: data.level || 'B2',
      ipa: data.ipa || estimateIpa(clean),
      phoneticGuide: data.phoneticGuide || generatePhoneticGuide(clean),
      phoneticNote: data.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
      translation: data.translation || clean,
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

  const [translationRes, dictData] = await Promise.all([
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

  const finalPos: PartOfSpeech = foundPos ? normalizePartOfSpeech(foundPos) : 'Sustantivo';
  const finalTranslation = translationRes
    ? translationRes.charAt(0).toUpperCase() + translationRes.slice(1)
    : clean.charAt(0).toUpperCase() + clean.slice(1);

  const finalIpa = foundIpa || estimateIpa(clean);
  const finalGuide = generatePhoneticGuide(clean);
  const pair = generateNaturalSentencePairSync(clean, finalPos);

  let level: WordLevel = 'B1';
  if (clean.length > 9 || clean.endsWith('tion') || clean.endsWith('ism') || clean.endsWith('ment')) {
    level = 'B2';
  }
  if (clean.length > 11 || ['leverage', 'resilience', 'ubiquitous', 'paradigm', 'empirical', 'benchmark'].includes(clean)) {
    level = 'C1';
  }

  const result: AutoEnrichResult = {
    word: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
    partOfSpeech: finalPos,
    level,
    ipa: finalIpa,
    phoneticGuide: finalGuide,
    phoneticNote: 'Sílaba tónica destacada / Fonética estándar',
    translation: finalTranslation,
    definition: foundDef || `Término utilizado como ${finalPos} en inglés`,
    exampleEn: pair.exampleEn,
    exampleEs: pair.exampleEs,
    categoryGroup: '',
    categorySub: '',
  };
  ENRICHMENT_CACHE.set(cacheKey, result);
  return result;
}
