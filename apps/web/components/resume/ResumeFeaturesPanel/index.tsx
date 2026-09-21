'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Sparkles, FileText, TrendingUp } from 'lucide-react';
import JobMatchTab from './JobMatchTab';

export default function ResumeFeaturesPanel() {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Tabs defaultValue="match" className="flex-1 flex flex-col">
        <div className="border-b bg-white px-4">
          <TabsList className="h-12 bg-transparent">
            <TabsTrigger value="match" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Job Match
            </TabsTrigger>
            <TabsTrigger value="optimize" className="gap-2" disabled>
              <Sparkles className="w-4 h-4" />
              AI Optimize
            </TabsTrigger>
            <TabsTrigger value="tips" className="gap-2" disabled>
              <FileText className="w-4 h-4" />
              Tips
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="match" className="mt-0 h-full">
            <JobMatchTab />
          </TabsContent>

          <TabsContent value="optimize" className="mt-0 p-4">
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-gray-500">AI Optimization coming soon...</p>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="mt-0 p-4">
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-gray-500">Resume tips coming soon...</p>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
