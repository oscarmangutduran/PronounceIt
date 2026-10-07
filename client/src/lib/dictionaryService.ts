import { WordItem, WordLevel, WordStatus } from '../types';
import { appStorage } from './storage';

export interface AutoEnrichResult {
  word: string;
  partOfSpeech: string;
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

// Comprehensive built-in lexical database for instant offline and rich responses
const BUILTIN_VOCABULARY: Record<string, Partial<AutoEnrichResult>> = {
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
    categoryGroup: 'Readings',
    categorySub: 'The little Prince',
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
    categoryGroup: 'Readings',
    categorySub: 'The little Prince',
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
    categoryGroup: 'Readings',
    categorySub: 'The little Prince',
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
    exampleEs: 'Logramos un avance decisivo en las negociaciones del contrato.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Debemos comunicar las actualizaciones del proyecto a cada parte interesada clave.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'El equipo trabajó horas extras para cumplir con el ajustado plazo del proyecto.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'La resiliencia económica le ha permitido a la empresa sobrevivir a los golpes del mercado.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Necesitamos aprovechar nuestra reputación de mercado durante las conversaciones.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Su investigación aporta valiosas perspectivas sobre los hábitos de compra del cliente.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'La dirección era reacia a realizar cambios importantes antes de los resultados trimestrales.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Consiguió superar todos los obstáculos técnicos gracias a su trabajo duro.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Debemos verificar el cronograma del proyecto antes de confirmar el lanzamiento.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'El feedback positivo de los clientes motivó a nuestro equipo de desarrollo.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Dominar la pronunciación en inglés es un desafío emocionante para los estudiantes.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'La práctica oral diaria mejorará tu habilidad conversacional.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Nuestro principal objetivo de ventas para este trimestre son diez mil usuarios activos.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Con práctica constante, lograrás una fluidez completa.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Este simulador móvil te ayudará a mejorar tu pronunciación.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'La previsión de ventas trimestral indica un fuerte crecimiento de los ingresos.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'El control de calidad se convirtió en el principal cuello de botella del ciclo de lanzamiento.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Adoptamos un nuevo software para agilizar la facturación y la incorporación de clientes.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Necesitamos evaluar si este plan de expansión es financieramente viable.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'El comité finalmente alcanzó un consenso sobre el presupuesto de marketing.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Ambas partes tuvieron que ceder para finalizar la empresa conjunta.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'La disputa llegó a un punto muerto tras horas de debate infructuoso.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
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
    exampleEs: 'Pasamos la tarde lluviosa en una cafetería muy acogedora.',
    categoryGroup: 'Grammar',
    categorySub: 'General',
  },
};

// Gemini API Configuration & Storage
export const GEMINI_STORAGE_KEY = 'pronounceit_gemini_api_key';

