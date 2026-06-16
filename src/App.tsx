import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Briefcase,
  GraduationCap,
  Target,
  Cpu,
  MessageSquare,
  Award,
  Send,
  RefreshCw,
  Play,
  FileCheck,
  Search,
  Plus,
  Compass,
  Copy,
  Check,
  Building,
  ArrowUpRight,
  Layers
} from 'lucide-react';

// Types for the parsed analysis payload
interface SectionImprovement {
  original: string;
  suggested: string;
}

interface ResumeSection {
  name: string;
  score: number;
  critique: string;
  improvements: SectionImprovement[];
}

interface CareerTip {
  tip: string;
  description: string;
}

interface InterviewQuestion {
  question: string;
  type: string; // "Technical" or "Behavioral"
  answerTips: string;
  sampleAnswer: string;
}

interface AnalysisResult {
  atsScore: number;
  summaryCritique: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  skillsAnalysis: {
    matched: string[];
    missing: string[];
    soft: string[];
  };
  sections: ResumeSection[];
  careerTips: CareerTip[];
  interviewPrep: InterviewQuestion[];
}

// Chat interfaces
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function App() {
  // Input form state
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // File upload state
  const [fileData, setFileData] = useState<{
    name: string;
    mimeType: string;
    base64Data: string;
  } | null>(null);
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Active UI tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'sections' | 'interview' | 'career' | 'chat'>('overview');
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [expandedInterviewQuestion, setExpandedInterviewQuestion] = useState<number | null>(0);
  
  // Copied states for improvements
  const [copiedText, setCopiedText] = useState<{ [key: string]: boolean }>({});

  // Conversational AI State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Staggered loading quotes to engage the client
  const loadingQuotes = [
    "Gemini is reading the file and extracting structural resume fields...",
    "Comparing skills and experience with modern professional industry benchmarks...",
    "Scanning content text patterns for passive terms and quantifying metrics...",
    "Measuring keyword coverage and computing ATS compliance rankings...",
    "Drafting action-oriented side-by-side phrasing rewrites just for you...",
    "Synthesizing high-potential career tracks, courses, and custom mock interviews..."
  ];

  // Increment loading steps during generation
  React.useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingQuotes.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Support click to upload
  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Convert files to base64 or plaintext
  const processUploadedFile = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    
    // PDF Handling
    if (file.type === 'application/pdf') {
      reader.onload = () => {
        const base64Data = reader.result as string;
        setFileData({
          name: file.name,
          mimeType: file.type,
          base64Data: base64Data
        });
        setResumeText(''); // reset manual text to prefer file
      };
      reader.readAsDataURL(file);
    } 
    // Text formats
    else if (
      file.type === 'text/plain' || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.json')
    ) {
      reader.onload = () => {
        const text = reader.result as string;
        setResumeText(text);
        setFileData({
          name: file.name,
          mimeType: 'text/plain',
          base64Data: btoa(unescape(encodeURIComponent(text)))
        });
      };
      reader.readAsText(file);
    } else {
      // General fallbacks
      reader.onload = () => {
        const base64Data = reader.result as string;
        setFileData({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data: base64Data
        });
        setResumeText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFileData(null);
    setResumeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run resume analysis against server API
  const handleAnalyze = async () => {
    // Basic verification
    if (!resumeText.trim() && !fileData) {
      setAnalysisError("Please paste your resume text or upload a document file to begin analysis.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setResult(null);
    setChatHistory([]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          resumeFile: fileData ? {
            name: fileData.name,
            mimeType: fileData.mimeType,
            base64Data: fileData.base64Data
          } : null,
          jobDescription: jobDescription.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error. Please try again.');
      }

      setResult(data);
      setActiveTab('overview');
      
      // Initialize chat with summary welcoming message
      setChatHistory([
        {
          id: 'welcome-001',
          sender: 'ai',
          text: `Hi! I have loaded your resume analysis. Based on my review, your resume scored an ATS score of ${data.atsScore}/100. 

I'm ready to help you optimize this further. You can ask me questions like:
- "Can you rewrite my summary to stand out better?"
- "Draft a personalized cover letter for this job description."
- "What projects can I build to address my seen skill gaps?"
- "How can I better phrase my experience under the STAR format?"`
        }
      ]);

    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'An error occurred during verification. Please configure your GEMINI_API_KEY if missing.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Direct AI conversation response handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || isSendingMessage || !result) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: currentMessage
    };

    setChatHistory(prev => [...prev, userMsg]);
    const promptToSend = currentMessage;
    setCurrentMessage('');
    setIsSendingMessage(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: promptToSend,
          context: `ATS Score is ${result.atsScore}. Major critique: ${result.summaryCritique}. Top weaknesses are: ${result.weaknesses.join(', ')}. Target JD is: ${jobDescription || 'Not provided'}`,
          history: chatHistory.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with AI helper.');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply
      };
      setChatHistory(prev => [...prev, aiMsg]);

    } catch (err: any) {
      setChatHistory(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `Error: ${err.message || "Failed to receive AI assistance. Ensure your backend server holds a valid secret key."}`
      }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Copy enhancement suggestions
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedText(prev => ({ ...prev, [key]: false }));
    }, 2500);
  };

  // Reset analyser
  const handleReset = () => {
    setResult(null);
    setResumeText('');
    setJobDescription('');
    setFileData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div id="app_root" className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans leading-relaxed selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Dynamic Header */}
      <nav id="navbar" className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-xl shadow-sm">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Resume Analyser <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">AI Engine</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium select-none">Evaluate, score, and optimize resumes instantly against any job description</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {result && (
              <button
                id="btn_reset"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 rounded-lg transition-all rounded-md"
              >
                <RefreshCw className="w-4 h-4" /> Reset Analyser
              </button>
            )}
            <a 
              href="https://ai.studio/build" 
              target="_blank" 
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Google AI Studio Build <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Step 1: Input stage */}
        {!result && !isAnalyzing && (
          <div id="input_stage" className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Input fields panel */}
            <div id="col_inputs" className="col-span-1 lg:col-span-7 flex flex-col gap-6">
              
              {/* Document/text input container */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Upload or Paste Resume
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Step 1 of 2</span>
                </div>

                {/* Upload Area */}
                <div 
                  id="dropzone"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={onButtonClick}
                  className={`relative p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]" 
                      : fileData 
                        ? "border-emerald-500 bg-emerald-50/20" 
                        : "border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.md,.json"
                    onChange={handleFileChange}
                  />

                  {fileData ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <FileCheck className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-semibold text-emerald-800 break-all">{fileData.name}</span>
                      <span className="text-xs text-slate-400">PDF / Document loaded. Click to replace.</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="mt-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-md hover:bg-rose-100 transition-colors"
                      >
                        Remove Document
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-700">
                        Drag & drop your resume file or <span className="text-indigo-600 font-semibold underline">browse</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Supports PDF (Direct AI reading), TXT, Markdown (.md), or JSON documents
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-[1px] bg-slate-200 flex-1"></div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or paste plain text</span>
                  <div className="h-[1px] bg-slate-200 flex-1"></div>
                </div>

                {/* Paste Area */}
                <div>
                  <textarea
                    id="resume_raw_text"
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      if (fileData) setFileData(null); // Clear file to prefer text if they start typing
                    }}
                    value={resumeText}
                    placeholder="E.g.,&#10;John Doe&#10;Senior Full-Stack Engineer&#10;EXPERIENCE:&#10;- Led React and Node.js development scaling client capacity by 50%..."
                    className="w-full h-56 p-4 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500/80 transition-all resize-y leading-relaxed text-slate-700 shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Target Job Description Panel */}
            <div id="col_job" className="col-span-1 lg:col-span-5 flex flex-col gap-6">
              
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Target Job Description
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Optional</span>
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Step 2 of 2</span>
                </div>
                
                <p className="text-xs text-slate-500">
                  Providing a target JD unlocks the **ATS Match score**, **missing keywords detector**, and creates customized interview questions targeting role alignment.
                </p>

                <div>
                  <textarea
                    id="jd_raw_text"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description here. We will run an ATS scanning algorithm to evaluate your matchup..."
                    className="w-full h-80 p-4 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500/80 transition-all resize-none leading-relaxed text-slate-700"
                  />
                </div>

                {analysisError && (
                  <div className="flex gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-150 text-rose-800 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{analysisError}</span>
                  </div>
                )}

                <button
                  id="btn_analyze"
                  onClick={handleAnalyze}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 active:scale-[0.98] transition-all rounded-xl shadow-md cursor-pointer hover:shadow-indigo-100"
                >
                  <Sparkles className="w-4.5 h-4.5" /> Analyze Resume With AI
                </button>
              </div>

              {/* Informational Quick Tip Card */}
              <div className="p-5 bg-gradient-to-tr from-slate-900 to-[#1e293b] text-slate-300 rounded-2xl border border-slate-800 shadow-md">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Cpu className="w-3.5 h-3.5 animate-pulse" /> Advanced Architecture
                </span>
                <p className="text-xs leading-relaxed text-slate-300">
                  This system processes matches using deep representation parsing. Our server hooks directly into the **Google Gemini SDK** to generate secure, structured validations without exposing API secrets or writing client-side keys.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* Loading Phase */}
        {isAnalyzing && (
          <div id="loader" className="max-w-2xl mx-auto py-16 flex flex-col items-center justify-center text-center gap-6">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-indigo-600 absolute animate-pulse" />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-900">Conducting Strategic Resume Audit</h3>
              <p className="text-xs text-indigo-600 font-medium tracking-wide uppercase select-none animate-bounce">Analyzing background details...</p>
            </div>

            <div className="p-4 bg-white border border-slate-150 rounded-xl shadow-xs max-w-md">
              <p className="text-xs italic text-slate-600 leading-relaxed">
                "{loadingQuotes[loadingStep]}"
              </p>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2 select-none">This usually takes about 10-15 seconds due to deep structural matching.</p>
          </div>
        )}

        {/* Step 2: Dashboard Results view */}
        {result && !isAnalyzing && (
          <div id="dashboard_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Navigation */}
            <div className="col-span-1 lg:col-span-3 lg:sticky lg:top-24 flex flex-col gap-4">
              
              {/* ATS SCORECARD CARD */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">ATS Score</span>
                
                {/* Score Dial SVG */}
                <div className="relative w-36 h-36 flex items-center justify-center my-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Ring */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="8"
                    />
                    {/* Meter fill */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={result.atsScore >= 80 ? "#10b981" : result.atsScore >= 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={(251.2 - (251.2 * result.atsScore) / 100).toString()}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{result.atsScore}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">out of 100</span>
                  </div>
                </div>

                <div className="mt-1">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                    result.atsScore >= 80 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : result.atsScore >= 60 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {result.atsScore >= 80 ? 'Highly Competitive' : result.atsScore >= 60 ? 'Needs Alignment' : 'Critical Enhancements'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-500 mt-4 px-2 italic">
                  "{result.summaryCritique}"
                </p>
              </div>

              {/* TABS SIDEBAR MENU */}
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full text-left inline-flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'overview' 
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-4 h-4" /> ATS Audit Overview
                </button>

                <button
                  onClick={() => setActiveTab('skills')}
                  className={`w-full text-left inline-flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'skills' 
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4 bg-transparent shrink-0" /> Target Keywords & Skills
                </button>

                <button
                  onClick={() => setActiveTab('sections')}
                  className={`w-full text-left inline-flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'sections' 
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-4 h-4 bg-transparent shrink-0" /> Section Scores & Rewrites
                </button>

                <button
                  onClick={() => setActiveTab('career')}
                  className={`w-full text-left inline-flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'career' 
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-4 h-4 bg-transparent shrink-0" /> Dynamic Career Pathing
                </button>

                <button
                  onClick={() => setActiveTab('interview')}
                  className={`w-full text-left inline-flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'interview' 
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4 bg-transparent shrink-0" /> Custom Interview Prep
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full text-left inline-flex items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'chat' 
                      ? 'bg-slate-950 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 bg-transparent shrink-0" /> AI Resume Chat
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">Explore</span>
                </button>
              </div>

              {/* DOCUMENT DETAILS INSIGHT */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2.5 text-xs font-medium text-slate-500">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Loaded Profile</span>
                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                  <span className="truncate text-slate-600">{fileData ? fileData.name : 'Pasted Plain Text'}</span>
                  <span className="text-[9px] font-bold text-slate-400 capitalize">{fileData ? fileData.mimeType.split('/')[1] : 'Raw text'}</span>
                </div>
                {jobDescription && (
                  <div className="flex flex-col gap-1 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Target Job description matched</span>
                    <span className="truncate text-indigo-600 text-[11px] font-semibold">ATS Compliance SCAN ACTIVE</span>
                  </div>
                )}
              </div>

            </div>

            {/* Main Interactive Content Panel */}
            <div className="col-span-1 lg:col-span-9 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
              
              {/* TAB 1: OVERVIEW / CRITIQUE */}
              {activeTab === 'overview' && (
                <div id="tab_overview" className="flex flex-col gap-8 animate-fadeIn">
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 pb-1 flex items-center gap-2">
                       ATS Audit Overview
                    </h3>
                    <p className="text-xs text-slate-500">
                      Overall strengths, optimization opportunities, and quick critiques identified across formatting and narrative structure.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100/55 flex flex-col gap-3">
                    <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> Professional Executive Feedback
                    </h4>
                    <p className="text-sm font-medium leading-relaxed text-slate-700">
                      {result.summaryCritique}
                    </p>
                  </div>

                  {/* Strengths & Weaknesses Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Strengths */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-4 h-4" /></span>
                        Top Strengths
                      </h4>
                      <ul className="flex flex-col gap-2.5">
                        {result.strengths.map((str, idx) => (
                          <li key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed font-semibold flex items-start gap-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <span className="p-1 rounded-full bg-rose-100 text-rose-700"><AlertCircle className="w-4 h-4" /></span>
                        Critique Points & Gaps
                      </h4>
                      <ul className="flex flex-col gap-2.5">
                        {result.weaknesses.map((wk, idx) => (
                          <li key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed font-semibold flex items-start gap-2">
                            <span className="text-rose-500 font-bold shrink-0 mt-0.5">!</span>
                            <span>{wk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Recommendation banner */}
                  <div className="mt-4 p-5 bg-gradient-to-tr from-indigo-50 t-slate-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5 max-w-xl">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Next Optimization Step</span>
                      <h5 className="text-sm font-extrabold text-slate-900">Review before-and-after line rewrites</h5>
                      <p className="text-xs text-slate-500">We have engineered customized bullet rewrites that embed metrics and active power verbs targeting your background profile.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('sections')}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all shadow-sm shrink-0 whitespace-nowrap"
                    >
                      View Rewrites & Scorecards
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: TARGET KEYWORDS & SKILLS */}
              {activeTab === 'skills' && (
                <div id="tab_skills" className="flex flex-col gap-8 animate-fadeIn">
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 pb-1">
                      Keyword Coverage & Skills Alignment
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comparison profiles showing target technologies and competencies that are matched, missing, or required for optimal impact.
                    </p>
                  </div>

                  {/* Missing Critical Keywords Alert */}
                  {result.missingKeywords && result.missingKeywords.length > 0 && (
                    <div className="p-5 bg-rose-50/50 rounded-xl border border-rose-100 flex flex-col gap-3">
                      <h4 className="text-xs font-extrabold text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" /> Priority Gaps & Keyword Warnings
                      </h4>
                      <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                        Adding these exact keywords onto your resume can dramatically lift automatic resume screen passes if you genuine possess them.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {result.missingKeywords.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center px-3 py-1 font-semibold text-xs rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            + {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Three-Dimensional Skill Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Matched skills */}
                    <div className="flex flex-col gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200/50">
                      <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Matched Competencies
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.skillsAnalysis.matched.map((tag, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 transition-all select-none">
                            {tag}
                          </span>
                        ))}
                        {result.skillsAnalysis.matched.length === 0 && (
                          <span className="text-slate-400 text-xs italic">No clear matcheable hard skills detected.</span>
                        )}
                      </div>
                    </div>

                    {/* Missing hard skills */}
                    <div className="flex flex-col gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200/50">
                      <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        Absent Technical Credentials
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.skillsAnalysis.missing.map((tag, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-amber-300 transition-all select-none">
                            {tag}
                          </span>
                        ))}
                        {result.skillsAnalysis.missing.length === 0 && (
                          <span className="text-slate-400 text-xs italic">All key tech skills are well-matched.</span>
                        )}
                      </div>
                    </div>

                    {/* Soft skills */}
                    <div className="flex flex-col gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200/50">
                      <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        Critical Soft Skills
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.skillsAnalysis.soft.map((tag, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 transition-all select-none">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: SECTION SCORES & REWRITES */}
              {activeTab === 'sections' && (
                <div id="tab_sections" className="flex flex-col gap-8 animate-fadeIn">
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 pb-1">
                      Section Scorecards & Side-By-Side Enhancements
                    </h3>
                    <p className="text-xs text-slate-500">
                      We evaluated the structure, density, and wording of individual resume components. Click any card below to view detailed re-phrasings.
                    </p>
                  </div>

                  {/* Section List */}
                  <div className="flex flex-col gap-4">
                    {result.sections.map((sec, secIdx) => (
                      <div 
                        key={secIdx} 
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-indigo-200 transition-all"
                      >
                        {/* Section Header */}
                        <div 
                          onClick={() => setExpandedSection(expandedSection === secIdx ? null : secIdx)}
                          className={`p-4 flex justify-between items-center cursor-pointer select-none transition-colors ${
                            expandedSection === secIdx ? 'bg-indigo-50/20' : 'bg-slate-50 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              sec.score >= 80 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : sec.score >= 60 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {sec.score}/100
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{sec.name}</h4>
                          </div>

                          <div className="text-slate-400">
                            {expandedSection === secIdx ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {expandedSection === secIdx && (
                          <div className="p-5 border-t border-slate-200 flex flex-col gap-5 animate-slideDown">
                            
                            {/* Score critique detail */}
                            <div className="text-xs font-medium text-slate-600 bg-slate-50 p-4 border border-slate-200 rounded-lg font-semibold leading-relaxed">
                              {sec.critique}
                            </div>

                            {/* Improvements List */}
                            {sec.improvements && sec.improvements.length > 0 ? (
                              <div className="flex flex-col gap-4">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Before & After Side-By-Side Highlights</span>
                                
                                {sec.improvements.map((imp, impIdx) => {
                                  const copyKey = `${secIdx}-${impIdx}`;
                                  return (
                                    <div key={impIdx} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                                      
                                      {/* Original phrasing */}
                                      <div className="p-3.5 bg-rose-50/30 border border-rose-100/80 rounded-lg flex flex-col justify-between">
                                        <div className="flex flex-col gap-1.5">
                                          <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-1.5">Subpar / Original</span>
                                          <p className="text-xs text-slate-600 leading-relaxed italic">
                                            "{imp.original}"
                                          </p>
                                        </div>
                                      </div>

                                      {/* AI Rewrite */}
                                      <div className="p-3.5 bg-emerald-50/30 border border-emerald-200/80 rounded-lg flex flex-col justify-between relative shadow-xs">
                                        <div className="flex flex-col gap-1.5">
                                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">High-Impact Rewrite (Recommended)</span>
                                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                                            {imp.suggested}
                                          </p>
                                        </div>

                                        {/* Copy button */}
                                        <div className="mt-3 flex justify-end">
                                          <button
                                            onClick={() => copyToClipboard(imp.suggested, copyKey)}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-sm hover:bg-slate-100 transition-all cursor-pointer"
                                          >
                                            {copiedText[copyKey] ? (
                                              <>
                                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3.5 h-3.5" /> Copy Rewrite
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                    </div>
                                  );
                                })}

                              </div>
                            ) : (
                              <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-2 text-center rounded-lg">
                                ✓ Excellent composition! No major improvements needed for this section.
                              </p>
                            )}

                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* TAB 4: MOCK INTERVIEW PREP */}
              {activeTab === 'interview' && (
                <div id="tab_interview" className="flex flex-col gap-8 animate-fadeIn">
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 pb-1">
                      AI-Generated Interview Preparation Cockpit
                    </h3>
                    <p className="text-xs text-slate-500">
                      Based on your resume details, Gemini generated predictive technical and behavioral interview questions you are highly likely to encounter.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {result.interviewPrep.map((item, qIdx) => (
                      <div 
                        key={qIdx} 
                        className="bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-150 transition-all"
                      >
                        {/* Questions bar */}
                        <div 
                          onClick={() => setExpandedInterviewQuestion(expandedInterviewQuestion === qIdx ? null : qIdx)}
                          className="p-4 flex justify-between items-center cursor-pointer select-none"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
                              item.type.toLowerCase() === 'technical' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {item.type}
                            </span>
                            <span className="text-slate-800 font-bold text-xs sm:text-sm">{item.question}</span>
                          </div>
                          
                          <div className="text-slate-400">
                            {expandedInterviewQuestion === qIdx ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </div>
                        </div>

                        {/* Collapsed breakdown panel */}
                        {expandedInterviewQuestion === qIdx && (
                          <div className="p-5 border-t border-slate-200 bg-white flex flex-col gap-4 animate-slideDown">
                            
                            {/* Strategy tips */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Crucial Answer Strategy</span>
                              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {item.answerTips}
                              </p>
                            </div>

                            {/* Sample perfect answer */}
                            <div className="flex flex-col gap-1 bg-emerald-50/20 p-4 border border-emerald-100 rounded-lg">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Professional STAR Response Model
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed italic">
                                "{item.sampleAnswer}"
                              </p>
                            </div>

                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* TAB 5: CAREER ACCELERATOR RECOMMENDATIONS */}
              {activeTab === 'career' && (
                <div id="tab_career" className="flex flex-col gap-8 animate-fadeIn">
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 pb-1">
                      Dynamic Career Pathing & Upgrades
                    </h3>
                    <p className="text-xs text-slate-500">
                      Personalized upskilling roadmap, recommended certifications, and technical projects to solidify your competitive advantages.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.careerTips.map((tip, idx) => (
                      <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs flex gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl h-fit">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900">{tip.tip}</h4>
                          <p className="text-xs leading-relaxed text-slate-600 font-semibold">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Informational project template */}
                  <div className="p-5 bg-gradient-to-tr from-slate-900 to-[#1e293b] text-slate-300 rounded-2xl border border-slate-800 shadow-md">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                       Next High-Impact Certification or Role Pivot
                    </span>
                    <p className="text-xs leading-relaxed">
                      Based on modern tech landscape trends, we recommend tackling certifications emphasizing missing elements (e.g. cloud orchestration or system-level benchmarks). Integrate these findings within the AI Resume Chat tool below for automatic cover letter scripting!
                    </p>
                  </div>

                </div>
              )}

              {/* TAB 6: AI RESUME CHAT */}
              {activeTab === 'chat' && (
                <div id="tab_chat" className="flex flex-col gap-4 animate-fadeIn h-[550px]">
                  
                  <div className="shrink-0">
                    <h3 className="text-xl font-bold text-slate-900 pb-0.5">
                      AI Career & Chat Assistant
                    </h3>
                    <p className="text-xs text-slate-500">
                      Query modifications, draft tailored cover letters, or discuss advanced career roadmap strategies.
                    </p>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-4 min-h-0 select-text">
                    {chatHistory.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'self-end bg-slate-900 text-white rounded-2xl rounded-tr-xs' : 'self-start bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs shadow-xs'
                        } p-3.5 text-xs whitespace-pre-wrap leading-relaxed select-text font-medium`}
                      >
                        {msg.text}
                      </div>
                    ))}
                    {isSendingMessage && (
                      <div className="self-start bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-xs text-slate-400 animate-pulse flex items-center gap-1.5 font-medium shadow-xs select-none">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" /> Gemini is compiling response...
                      </div>
                    )}
                  </div>

                  {/* Message Input bar */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Ask the AI (e.g., 'Draft a custom cover letter based on this target position'...)"
                      className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500/80 transition-all font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={isSendingMessage || !currentMessage.trim()}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer font-extrabold"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>

                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* Humble Footer */}
      <footer id="footer" className="bg-slate-900 text-slate-400 py-12 mt-16 border-t border-slate-800 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-white">Resume Analyser</span>
          </div>
          <p className="text-xs text-slate-500">
            Powered by Gemini LLM & Full-stack Express. Single view architectural bounds validated.
          </p>
        </div>
      </footer>

    </div>
  );
}
