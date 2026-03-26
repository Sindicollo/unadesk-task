export interface Annotation {
  id: string;
  articleId: string;
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
  createdAt: number;
}

export interface NewAnnotation {
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
}
