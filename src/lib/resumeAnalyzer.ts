// AI-powered resume analysis via Lovable AI (Gemini) with NER, NLP, and TF-IDF scoring
import { supabase } from '@/integrations/supabase/client';

export interface SkillMatch {
  skill: string;
  found: boolean;
  category: 'technical' | 'soft' | 'tool' | 'language' | 'framework' | 'cloud' | 'database' | 'methodology';
  confidence?: number;
}

export interface ResumeEntities {
  companies: string[];
  jobTitles: string[];
  institutions: string[];
  degrees: string[];
  certifications: string[];
  locations: string[];
}

export interface MatchedRole {
  role: string;
  confidence: number;
}

export interface ResumeAnalysis {
  overallScore: number;
  skills: SkillMatch[];
  entities: ResumeEntities;
  keywords: { word: string; tfidfScore: number; count: number }[];
  sections: { name: string; found: boolean }[];
  suggestions: string[];
  matchedRoles: string[];
  matchedRolesDetailed: MatchedRole[];
  jobMatchScore?: number;
  missingKeywords?: string[];
}

export async function analyzeResume(
  text: string,
  jobDescription?: string
): Promise<ResumeAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-resume', {
    body: { resumeText: text, jobDescription },
  });

  if (error) {
    console.error('AI analysis error:', error);
    throw new Error(error.message || 'Failed to analyze resume');
  }

  if (!data?.success || !data?.analysis) {
    throw new Error(data?.error || 'AI analysis returned no results');
  }

  const a = data.analysis;

  return {
    overallScore: a.overallScore ?? 0,
    skills: (a.skills ?? []).map((s: any) => ({
      skill: s.skill,
      found: s.found ?? true,
      category: s.category ?? 'technical',
      confidence: s.confidence,
    })),
    entities: {
      companies: a.entities?.companies ?? [],
      jobTitles: a.entities?.jobTitles ?? [],
      institutions: a.entities?.institutions ?? [],
      degrees: a.entities?.degrees ?? [],
      certifications: a.entities?.certifications ?? [],
      locations: a.entities?.locations ?? [],
    },
    keywords: (a.keywords ?? []).map((k: any) => ({
      word: k.word,
      tfidfScore: k.tfidfScore ?? 0,
      count: k.count ?? 1,
    })),
    sections: a.sections ?? [],
    suggestions: a.suggestions ?? [],
    matchedRoles: (a.matchedRoles ?? []).map((r: any) => typeof r === 'string' ? r : r.role),
    matchedRolesDetailed: (a.matchedRoles ?? []).map((r: any) =>
      typeof r === 'string' ? { role: r, confidence: 50 } : { role: r.role, confidence: r.confidence ?? 50 }
    ),
    jobMatchScore: a.jobMatchScore,
    missingKeywords: a.missingKeywords,
  };
}
