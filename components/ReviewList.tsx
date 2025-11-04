import React from 'react';
import { VisitorReview } from '../types';

interface ReviewListProps {
  reviews: VisitorReview[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  return (
    <div className="mt-8" aria-live="polite">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Ce que nos visiteurs disent:</h3>
      {reviews.length === 0 ? (
        <p className="text-gray-600 italic">Soyez le premier à laisser un avis !</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-800 mb-2 leading-relaxed">{review.text}</p>
              <p className="text-sm text-gray-600 text-right">
                Publié le {review.timestamp.toLocaleDateString('fr-FR')} à {review.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewList;