'use client';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';
import { Resume } from '@/types/resume';

interface ResumeDocumentProps {
  resume: Resume;
}

export default function ResumeDocument({ resume }: ResumeDocumentProps) {
  const { personalInfo, education, workExperience, skills } = resume;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    return `${year}年${month}月`;
  };

  // A4 尺寸: 210mm x 297mm
  // 浏览器默认使用 96 DPI
  // 在 96 DPI 下: 210mm = 794px, 297mm = 1123px
  // 使用像素单位确保浏览器和 PDF 渲染一致
  return (
    <div
      id="resume-document"
      className="bg-white mx-auto"
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '56px 75px', // 约 15mm x 20mm
        boxSizing: 'border-box',
      }}
    >
      <div className="space-y-6">
        {/* 个人信息头部 */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">
            {personalInfo.fullName || '您的姓名'}
          </h1>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            {personalInfo.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{personalInfo.location}</span>
              </div>
            )}
          </div>

          {(personalInfo.linkedIn || personalInfo.github || personalInfo.website) && (
            <div className="flex flex-wrap justify-center gap-4 text-sm text-blue-600">
              {personalInfo.linkedIn && (
                <div className="flex items-center gap-1">
                  <Linkedin className="h-4 w-4" />
                  <span>{personalInfo.linkedIn}</span>
                </div>
              )}
              {personalInfo.github && (
                <div className="flex items-center gap-1">
                  <Github className="h-4 w-4" />
                  <span>{personalInfo.github}</span>
                </div>
              )}
              {personalInfo.website && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>{personalInfo.website}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 个人简介 */}
        {personalInfo.summary && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">个人简介</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {personalInfo.summary}
              </p>
            </div>
          </>
        )}

        {/* 工作经历 */}
        {workExperience.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">工作经历</h2>
              <div className="space-y-4">
                {workExperience.map(work => (
                  <div key={work.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {work.position || '职位名称'}
                        </h3>
                        <p className="text-gray-700">
                          {work.company || '公司名称'}
                          {work.location && ` · ${work.location}`}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600 text-right whitespace-nowrap ml-4">
                        {work.startDate && formatDate(work.startDate)}
                        {' - '}
                        {work.current ? '至今' : work.endDate ? formatDate(work.endDate) : ''}
                      </div>
                    </div>
                    {work.description && (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {work.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 教育经历 */}
        {education.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">教育经历</h2>
              <div className="space-y-4">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {edu.school || '学校名称'}
                        </h3>
                        <p className="text-gray-700">
                          {edu.degree && `${edu.degree} · `}
                          {edu.field || '专业'}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600 text-right whitespace-nowrap ml-4">
                        {edu.startDate && formatDate(edu.startDate)}
                        {' - '}
                        {edu.endDate && formatDate(edu.endDate)}
                      </div>
                    </div>
                    {edu.description && (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 技能 */}
        {skills.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">技能</h2>
              <div className="space-y-3">
                {Array.from(new Set(skills.map(s => s.category))).map(category => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {skills
                        .filter(skill => skill.category === category)
                        .map(skill => (
                          <Badge key={skill.id} variant="secondary" className="text-sm">
                            {skill.name}
                            {skill.level &&
                              ` · ${
                                skill.level === 'Beginner'
                                  ? '初级'
                                  : skill.level === 'Intermediate'
                                    ? '中级'
                                    : skill.level === 'Advanced'
                                      ? '高级'
                                      : '专家'
                              }`}
                          </Badge>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 空状态提示 */}
        {!personalInfo.fullName &&
          workExperience.length === 0 &&
          education.length === 0 &&
          skills.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">在左侧编辑区开始编辑您的简历</p>
              <p className="text-sm mt-2">或者从LinkedIn导入您的数据</p>
            </div>
          )}
      </div>
    </div>
  );
}
