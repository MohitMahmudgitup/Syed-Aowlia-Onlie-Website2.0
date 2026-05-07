import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey:"AIzaSyCbJxZMyO1oiAAy3JupD-9MsOW3TVU8N3c" });

export default async function main(prompt : string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Write a product description for: ${prompt}`,
  });
  return response.text
}

