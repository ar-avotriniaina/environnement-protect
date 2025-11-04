import { GoogleGenAI, GenerateContentResponse, Type, Modality, Chat } from "@google/genai";
import { NewsArticle, Source, ChatMessage } from "../types";

// Helper functions (encode/decode) are not directly used for text generation,
// but kept for consistency if future multi-modal needs arise.
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to generate an image based on article title and summary
export const generateArticleImage = async (title: string, summary: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Crée une image pertinente pour une actualité environnementale avec le titre "${title}" et le résumé "${summary}". L'image doit être visuellement attrayante et représenter le thème (destruction, conservation ou protection).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Use the image generation model
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (imagePart && imagePart.inlineData) {
      const base64ImageBytes: string = imagePart.inlineData.data;
      return `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  } catch (error) {
    console.error(`Error generating image for "${title}":`, error);
  }
  return undefined;
};

// Function to fetch environmental news using Gemini with Google Search grounding.
export const fetchEnvironmentalNews = async (): Promise<NewsArticle[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `Générez une liste d'actualités récentes et importantes sur la destruction, la conservation et la protection de l'environnement.
Pour chaque actualité, fournissez:
1.  Un titre concis.
2.  Un résumé détaillé.
3.  Une catégorie parmi "Destruction", "Conservation", "Protection".
Retournez le résultat sous forme de tableau JSON.`;

  let response: GenerateContentResponse;
  try {
    response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Le titre de l'actualité." },
              summary: { type: Type.STRING, description: "Le résumé de l'actualité." },
              category: {
                type: Type.STRING,
                description: "La catégorie de l'actualité (Destruction, Conservation, Protection).",
                enum: ["Destruction", "Conservation", "Protection"]
              },
            },
            required: ["title", "summary", "category"],
            propertyOrdering: ["title", "summary", "category"]
          },
        },
      },
    });

    const jsonStr = response.text.trim();
    // Use a more robust parsing for potential leading/trailing non-JSON text
    const jsonStartIndex = jsonStr.indexOf('[');
    const jsonEndIndex = jsonStr.lastIndexOf(']');
    let rawArticles: { title: string, summary: string, category: string }[] = [];

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        const cleanedJsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1);
        rawArticles = JSON.parse(cleanedJsonStr);
    } else {
        console.warn("Could not parse JSON from Gemini response, attempting regex fallback.");
        // Fallback to regex if JSON parsing fails, similar to previous approach but for categories too.
        // This fallback is less robust but provides a chance to recover some data.
        const articlesMatch = jsonStr.matchAll(/Titre:\s*(.*?)\nRésumé:\s*(.*?)\nCatégorie:\s*(.*?)(?=\nTitre:|\n*$)/gs);
        for (const match of articlesMatch) {
            rawArticles.push({
                title: match[1].trim(),
                summary: match[2].trim(),
                category: match[3].trim(),
            });
        }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const allSources: Source[] = [];

    if (groundingChunks) {
      groundingChunks.forEach(chunk => {
        if ('web' in chunk && chunk.web?.uri) {
          allSources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
        if ('maps' in chunk && chunk.maps?.uri) {
          allSources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
          if (chunk.maps.placeAnswerSources) {
            chunk.maps.placeAnswerSources.reviewSnippets?.forEach(snippet => {
              const reviewSource = snippet as Source; // Assert type to access uri/title
              if (reviewSource.uri) {
                allSources.push({ uri: reviewSource.uri, title: reviewSource.title || "Review Snippet" });
              }
            });
          }
        }
      });
    }

    const newsArticles: NewsArticle[] = rawArticles.map((rawArticle, index) => ({
      id: `article-${index}-${Date.now()}`, // Unique ID
      title: rawArticle.title,
      summary: rawArticle.summary,
      category: rawArticle.category,
      sources: allSources, // Attach all collected sources to each article
      createdAt: Date.now() - (rawArticles.length - 1 - index) * 3600000, // Simulate different creation times for sorting
    }));

    // Generate images for each article in parallel
    const newsArticlesWithImages = await Promise.all(
      newsArticles.map(async (article) => {
        try {
          const imageUrl = await generateArticleImage(article.title, article.summary);
          return { ...article, imageUrl };
        } catch (imageError) {
          console.warn(`Failed to generate image for "${article.title}":`, imageError);
          return article; // Return article without image on error
        }
      })
    );

    return newsArticlesWithImages;

  } catch (error) {
    console.error("Error fetching environmental news:", error);
    // If API key is invalid or not found, propagate a specific error message
    if (String(error).includes("API_KEY_INVALID") || String(error).includes("Requested entity was not found.")) {
      throw new Error("Clé API invalide ou non sélectionnée. Veuillez sélectionner votre clé API.");
    }
    throw new Error(`Failed to fetch news from Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Function to fetch detailed content for a specific article
export const fetchDetailedArticleContent = async (title: string, summary: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `Développez le résumé suivant en un article détaillé d'environ 300-500 mots, en fournissant plus de contexte et d'informations.
Titre: ${title}
Résumé: ${summary}
Contenu détaillé:`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Use search grounding for detailed content as well
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("Error fetching detailed article content:", error);
    if (String(error).includes("API_KEY_INVALID") || String(error).includes("Requested entity was not found.")) {
      throw new Error("Clé API invalide ou non sélectionnée. Veuillez sélectionner votre clé API.");
    }
    throw new Error(`Failed to fetch detailed content from Gemini API: ${error instanceof Error ? error.message : String(error)}}`);
  }
};

// Function to fetch general environmental facts
export const fetchEnvironmentalFacts = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `Fournissez 5 à 7 faits marquants et récents sur l'environnement (destruction, conservation, protection), sous forme de points. Chaque fait doit être concis et informatif.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Use search grounding for facts
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("Error fetching environmental facts:", error);
    if (String(error).includes("API_KEY_INVALID") || String(error).includes("Requested entity was not found.")) {
      throw new Error("Clé API invalide ou non sélectionnée. Veuillez sélectionner votre clé API.");
    }
    throw new Error(`Failed to fetch environmental facts from Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Function to create a new chat session
export const createChatSession = (): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: 'Vous êtes un assistant environnemental amical et informatif nommé EcoBot. Vous pouvez répondre à des questions sur la destruction, la conservation et la protection de l\'environnement, ainsi que sur les actualités récentes. Votre objectif est de fournir des informations précises et utiles pour sensibiliser et inspirer l\'action.',
      tools: [{ googleSearch: {} }], // Enable Google Search for up-to-date info
    },
  });
};

// Function to send a message to the chat and handle streaming response
export const sendMessageToChat = async (chat: Chat, message: string, onChunk: (chunk: string) => void): Promise<void> => {
  const responseStream = await chat.sendMessageStream({ message: message });
  for await (const chunk of responseStream) {
    onChunk(chunk.text);
  }
};