import React, { useState } from 'react';

interface ReviewFormProps {
  onSubmit: (reviewText: string) => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit }) => {
  const [reviewInput, setReviewInput] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewInput.trim()) {
      onSubmit(reviewInput);
      setReviewInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Laissez-nous votre avis !</h3>
      <div className="mb-4">
        <label htmlFor="review-text" className="sr-only">Votre feedback</label>
        <textarea
          id="review-text"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px] text-gray-800"
          placeholder="Partagez vos impressions sur EcoActu ou vos suggestions pour la protection de l'environnement..."
          value={reviewInput}
          onChange={(e) => setReviewInput(e.target.value)}
          aria-label="Champ de saisie pour votre feedback"
          required
        ></textarea>
      </div>
      <button
        type="submit"
        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
        aria-label="Envoyer votre feedback"
      >
        Envoyer le Feedback
      </button>
    </form>
  );
};

export default ReviewForm;