
import React from 'react';
import { NewsArticle } from '../types';

interface NewsCardProps {
  article: NewsArticle;
  onClick: (article: NewsArticle) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onClick }) => {
  return (
    <button
      onClick={() => onClick(article)}
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1 text-left w-full block focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      aria-label={`Lire l'article: ${article.title}`}
    >
      <h3 className="text-xl font-semibold text-green-700 mb-2">
        {article.title}
      </h3>
      <p className="text-gray-600 mb-4 text-justify line-clamp-3">{article.summary}</p>
      {article.sources && article.sources.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-1">Sources:</p>
          <ul className="list-disc list-inside space-y-1">
            {[...new Set(article.sources.map(s => s.uri))].slice(0, 3).map((uri, index) => { // Limit to 3 sources for brevity
              const source = article.sources.find(s => s.uri === uri);
              return (
                <li key={index}>
                  <a
                    href={uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 hover:underline transition-colors duration-200"
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking source link
                  >
                    {source?.title || uri}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </button>
  );
};

export default NewsCard;
