import { Injectable } from '@angular/core';
import { Annotation, NewAnnotation } from '../models/annotation';

export interface AnnotationOverlap {
  overlaps: boolean;
  conflictingAnnotation?: Annotation;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnnotationValidatorService {

  /**
   * Проверяет, пересекается ли новая аннотация с существующими
   */
  checkOverlap(
    startOffset: number,
    endOffset: number,
    existingAnnotations: Annotation[],
    excludeAnnotationId?: string
  ): AnnotationOverlap {
    for (const existing of existingAnnotations) {
      // Пропускаем ту же самую аннотацию (при редактировании)
      if (excludeAnnotationId && existing.id === excludeAnnotationId) {
        continue;
      }

      if (this.rangesOverlap(startOffset, endOffset, existing.startOffset, existing.endOffset)) {
        return {
          overlaps: true,
          conflictingAnnotation: existing,
          message: this.getOverlapMessage(startOffset, endOffset, existing)
        };
      }
    }

    return { overlaps: false };
  }

  /**
   * Проверяет пересечение двух диапазонов
   * Диапазоны пересекаются, если начало одного меньше конца другого
   */
  private rangesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    // Диапазоны НЕ пересекаются, если один полностью до или после другого
    const noOverlap = end1 <= start2 || end2 <= start1;
    return !noOverlap;
  }

  /**
   * Формирует сообщение о конфликте
   */
  private getOverlapMessage(
    newStart: number,
    newEnd: number,
    existing: Annotation
  ): string {
    const existingText = `аннотация [${existing.startOffset}-${existing.endOffset}]`;
    const newText = `новая [${newStart}-${newEnd}]`;
    return `Пересечение диапазонов: ${existingText} и ${newText}`;
  }

  /**
   * Валидирует новую аннотацию перед созданием
   */
  validateNewAnnotation(
    newAnnotation: NewAnnotation,
    existingAnnotations: Annotation[]
  ): { valid: boolean; message?: string } {
    // Проверка на корректность диапазона
    if (newAnnotation.startOffset < 0) {
      return {
        valid: false,
        message: 'Начальная позиция не может быть отрицательной'
      };
    }

    if (newAnnotation.endOffset <= newAnnotation.startOffset) {
      return {
        valid: false,
        message: 'Конечная позиция должна быть больше начальной'
      };
    }

    // Проверка на пересечения
    const overlap = this.checkOverlap(
      newAnnotation.startOffset,
      newAnnotation.endOffset,
      existingAnnotations
    );

    if (overlap.overlaps) {
      return {
        valid: false,
        message: overlap.message
      };
    }

    return { valid: true };
  }

  /**
   * Валидирует обновлённую аннотацию
   */
  validateUpdatedAnnotation(
    annotationId: string,
    updates: Partial<Annotation>,
    existingAnnotations: Annotation[]
  ): { valid: boolean; message?: string } {
    const annotation = existingAnnotations.find(a => a.id === annotationId);
    if (!annotation) {
      return {
        valid: false,
        message: 'Аннотация не найдена'
      };
    }

    // Если обновляем позиции
    if (updates.startOffset !== undefined || updates.endOffset !== undefined) {
      const newStart = updates.startOffset ?? annotation.startOffset;
      const newEnd = updates.endOffset ?? annotation.endOffset;

      if (newStart < 0) {
        return {
          valid: false,
          message: 'Начальная позиция не может быть отрицательной'
        };
      }

      if (newEnd <= newStart) {
        return {
          valid: false,
          message: 'Конечная позиция должна быть больше начальной'
        };
      }

      // Проверка на пересечения (исключая текущую аннотацию)
      const overlap = this.checkOverlap(newStart, newEnd, existingAnnotations, annotationId);

      if (overlap.overlaps) {
        return {
          valid: false,
          message: overlap.message
        };
      }
    }

    return { valid: true };
  }
}
