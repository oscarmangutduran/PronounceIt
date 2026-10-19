/**
 * Tipos compartidos para las Firebase Cloud Functions de PronounceIt
 */

export interface EnrichWordRequest {
  word: string;
  targetLanguage?: 'es' | 'en';
}

export interface EnrichWordResponse {
  word: string;
  phoneticIpa: string;
  translation: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleEs: string;
  pronunciationTips: string[];
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  timestamp: string;
}

export interface DeleteUserAccountRequest {
  confirmation: boolean;
}

export interface DeleteUserAccountResponse {
  success: boolean;
  message: string;
  deletedUid: string;
}
