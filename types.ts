
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
