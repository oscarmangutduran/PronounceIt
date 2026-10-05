import { WordItem, WordLevel, WordStatus } from '../types';

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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Finanzas & Métricas',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Correspondencia & Email',
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
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
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
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Finanzas & Métricas',
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
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
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
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Finanzas & Métricas',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Finanzas & Métricas',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
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
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
  },
};

// Generates an explicit sentence that ALWAYS contains the target English word and its Spanish translation
function generateContextualSentence(word: string, pos: string, translation: string): { exampleEn: string; exampleEs: string } {
  const w = word.trim();
  const lowerW = w.toLowerCase();
  const t = translation.trim();
  const lowerT = t.toLowerCase();
  const p = (pos || '').toLowerCase();

  if (p.includes('verb')) {
    return {
      exampleEn: `We need to ${lowerW} the plan before the project deadline.`,
      exampleEs: `Necesitamos ${lowerT} el plan antes de la fecha límite del proyecto.`,
    };
  }

  if (p.includes('adj')) {
    return {
      exampleEn: `Their new approach was remarkably ${lowerW} for the entire team.`,
      exampleEs: `Su nuevo enfoque fue notablemente ${lowerT} para todo el equipo.`,
    };
  }

  if (p.includes('adv')) {
    return {
      exampleEn: `The team worked ${lowerW} to deliver the final presentation on time.`,
      exampleEs: `El equipo trabajó de forma ${lowerT} para entregar la presentación final a tiempo.`,
    };
  }

  if (p.includes('idiom') || lowerW.includes(' ')) {
    return {
      exampleEn: `In difficult discussions, it is helpful to ${lowerW} to move forward.`,
      exampleEs: `En discusiones difíciles, es útil ${lowerT} para seguir adelante.`,
    };
  }

  // Default noun
  return {
    exampleEn: `The team highlighted the importance of this ${lowerW} in today's session.`,
    exampleEs: `El equipo destacó la importancia de este/a ${lowerT} en la sesión de hoy.`,
  };
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

  // 1. Check local pre-populated database
  if (BUILTIN_VOCABULARY[clean]) {
    const data = BUILTIN_VOCABULARY[clean];
    const capitalizedWord = rawWord.trim().charAt(0).toUpperCase() + rawWord.trim().slice(1);
    const trans = data.translation || clean;
    const pos = data.partOfSpeech || 'noun';

    // Verify example explicitly contains the word
    let exEn = data.exampleEn || '';
    let exEs = data.exampleEs || '';
    if (!exEn || !new RegExp(`\\b${clean}`, 'i').test(exEn)) {
      const generated = generateContextualSentence(clean, pos, trans);
      exEn = generated.exampleEn;
      exEs = generated.exampleEs;
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
      categoryGroup: data.categoryGroup || 'Negocios & Trabajo',
      categorySub: data.categorySub || 'Reuniones & Negociación',
    };
  }

  // 2. Fetch from Free Dictionary API (for real IPA, part of speech, definition, and example)
  let foundIpa = '';
  let foundPos = 'noun';
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
          foundPos = firstMeaning.partOfSpeech || 'noun';
          if (firstMeaning.definitions && firstMeaning.definitions[0]) {
            foundDef = firstMeaning.definitions[0].definition || '';
            const candExample = firstMeaning.definitions[0].example || '';
            // Only keep if the candidate example ACTUALLY contains the word
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

  // 3. Fetch translation from MyMemory Free API
  let foundTranslation = '';
  try {
    const transRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|es`
    );
    if (transRes.ok) {
      const transData = await transRes.json();
      if (transData?.responseData?.translatedText) {
        foundTranslation = transData.responseData.translatedText;
        foundTranslation = foundTranslation.replace(/[.!]$/, '').trim();
      }
    }
  } catch (e) {
    console.warn('Translation API fetch failed', e);
  }

  if (!foundTranslation) {
    foundTranslation = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // 4. Generate guaranteed example sentence containing the word if not present
  let finalExEn = foundExEn;
  let finalExEs = '';

  if (!finalExEn || !new RegExp(`\\b${clean}`, 'i').test(finalExEn)) {
    const sentencePair = generateContextualSentence(clean, foundPos, foundTranslation);
    finalExEn = sentencePair.exampleEn;
    finalExEs = sentencePair.exampleEs;
  } else {
    // If dictionary provided an authentic sentence containing the word, translate that exact sentence
    try {
      const exTransRes = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(finalExEn)}&langpair=en|es`
      );
      if (exTransRes.ok) {
        const exData = await exTransRes.json();
        if (exData?.responseData?.translatedText) {
          finalExEs = exData.responseData.translatedText;
        }
      }
    } catch {}

    if (!finalExEs) {
      finalExEs = generateContextualSentence(clean, foundPos, foundTranslation).exampleEs;
    }
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
    translation: foundTranslation.charAt(0).toUpperCase() + foundTranslation.slice(1),
    definition: foundDef || `Término utilizado como ${foundPos} en inglés`,
    exampleEn: finalExEn,
    exampleEs: finalExEs,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  };
}
