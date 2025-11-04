import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchEnvironmentalNews, fetchDetailedArticleContent, fetchEnvironmentalFacts } from './services/geminiService';
import { NewsArticle, VisitorReview } from './types';
import NewsCard from './components/NewsCard';
import LoadingSpinner from './components/LoadingSpinner';
import ChatbotWindow from './components/ChatbotWindow'; // Import the new ChatbotWindow component
import ReviewForm from './components/ReviewForm'; // Import ReviewForm
import ReviewList from './components/ReviewList'; // Import ReviewList

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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none'; // Hide broken image
    e.currentTarget.onerror = null; // Prevent infinite loop
  };

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
      {article.category && (
        <span className={`inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mb-4`}>
          {article.category}
        </span>
      )}
      <p className="text-xl text-gray-700 italic mb-6">{article.summary}</p>

      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt={`Illustration pour ${article.title}`}
          className="w-full h-72 object-cover rounded-md mb-6"
          onError={handleImageError}
        />
      )}

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
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false); // State for chatbot
  const [isAccMenuOpen, setIsAccMenuOpen] = useState<boolean>(false); // State for accessibility menu
  const [textSize, setTextSize] = useState<'small' | 'normal' | 'large' | 'xl'>('normal'); // State for text size
  const [highContrast, setHighContrast] = useState<boolean>(false); // State for high contrast
  const [reviews, setReviews] = useState<VisitorReview[]>([]); // State for visitor reviews

  // State for sorting and filtering
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const availableCategories = ['all', 'Destruction', 'Conservation', 'Protection'];

  // Effect to apply text size and high contrast classes to the document
  useEffect(() => {
    // Apply text size class to HTML element
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-xl');
    document.documentElement.classList.add(`text-size-${textSize}`);

    // Apply high contrast class to BODY element
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [textSize, highContrast]);

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

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  const handleAddReview = (reviewText: string) => {
    const newReview: VisitorReview = {
      id: Date.now().toString(),
      text: reviewText,
      timestamp: new Date(),
    };
    setReviews((prevReviews) => [newReview, ...prevReviews]); // Add new review at the beginning
  };

  // Memoized filtered and sorted news
  const filteredAndSortedNews = useMemo(() => {
    let currentNews = [...news]; // Start with a copy of the fetched news

    // Filter by category
    if (selectedCategory !== 'all') {
      currentNews = currentNews.filter(article => article.category === selectedCategory);
    }

    // Sort by date
    if (sortOrder === 'latest') {
      currentNews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortOrder === 'oldest') {
      currentNews.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    return currentNews;
  }, [news, selectedCategory, sortOrder]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <header className="w-full max-w-4xl text-center py-8">
        <h1 className="text-5xl font-extrabold text-green-800 tracking-tight leading-tight">
          Eco<span className="text-blue-600">Actu</span>
        </h1>
        <p className="mt-4 text-xl text-gray-700 font-light">
          Votre source d'informations à jour sur l'environnement
        </p>
      </header>

      {/* Accessibility Menu Button and Panel */}
      <div className="fixed top-4 right-4 z-50">
          <button
              onClick={() => setIsAccMenuOpen(!isAccMenuOpen)}
              className="p-3 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-all duration-300"
              aria-label="Ouvrir les paramètres d'accessibilité"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
          </button>
          {isAccMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl p-4 space-y-4 border border-gray-200">
                  {/* Text size controls */}
                  <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Taille du Texte</h3>
                      <div className="flex justify-between space-x-2">
                          {['small', 'normal', 'large', 'xl'].map((size) => (
                              <button
                                  key={size}
                                  onClick={() => setTextSize(size as 'small' | 'normal' | 'large' | 'xl')}
                                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200
                                      ${textSize === size ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                                  aria-pressed={textSize === size}
                                  aria-label={`Définir la taille du texte à ${size}`}
                              >
                                  {size.charAt(0).toUpperCase() + size.slice(1)}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Contrast controls */}
                  <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Contraste des Couleurs</h3>
                      <label className="flex items-center cursor-pointer">
                          <div className="relative">
                              <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={highContrast}
                                  onChange={() => setHighContrast(!highContrast)}
                                  aria-label="Activer ou désactiver le mode contraste élevé"
                              />
                              <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300
                                  ${highContrast ? 'translate-x-full bg-green-500' : ''}`}></div>
                          </div>
                          <div className="ml-3 text-gray-700 font-medium">
                              Contraste Élevé
                          </div>
                      </label>
                  </div>
              </div>
          )}
      </div>

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

                  {/* Sorting and Filtering Controls */}
                  <div className="flex flex-wrap justify-center gap-4 mb-8">
                    {/* Sort Order */}
                    <div className="relative">
                      <label htmlFor="sort-select" className="sr-only">Trier par</label>
                      <select
                        id="sort-select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'latest' | 'oldest')}
                        className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg shadow-sm leading-tight focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        aria-label="Trier les actualités par"
                      >
                        <option value="latest">Plus récentes</option>
                        <option value="oldest">Plus anciennes</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                      <label htmlFor="category-select" className="sr-only">Filtrer par catégorie</label>
                      <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg shadow-sm leading-tight focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        aria-label="Filtrer les actualités par catégorie"
                      >
                        {availableCategories.map(category => (
                          <option key={category} value={category}>
                            {category === 'all' ? 'Toutes les catégories' : category}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>

                  {loading && <LoadingSpinner />}

                  {!loading && filteredAndSortedNews.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                      {filteredAndSortedNews.map((article) => (
                        <NewsCard key={article.id} article={article} onClick={handleArticleClick} />
                      ))}
                    </div>
                  )}

                  {!loading && filteredAndSortedNews.length === 0 && !error && (
                    <p className="text-center text-lg text-gray-600 mt-8">
                      {selectedCategory === 'all'
                        ? "Aucune actualité trouvée pour le moment. Veuillez recharger."
                        : `Aucune actualité trouvée dans la catégorie "${selectedCategory}".`
                      }
                    </p>
                  )}
                </section>

                {/* Section Avis et Feedback des Visiteurs */}
                <section className="bg-white p-8 rounded-lg shadow-lg my-8" aria-labelledby="reviews-section-title">
                  <h2 id="reviews-section-title" className="text-3xl font-bold text-blue-700 mb-4">Avis et Feedback des Visiteurs</h2>
                  <ReviewForm onSubmit={handleAddReview} />
                  <ReviewList reviews={reviews} />
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

      {/* Chatbot Floating Action Button */}
      <button
        onClick={toggleChatbot}
        className="fixed bottom-8 right-8 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 z-50"
        aria-label={isChatbotOpen ? "Fermer le chatbot" : "Ouvrir le chatbot"}
      >
        {isChatbotOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isChatbotOpen && (
        <ChatbotWindow
          onClose={() => setIsChatbotOpen(false)}
          hasApiKey={hasApiKey}
          onSelectApiKey={handleSelectApiKey}
        />
      )}
    </div>
  );
}

export default App;