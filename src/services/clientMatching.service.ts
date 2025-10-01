import { supabase } from '../lib/supabase';
import { ClientRecord } from './fileValidation.service';

export interface ExistingClient {
  cuit: number;
  razon_social: string;
  email: string;
  telefono: string | null;
  direccion: string;
  contacto: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  type: 'exact' | 'potential' | 'new';
  confidence: number;
  existingClient?: ExistingClient;
  uploadedClient: ClientRecord;
  matchCriteria: string[];
  differences?: FieldDifference[];
}

export interface FieldDifference {
  field: string;
  existingValue: any;
  newValue: any;
}

const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
};

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
};

const calculateStringSimilarity = (str1: string, str2: string): number => {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 100;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  if (maxLength === 0) return 100;

  return Math.max(0, (1 - distance / maxLength) * 100);
};

const findDifferences = (
  existing: ExistingClient,
  uploaded: ClientRecord
): FieldDifference[] => {
  const differences: FieldDifference[] = [];

  const fields: Array<keyof ExistingClient> = [
    'razon_social',
    'email',
    'telefono',
    'direccion',
    'contacto',
  ];

  fields.forEach((field) => {
    const existingValue = existing[field];
    const uploadedValue = uploaded[field as keyof ClientRecord];

    const existingStr = existingValue?.toString().trim() || '';
    const uploadedStr = uploadedValue?.toString().trim() || '';

    if (existingStr !== uploadedStr) {
      differences.push({
        field: field.toString(),
        existingValue: existingValue || null,
        newValue: uploadedValue || null,
      });
    }
  });

  return differences;
};

export const matchClients = async (
  uploadedRecords: ClientRecord[]
): Promise<MatchResult[]> => {
  const { data: existingClients, error } = await supabase
    .from('clients')
    .select('*');

  if (error) {
    throw new Error(`Error al cargar clientes existentes: ${error.message}`);
  }

  const results: MatchResult[] = [];

  for (const uploaded of uploadedRecords) {
    const uploadedCuit = uploaded.cuit.replace(/[-\s]/g, '');

    const exactMatch = existingClients?.find(
      (existing) => existing.cuit.toString() === uploadedCuit
    );

    if (exactMatch) {
      const differences = findDifferences(exactMatch, uploaded);

      results.push({
        type: 'exact',
        confidence: 100,
        existingClient: exactMatch,
        uploadedClient: uploaded,
        matchCriteria: ['cuit'],
        differences: differences.length > 0 ? differences : undefined,
      });
      continue;
    }

    let bestMatch: ExistingClient | null = null;
    let bestScore = 0;
    let matchCriteria: string[] = [];

    for (const existing of existingClients || []) {
      let score = 0;
      const criteria: string[] = [];

      if (existing.email.toLowerCase() === uploaded.email.toLowerCase()) {
        score += 40;
        criteria.push('email');
      }

      const nameSimilarity = calculateStringSimilarity(
        existing.razon_social,
        uploaded.razon_social
      );

      if (nameSimilarity >= 85) {
        score += nameSimilarity * 0.6;
        criteria.push('razon_social');
      }

      if (
        existing.telefono &&
        uploaded.telefono &&
        existing.telefono.replace(/[\s\-()]/g, '') ===
          uploaded.telefono.replace(/[\s\-()]/g, '')
      ) {
        score += 20;
        criteria.push('telefono');
      }

      if (score > bestScore && score >= 70) {
        bestScore = score;
        bestMatch = existing;
        matchCriteria = criteria;
      }
    }

    if (bestMatch && bestScore >= 70) {
      const differences = findDifferences(bestMatch, uploaded);

      results.push({
        type: 'potential',
        confidence: Math.round(bestScore),
        existingClient: bestMatch,
        uploadedClient: uploaded,
        matchCriteria,
        differences,
      });
    } else {
      results.push({
        type: 'new',
        confidence: 0,
        uploadedClient: uploaded,
        matchCriteria: [],
      });
    }
  }

  return results;
};

export const categorizeMatches = (matches: MatchResult[]) => {
  const exactMatches = matches.filter((m) => m.type === 'exact');
  const potentialDuplicates = matches.filter((m) => m.type === 'potential');
  const newClients = matches.filter((m) => m.type === 'new');

  const exactMatchesWithChanges = exactMatches.filter(
    (m) => m.differences && m.differences.length > 0
  );

  const exactMatchesNoChanges = exactMatches.filter(
    (m) => !m.differences || m.differences.length === 0
  );

  return {
    exactMatches,
    exactMatchesWithChanges,
    exactMatchesNoChanges,
    potentialDuplicates,
    newClients,
    summary: {
      total: matches.length,
      exactMatch: exactMatches.length,
      exactMatchWithChanges: exactMatchesWithChanges.length,
      exactMatchNoChanges: exactMatchesNoChanges.length,
      potentialDuplicate: potentialDuplicates.length,
      newClient: newClients.length,
    },
  };
};
