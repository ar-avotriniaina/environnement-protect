

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  fullContent?: string; // Added for the detailed view
  sources: Source[];
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