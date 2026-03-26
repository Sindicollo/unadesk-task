export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface NewArticle {
  title: string;
  content: string;
}
