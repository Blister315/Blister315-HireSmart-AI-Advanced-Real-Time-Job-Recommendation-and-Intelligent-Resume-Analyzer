export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experience: string;
  salary: string;
  skills: string[];
  posted: string;
  logo: string;
  linkedinUrl: string;
  description: string;
  isHiring: boolean;
}

export const INDIAN_CITIES = [
  'All India', 'Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune',
  'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Noida', 'Gurugram',
  'Kochi', 'Chandigarh', 'Indore', 'Coimbatore', 'Remote',
];

const COMPANIES: { name: string; logo: string }[] = [
  { name: 'Infosys', logo: '🟢' },
  { name: 'TCS', logo: '🔵' },
  { name: 'Wipro', logo: '🟣' },
  { name: 'HCL Technologies', logo: '🔴' },
  { name: 'Tech Mahindra', logo: '🟠' },
  { name: 'Flipkart', logo: '🟡' },
  { name: 'Razorpay', logo: '🔷' },
  { name: 'Zerodha', logo: '💎' },
  { name: 'Zomato', logo: '🍕' },
  { name: 'Swiggy', logo: '🧡' },
  { name: 'PhonePe', logo: '💜' },
  { name: 'CRED', logo: '⚡' },
  { name: 'Paytm', logo: '💙' },
  { name: 'Freshworks', logo: '🌿' },
  { name: 'Zoho', logo: '🏢' },
  { name: 'MakeMyTrip', logo: '✈️' },
  { name: 'Ola', logo: '🚗' },
  { name: 'Dream11', logo: '🏏' },
  { name: 'Myntra', logo: '👗' },
  { name: 'BigBasket', logo: '🛒' },
  { name: 'Reliance Jio', logo: '📡' },
  { name: 'Meesho', logo: '🛍️' },
  { name: 'Unacademy', logo: '📚' },
  { name: 'ShareChat', logo: '💬' },
];

const JOB_TITLES = [
  'Senior Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Data Scientist', 'ML Engineer',
  'DevOps Engineer', 'Product Manager', 'UI/UX Designer',
  'Cloud Architect', 'QA Engineer', 'Mobile Developer',
  'Data Analyst', 'Site Reliability Engineer', 'Security Engineer',
  'Tech Lead', 'Engineering Manager', 'Solutions Architect',
];

const SKILLS_POOL = [
  'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'AWS', 'Docker',
  'Kubernetes', 'MongoDB', 'PostgreSQL', 'Redis', 'Kafka', 'GraphQL',
  'Machine Learning', 'TensorFlow', 'Go', 'Rust', 'Flutter', 'Swift',
  'Figma', 'Tableau', 'Spark', 'Hadoop', 'Elasticsearch',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSkills(): string[] {
  const count = 3 + Math.floor(Math.random() * 4);
  const shuffled = [...SKILLS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function daysAgo(n: number): string {
  if (n === 0) return 'Today';
  if (n === 1) return '1 day ago';
  return `${n} days ago`;
}

export function generateJobs(count: number = 30, city?: string): Job[] {
  const cities = city && city !== 'All India'
    ? [city]
    : INDIAN_CITIES.filter(c => c !== 'All India');

  return Array.from({ length: count }, (_, i) => {
    const company = randomFrom(COMPANIES);
    const salaryBase = 4 + Math.floor(Math.random() * 40);
    const salaryTop = salaryBase + 5 + Math.floor(Math.random() * 15);
    return {
      id: `job-${i + 1}`,
      title: randomFrom(JOB_TITLES),
      company: company.name,
      location: randomFrom(cities),
      type: randomFrom(['Full-time', 'Full-time', 'Full-time', 'Contract', 'Internship'] as const),
      experience: `${Math.floor(Math.random() * 5)}-${3 + Math.floor(Math.random() * 7)} years`,
      salary: `₹${salaryBase}-${salaryTop} LPA`,
      skills: randomSkills(),
      posted: daysAgo(Math.floor(Math.random() * 14)),
      logo: company.logo,
      linkedinUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(randomFrom(JOB_TITLES))}&location=India`,
      description: `We are looking for a talented professional to join our team at ${company.name}. This is an exciting opportunity to work on cutting-edge technology.`,
      isHiring: true,
    };
  });
}

export function matchJobsToResume(jobs: Job[], resumeSkills: string[]): (Job & { matchScore: number })[] {
  const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
  return jobs.map(job => {
    const jobSkillsLower = job.skills.map(s => s.toLowerCase());
    const matched = jobSkillsLower.filter(s => 
      resumeSkillsLower.some(rs => rs.includes(s) || s.includes(rs))
    ).length;
    const matchScore = jobSkillsLower.length > 0
      ? Math.round((matched / jobSkillsLower.length) * 100)
      : 0;
    return { ...job, matchScore };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
