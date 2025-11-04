
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { NewsArticle, Source } from "../types";

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

// Function to fetch environmental news using Gemini with Google Search grounding.
export const fetchEnvironmentalNews = async (): Promise<NewsArticle[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `Résumez les actualités récentes et importantes sur la destruction, la conservation et la protection de l'environnement.
Chaque actualité doit inclure un titre et un résumé concis.
Listez chaque actualité sur une nouvelle ligne, formatée comme follows :
Titre: [Titre de l'article]
Résumé: [Résumé de l'actualité]
`;

  let response: GenerateContentResponse;
  try {
    response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Do not set responseMimeType or responseSchema with googleSearch
      },
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    const newsArticles: NewsArticle[] = [];
    // Split by "Titre: " and discard the first empty element, handling potential leading text
    const rawArticles = text.split(/Titre: /i).slice(1); 

    rawArticles.forEach((rawArticle, index) => {
      const titleMatch = rawArticle.match(/^([^\n]+)/);
      const summaryMatch = rawArticle.match(/Résumé: ([^\n]+)/i);

      const title = titleMatch ? titleMatch[1].trim() : `Actualité sans titre ${index + 1}`;
      const summary = summaryMatch ? summaryMatch[1].trim() : `Résumé non disponible pour l'actualité ${index + 1}.`;

      const articleSources: Source[] = [];
      if (groundingChunks) {
        groundingChunks.forEach(chunk => {
          if ('web' in chunk && chunk.web?.uri) {
            articleSources.push({ uri: chunk.web.uri, title: chunk.web.title });
          }
          if ('maps' in chunk && chunk.maps?.uri) {
            articleSources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
            if (chunk.maps.placeAnswerSources) {
              chunk.maps.placeAnswerSources.reviewSnippets?.forEach(snippet => {
                // Ensure 'uri' exists before pushing
                // Fix: Access 'uri' and 'title' directly from the snippet object, as 'link' property does not exist.
                if (snippet.uri) {
                  articleSources.push({ uri: snippet.uri, title: snippet.title || "Review Snippet" });
                }
              });
            }
          }
        });
      }

      newsArticles.push({
        id: `article-${index}-${Date.now()}`,
        title: title,
        summary: summary,
        sources: articleSources,
      });
    });

    return newsArticles;

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
  } catch (error) {
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
  } catch (error) {
    console.error("Error fetching environmental facts:", error);
    if (String(error).includes("API_KEY_INVALID") || String(error).includes("Requested entity was not found.")) {
      throw new Error("Clé API invalide ou non sélectionnée. Veuillez sélectionner votre clé API.");
    }
    throw new Error(`Failed to fetch environmental facts from Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }
};
