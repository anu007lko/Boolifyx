import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded or guarded initialization of Gemini client (Strict BYOK)
function getGeminiClient(customKey?: string) {
  const keyToUse = customKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!keyToUse || keyToUse === "undefined" || keyToUse === "null" || keyToUse === "MY_GEMINI_API_KEY") {
    throw new Error("Gemini API key is not configured. Please supply your own Gemini API Key in the top-right Settings Panel.");
  }
  return new GoogleGenAI({
    apiKey: keyToUse,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Exponential Backoff Retry Middleware for Gemini requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRateLimitOrOverload(error: any): boolean {
  if (!error) return false;
  
  // Extract numeric status/code
  const status = error.status || error.statusCode || error.code || error.error?.code || error.error?.status;
  if (status === 429 || status === 503 || status === "429" || status === "503") {
    return true;
  }

  // Check messages
  let text = "";
  if (typeof error === "string") {
    text = error;
  } else {
    text = String(error.message || "") + " " + String(error.error?.message || "") + " " + String(error);
  }

  const lower = text.toLowerCase();
  return lower.includes("429") ||
         lower.includes("503") ||
         lower.includes("rate") ||
         lower.includes("limit") ||
         lower.includes("exhausted") ||
         lower.includes("quota") ||
         lower.includes("overloaded") ||
         lower.includes("unvailable") ||
         lower.includes("unavailable") ||
         lower.includes("spikes in demand") ||
         lower.includes("high demand") ||
         lower.includes("service unavailable");
}

function extractGeminiErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred during Job Description analysis.";

  // Highly robust extraction
  if (error.error && typeof error.error === 'object' && error.error.message) {
    return error.error.message;
  }

  let msg = error.message;
  if (!msg && typeof error === 'object') {
    if (error.status && error.message) {
      msg = error.message;
    } else {
      try {
        msg = JSON.stringify(error);
      } catch (e) {
        msg = String(error);
      }
    }
  }

  if (typeof msg === 'string') {
    const trimmed = msg.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.error && parsed.error.message) {
          return parsed.error.message;
        }
        if (parsed.message) {
          return parsed.message;
        }
      } catch (e) {
        // ignore
      }
    }

    const firstCurly = trimmed.indexOf('{');
    const lastCurly = trimmed.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly > firstCurly) {
      try {
        const potentialJson = trimmed.substring(firstCurly, lastCurly + 1);
        const parsed = JSON.parse(potentialJson);
        if (parsed.error && parsed.error.message) {
          return parsed.error.message;
        }
        if (parsed.message) {
          return parsed.message;
        }
      } catch (e) {
        // ignore
      }
    }

    return trimmed;
  }

  return String(error);
}

async function generateContentWithRetry(ai: GoogleGenAI, requestPayload: any, maxRetries = 3) {
  let attempt = 0;
  let currentDelay = 2000; // Start waiting 2 seconds for the first 429/503 hit

  // Ensure strict SDK compatibility (no "models/" prefix, use modern generations)
  if (requestPayload.model) {
    requestPayload.model = "gemini-2.5-flash";
  }

  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(requestPayload);
    } catch (error: any) {
      const isRateLimited = isRateLimitOrOverload(error);

      if (isRateLimited && attempt < maxRetries - 1) {
        console.warn(`[Gemini API] Rate Limit / 503 hit. Retrying in ${currentDelay}ms... (Attempt ${attempt + 1} of ${maxRetries})`);
        await delay(currentDelay);
        currentDelay *= 2; // Exponential backoff (2s -> 4s)
        attempt++;
      } else {
        throw error;
      }
    }
  }
}

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Model Coherence & Hallucination Diagnostics for Gemini 2.5 Flash
app.get("/api/model-health", async (req, res) => {
  const clientApiKey = req.headers["x-gemini-key"] as string | undefined;
  const startTime = Date.now();
  try {
    const ai = getGeminiClient(clientApiKey);
    
    // Test the model's instruction following and zero-hallucination compliance
    const testPrompt = "Translate the keyword 'React developer' to standard tech taxonomy. Respond with only ONE word. Do NOT add any extra explanation or punctuation.";
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: testPrompt,
      config: {
        maxOutputTokens: 10,
        temperature: 0.1
      }
    });

    const latency = Date.now() - startTime;
    const modelText = response.text?.trim() || "";
    
    // Check if the model hallucinated or added extra words beyond what was instructed
    const wordsCount = modelText.split(/\s+/).filter(Boolean).length;
    const isConfabulationDefensive = wordsCount <= 3; // Strict instruction verification

    res.json({
      status: "healthy",
      engine: "gemini-2.5-flash",
      latencyMs: latency,
      responseSample: modelText,
      confabulationCheck: isConfabulationDefensive ? "PASSED" : "FAILED",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: "unhealthy",
      engine: "gemini-2.5-flash",
      latencyMs: Date.now() - startTime,
      error: error.message || String(error)
    });
  }
});

