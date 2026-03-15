import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, page } = await req.json();

    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RAPIDAPI_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = query || 'software developer';
    const searchLocation = location && location !== 'All India' ? `${location}, India` : 'India';
    const pageNum = page || 1;

    const url = new URL('https://jsearch.p.rapidapi.com/search');
    url.searchParams.set('query', `${searchQuery} in ${searchLocation}`);
    url.searchParams.set('page', String(pageNum));
    url.searchParams.set('num_pages', '1');
    url.searchParams.set('country', 'in');
    url.searchParams.set('date_posted', 'week');

    console.log('Fetching jobs:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('JSearch API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.message || 'JSearch API error' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform to our format
    const jobs = (data.data || []).map((job: any, i: number) => ({
      id: job.job_id || `job-${i}`,
      title: job.job_title || 'Unknown',
      company: job.employer_name || 'Unknown',
      location: job.job_city ? `${job.job_city}, ${job.job_state || ''}`.trim() : job.job_country || 'India',
      type: job.job_employment_type || 'Full-time',
      experience: job.job_required_experience?.required_experience_in_months
        ? `${Math.round(job.job_required_experience.required_experience_in_months / 12)} years`
        : 'Not specified',
      salary: job.job_min_salary && job.job_max_salary
        ? `₹${Math.round(job.job_min_salary / 100000)}-${Math.round(job.job_max_salary / 100000)} LPA`
        : 'Not disclosed',
      skills: job.job_required_skills || [],
      posted: job.job_posted_at_datetime_utc
        ? getRelativeTime(job.job_posted_at_datetime_utc)
        : 'Recently',
      logo: job.employer_logo || '',
      linkedinUrl: job.job_apply_link || job.job_google_link || '#',
      description: job.job_description?.substring(0, 200) || '',
      isHiring: true,
      applyLink: job.job_apply_link || '',
    }));

    return new Response(
      JSON.stringify({ success: true, jobs, total: data.data?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const posted = new Date(dateStr);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
