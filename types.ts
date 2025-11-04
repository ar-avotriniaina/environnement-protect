

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category?: string; // Added for filtering
  fullContent?: string; // Added for the detailed view
  sources: Source[];
  imageUrl?: string; // Added for generated image illustration
  createdAt?: number; // Added for sorting by date
}

export interface Source {
  uri: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export interface VisitorReview {
  id: string;
  text: string;
  timestamp: Date;
}