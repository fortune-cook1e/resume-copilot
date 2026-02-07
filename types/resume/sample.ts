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

    experience: {
      name: 'Experience',
      visible: true,
      id: 'experience',
      items: [
        {
          id: 'experience-item-1',
          company: 'Google',
          position: 'Software Engineer',
          location: 'Mountain View, CA',
          date: 'Jul 2018 - Aug 2025',
          visible: true,
          summary:
            '• Developed and maintained the user interface for Google Search, serving over 1 billion users worldwide.\n• Collaborated with cross-functional teams to design and implement new features, resulting in a 15% increase in user engagement.\n• Optimized front-end performance, reducing page load times by 30% and improving overall user experience.',
        },
        {
          id: 'experience-item-2',
          company: 'Facebook',
          position: 'Front-End Developer',
          location: 'Menlo Park, CA',
          date: 'Jun 2016 - Aug 2016',
          visible: true,
          summary:
            '• Contributed to the development of Facebook’s main web application, enhancing the news feed and user profile features.\n• Implemented responsive design techniques to ensure a seamless experience across desktop and mobile devices.\n• Participated in code reviews and collaborated with designers to create intuitive user interfaces.',
        },
        {
          id: 'experience-item-3',
          company: 'Startup XYZ',
          position: 'Intern Front-End Developer',
          location: 'San Francisco, CA',
          date: 'Jun 2015 - Aug 2015',
          visible: true,
          summary:
            '• Assisted in the development of a single-page application using React and Redux, contributing to both front-end and back-end code.\n• Worked closely with the design team to implement pixel-perfect UI components and improve the overall user experience.\n• Gained valuable experience in an agile development environment, participating in daily stand-ups and sprint planning sessions.',
        },
      ],
    },
  },
};
