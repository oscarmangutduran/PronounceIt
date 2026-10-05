import { WordItem, CategoryItem, WordStatus } from '../types';

const STORAGE_KEY_WORDS = 'pronounceit_vocab_words_v1';
const STORAGE_KEY_AUDIO_SETTINGS = 'pronounceit_audio_settings';

export interface AudioSettings {
  rate: number;
  pitch: number;
  voiceName: string;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'business',
    name: 'Negocios & Trabajo',
    icon: 'Briefcase',
    count: 48,
    subcategories: [
      { id: 'meetings', name: 'Reuniones & Negociación', count: 18 },
      { id: 'finance', name: 'Finanzas & Métricas', count: 14 },
      { id: 'email', name: 'Correspondencia & Email', count: 16 },
    ],
  },
  {
    id: 'daily',
    name: 'Vida Diaria & Hogar',
    icon: 'Home',
    count: 35,
    subcategories: [
      { id: 'home_routine', name: 'Rutinas & Quehaceres', count: 18 },
      { id: 'cooking', name: 'Cocina & Alimentos', count: 17 },
    ],
  },
  {
    id: 'travel',
    name: 'Viajes & Transporte',
    icon: 'Plane',
    count: 32,
    subcategories: [
      { id: 'airport', name: 'Aeropuerto & Vuelos', count: 16 },
      { id: 'hotel', name: 'Hotel & Estancias', count: 16 },
    ],
  },
  {
    id: 'idioms',
    name: 'Expresiones & Idioms',
    icon: 'MessageSquare',
    count: 27,
    subcategories: [
      { id: 'common_idioms', name: 'Modismos habituales', count: 15 },
      { id: 'phrasal_verbs', name: 'Phrasal Verbs Clave', count: 12 },
    ],
  },
];

