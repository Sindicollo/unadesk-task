import { Injectable, signal, computed } from '@angular/core';
import { Annotation, NewAnnotation } from '../models/annotation';
import { getAnnotationsStorageKey } from '../constants/storage-keys';
import { AnnotationValidatorService } from './annotation-validator.service';

@Injectable({
  providedIn: 'root'
})
export class AnnotationsService {
  private annotationsSignal = signal<Map<string, Annotation[]>>(new Map());
  private validator = new AnnotationValidatorService();
  
  readonly annotations = computed(() => this.annotationsSignal());

  private loadFromStorage(articleId: string): Annotation[] {
    try {
      const data = localStorage.getItem(getAnnotationsStorageKey(articleId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(articleId: string, annotations: Annotation[]): void {
    localStorage.setItem(getAnnotationsStorageKey(articleId), JSON.stringify(annotations));
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
    // Получаем существующие аннотации для валидации
    const existingAnnotations = this.getByArticleId(articleId);

    // Валидируем новую аннотацию
    const validation = this.validator.validateNewAnnotation(newAnnotation, existingAnnotations);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

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
    const existingAnnotations = this.getByArticleId(articleId);

    // Валидируем обновлённую аннотацию
    const validation = this.validator.validateUpdatedAnnotation(annotationId, updates, existingAnnotations);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    this.annotationsSignal.update(map => {
      const newMap = new Map(map);
      const articleAnnotations = newMap.get(articleId) || [];

      const updated = articleAnnotations.map(ann => {
        if (ann.id === annotationId) {
          return { ...ann, ...updates };
        }
        return ann;
      });

      newMap.set(articleId, updated);
      this.saveToStorage(articleId, updated);
      return newMap;
    });

    return this.getByArticleId(articleId).find(ann => ann.id === annotationId) || null;
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
    localStorage.removeItem(getAnnotationsStorageKey(articleId));
  }
}
