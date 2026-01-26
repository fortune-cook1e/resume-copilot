import { LinkedInProfile, Resume, Education, WorkExperience, Skill } from '@/types/resume';

/**
 * 解析LinkedIn导出的JSON文件
 * LinkedIn允许用户导出个人资料数据
 */
export function parseLinkedInJSON(data: any): Partial<Resume> {
  const profile = data as LinkedInProfile;

  return {
    personalInfo: {
      fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      email: profile.emailAddress || '',
      phone: profile.phoneNumbers?.[0] || '',
      location: '',
      linkedIn: '',
      github: '',
      website: '',
      summary: profile.summary || profile.headline || '',
    },
    education: parseLinkedInEducation(profile.educations || []),
    workExperience: parseLinkedInPositions(profile.positions || []),
    skills: parseLinkedInSkills(profile.skills || []),
    projects: [],
  };
}

function parseLinkedInEducation(educations: any[]): Education[] {
  return educations.map((edu: any, index: number) => ({
    id: `edu-${Date.now()}-${index}`,
    school: edu.schoolName || edu['School Name'] || '',
    degree: edu.degreeName || edu['Degree Name'] || '',
    field: edu.fieldOfStudy || edu['Field Of Study'] || '',
    startDate: formatLinkedInDate(edu.startDate || edu['Start Date']),
    endDate: formatLinkedInDate(edu.endDate || edu['End Date']),
    description: edu.notes || edu.activities || '',
  }));
}

function parseLinkedInPositions(positions: any[]): WorkExperience[] {
  return positions.map((pos: any, index: number) => ({
    id: `work-${Date.now()}-${index}`,
    company: pos.companyName || pos['Company Name'] || '',
    position: pos.title || pos['Title'] || '',
    location: pos.location || pos['Location'] || '',
    startDate: formatLinkedInDate(pos.startedOn || pos['Started On']),
    endDate: formatLinkedInDate(pos.finishedOn || pos['Finished On']),
    current: !pos.finishedOn && !pos['Finished On'],
    description: pos.description || pos['Description'] || '',
    achievements: [],
  }));
}

function parseLinkedInSkills(skills: any[]): Skill[] {
  return skills.map((skill: any, index: number) => ({
    id: `skill-${Date.now()}-${index}`,
    name: skill.name || skill['Name'] || '',
    category: 'Professional',
    level: 'Intermediate',
  }));
}

function formatLinkedInDate(dateObj: any): string {
  if (!dateObj) return '';

  // LinkedIn日期格式可能是 {year: 2020, month: 1} 或字符串
  if (typeof dateObj === 'object') {
    const year = dateObj.year;
    const month = dateObj.month || 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  if (typeof dateObj === 'string') {
    // 尝试解析字符串日期
    const date = new Date(dateObj);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * 处理LinkedIn PDF提取的文本（基础版本）
 * 注意：从PDF提取结构化数据比较困难，建议使用JSON导入
 */
export function parseLinkedInText(text: string): Partial<Resume> {
  // 这是一个简化版本，实际应用中需要更复杂的解析逻辑
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  // 尝试提取基本信息（这里只是示例）
  const name = lines[0] || '';

  return {
    personalInfo: {
      fullName: name,
      email: '',
      phone: '',
      location: '',
      linkedIn: '',
      github: '',
      website: '',
      summary: '',
    },
    education: [],
    workExperience: [],
    skills: [],
    projects: [],
  };
}
