import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Set payload limit to support base64 document transfers
app.use(express.json({ limit: '30mb' }));

// Helper to initialize Gemini safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing. Please configure it in your Secrets panel.');
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// REST route for analyzing resume
app.post('/api/analyze', async (req, res) => {
  try {
    const { resumeText, resumeFile, jobDescription } = req.body;

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(500).json({
        error: err.message || 'Gemini API client initialization failed.'
      });
    }

    // Prepare content parts
    const parts: any[] = [];

    // If there is an uploaded file
    if (resumeFile && resumeFile.base64Data && resumeFile.mimeType) {
      const cleanBase64 = resumeFile.base64Data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: resumeFile.mimeType,
          data: cleanBase64,
        },
      });
    }

    // Add prompt part
    let textPrompt = `You are an elite, senior ATS (Applicant Tracking System) platform algorithm, resume writer, and career coach.
Analyze the provided resume document/information.`;

    if (resumeText) {
      textPrompt += `\n\n=== RESUME RAW TEXT ===\n${resumeText}\n`;
    }

    if (jobDescription) {
      textPrompt += `\n\n=== TARGET JOB DESCRIPTION ===\n${jobDescription}\n`;
    } else {
      textPrompt += `\n\nNo job description provided. Perform a comprehensive critique of the resume against general modern professional standards (with 100 as the maximum reference). Provide advice for role progression, certifications, and high-impact phrasing.`;
    }

    textPrompt += `\n\nPerform a deep analysis and generate a JSON response strictly following the provided schema. Ensure you analyze:
1. ATS Score (80+ if matches, lower if core skills are missing or layout seems poor).
2. Overall summary critique of the resume.
3. Explicit lists of detailed Strengths, Weaknesses, and Missing Keywords (match specifically with the Target Job Description if provided).
4. Skills analysis: key tools/skills matched, missing crucial keywords/skills, and critical soft skills seen or needed.
5. Section scores (out of 100) and actionable concrete line improvements. For work history lines, give original phrases found or implied and rewrite them with action verbs and metrics.
6. Highly strategic career coaching recommendations.
7. Targeted mock interview prep questions (Technical and Behavioral) with notes on how to answer and what complete responses should sound like.

Focus on factual accuracy. Do not hallucinate qualifications not present.`;

    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            atsScore: { type: Type.INTEGER, description: 'Overall ATS or general standard score out of 100.' },
            summaryCritique: { type: Type.STRING, description: 'Concise summary evaluation in 2-3 sentences.' },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Top 3-4 strengths identified in the resume.' },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Top 3-4 weaknesses or optimization points.' },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Specific tools or keywords absent but desired for this type of role.' },
            skillsAnalysis: {
              type: Type.OBJECT,
              properties: {
                matched: { type: Type.ARRAY, items: { type: Type.STRING } },
                missing: { type: Type.ARRAY, items: { type: Type.STRING } },
                soft: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['matched', 'missing', 'soft']
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Section name (e.g. Work Experience, Education, Professional Summary).' },
                  score: { type: Type.INTEGER, description: 'Score of this section from 0 to 100.' },
                  critique: { type: Type.STRING, description: 'Short review of this section.' },
                  improvements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        original: { type: Type.STRING, description: 'The original subpar phrasing or a suggested area of edit.' },
                        suggested: { type: Type.STRING, description: 'The high-impact rewritten phrase or specific addition.' }
                      },
                      required: ['original', 'suggested']
                    }
                  }
                },
                required: ['name', 'score', 'critique', 'improvements']
              }
            },
            careerTips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tip: { type: Type.STRING, description: 'Core recommendation title (e.g., Certification, Open Source contribution).' },
                  description: { type: Type.STRING, description: 'Detailed action steps.' }
                },
                required: ['tip', 'description']
              }
            },
            interviewPrep: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: 'An engineering/business interview question tailored to the profile.' },
                  type: { type: Type.STRING, description: '"Technical" or "Behavioral".' },
                  answerTips: { type: Type.STRING, description: 'Crucial talking points from their background they should highlight.' },
                  sampleAnswer: { type: Type.STRING, description: 'A polished, impressive model response.' }
                },
                required: ['question', 'type', 'answerTips', 'sampleAnswer']
              }
            }
          },
          required: [
            'atsScore',
            'summaryCritique',
            'strengths',
            'weaknesses',
            'missingKeywords',
            'skillsAnalysis',
            'sections',
            'careerTips',
            'interviewPrep'
          ]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('Empty response from Gemini.');
    }

    const payload = JSON.parse(outputText);
    return res.status(200).json(payload);

  } catch (err: any) {
    console.error('Analysis error:', err);
    return res.status(500).json({ error: err.message || 'Verification of resume failed.' });
  }
});

// Followup conversation helper route
app.post('/api/chat', async (req, res) => {
  try {
    const { history, message, context } = req.body;

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }

    // Form follow-up content
    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction: `You are an elite career advisor and resume editor. 
You are discussing a resume and job description. 
Context: ${context || 'None'}.
Be encouraging, professional, structured, and give concise, high-value advice. Offer detailed formatting options, rewrites, and answers to their exact career requests.`
      }
    });

    // Seed chat history if provided
    if (history && history.length > 0) {
      // Re-hydrate the history. Note: we can structure conversations as calls or mock chat sequences
      // However, to keep it simple and robust, we can just supply the history directly or join it in a robust prompt
    }

    // Direct exchange is extremely robust
    const prompt = message;
    const response = await chat.sendMessage({ message: prompt });
    
    return res.status(200).json({ reply: response.text });
  } catch (err: any) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message || 'Chat messaging failed.' });
  }
});

// Bind UI or production static assets
if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // Setup Vite Dev server middleware
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
  
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const indexFile = path.resolve(__dirname, 'index.html');
      let template = fs.readFileSync(indexFile, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

app.listen(port, () => {
  console.log(`Server launched successfully on port ${port}`);
});
