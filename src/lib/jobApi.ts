import { supabase } from '@/integrations/supabase/client';

export interface RealJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  experience: string;
  salary: string;
  skills: string[];
  posted: string;
  logo: string;
  linkedinUrl: string;
  description: string;
  isHiring: boolean;
  applyLink: string;
  matchScore?: number;
}

export async function fetchRealJobs(
  query: string = 'software developer',
  location: string = 'All India',
  page: number = 1
): Promise<{ jobs: RealJob[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('search-jobs', {
      body: { query, location, page },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { jobs: [], error: error.message };
    }

    if (!data.success) {
      return { jobs: [], error: data.error || 'Failed to fetch jobs' };
    }

    return { jobs: data.jobs || [] };
  } catch (err) {
    console.error('Fetch error:', err);
    return { jobs: [], error: 'Failed to connect to job search service' };
  }
}

export function matchJobsToResumeSkills(
  jobs: RealJob[],
  resumeSkills: string[]
): RealJob[] {
  if (!resumeSkills.length) return jobs;

  const skillsLower = resumeSkills.map(s => s.toLowerCase());

  return jobs
    .map(job => {
      const jobText = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
      const matched = skillsLower.filter(s => jobText.includes(s)).length;
      const matchScore = Math.round((matched / Math.max(skillsLower.length, 1)) * 100);
      return { ...job, matchScore };
    })
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}
