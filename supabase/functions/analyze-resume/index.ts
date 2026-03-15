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
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || resumeText.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resume text is too short (minimum 50 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert NLP-based resume analyzer. You perform Named Entity Recognition (NER), semantic analysis, and TF-IDF-style relevance scoring on resumes.

Your analysis must include:
1. **NER Extraction**: Extract named entities - skills (technical & soft), companies, job titles, education institutions, degrees, certifications, programming languages, frameworks, tools.
2. **Semantic Skill Categorization**: Classify each skill into categories: technical, soft, tool, language, framework, cloud, database, methodology.
3. **Resume Section Detection**: Identify which standard sections exist (summary, experience, education, skills, projects, certifications, achievements, contact, languages).
4. **TF-IDF Keyword Analysis**: Identify the most relevant/important terms weighted by their significance in the resume context.
5. **Role Matching**: Based on the skill profile, determine which job roles the candidate is best suited for, with confidence scores.
6. **Overall Quality Score** (0-100): Based on content richness, structure, skill diversity, quantifiable achievements, and keyword optimization.
7. **Actionable Suggestions**: Specific improvements the candidate should make.
${jobDescription ? `8. **Job Description Match**: Compare the resume against the provided job description. Assess semantic similarity, missing keywords, and fit score.` : ''}`;

    const userPrompt = `Analyze this resume using NER and NLP techniques:

---RESUME START---
${resumeText.substring(0, 8000)}
---RESUME END---
${jobDescription ? `\n---JOB DESCRIPTION START---\n${jobDescription.substring(0, 3000)}\n---JOB DESCRIPTION END---` : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_resume_analysis',
              description: 'Return the structured NER and NLP analysis of the resume',
              parameters: {
                type: 'object',
                properties: {
                  overallScore: {
                    type: 'number',
                    description: 'Overall resume quality score from 0-100',
                  },
                  skills: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        skill: { type: 'string' },
                        found: { type: 'boolean' },
                        category: {
                          type: 'string',
                          enum: ['technical', 'soft', 'tool', 'language', 'framework', 'cloud', 'database', 'methodology'],
                        },
                        confidence: { type: 'number', description: 'NER confidence 0-1' },
                      },
                      required: ['skill', 'found', 'category'],
                      additionalProperties: false,
                    },
                  },
                  entities: {
                    type: 'object',
                    properties: {
                      companies: { type: 'array', items: { type: 'string' } },
                      jobTitles: { type: 'array', items: { type: 'string' } },
                      institutions: { type: 'array', items: { type: 'string' } },
                      degrees: { type: 'array', items: { type: 'string' } },
                      certifications: { type: 'array', items: { type: 'string' } },
                      locations: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['companies', 'jobTitles', 'institutions', 'degrees', 'certifications', 'locations'],
                    additionalProperties: false,
                  },
                  keywords: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        word: { type: 'string' },
                        tfidfScore: { type: 'number', description: 'Relative TF-IDF importance 0-100' },
                        count: { type: 'number' },
                      },
                      required: ['word', 'tfidfScore', 'count'],
                      additionalProperties: false,
                    },
                  },
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        found: { type: 'boolean' },
                      },
                      required: ['name', 'found'],
                      additionalProperties: false,
                    },
                  },
                  matchedRoles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string' },
                        confidence: { type: 'number', description: '0-100 match confidence' },
                      },
                      required: ['role', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                  suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  jobMatchScore: {
                    type: 'number',
                    description: 'Semantic similarity score with job description 0-100, only if job description provided',
                  },
                  missingKeywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Keywords from job description missing in resume',
                  },
                },
                required: ['overallScore', 'skills', 'entities', 'keywords', 'sections', 'matchedRoles', 'suggestions'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_resume_analysis' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in AI response:', JSON.stringify(aiResult));
      return new Response(
        JSON.stringify({ success: false, error: 'AI did not return structured analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let analysis;
    try {
      analysis = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      console.error('Failed to parse AI arguments:', toolCall.function.arguments);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('analyze-resume error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
