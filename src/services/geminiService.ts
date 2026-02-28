import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeChart = async (
  base64Image: string
): Promise<AnalysisResult> => {
  // Using Flash model for high speed and efficiency
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Fast Analysis: Identify Pair/Timeframe from chart.
    Apply:
    1. SNR: Key levels.
    2. ICT: OB, FVG, Liquidity, MSS.
    3. STD: Volatility.
    4. Alchemist X MSNR: Manipulation SNR & cycles.
    5. Macro: Latest high-impact events for the pair.

    Output: BUY/SELL/NEUTRAL with Entry, TP, SL.
    
    JSON format:
    {
      "signal": {
        "pair": string,
        "action": "BUY" | "SELL" | "NEUTRAL",
        "entry": string,
        "tp": string,
        "sl": string,
        "confidence": number,
        "reasoning": string
      },
      "technical": { "snr": string, "ict": string, "std": string, "alchemist": string },
      "fundamental": string
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // Minimize latency
      tools: [{ googleSearch: {} }],
    },
  });

  const result = JSON.parse(response.text || "{}");
  return {
    ...result,
    timestamp: new Date().toISOString(),
  };
};