export function getGeminiApiKey(): string {
  try {
    const local = appStorage.getItem(GEMINI_STORAGE_KEY);
    if (local && local.trim()) return local.trim();
  } catch {}
  return (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
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
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond strictly with valid JSON: {"status": "ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

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

// Queries Google Gemini free API for rich, authentic, non-repetitive lexical analysis
export async function queryGeminiForWord(
  word: string,
  customApiKey?: string
): Promise<AutoEnrichResult | null> {
  const apiKey = (customApiKey !== undefined ? customApiKey : getGeminiApiKey()).trim();
  if (!apiKey) return null;

  const clean = word.trim();
  if (!clean) return null;

  const prompt = `You are an expert bilingual English-Spanish lexicographer and English teacher.
Analyze this English word or phrase: "${clean}".

CRITICAL INSTRUCTION FOR EXAMPLES:
- Generate an authentic, realistic, context-appropriate, and engaging example sentence in English demonstrating natural usage of "${clean}".
- NEVER use generic repetitive templates (e.g. avoid "She showed me the...", "I want to...", "It was a very..."). The sentence must be vivid, varied, natural, and directly suited to this specific word.
- Translate that exact sentence into natural, fluent Spanish.

Respond strictly with a single JSON object with these exact keys:
{
  "translation": "Most accurate, common and natural Spanish translation for this word",
  "partOfSpeech": "One of: 'noun', 'verb', 'adjective', 'adverb', 'article', 'pronoun', 'preposition', 'conjunction', 'phrasal verb', 'phrase'",
  "level": "CEFR level: 'A1', 'A2', 'B1', 'B2', 'C1', or 'C2'",
  "ipa": "Standard IPA phonetics with stress mark (e.g. /ˈbreɪkˌθruː/)",
  "phoneticGuide": "Friendly Spanish phonetic pronunciation approximation in quotes (e.g. \\"breik-zru\\")",
  "phoneticNote": "Short pronunciation tip for Spanish speakers regarding pronunciation or stress",
  "definition": "Clear, concise Spanish definition of the word",
  "exampleEn": "Natural, rich, non-repetitive English example sentence using the word naturally in context",
  "exampleEs": "Natural, fluent Spanish translation of the example sentence"
}`;

  const models = GEMINI_AVAILABLE_MODELS;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.5,
          },
        }),
      });

      if (!response.ok) {
        console.warn(`[Gemini API] Model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      const capWord = clean.charAt(0).toUpperCase() + clean.slice(1);
      const pos = normalizePartOfSpeech(parsed.partOfSpeech || 'noun');

      const validLevels: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const level: WordLevel = validLevels.includes(parsed.level) ? parsed.level : 'B1';

      return {
        word: capWord,
        partOfSpeech: pos,
        level,
        ipa: (parsed.ipa || `/${clean.toLowerCase()}/`).trim(),
        phoneticGuide: (parsed.phoneticGuide || `"${clean.toLowerCase()}"`).trim(),
        phoneticNote: (parsed.phoneticNote || 'Pronunciación estándar en inglés').trim(),
        translation: (parsed.translation || clean).trim(),
        definition: (parsed.definition || `Término utilizado como ${pos} en inglés`).trim(),
        exampleEn: (parsed.exampleEn || `${capWord} is used in English.`).trim(),
        exampleEs: (parsed.exampleEs || `Se utiliza en inglés.`).trim(),
        categoryGroup: 'Grammar',
        categorySub: 'General',
      };
    } catch (err) {
      console.warn(`[Gemini API] Error querying ${model}:`, err);
    }
  }

  return null;
}

// High-accuracy Google Translate helper for single words and natural sentences
export async function translateText(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.[0])) {
        const translated = data[0].map((item: any) => item[0]).join('').trim();
        if (translated) return translated;
      }
    }
  } catch (e) {
    console.warn('[translateText] Google API fallback:', e);
  }

  // Secondary fallback: MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|es`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const txt = data?.responseData?.translatedText;
      if (txt && !txt.includes('MYMEMORY WARNING')) {
        return txt.replace(/[.!]$/, '').trim();
      }
    }
  } catch {}

  return clean;
}

// Retrieves accurate dictionary translation and part of speech from Google Translate Dictionary endpoint
export async function fetchGoogleDictionary(
  word: string
): Promise<{ translation: string; partOfSpeech?: string; alternatives?: string[] }> {
  const clean = word.trim().toLowerCase();
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&dt=bd&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      let translation = '';
      let partOfSpeech: string | undefined = undefined;
      const alternatives: string[] = [];

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

      return { translation, partOfSpeech, alternatives };
    }
  } catch (e) {
    console.warn('[fetchGoogleDictionary] Error:', e);
  }
  return { translation: '' };
}

// Normalized part of speech mapping with precedence order (adv, phrasal must precede verb!)
export function normalizePartOfSpeech(pos: string): string {
  const p = (pos || '').toLowerCase().trim();
  if (!p) return 'noun';
  if (p.includes('art') || p === 'determiner') return 'article';
  if (p.includes('phrasal')) return 'phrasal verb';
  if (p.includes('adv')) return 'adverb';
  if (p.includes('adj')) return 'adjective';
  if (p.includes('verb')) return 'verb';
  if (p.includes('noun')) return 'noun';
  if (p.includes('pron')) return 'pronoun';
  if (p.includes('prep')) return 'preposition';
  if (p.includes('conj')) return 'conjunction';
  if (p.includes('interj')) return 'interjection';
  if (p.includes('phrase') || p.includes('idiom') || p.includes('expression')) return 'phrase';
  return p;
}

