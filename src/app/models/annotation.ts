export interface Annotation {
  id: string;
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
}

export interface NewAnnotation {
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
}
