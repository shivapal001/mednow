import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async getHealthAdvice(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are MedNow AI, a helpful healthcare assistant. Provide concise, accurate health information. Always include a disclaimer that you are an AI and users should consult a real doctor for serious conditions. Focus on symptoms, general medicine info, and healthy living tips.",
      },
    });

    // Note: In a real app, we'd pass history here. For simplicity in this demo:
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: "You are MedNow AI. Be professional, empathetic, and clear.",
      }
    });
    return response.text;
  },

  async scanPrescription(base64Image: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1],
            },
          },
          {
            text: "Extract medicine names, dosages, and instructions from this prescription. Return as JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                },
                required: ["name"],
              },
            },
            doctorName: { type: Type.STRING },
            date: { type: Type.STRING },
          },
        },
      },
    });

    return JSON.parse(response.text || "{}");
  }
};
