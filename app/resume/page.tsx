'use client';

import { useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import ResumeEditor from '@/components/resume/ResumeEditor';
import ResumePreview from '@/components/resume/ResumePreview';
import { useResumeStore } from '@/stores/resume-store';
import { useLayoutStore } from '@/stores/layout-store';
import { Resume } from '@/types/resume';

const initialResumeData: Resume = {
  personalInfo: {
    fullName: '张三',
    email: 'zhangsan@example.com',
    phone: '+86 138-0000-0000',
    location: '北京，中国',
    linkedIn: 'linkedin.com/in/zhangsan',
    github: 'github.com/zhangsan',
    website: 'zhangsan.com',
    summary:
      '5年以上前端开发经验，精通React、TypeScript和Node.js。热衷于构建高性能、用户友好的Web应用。具有良好的团队协作能力和问题解决能力。',
  },
  education: [
    {
      id: '1',
      school: '清华大学',
      degree: '计算机科学与技术学士',
      field: '计算机科学',
      startDate: '2015-09',
      endDate: '2019-06',
      description: '主修课程：数据结构与算法、操作系统、计算机网络、软件工程\nGPA: 3.8/4.0',
    },
  ],
  workExperience: [
    {
      id: '1',
      company: '字节跳动',
      position: '高级前端工程师',
      location: '北京',
      startDate: '2021-07',
      endDate: '至今',
      current: true,
      description:
        '• 负责今日头条Web端核心功能的开发和维护，优化首屏加载速度30%\n• 主导重构推荐流组件，提升代码可维护性和性能\n• 指导3名初级工程师，协助团队技术栈升级到React 18\n• 参与技术方案评审，推动前端工程化和自动化流程建设',
      achievements: [
        '优化首屏加载速度30%',
        '重构推荐流组件',
        '指导3名初级工程师',
        '推动前端工程化建设',
      ],
    },
    {
      id: '2',
      company: '阿里巴巴',
      position: '前端工程师',
      location: '杭州',
      startDate: '2019-07',
      endDate: '2021-06',
      current: false,
      description:
        '• 参与淘宝商家后台系统的开发，使用React和Ant Design\n• 开发可复用的业务组件库，提升团队开发效率20%\n• 优化页面性能，减少白屏时间和交互延迟\n• 参与Code Review和技术分享，促进团队技术成长',
      achievements: [
        '开发可复用的业务组件库',
        '提升团队开发效率20%',
        '优化页面性能',
        '参与技术分享',
      ],
    },
  ],
  skills: [
    { id: '1', name: 'JavaScript/TypeScript', category: '编程语言', level: 'Expert' },
    { id: '2', name: 'React/Next.js', category: '前端框架', level: 'Expert' },
    { id: '3', name: 'Vue.js', category: '前端框架', level: 'Advanced' },
    { id: '4', name: 'Node.js', category: '后端', level: 'Advanced' },
    { id: '5', name: 'Tailwind CSS', category: '样式', level: 'Advanced' },
    { id: '6', name: 'Git', category: '工具', level: 'Advanced' },
    { id: '7', name: 'Webpack/Vite', category: '工具', level: 'Intermediate' },
    { id: '8', name: 'Docker', category: '工具', level: 'Intermediate' },
  ],
  projects: [
    {
      id: '1',
      name: 'Resume Copilot',
      description: '基于Next.js和AI的智能简历生成工具，支持从LinkedIn导入数据，实时预览和PDF导出',
      technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Zustand'],
      url: 'github.com/zhangsan/resume-copilot',
      startDate: '2024-01',
      endDate: '至今',
    },
    {
      id: '2',
      name: '电商管理平台',
      description: '为中小企业提供的电商管理系统，包含商品管理、订单处理、数据分析等功能',
      technologies: ['React', 'Ant Design', 'Node.js', 'MongoDB'],
      url: '',
      startDate: '2020-06',
      endDate: '2021-03',
    },
  ],
};

export default function ResumePage() {
  const { resume, setResume } = useResumeStore();
  const { leftSidebarSize, rightSidebarSize, setLeftSidebarSize, setRightSidebarSize } =
    useLayoutStore();

  // Initialize resume data
  useEffect(() => {
    if (!resume) {
      setResume(initialResumeData);
    }
  }, [resume, setResume]);

  const handleLayoutChange = (sizes: number[]) => {
    if (sizes[0]) setLeftSidebarSize(sizes[0]);
    if (sizes[1]) setRightSidebarSize(sizes[1]);
  };

  if (!resume) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Resume Copilot</h1>
          <p className="text-sm text-gray-600 mt-1">从LinkedIn导入，创建专业简历</p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={handleLayoutChange}
          className="h-full"
        >
          {/* 左侧编辑区 */}
          <ResizablePanel defaultSize={leftSidebarSize} minSize={30} maxSize={70}>
            <div className="h-full bg-white border-r border-gray-200">
              <div className="h-full overflow-y-auto">
                <ResumeEditor />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* 右侧预览区 */}
          <ResizablePanel defaultSize={rightSidebarSize} minSize={30} maxSize={70}>
            <div className="h-full bg-gray-100">
              <div className="h-full overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                  <ResumePreview />
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