export const INITIAL_WORDS: WordItem[] = [
  {
    id: 'w-1',
    word: 'Breakthrough',
    partOfSpeech: 'noun/verb',
    level: 'B2',
    ipa: '/ˈbreɪk.θruː/',
    phoneticGuide: '"breik-zru"',
    phoneticNote: 'Acento: Sílaba 1 (θ fricativa)',
    translation: 'Avance decisivo',
    definition: 'Logro importante, hito trascendental',
    exampleEn: 'We achieved a major breakthrough in the contract negotiations.',
    exampleEs: 'Logramos un avance decisivo en las negociaciones del contrato.',
    highlightWord: 'breakthrough',
    status: 'dominada',
    isFavorite: true,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-2',
    word: 'Reach an agreement',
    partOfSpeech: 'idiom / collocation',
    level: 'B1',
    ipa: '/riːtʃ ən əˈɡriːmənt/',
    phoneticGuide: '"riich an agri-ment"',
    phoneticNote: 'Enlace fonético: /tʃən/',
    translation: 'Llegar a un acuerdo',
    definition: 'Pactar, resolver de mutuo acuerdo',
    exampleEn: 'Both teams worked late to reach an agreement before the deadline.',
    exampleEs: 'Ambos equipos trabajaron hasta tarde para llegar a un acuerdo antes de la fecha límite.',
    highlightWord: 'reach an agreement',
    status: 'en_repaso',
    isFavorite: false,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-3',
    word: 'Concur',
    partOfSpeech: 'verb',
    level: 'C1',
    ipa: '/kənˈkɜːr/',
    phoneticGuide: '"kon-kóor"',
    phoneticNote: 'Registro: Formal / Jurídico',
    translation: 'Coincidir',
    definition: 'Estar de acuerdo formalmente, asentir',
    exampleEn: "I concur with the board's proposed timeline for Q3.",
    exampleEs: 'Coincido con el cronograma propuesto por la junta para el tercer trimestre.',
    highlightWord: 'concur',
    status: 'nueva',
    isFavorite: false,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-4',
    word: 'Counteroffer',
    partOfSpeech: 'noun',
    level: 'B2',
    ipa: '/ˈkaʊn.tərˌɔf.ər/',
    phoneticGuide: '"kaun-ter-ófer"',
    phoneticNote: 'Acento tónico secundario en /ɒf/',
    translation: 'Contraoferta',
    definition: 'Propuesta alternativa de negociación',
    exampleEn: 'They rejected the initial proposal and sent a reasonable counteroffer.',
    exampleEs: 'Rechazaron la propuesta inicial y enviaron una contraoferta razonable.',
    highlightWord: 'counteroffer',
    status: 'en_repaso',
    isFavorite: true,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-5',
    word: 'Call it a day',
    partOfSpeech: 'idiom',
    level: 'B2',
    ipa: '/kɔːl ɪt ə deɪ/',
    phoneticGuide: '"kol it a dei"',
    phoneticNote: 'Flapping en inglés americano',
    translation: 'Dar el día por terminado',
    definition: 'Suspender la jornada, levantar sesión',
    exampleEn: "We've covered all agenda items, let's call it a day.",
    exampleEs: 'Hemos cubierto todos los puntos de la agenda, demos el día por terminado.',
    highlightWord: 'call it a day',
    status: 'dominada',
    isFavorite: false,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-6',
    word: 'Leverage',
    partOfSpeech: 'verb / noun',
    level: 'C1',
    ipa: '/ˈlev.ər.ɪdʒ/',
    phoneticGuide: '"lév-ridy"',
    phoneticNote: 'UK alternativa: /ˈliː.vər.ɪdʒ/',
    translation: 'Aprovechar, sacar ventaja',
    definition: 'Apalancamiento estratégico',
    exampleEn: 'We need to leverage our market reputation during talks.',
    exampleEs: 'Necesitamos aprovechar nuestra reputación de mercado durante las conversaciones.',
    highlightWord: 'leverage',
    status: 'en_repaso',
    isFavorite: true,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  // Additional words in Reuniones & Negociación
  {
    id: 'w-7',
    word: 'Deadlock',
    partOfSpeech: 'noun',
    level: 'C1',
    ipa: '/ˈded.lɒk/',
    phoneticGuide: '"ded-lok"',
    phoneticNote: 'Oclusiva sorda final /k/',
    translation: 'Punto muerto, estancamiento',
    definition: 'Situación en la que no se puede avanzar',
    exampleEn: 'The dispute reached a deadlock after hours of futile debate.',
    exampleEs: 'La disputa llegó a un punto muerto tras horas de debate infructuoso.',
    highlightWord: 'deadlock',
    status: 'en_repaso',
    isFavorite: false,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-8',
    word: 'Compromise',
    partOfSpeech: 'noun / verb',
    level: 'B1',
    ipa: '/ˈkɒm.prə.maɪz/',
    phoneticGuide: '"kom-pro-mais"',
    phoneticNote: 'Diptongo /aɪ/ en la última sílaba',
    translation: 'Llegar a un término medio, acuerdo mutuo',
    definition: 'Concesión mutua para resolver diferencias',
    exampleEn: 'Both parties had to compromise to finalize the joint venture.',
    exampleEs: 'Ambas partes tuvieron que ceder para finalizar la empresa conjunta.',
    highlightWord: 'compromise',
    status: 'dominada',
    isFavorite: true,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-9',
    word: 'Consensus',
    partOfSpeech: 'noun',
    level: 'B2',
    ipa: '/kənˈsen.səs/',
    phoneticGuide: '"kon-sén-ses"',
    phoneticNote: 'Schwa átona en primera y última sílaba',
    translation: 'Consenso, acuerdo general',
    definition: 'Opinión unánime o ampliamente compartida',
    exampleEn: 'The committee finally reached a consensus on the marketing budget.',
    exampleEs: 'El comité finalmente alcanzó un consenso sobre el presupuesto de marketing.',
    highlightWord: 'consensus',
    status: 'dominada',
    isFavorite: false,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  {
    id: 'w-10',
    word: 'Feasible',
    partOfSpeech: 'adjective',
    level: 'B2',
    ipa: '/ˈfiː.zə.bəl/',
    phoneticGuide: '"fii-zi-bl"',
    phoneticNote: 'Sonido /z/ intervocálico sonoro',
    translation: 'Viable, factible',
    definition: 'Que se puede llevar a cabo con éxito',
    exampleEn: 'We need to evaluate if this expansion plan is financially feasible.',
    exampleEs: 'Necesitamos evaluar si este plan de expansión es financieramente viable.',
    highlightWord: 'feasible',
    status: 'en_repaso',
    isFavorite: true,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Reuniones & Negociación',
  },
  // Finanzas & Métricas
  {
    id: 'w-11',
    word: 'Bottom line',
    partOfSpeech: 'noun / idiom',
    level: 'B2',
    ipa: '/ˌbɒt.əm ˈlaɪn/',
    phoneticGuide: '"bot-om lain"',
    phoneticNote: 'Acento en la segunda palabra',
    translation: 'Resultado neto / Lo fundamental',
    definition: 'Beneficio neto o aspecto crucial final',
    exampleEn: 'Rising inflation heavily impacted our bottom line this quarter.',
    exampleEs: 'El aumento de la inflación afectó gravemente a nuestro resultado neto este trimestre.',
    highlightWord: 'bottom line',
    status: 'dominada',
    isFavorite: false,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Finanzas & Métricas',
  },
  // Correspondencia & Email
  {
    id: 'w-12',
    word: 'Touch base',
    partOfSpeech: 'idiom',
    level: 'B2',
    ipa: '/tʌtʃ beɪs/',
    phoneticGuide: '"tatch beis"',
    phoneticNote: 'Coloquial empresarial en Norteamérica',
    translation: 'Ponerse en contacto brevemente',
    definition: 'Comunicarse para actualizar el estado',
    exampleEn: "Let's touch base next Monday to review the deliverables.",
    exampleEs: 'Pongámonos en contacto el próximo lunes para revisar los entregables.',
    highlightWord: 'touch base',
    status: 'nueva',
    isFavorite: true,
    categoryGroup: 'Negocios & Trabajo',
    categorySub: 'Correspondencia & Email',
  },
  // Vida Diaria
  {
    id: 'w-13',
    word: 'Run errands',
    partOfSpeech: 'collocation',
    level: 'B1',
    ipa: '/rʌn ˈer.əndz/',
    phoneticGuide: '"ran ér-andz"',
    phoneticNote: 'Plural sonoro /dz/',
    translation: 'Hacer recados / trámites',
    definition: 'Salidas breves para compras o tareas cotidianas',
    exampleEn: 'I need to run a few errands before the supermarket closes.',
    exampleEs: 'Tengo que hacer unos recados antes de que cierre el supermercado.',
    highlightWord: 'run errands',
    status: 'dominada',
    isFavorite: false,
    categoryGroup: 'Vida Diaria & Hogar',
    categorySub: 'Rutinas & Quehaceres',
  },
  // Viajes
  {
    id: 'w-14',
    word: 'Layover',
    partOfSpeech: 'noun',
    level: 'B1',
    ipa: '/ˈleɪˌoʊ.vər/',
    phoneticGuide: '"lei-ou-ver"',
    phoneticNote: 'Acento primario en la primera sílaba',
    translation: 'Escala (de vuelo)',
    definition: 'Parada temporal entre dos tramos de viaje',
    exampleEn: 'We had a four-hour layover at Heathrow Airport.',
    exampleEs: 'Tuvimos una escala de cuatro horas en el aeropuerto de Heathrow.',
    highlightWord: 'layover',
    status: 'en_repaso',
    isFavorite: false,
    categoryGroup: 'Viajes & Transporte',
    categorySub: 'Aeropuerto & Vuelos',
  },
  // Idioms
  {
    id: 'w-15',
    word: 'Bite the bullet',
    partOfSpeech: 'idiom',
    level: 'B2',
    ipa: '/baɪt ðə ˈbʊl.ɪt/',
    phoneticGuide: '"bait de bu-lit"',
    phoneticNote: 'Vocal corta /ʊ/ en bullet',
    translation: 'Hacer de tripas corazón / Afrontar lo inevitable',
    definition: 'Encarar una situación desagradable con valentía',
    exampleEn: 'We decided to bite the bullet and invest in new equipment.',
    exampleEs: 'Decidimos hacer de tripas corazón e invertir en nuevo equipamiento.',
    highlightWord: 'bite the bullet',
    status: 'nueva',
    isFavorite: true,
    categoryGroup: 'Expresiones & Idioms',
    categorySub: 'Modismos habituales',
  },
];

class VocabularyService {
  private words: WordItem[] = [];
  private listeners: (() => void)[] = [];
  private audioSettings: AudioSettings = {
    rate: 0.95,
    pitch: 1.0,
    voiceName: '',
  };

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WORDS);
      if (stored) {
        this.words = JSON.parse(stored);
      } else {
        this.words = [...INITIAL_WORDS];
        this.saveWords();
      }

      const audioStored = localStorage.getItem(STORAGE_KEY_AUDIO_SETTINGS);
      if (audioStored) {
        this.audioSettings = JSON.parse(audioStored);
      }
    } catch {
      this.words = [...INITIAL_WORDS];
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  private saveWords() {
    try {
      localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(this.words));
    } catch (e) {
      console.error('Error saving words to storage', e);
    }
    this.notify();
  }

  public getWords(): WordItem[] {
    return [...this.words];
  }

  public getCategories(): CategoryItem[] {
    // Dynamic counts based on loaded words
    return INITIAL_CATEGORIES.map((cat) => {
      const groupWords = this.words.filter((w) => w.categoryGroup === cat.name);
      return {
        ...cat,
        count: groupWords.length > 0 ? groupWords.length : cat.count,
        subcategories: cat.subcategories?.map((sub) => {
          const subWords = this.words.filter((w) => w.categorySub === sub.name);
          return {
            ...sub,
            count: subWords.length > 0 ? subWords.length : sub.count,
          };
        }),
      };
    });
  }

  public addWord(word: Omit<WordItem, 'id'>): WordItem {
    const newWord: WordItem = {
      ...word,
      id: `w-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.words.unshift(newWord);
    this.saveWords();
    return newWord;
  }

  public updateWord(id: string, updates: Partial<WordItem>): WordItem | null {
    const index = this.words.findIndex((w) => w.id === id);
    if (index === -1) return null;
    this.words[index] = { ...this.words[index], ...updates };
    this.saveWords();
    return this.words[index];
  }

  public deleteWord(id: string) {
    this.words = this.words.filter((w) => w.id !== id);
    this.saveWords();
  }

  public toggleFavorite(id: string) {
    const word = this.words.find((w) => w.id === id);
    if (word) {
      word.isFavorite = !word.isFavorite;
      this.saveWords();
    }
  }

  public updateStatus(id: string, status: WordStatus) {
    const word = this.words.find((w) => w.id === id);
    if (word) {
      word.status = status;
      word.lastReviewedAt = new Date().toISOString();
      this.saveWords();
    }
  }

  public resetToDefault() {
    this.words = [...INITIAL_WORDS];
    this.saveWords();
  }

  // Audio / Speech Synthesis
  public speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = this.audioSettings.rate || 0.95;
    utterance.pitch = this.audioSettings.pitch || 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (this.audioSettings.voiceName) {
      const selected = voices.find((v) => v.name === this.audioSettings.voiceName);
      if (selected) utterance.voice = selected;
    } else {
      const preferred = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
      if (preferred) utterance.voice = preferred;
    }

    window.speechSynthesis.speak(utterance);
  }

  public getAudioSettings(): AudioSettings {
    return { ...this.audioSettings };
  }

  public updateAudioSettings(settings: Partial<AudioSettings>) {
    this.audioSettings = { ...this.audioSettings, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY_AUDIO_SETTINGS, JSON.stringify(this.audioSettings));
    } catch {}
    this.notify();
  }
}

export const vocabService = new VocabularyService();
