import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeChart = async (
  base64Image: string
): Promise<AnalysisResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it to your environment variables.");
  }

  // Using Flash model for high speed and efficiency
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this trading chart and provide a fast, professional analysis.
    Identify the Pair and Timeframe.
    
    Apply these methods:
    1. SNR (Support & Resistance): Identify key levels.
    2. ICT (Inner Circle Trader): Look for Order Blocks (OB), Fair Value Gaps (FVG), Liquidity pools, and Market Structure Shift (MSS).
    3. STD (Standard Deviation): Assess volatility.
    4. Alchemist X MSNR: Identify manipulation SNR and market cycles.
    5. Macro: Briefly mention latest high-impact events relevant to this pair.

    Provide a clear Signal: BUY, SELL, or NEUTRAL.
    Include Entry, Take Profit (TP), and Stop Loss (SL) levels.
    
    IMPORTANT: Return ONLY a valid JSON object with this exact structure:
    {
      "signal": {
        "pair": "string",
        "action": "BUY" | "SELL" | "NEUTRAL",
        "entry": "string",
        "tp": "string",
        "sl": "string",
        "confidence": number,
        "reasoning": "string"
      },
      "technical": { "snr": "string", "ict": "string", "std": "string", "alchemist": "string" },
      "fundamental": "string"
    }
  `;

  try {
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        // Only include tools if needed or if they don't cause failures
        // tools: [{ googleSearch: {} }], 
      },
    });

    const text = response.text;
    console.log("Model Response Text:", text);
    if (!text) {
      throw new Error("No response received from AI model.");
    }

    // Clean the response text in case the model included markdown blocks
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson);
    
    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Invalid Gemini API Key. Please check your configuration.");
    }
    throw error;
  }
};
