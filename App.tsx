
import React, { useState, useEffect, useCallback } from 'react';
import { fetchEnvironmentalNews, fetchDetailedArticleContent, fetchEnvironmentalFacts } from './services/geminiService';
import { NewsArticle } from './types';
import NewsCard from './components/NewsCard';
import LoadingSpinner from './components/LoadingSpinner';

// New component for displaying a detailed article
interface DetailedArticleViewProps {
  article: NewsArticle;
  onBack: () => void;
}

const DetailedArticleView: React.FC<DetailedArticleViewProps> = ({ article, onBack }) => {
  const [detailedContent, setDetailedContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(true);
  const [errorContent, setErrorContent] = useState<string | null>(null);

  useEffect(() => {
    const loadDetailedContent = async () => {
      setLoadingContent(true);
      setErrorContent(null);
      try {
        const content = await fetchDetailedArticleContent(article.title, article.summary);
        setDetailedContent(content);
      } catch (err: any) {
        console.error("Error fetching detailed article content:", err);
        setErrorContent(err.message || "Impossible de charger le contenu détaillé de l'article.");
      } finally {
        setLoadingContent(false);
      }
    };

    loadDetailedContent();
  }, [article.title, article.summary]);

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg my-8 relative">
      <button
        onClick={onBack}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        aria-label="Retour aux actualités"
      >
        &#x2190; Retour
      </button>
      <h2 className="text-4xl font-extrabold text-green-800 mb-4">{article.title}</h2>
      <p className="text-xl text-gray-700 italic mb-6">{article.summary}</p>

      {loadingContent ? (
        <LoadingSpinner />
      ) : errorContent ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
          <strong className="font-bold">Erreur:</strong>
          <span className="block sm:inline ml-2">{errorContent}</span>
        </div>
      ) : (
        <div className="prose max-w-none text-gray-800 leading-relaxed text-justify">
          {detailedContent && detailedContent.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4">{paragraph}</p>
          ))}
        </div>
      )}

      {article.sources && article.sources.length > 0 && (
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-2">Sources:</p>
          <ul className="list-disc list-inside space-y-1">
            {[...new Set(article.sources.map(s => s.uri))].map((uri, index) => {
              const source = article.sources.find(s => s.uri === uri);
              return (
                <li key={index}>
                  <a
                    href={uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 hover:underline transition-colors duration-200"
                  >
                    {source?.title || uri}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};


function App() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [environmentalFacts, setEnvironmentalFacts] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFacts, setLoadingFacts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const loadAllContent = useCallback(async (selectedApiKey: boolean) => {
    if (!selectedApiKey) {
      setLoading(false);
      setLoadingFacts(false);
      setError("Veuillez sélectionner une clé API pour utiliser l'application.");
      return;
    }

    setLoading(true);
    setLoadingFacts(true);
    setError(null);

    // Load News
    try {
      const fetchedNews = await fetchEnvironmentalNews();
      setNews(fetchedNews);
    } catch (err: any) {
      console.error("Error loading news:", err);
      setError(err.message || "Une erreur est survenue lors du chargement des actualités.");
      if (err.message && err.message.includes("Clé API invalide")) {
        setHasApiKey(false); // Reset API key state if invalid
      }
    } finally {
      setLoading(false);
    }

    // Load Environmental Facts
    try {
      const facts = await fetchEnvironmentalFacts();
      setEnvironmentalFacts(facts);
    } catch (err: any) {
      console.error("Error loading environmental facts:", err);
      // Don't block the entire app if facts fail, just show an error for this section
      if (!error) setError(err.message || "Une erreur est survenue lors du chargement des faits environnementaux.");
      if (err.message && err.message.includes("Clé API invalide")) {
        setHasApiKey(false); // Reset API key state if invalid
      }
    } finally {
      setLoadingFacts(false);
    }
  }, [error]);

  const checkApiKeyAndLoadContent = useCallback(async () => {
    try {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
      if (selected) {
        await loadAllContent(true);
      } else {
        setLoading(false);
        setLoadingFacts(false);
        setError("Veuillez sélectionner une clé API pour utiliser l'application.");
      }
    } catch (err) {
      console.error("Error checking API key:", err);
      setError("Erreur lors de la vérification de la clé API.");
      setLoading(false);
      setLoadingFacts(false);
    }
  }, [loadAllContent]);

  useEffect(() => {
    checkApiKeyAndLoadContent();
  }, [checkApiKeyAndLoadContent]);

  const handleSelectApiKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success and immediately try to load content.
      setHasApiKey(true);
      // Clear existing errors before reloading
      setError(null); 
      setSelectedArticle(null); // Go back to main view
      await loadAllContent(true);
    } catch (err) {
      console.error("Error opening API key selection:", err);
      setError("Erreur lors de l'ouverture du sélecteur de clé API.");
    }
  };

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
  };

  const handleBackToNews = () => {
    setSelectedArticle(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
      <header className="w-full max-w-4xl text-center py-8">
        <h1 className="text-5xl font-extrabold text-green-800 tracking-tight leading-tight">
          Eco<span className="text-blue-600">Actu</span>
        </h1>
        <p className="mt-4 text-xl text-gray-700 font-light">
          Votre source d'informations à jour sur l'environnement
        </p>
      </header>

      <main className="w-full max-w-4xl flex-grow">
        {!hasApiKey ? (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center my-8" role="alert" aria-live="polite">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Clé API requise</h2>
            <p className="text-gray-700 mb-6">
              Pour accéder aux dernières actualités environnementales et aux faits, veuillez sélectionner votre clé API Google Gemini.
            </p>
            <button
              onClick={handleSelectApiKey}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
            >
              Sélectionner la clé API
            </button>
            <p className="mt-4 text-sm text-gray-500">
              <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Informations sur la facturation de l'API Gemini
              </a>
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
                <strong className="font-bold">Erreur:</strong>
                <span className="block sm:inline ml-2">{error}</span>
                <p className="mt-2 text-sm">Veuillez réessayer ou vérifier votre connexion internet et votre clé API.</p>
              </div>
            )}

            {selectedArticle ? (
              <DetailedArticleView article={selectedArticle} onBack={handleBackToNews} />
            ) : (
              <>
                <section className="bg-white p-8 rounded-lg shadow-lg my-8" aria-labelledby="about-section-title">
                  <h2 id="about-section-title" className="text-3xl font-bold text-green-700 mb-4">À Propos d'EcoActu</h2>
                  <p className="text-gray-700 leading-relaxed text-justify">
                    EcoActu est votre plateforme dédiée aux dernières nouvelles et analyses concernant l'environnement.
                    Nous nous engageons à vous fournir des informations précises et à jour sur les défis de la destruction environnementale,
                    les efforts de conservation, et les initiatives de protection à travers le monde. Notre mission est de sensibiliser
                    et d'informer pour inspirer l'action collective vers un avenir plus durable.
                  </p>
                </section>

                <section className="bg-white p-8 rounded-lg shadow-lg my-8" aria-labelledby="facts-section-title">
                  <h2 id="facts-section-title" className="text-3xl font-bold text-blue-700 mb-4">Faits Environnementaux Clés</h2>
                  {loadingFacts ? (
                    <LoadingSpinner />
                  ) : environmentalFacts ? (
                    <div className="prose max-w-none text-gray-800 leading-relaxed">
                      {environmentalFacts.split('\n').map((item, index) => (
                        <p key={index} className="mb-2">{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-lg text-gray-600 mt-4">Impossible de charger les faits environnementaux.</p>
                  )}
                </section>

                <section className="my-8" aria-labelledby="news-section-title">
                  <h2 id="news-section-title" className="text-3xl font-bold text-green-700 mb-6 text-center">Dernières Actualités Environnementales</h2>
                  {loading && <LoadingSpinner />}

                  {!loading && news.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                      {news.map((article) => (
                        <NewsCard key={article.id} article={article} onClick={handleArticleClick} />
                      ))}
                    </div>
                  )}

                  {!loading && news.length === 0 && !error && (
                    <p className="text-center text-lg text-gray-600 mt-8">Aucune actualité trouvée pour le moment. Veuillez recharger.</p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      {hasApiKey && !selectedArticle && ( // Only show footer button on main news view
        <footer className="sticky bottom-0 w-full bg-white bg-opacity-90 border-t border-gray-200 p-4 shadow-lg flex justify-center mt-8 z-10">
          <button
            onClick={() => loadAllContent(true)} // Re-fetch all content
            disabled={loading || loadingFacts}
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || loadingFacts ? 'Rechargement...' : 'Recharger les Actualités & Faits'}
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;