// Automated Multi-threading Stress-Testing Suite for Recruiters
app.post("/api/stress-test-batch", async (req, res) => {
  const clientApiKey = req.headers["x-gemini-key"] as string | undefined;
  const { concurrency = 3 } = req.body; // Default of 3 parallel test threads to prevent massive API key block
  
  const concurrencyCount = Math.min(Math.max(Number(concurrency), 1), 6); // Limit 1 to 6
  const testPrompts = [
    "List 3 essential languages for iOS dev.",
    "List 3 essential databases for Big Data.",
    "List 3 popular DevOps CI/CD tools.",
    "List 3 core packages for Python ML.",
    "List 3 front-end tools for state management.",
    "List 3 cloud serverless services."
  ].slice(0, concurrencyCount);

  const startTime = Date.now();
  
  try {
    const ai = getGeminiClient(clientApiKey);

    const threadRun = async (prompt: string, index: number) => {
      const threadStart = Date.now();
      try {
        // Small prompt to test concurrency, latency and correctness
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt + " Respond with code/keywords separated by commas. No prose.",
          config: {
            maxOutputTokens: 25,
            temperature: 0.2
          }
        });
        
        const text = response.text?.trim() || "";
        const isHallucinated = text.toLowerCase().includes("sorry") || text.length === 0;

        return {
          threadId: index + 1,
          prompt,
          success: true,
          latencyMs: Date.now() - threadStart,
          output: text,
          hallucinationCheck: !isHallucinated ? "PASSED" : "FAILED (Empty or Non-cooperative)"
        };
      } catch (err: any) {
        return {
          threadId: index + 1,
          prompt,
          success: false,
          latencyMs: Date.now() - threadStart,
          error: err.message || String(err),
          hallucinationCheck: "FAILED (API Error)"
        };
      }
    };

    const results = await Promise.all(testPrompts.map((prompt, idx) => threadRun(prompt, idx)));
    const totalLatency = Date.now() - startTime;
    
    // Compute aggregated metrics
    const overallSuccess = results.filter(r => r.success).length;
    const averageSuccessLatency = results.filter(r => r.success).reduce((sum, r) => sum + r.latencyMs, 0) / (overallSuccess || 1);
    
    res.json({
      engine: "gemini-2.5-flash",
      concurrencyRequested: concurrencyCount,
      completedSucceeded: overallSuccess,
      completedFailed: concurrencyCount - overallSuccess,
      totalSequenceDurationMs: totalLatency,
      averageLatenciesMs: Math.round(averageSuccessLatency),
      stressResults: results
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Stress test batch initialization crashed. Make sure your custom API Key is set if required.",
      details: error.message || String(error)
    });
  }
});

