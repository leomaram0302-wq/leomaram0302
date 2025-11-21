import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Expense, SavingsGoal } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = "gemini-2.5-flash";

/**
 * Generates a conversational response.
 */
export const generateChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  userMessage: string,
  systemInstruction: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [
        ...history.map(h => ({
          role: h.role,
          parts: h.parts
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text || "Disculpe, hubo un error al procesar su solicitud.";
  } catch (error) {
    console.error("Error in generateChatResponse:", error);
    return "Lo siento, ha ocurrido un error técnico. Por favor, inténtelo de nuevo.";
  }
};

/**
 * Extracts a single number (Income) from text.
 */
export const extractIncome = async (text: string): Promise<number | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Extract the monthly income value from this text. If unsure, return 0. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            income: { type: Type.NUMBER },
          },
          required: ["income"],
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    return data.income || null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

/**
 * Extracts a list of categories from text.
 */
export const extractCategories = async (text: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Extract a list of expense categories from the text. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["categories"],
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    return data.categories || [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

/**
 * Extracts expense amount for a specific category.
 */
export const extractExpenseAmount = async (text: string, categoryName: string): Promise<number> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `User is answering for category "${categoryName}". Extract the expense amount from this text: "${text}". Return 0 if not found.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
          },
          required: ["amount"],
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    return data.amount || 0;
  } catch (e) {
    console.error(e);
    return 0;
  }
};

/**
 * Extracts savings goal details.
 */
export const extractSavingsGoal = async (text: string): Promise<Partial<SavingsGoal> | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Extract savings goal details: name, target amount, and target date (YYYY-MM-DD) from text: "${text}". If date is relative (e.g. 'in 6 months'), calculate the date.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            targetAmount: { type: Type.NUMBER },
            targetDate: { type: Type.STRING },
          },
          required: ["name", "targetAmount", "targetDate"],
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    if (!data.name || !data.targetAmount) return null;
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
};

/**
 * Extracts extra purchase details.
 */
export const extractExtraPurchase = async (text: string): Promise<{ name: string; cost: number } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Extract purchase name and cost from text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            cost: { type: Type.NUMBER },
          },
          required: ["name", "cost"],
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    if (!data.name || !data.cost) return null;
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
};

/**
 * Yes/No Classifier
 */
export const classifyYesNo = async (text: string): Promise<boolean> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Does the user want to proceed? Answer true for yes, false for no. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.BOOLEAN },
          },
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    return !!data.decision;
  } catch (e) {
    return false;
  }
}