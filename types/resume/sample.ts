import { ResumeData } from './resume';

export const sampleResume: ResumeData = {
  basics: {
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    phone: '(555) 123-4567',
    location: 'Pleasantville, CA 94588',
    headline: 'Creative Front-End Developer',
    website: {
      icon: '',
      label: 'Portfolio',
      link: 'https://johndoe.me/',
    },
    picture: {
      url: 'https://i.imgur.com/HgwyOuJ.jpg',
      size: 120,
    },
    customFields: [],
  },
  modules: {
    education: {
      name: 'Education',
      visible: true,
      id: 'education',
      items: [
        {
          id: 'education-item-1',
          university: 'MIT University',
          location: 'Cambridge, MA',
          date: 'Sep 2025 - Jun 2027 (Expected)',
          visible: true,
          major: 'MSc in Computer Science',
          summary: '',
        },
        {
          id: 'education-item-2',
          university: 'Harvard University',
          location: 'Cambridge, MA',
          date: 'Sep 2014 - Jul 2018',
          visible: true,
          major: 'BSc in Computer Science',
          summary: '',
        },
      ],
    },
  },
};