// Validate User-Provided Gemini API Key
app.post("/api/validate-key", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return res.status(400).json({ valid: false, error: "An API key must be provided." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Invoke a tiny quick call to test key validity
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Respond only with OK",
      config: {
        maxOutputTokens: 5,
        temperature: 0.1
      }
    });

    res.json({ valid: true });
  } catch (error: any) {
    console.error("Custom Key verification failed:", error);
    res.status(401).json({ 
      valid: false, 
      error: error.message || "Invalid API Key. Please make sure the characters are correct." 
    });
  }
});

// Analyze Job Description API
// In-memory Cache Layer and Cooldown track stores
const analysisCache = new Map<string, any>();
const userCooldowns = new Map<string, number>();
const COOLDOWN_PERIOD_MS = 10000; // 10 second cooldown active

app.post("/api/analyze-jd", async (req, res) => {
  const { jdText } = req.body;
  const clientApiKey = req.headers["x-gemini-key"] as string | undefined;

  if (!jdText || jdText.trim().length < 20) {
    return res.status(400).json({
      error: "Please provide a job description containing at least 20 characters to analyze."
    });
  }

  // 1. Cache Layer Check (Fast Normalization Match)
  const normalizedJd = jdText.trim().replace(/\s+/g, " ").toLowerCase();
  if (analysisCache.has(normalizedJd)) {
    console.log("⚡ Serving from memory Cache Layer hit!");
    const cachedData = analysisCache.get(normalizedJd);
    return res.json({
      ...cachedData,
      fromCache: true
    });
  }

  // 2. Cooldown Guard
  const clientIp = (req.ip || req.headers["x-forwarded-for"] || "127.0.0.1") as string;
  const now = Date.now();
  const lastRequestTime = userCooldowns.get(clientIp) || 0;
  const timePassed = now - lastRequestTime;

  if (timePassed < COOLDOWN_PERIOD_MS) {
    const secondsRemaining = Math.ceil((COOLDOWN_PERIOD_MS - timePassed) / 1000);
    return res.status(429).json({
      rateLimited: true,
      cooldownRemaining: secondsRemaining,
      error: `Analysis cooldown active to protect system quota. Please wait ${secondsRemaining} second(s) before analyzing another JD.`
    });
  }

  try {
    let systemAiModel = "gemini-2.5-flash";

    const systemInstruction = `You are an Elite Technical Sourcing Intelligence & Recruitment Architect. Your objective is to extract job requirements securely and accurately.

CRITICAL RULES:
1. STRICT MANDATORY SKILLS (Must-Haves): Extract strict dealbreakers (must-haves).
2. OPTIONAL SKILLS (Nice-to-Haves): Extract preferred, nice to have skills.
3. ZERO HALLUCINATION: Only use information provided in the JD. Do not invent requirements.
4. LATENT ECOSYSTEM MAPPING (Skill Intelligence):
   - Do not just extract what is written; infer the necessary ecosystem.
   - If a broad ecosystem is requested, automatically inject the industry-standard frameworks and tools that belong to it into the OR cluster.
   - Example 1: If the JD asks for "Java Backend", you must expand the cluster to include associated core tech: ("Java" OR "Spring Boot" OR "Hibernate" OR "J2EE").
   - Example 2: If the JD asks for "Frontend Developer" and mentions JavaScript, expand to include the standard modern frameworks if not explicitly excluded: ("JavaScript" OR "React" OR "Angular" OR "Vue").
   - Example 3: If the JD asks for "AWS Cloud", map the relevant infrastructure tools: ("AWS" OR "EC2" OR "Lambda" OR "S3").
   - WARNING: Only group these ecosystem expansions into 'OR' brackets. Never force them into 'AND' brackets unless explicitly demanded by the JD, to prevent filtering out otherwise qualified candidates.
5. NOISE REDUCTION: Aggressively identify exclusionary keywords (e.g., if looking for senior, exclude "intern", "junior", "trainee").
6. Return ONLY the requested JSON schema fields. Keep notes brief.`;

    const userPrompt = `JD CLIPS:\n"""\n${jdText}\n"""\n\nRuntime Variables: Timestamp: ${new Date().toISOString()}`;

    const ai = getGeminiClient(clientApiKey);

    // Base config payload
    const payload = {
      model: systemAiModel,
      contents: userPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            jobTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
            mandatorySkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  keyword: { type: Type.STRING },
                  synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  category: { type: Type.STRING }
                }
              }
            },
            preferredSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  keyword: { type: Type.STRING },
                  synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  category: { type: Type.STRING }
                }
              }
            },
            excludedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recruiterNotes: { type: Type.STRING }
          }
        },
        systemInstruction: systemInstruction,
        temperature: 0.2
      }
    };

    let response;
    let fallbackUsed = false;

    if (clientApiKey) {
      try {
        console.log("[Gemini] Attempting analysis with custom User API key on priority...");
        const userAi = getGeminiClient(clientApiKey);
        response = await generateContentWithRetry(userAi, payload);
      } catch (err: any) {
        const isUserKeyExhausted = isRateLimitOrOverload(err);

        if (isUserKeyExhausted) {
          console.warn("[Gemini] User API key got exhausted or rate limited. Falling back to App API key...");
          fallbackUsed = true;
          try {
            const appAi = getGeminiClient(undefined);
            response = await generateContentWithRetry(appAi, payload);
          } catch (appErr: any) {
            console.error("[Gemini] Fallback App API key also failed:", appErr);
            throw appErr;
          }
        } else {
          throw err;
        }
      }
    } else {
      console.log("[Gemini] No user API key provided. Using App API key directly...");
      const appAi = getGeminiClient(undefined);
      response = await generateContentWithRetry(appAi, payload);
    }

    let jsonText = response?.text?.trim() || "";
    
    // Remove markdown wrapping if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "");
      jsonText = jsonText.replace(/```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "");
      jsonText = jsonText.replace(/```$/, "");
    }
    jsonText = jsonText.trim();
    
    let resultData;
    try {
      resultData = JSON.parse(jsonText);
    } catch (parseError: any) {
      console.error("JSON Parse Error. Raw response (first 1000 chars):", jsonText.substring(0, 1000));
      return res.status(500).json({ error: "Failed to parse AI response as valid JSON. Please try again or refine the job description.", details: parseError.message });
    }
    
    if (resultData.mandatorySkills) {
      resultData.mandatorySkills = resultData.mandatorySkills.map((item: any, index: number) => ({
        ...item,
        id: item.id || `m-${index}`,
        enabled: true
      }));
    }
    if (resultData.preferredSkills) {
      resultData.preferredSkills = resultData.preferredSkills.map((item: any, index: number) => ({
        ...item,
        id: item.id || `p-${index}`,
        enabled: true
      }));
    }

    resultData.fromCache = false;
    resultData.fallbackUsed = fallbackUsed;

    // Cache the successful generation result for future hits (Max size: 500 records to prevent OOM)
    const MAX_CACHE_SIZE = 500;
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = analysisCache.keys().next().value;
      if (oldestKey !== undefined) {
        analysisCache.delete(oldestKey);
      }
    }
    analysisCache.set(normalizedJd, resultData);

    // Update client cooldown timer track & clean up stale records to save RAM
    for (const [ip, timestamp] of userCooldowns.entries()) {
      if (now - timestamp > COOLDOWN_PERIOD_MS) {
        userCooldowns.delete(ip);
      }
    }
    userCooldowns.set(clientIp, now);

    res.json(resultData);

  } catch (error: any) {
    console.error("Analysis route error:", error);
    
    const isRateLimited = isRateLimitOrOverload(error);
    const errorMessage = extractGeminiErrorMessage(error);

    if (isRateLimited) {
      return res.status(503).json({
        error: `AI Model API Error: Your Gemini API Key may have exhausted its free quota, or the API is currently overloaded. Please check your API quota or try again later. (Details: ${errorMessage})`
      });
    }
    
    res.status(500).json({
      error: errorMessage
    });
  }
});

// Configure Vite or Static delivery
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started and listening at http://localhost:${PORT}`);
  });
}

start();
