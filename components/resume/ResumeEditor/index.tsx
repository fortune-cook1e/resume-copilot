'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResumeStore } from '@/stores/resume-store';
import Basics from './Basics';
import Education from './Education';

export default function ResumeEditor() {
  const { resume } = useResumeStore();

  if (!resume) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Edit Resume</h2>
      </div>

      <Tabs defaultValue="basics" className="w-full">
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="mt-4">
          <Basics />
        </TabsContent>
        <TabsContent value="education" className="mt-4">
          <Education />
        </TabsContent>
        <TabsContent value="experience" className="mt-4">
          {/* Experience form component goes here */}
        </TabsContent>
        <TabsContent value="skills" className="mt-4">
          {/* Skills form component goes here */}
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          {/* Projects form component goes here */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
