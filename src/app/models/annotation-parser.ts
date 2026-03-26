export interface ParsedAnnotation {
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  tooltip: string;
}

export interface ParseResult {
  text: string;
  annotations: ParsedAnnotation[];
}

export interface ParseError {
  error: string;
}

export type ParseMarkedContentResult = ParseResult | ParseError;
