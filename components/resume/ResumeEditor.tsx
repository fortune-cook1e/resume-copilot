'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Upload } from 'lucide-react';
import { parseLinkedInJSON } from '@/lib/linkedin-parser';
import { useRef } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { Education, WorkExperience, Skill } from '@/types/resume';

export default function ResumeEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { resume, updateResume } = useResumeStore();

  if (!resume) return null;

  const handleAddEducation = () => {
    updateResume(draft => {
      draft.education.push({
        id: Date.now().toString(),
        school: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        description: '',
      });
    });
  };

  const handleRemoveEducation = (id: string) => {
    updateResume(draft => {
      draft.education = draft.education.filter(edu => edu.id !== id);
    });
  };

  const handleUpdateEducation = (id: string, field: keyof Education, value: string) => {
    updateResume(draft => {
      const edu = draft.education.find(e => e.id === id);
      if (edu) {
        (edu[field] as string) = value;
      }
    });
  };

  const handleAddWorkExperience = () => {
    updateResume(draft => {
      draft.workExperience.push({
        id: Date.now().toString(),
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        achievements: [],
      });
    });
  };

  const handleRemoveWorkExperience = (id: string) => {
    updateResume(draft => {
      draft.workExperience = draft.workExperience.filter(work => work.id !== id);
    });
  };

  const handleUpdateWorkExperience = (id: string, field: keyof WorkExperience, value: any) => {
    updateResume(draft => {
      const work = draft.workExperience.find(w => w.id === id);
      if (work) {
        (work[field] as any) = value;
      }
    });
  };

  const handleAddSkill = () => {
    updateResume(draft => {
      draft.skills.push({
        id: Date.now().toString(),
        name: '',
        category: 'Technical',
        level: 'Intermediate',
      });
    });
  };

  const handleRemoveSkill = (id: string) => {
    updateResume(draft => {
      draft.skills = draft.skills.filter(skill => skill.id !== id);
    });
  };

  const handleUpdateSkill = (id: string, field: keyof Skill, value: string) => {
    updateResume(draft => {
      const skill = draft.skills.find(s => s.id === id);
      if (skill) {
        (skill[field] as string) = value;
      }
    });
  };

  const handleLinkedInImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const parsedData = parseLinkedInJSON(data);

      updateResume(draft => {
        if (parsedData.personalInfo) {
          Object.assign(draft.personalInfo, parsedData.personalInfo);
        }
        if (parsedData.education) {
          draft.education = parsedData.education;
        }
        if (parsedData.workExperience) {
          draft.workExperience = parsedData.workExperience;
        }
        if (parsedData.skills) {
          draft.skills = parsedData.skills;
        }
      });

      alert('LinkedIn数据导入成功！');
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请确保上传的是有效的LinkedIn JSON文件');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">编辑简历</h2>
        <Button onClick={handleLinkedInImport} className="gap-2">
          <Upload className="h-4 w-4" />
          从LinkedIn导入
        </Button>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">基本信息</TabsTrigger>
          <TabsTrigger value="education">教育经历</TabsTrigger>
          <TabsTrigger value="experience">工作经历</TabsTrigger>
          <TabsTrigger value="skills">技能</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">姓名 *</Label>
              <Input
                id="fullName"
                value={resume.personalInfo.fullName}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.fullName = e.target.value;
                  })
                }
                placeholder="张三"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                value={resume.personalInfo.email}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.email = e.target.value;
                  })
                }
                placeholder="zhangsan@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">电话 *</Label>
              <Input
                id="phone"
                value={resume.personalInfo.phone}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.phone = e.target.value;
                  })
                }
                placeholder="+86 138 0000 0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">地址</Label>
              <Input
                id="location"
                value={resume.personalInfo.location}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.location = e.target.value;
                  })
                }
                placeholder="北京市"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input
                id="linkedIn"
                value={resume.personalInfo.linkedIn}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.linkedIn = e.target.value;
                  })
                }
                placeholder="linkedin.com/in/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                value={resume.personalInfo.github}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.github = e.target.value;
                  })
                }
                placeholder="github.com/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">个人网站</Label>
              <Input
                id="website"
                value={resume.personalInfo.website}
                onChange={e =>
                  updateResume(draft => {
                    draft.personalInfo.website = e.target.value;
                  })
                }
                placeholder="www.example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">个人简介</Label>
            <Textarea
              id="summary"
              value={resume.personalInfo.summary}
              onChange={e =>
                updateResume(draft => {
                  draft.personalInfo.summary = e.target.value;
                })
              }
              placeholder="简要描述您的专业背景、技能和职业目标..."
              rows={5}
            />
          </div>
        </TabsContent>

        {/* 教育经历 */}
        <TabsContent value="education" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Label className="text-base">教育经历</Label>
            <Button onClick={handleAddEducation} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              添加教育经历
            </Button>
          </div>

          {resume.education.map(edu => (
            <Card key={edu.id} className="p-4 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveEducation(edu.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>

              <div className="space-y-4 pr-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>学校名称</Label>
                    <Input
                      value={edu.school}
                      onChange={e => handleUpdateEducation(edu.id, 'school', e.target.value)}
                      placeholder="清华大学"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>学位</Label>
                    <Input
                      value={edu.degree}
                      onChange={e => handleUpdateEducation(edu.id, 'degree', e.target.value)}
                      placeholder="学士"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>专业</Label>
                  <Input
                    value={edu.field}
                    onChange={e => handleUpdateEducation(edu.id, 'field', e.target.value)}
                    placeholder="计算机科学"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>开始日期</Label>
                    <Input
                      type="month"
                      value={edu.startDate}
                      onChange={e => handleUpdateEducation(edu.id, 'startDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结束日期</Label>
                    <Input
                      type="month"
                      value={edu.endDate}
                      onChange={e => handleUpdateEducation(edu.id, 'endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>描述（可选）</Label>
                  <Textarea
                    value={edu.description || ''}
                    onChange={e => handleUpdateEducation(edu.id, 'description', e.target.value)}
                    placeholder="相关课程、成绩、荣誉等..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          ))}

          {resume.education.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无教育经历，点击上方按钮添加</div>
          )}
        </TabsContent>

        {/* 工作经历 */}
        <TabsContent value="experience" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Label className="text-base">工作经历</Label>
            <Button onClick={handleAddWorkExperience} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              添加工作经历
            </Button>
          </div>

          {resume.workExperience.map(work => (
            <Card key={work.id} className="p-4 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveWorkExperience(work.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>

              <div className="space-y-4 pr-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>公司名称</Label>
                    <Input
                      value={work.company}
                      onChange={e => handleUpdateWorkExperience(work.id, 'company', e.target.value)}
                      placeholder="字节跳动"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>职位</Label>
                    <Input
                      value={work.position}
                      onChange={e =>
                        handleUpdateWorkExperience(work.id, 'position', e.target.value)
                      }
                      placeholder="前端工程师"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>地点</Label>
                  <Input
                    value={work.location}
                    onChange={e => handleUpdateWorkExperience(work.id, 'location', e.target.value)}
                    placeholder="北京"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>开始日期</Label>
                    <Input
                      type="month"
                      value={work.startDate}
                      onChange={e =>
                        handleUpdateWorkExperience(work.id, 'startDate', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结束日期</Label>
                    <Input
                      type="month"
                      value={work.endDate}
                      onChange={e => handleUpdateWorkExperience(work.id, 'endDate', e.target.value)}
                      disabled={work.current}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`current-${work.id}`}
                    checked={work.current}
                    onChange={e => handleUpdateWorkExperience(work.id, 'current', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`current-${work.id}`}>我目前在这里工作</Label>
                </div>

                <div className="space-y-2">
                  <Label>工作描述</Label>
                  <Textarea
                    value={work.description}
                    onChange={e =>
                      handleUpdateWorkExperience(work.id, 'description', e.target.value)
                    }
                    placeholder="描述您的职责和成就..."
                    rows={4}
                  />
                </div>
              </div>
            </Card>
          ))}

          {resume.workExperience.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无工作经历，点击上方按钮添加</div>
          )}
        </TabsContent>

        {/* 技能 */}
        <TabsContent value="skills" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Label className="text-base">技能</Label>
            <Button onClick={handleAddSkill} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              添加技能
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {resume.skills.map(skill => (
              <Card key={skill.id} className="p-4 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemoveSkill(skill.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>

                <div className="space-y-3 pr-8">
                  <div className="space-y-2">
                    <Label>技能名称</Label>
                    <Input
                      value={skill.name}
                      onChange={e => handleUpdateSkill(skill.id, 'name', e.target.value)}
                      placeholder="React.js"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>类别</Label>
                    <Input
                      value={skill.category}
                      onChange={e => handleUpdateSkill(skill.id, 'category', e.target.value)}
                      placeholder="前端开发"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>熟练程度</Label>
                    <select
                      value={skill.level || 'Intermediate'}
                      onChange={e => handleUpdateSkill(skill.id, 'level', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="Beginner">初级</option>
                      <option value="Intermediate">中级</option>
                      <option value="Advanced">高级</option>
                      <option value="Expert">专家</option>
                    </select>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {resume.skills.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无技能信息，点击上方按钮添加</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
