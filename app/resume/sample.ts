import { Resume } from '@/types/resume';

export const INITIAL_SAMPLE_RESUME: Resume = {
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
