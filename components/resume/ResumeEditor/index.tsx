'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResumeStore } from '@/stores/resume-store';
import { useRouter } from 'next/navigation';
import PersonalInfoForm from './PersonalInfoForm';

export default function ResumeEditor() {
  const { resume } = useResumeStore();
  const router = useRouter();

  if (!resume) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Edit Resume</h2>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <PersonalInfoForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
