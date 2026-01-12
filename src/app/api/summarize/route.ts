import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import type { Persona, Country } from "@/types/europarl";
import { PERSONA_LABELS, COUNTRY_LABELS } from "@/types/europarl";

const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  return "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW };
  }

  if (record.count >= RATE_LIMIT) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    };
  }

  record.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT - record.count, 
    resetIn: record.resetTime - now 
  };
}

const BASE_SYSTEM_PROMPT = `You are a non-partisan political analyst for EuroLens, an EU legislation tracker.
Your role is to make complex EU legislative documents accessible to ordinary citizens.

Guidelines:
- Be factual and balanced - never show political bias
- Use simple language that a high school student would understand
- Avoid jargon - if you must use a technical term, explain it
- Focus on concrete impacts, not abstract policy language
- Be concise - citizens are busy`;

function buildSystemPrompt(persona: Persona, country: Country): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (persona !== "general" || country !== "general") {
    prompt += "\n\nContext about the reader:";

    if (persona !== "general") {
      const personaLabel = PERSONA_LABELS[persona];
      prompt += `\n- They are a ${personaLabel.toLowerCase()}`;

      switch (persona) {
        case "student":
          prompt +=
            ". Focus on impacts related to education, employment prospects, cost of living, and youth opportunities.";
          break;
        case "small-business-owner":
          prompt +=
            ". Focus on impacts related to regulations, compliance costs, market access, and business opportunities.";
          break;
        case "farmer":
          prompt +=
            ". Focus on impacts related to agriculture, subsidies, environmental regulations, and food production.";
          break;
        case "worker":
          prompt +=
            ". Focus on impacts related to labor rights, working conditions, job security, and wages.";
          break;
        case "parent":
          prompt +=
            ". Focus on impacts related to family life, childcare, education, health, and consumer safety.";
          break;
      }
    }

    if (country !== "general") {
      const countryLabel = COUNTRY_LABELS[country];
      prompt += `\n- They live in ${countryLabel}. Mention any country-specific implications if relevant.`;
    }
  }

  return prompt;
}

function buildUserPrompt(
  title: string,
  summary: string,
  subjects: string[]
): string {
  let prompt = `Summarize this EU legislation for a general audience.

**Title:** ${title}

**Summary/Description:** ${summary || "No summary available."}`;

  if (subjects.length > 0) {
    prompt += `\n\n**Policy Areas:** ${subjects.join(", ")}`;
  }

  prompt += `

Provide your response in this exact format:

## What is it?
[One clear sentence explaining what this legislation does]

## Why does it matter?
[One clear sentence on the real-world impact for ordinary people]

## Who is involved?
[One sentence about which political groups or stakeholders support or oppose this, if known]`;

  return prompt;
}

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const { allowed, remaining, resetIn } = checkRateLimit(clientIp);

    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil(resetIn / 1000)
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetIn / 1000)),
            "Retry-After": String(Math.ceil(resetIn / 1000))
          },
        }
      );
    }

    const body = await req.json();
    const {
      title,
      summary,
      subjects = [],
      persona = "general",
      country = "general",
    } = body as {
      title: string;
      summary?: string;
      subjects?: string[];
      persona?: Persona;
      country?: Country;
    };

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": String(remaining),
        },
      });
    }

    const systemPrompt = buildSystemPrompt(persona, country);
    const userPrompt = buildUserPrompt(title, summary || "", subjects);

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const response = result.toTextStreamResponse();
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    
    return response;
  } catch (error) {
    console.error("Summarize API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