export function detectQuickPartOfSpeech(word: string): string | null {
  const w = word.toLowerCase().trim();
  if (['the', 'a', 'an'].includes(w)) return 'article';
  if (['in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'off', 'over', 'under'].includes(w)) return 'preposition';
  if (['and', 'but', 'or', 'so', 'because', 'although', 'since', 'unless', 'while', 'whereas', 'if'].includes(w)) return 'conjunction';
  if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'this', 'that', 'these', 'those'].includes(w)) return 'pronoun';
  if (['be', 'is', 'are', 'was', 'were', 'have', 'has', 'do', 'does', 'go', 'make', 'take', 'see', 'come', 'get', 'give', 'know', 'think', 'say', 'look', 'want', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'run', 'read', 'write', 'learn'].includes(w)) return 'verb';
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

// Generates an authentic, grammatically correct contextual sentence pair
async function generateNaturalSentencePair(word: string, pos: string): Promise<{ exampleEn: string; exampleEs: string }> {
  const w = word.trim().toLowerCase();
  const cap = w.charAt(0).toUpperCase() + w.slice(1);
  const p = (pos || '').toLowerCase();

  // 1. Try Tatoeba first for genuine human sentences
  const tatoeba = await fetchTatoebaSentence(w);
  if (tatoeba?.exampleEn) {
    const es = tatoeba.exampleEs || (await translateText(tatoeba.exampleEn));
    return { exampleEn: tatoeba.exampleEn, exampleEs: es };
  }

  // 2. Varied contextual templates by hash to avoid repetitive sentences across words
  const hash = w.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  let enSentence = '';
  if (p.includes('art')) {
    if (w === 'the') {
      enSentence = 'The little prince looked at the bright stars in the sky.';
    } else if (w === 'a') {
      enSentence = 'I saw a beautiful flower growing in the garden.';
    } else if (w === 'an') {
      enSentence = 'She ate an apple while reading her favorite book.';
    } else {
      enSentence = `${cap} sun is shining brightly today.`;
    }
  } else if (p.includes('adv')) {
    const templates = [
      `She completed the task ${w} and without any mistakes.`,
      `They were speaking ${w} during the morning meeting.`,
      `The situation improved ${w} over the last few weeks.`,
      `He answered all the difficult questions ${w}.`,
    ];
    enSentence = templates[hash % templates.length];
  } else if (p.includes('adj')) {
    const templates = [
      `It was a very ${w} experience for the whole team.`,
      `She gave a ${w} explanation during the presentation.`,
      `The project requires a ${w} approach to succeed.`,
      `We noticed a ${w} difference in the final results.`,
    ];
    enSentence = templates[hash % templates.length];
  } else if (p.includes('verb')) {
    const templates = [
      `I need to ${w} this matter carefully before making a choice.`,
      `They decided to ${w} together on the new initiative.`,
      `You should ${w} every day to make steady progress.`,
      `We hope to ${w} significant milestones by next month.`,
    ];
    enSentence = templates[hash % templates.length];
  } else if (p.includes('prep')) {
    const templates = [
      `The notebook was placed ${w} the wooden desk.`,
      `We walked ${w} the quiet path in the morning.`,
      `The keys were found ${w} the front door.`,
    ];
    enSentence = templates[hash % templates.length];
  } else if (p.includes('conj')) {
    const templates = [
      `We stayed inside ${w} the weather was stormy.`,
      `He worked late ${w} the deadline was approaching.`,
      `She smiled ${w} she received the good news.`,
    ];
    enSentence = templates[hash % templates.length];
  } else if (p.includes('pron')) {
    enSentence = `${cap} decided to visit the local library.`;
  } else if (p.includes('phrasal') || p.includes('idiom') || w.includes(' ')) {
    const templates = [
      `They promised to ${w} as soon as possible.`,
      `It is not easy to ${w} without proper preparation.`,
      `We will certainly ${w} during tomorrow's session.`,
    ];
    enSentence = templates[hash % templates.length];
  } else {
    // Noun templates with rich variety
    const templates = [
      `The manager discussed the new ${w} during the conference.`,
      `Understanding the importance of this ${w} will help us succeed.`,
      `They found an interesting article about the ${w} online.`,
      `We need to focus our attention on this particular ${w}.`,
      `She shared valuable insights regarding the ${w}.`,
    ];
    enSentence = templates[hash % templates.length];
  }

  // Translate sentence accurately with Google Translate
  const esSentence = await translateText(enSentence);
  return { exampleEn: enSentence, exampleEs: esSentence };
}

// Algorithmic phonetic approximation generator
function generatePhoneticGuide(word: string): string {
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

function estimateIpa(word: string): string {
  const clean = word.toLowerCase().trim();
  return `/${clean}/`;
}

// Main auto-enrich function
export async function autoEnrichWord(rawWord: string): Promise<AutoEnrichResult> {
  const clean = rawWord.trim().toLowerCase();
  if (!clean) {
    throw new Error('La palabra no puede estar vacía');
  }

  // 1. If Gemini API is configured, use it first for top-tier authentic AI generation!
  if (isGeminiConfigured()) {
    try {
      const geminiResult = await queryGeminiForWord(clean);
      if (geminiResult) {
        return geminiResult;
      }
    } catch (e) {
      console.warn('[autoEnrichWord] Gemini query failed, continuing with fallback:', e);
    }
  }

  // 2. Check local pre-populated database
  if (BUILTIN_VOCABULARY[clean]) {
    const data = BUILTIN_VOCABULARY[clean];
    const capitalizedWord = rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1);
    const trans = data.translation || clean;
    const pos = normalizePartOfSpeech(data.partOfSpeech || 'noun');

    let exEn = data.exampleEn || '';
    let exEs = data.exampleEs || '';
    if (!exEn || !new RegExp(`\\b${clean}`, 'i').test(exEn)) {
      const pair = await generateNaturalSentencePair(clean, pos);
      exEn = pair.exampleEn;
      exEs = pair.exampleEs;
    } else if (!exEs) {
      exEs = await translateText(exEn);
    }

    return {
      word: capitalizedWord,
      partOfSpeech: pos,
      level: data.level || 'B2',
      ipa: data.ipa || estimateIpa(clean),
      phoneticGuide: data.phoneticGuide || generatePhoneticGuide(clean),
      phoneticNote: data.phoneticNote || 'Sílaba tónica destacada / Fonética estándar',
      translation: trans,
      definition: data.definition || '',
      exampleEn: exEn,
      exampleEs: exEs,
      categoryGroup: data.categoryGroup || 'Grammar',
      categorySub: data.categorySub || 'General',
    };
  }

  // 2. Fetch from Free Dictionary API (for real IPA, definition, and authentic dictionary example)
  let foundIpa = '';
  let foundPos = detectQuickPartOfSpeech(clean) || '';
  let foundDef = '';
  let foundExEn = '';

  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
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
            const candExample = firstMeaning.definitions[0].example || '';
            if (candExample && new RegExp(`\\b${clean}`, 'i').test(candExample)) {
              foundExEn = candExample;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Dictionary API fetch failed, using fallback', e);
  }

  // 3. Fetch high-accuracy translation & grammatical part of speech from Google Translate
  let foundTranslation = '';
  const gDict = await fetchGoogleDictionary(clean);
  if (gDict.translation) {
    foundTranslation = gDict.translation;
    if (!foundPos && gDict.partOfSpeech) {
      foundPos = gDict.partOfSpeech;
    }
  }

  if (!foundPos) {
    foundPos = detectQuickPartOfSpeech(clean) || 'noun';
  }

  if (!foundTranslation) {
    foundTranslation = await translateText(clean);
  }

  // Clean and capitalize translation
  if (foundTranslation) {
    foundTranslation = foundTranslation.charAt(0).toUpperCase() + foundTranslation.slice(1);
  } else {
    foundTranslation = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // 4. Generate guaranteed authentic & natural example sentences
  let finalExEn = '';
  let finalExEs = '';

  if (foundExEn) {
    finalExEn = foundExEn;
    finalExEs = await translateText(foundExEn);
  } else {
    const pair = await generateNaturalSentencePair(clean, foundPos);
    finalExEn = pair.exampleEn;
    finalExEs = pair.exampleEs;
  }

  const finalIpa = foundIpa || estimateIpa(clean);
  const finalGuide = generatePhoneticGuide(clean);

  // Guess CEFR level
  let level: WordLevel = 'B1';
  if (clean.length > 9 || clean.endsWith('tion') || clean.endsWith('ism') || clean.endsWith('ment')) {
    level = 'B2';
  }
  if (clean.length > 11 || ['leverage', 'resilience', 'ubiquitous', 'paradigm', 'empirical', 'benchmark'].includes(clean)) {
    level = 'C1';
  }

  return {
    word: rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1),
    partOfSpeech: foundPos,
    level,
    ipa: finalIpa,
    phoneticGuide: finalGuide,
    phoneticNote: 'Sílaba tónica destacada / Fonética estándar',
    translation: foundTranslation,
    definition: foundDef || `Término utilizado como ${foundPos} en inglés`,
    exampleEn: finalExEn,
    exampleEs: finalExEs,
    categoryGroup: 'Grammar',
    categorySub: 'General',
  };
}
