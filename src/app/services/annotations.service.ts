import { Injectable, signal, computed } from '@angular/core';
import { Annotation, NewAnnotation } from '../models/annotation';

const STORAGE_PREFIX = 'unadesk_annotations_';

@Injectable({
  providedIn: 'root'
})
export class AnnotationsService {
  private annotationsSignal = signal<Map<string, Annotation[]>>(new Map());
  
  readonly annotations = computed(() => this.annotationsSignal());

  getStorageKey(articleId: string): string {
    return `${STORAGE_PREFIX}${articleId}`;
  }

  private loadFromStorage(articleId: string): Annotation[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(articleId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(articleId: string, annotations: Annotation[]): void {
    localStorage.setItem(this.getStorageKey(articleId), JSON.stringify(annotations));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getByArticleId(articleId: string): Annotation[] {
    const currentMap = this.annotationsSignal();
    if (currentMap.has(articleId)) {
      return currentMap.get(articleId)!;
    }
    
    // Загружаем из localStorage если ещё не загружены
    const annotations = this.loadFromStorage(articleId);
    this.annotationsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(articleId, annotations);
      return newMap;
    });
    return annotations;
  }

  create(articleId: string, newAnnotation: NewAnnotation): Annotation {
    const annotation: Annotation = {
      id: this.generateId(),
      startOffset: newAnnotation.startOffset,
      endOffset: newAnnotation.endOffset,
      color: newAnnotation.color,
      text: newAnnotation.text
    };

    this.annotationsSignal.update(map => {
      const newMap = new Map(map);
      const articleAnnotations = newMap.get(articleId) || [];
      const updated = [...articleAnnotations, annotation];
      newMap.set(articleId, updated);
      this.saveToStorage(articleId, updated);
      return newMap;
    });

    return annotation;
  }

  update(articleId: string, annotationId: string, updates: Partial<Annotation>): Annotation | null {
    let updatedAnnotation: Annotation | null = null;

    this.annotationsSignal.update(map => {
      const newMap = new Map(map);
      const articleAnnotations = newMap.get(articleId) || [];
      
      const updated = articleAnnotations.map(ann => {
        if (ann.id === annotationId) {
          updatedAnnotation = { ...ann, ...updates };
          return updatedAnnotation;
        }
        return ann;
      });
      
      newMap.set(articleId, updated);
      this.saveToStorage(articleId, updated);
      return newMap;
    });

    return updatedAnnotation;
  }

  delete(articleId: string, annotationId: string): boolean {
    let deleted = false;

    this.annotationsSignal.update(map => {
      const newMap = new Map(map);
      const articleAnnotations = newMap.get(articleId) || [];
      
      const filtered = articleAnnotations.filter(ann => {
        if (ann.id === annotationId) {
          deleted = true;
          return false;
        }
        return true;
      });
      
      newMap.set(articleId, filtered);
      this.saveToStorage(articleId, filtered);
      return newMap;
    });

    return deleted;
  }

  deleteAllForArticle(articleId: string): void {
    this.annotationsSignal.update(map => {
      const newMap = new Map(map);
      newMap.delete(articleId);
      return newMap;
    });
    localStorage.removeItem(this.getStorageKey(articleId));
  }
}
