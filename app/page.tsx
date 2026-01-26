import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Upload, Download, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>AI驱动的简历生成工具</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">
            Resume Copilot
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            从LinkedIn轻松导入数据，创建专业、美观的简历
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/resume">
              <Button size="lg" className="text-lg px-8 gap-2">
                <FileText className="h-5 w-5" />
                开始创建简历
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">LinkedIn导入</h3>
            <p className="text-gray-600">直接从LinkedIn导入您的个人资料数据，无需手动输入</p>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">实时预览</h3>
            <p className="text-gray-600">左右分栏设计，编辑的同时实时查看简历效果</p>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">一键导出</h3>
            <p className="text-gray-600">完成编辑后，一键导出为PDF或其他格式（即将推出）</p>
          </Card>
        </div>

        {/* How to use LinkedIn Export */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="p-8 bg-blue-50 border-blue-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">如何从LinkedIn导出数据？</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600">1.</span>
                <span>访问 LinkedIn 并登录您的账户</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600">2.</span>
                <span>点击右上角头像，选择「设置与隐私」</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600">3.</span>
                <span>在「数据隐私」标签下，找到「获取您的数据副本」</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600">4.</span>
                <span>选择「请求存档」，LinkedIn会将您的数据打包发送到您的邮箱</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600">5.</span>
                <span>下载存档文件，解压后找到 Profile.json 文件</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-blue-600">6.</span>
                <span>在简历编辑器中点击「从LinkedIn导入」按钮，上传 JSON 文件</span>
              </li>
            </ol>
          </Card>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2026 Resume Copilot. 让求职更简单。</p>
        </div>
      </footer>
    </div>
  );
}
