import { Injectable } from '@angular/core';
import { Annotation } from '../models/annotation';
import { ParseMarkedContentResult, ParsedAnnotation } from '../models/annotation-parser';

@Injectable({
  providedIn: 'root'
})
export class AnnotationParserService {

  /**
   * Конвертирует текст с аннотациями в размеченный формат
   * Формат: [текст аннотации](*цвет "подсказка")
   */
  convertToMarkedContent(text: string, annotations: Annotation[]): string {
    if (annotations.length === 0) return text;

    const sortedAnnotations = [...annotations].sort((a, b) => b.startOffset - a.startOffset);
    let result = text;

    for (const ann of sortedAnnotations) {
      const before = result.substring(0, ann.startOffset);
      const highlighted = result.substring(ann.startOffset, ann.endOffset);
      const after = result.substring(ann.endOffset);

      // Получаем короткое имя цвета
      const colorName = ann.color.replace('highlight_', '');
      // Экранируем кавычки в тексте подсказки
      const annotationText = ann.text.replace(/"/g, '\\"');

      result = before + `[${highlighted}](*${colorName} "${annotationText}")` + after;
    }

    return result;
  }

  /**
   * Парсит размеченный контент и возвращает чистый текст + аннотации
   * Формат: [текст](*цвет "подсказка")
   * Предполагается, что вложенных аннотаций нет (отловлено валидатором)
   */
  parseMarkedContent(markedText: string): ParseMarkedContentResult {
    const annotations: ParsedAnnotation[] = [];
    const validColors = ['yellow', 'red', 'blue', 'green', 'purple', 'pink', 'orange', 'cyan'];

    // Находим все аннотации
    const allAnnotations = this.findAllAnnotations(markedText);

    // Проверяем цвета
    for (const ann of allAnnotations) {
      if (!validColors.includes(ann.colorName)) {
        return {
          error: `Неверный цвет "${ann.colorName}". Допустимые: ${validColors.join(', ')}`
        };
      }
    }

    // Проверяем на пересечения
    const overlapError = this.checkOverlapsParsed(allAnnotations);
    if (overlapError) {
      return { error: overlapError };
    }

    // Извлекаем чистый текст и вычисляем offset'ы
    let pureText = '';
    let markedIndex = 0;

    // Сортируем аннотации по позиции
    const sortedAnnotations = [...allAnnotations].sort((a, b) => a.pos - b.pos);

    for (const ann of sortedAnnotations) {
      // Добавляем текст до аннотации
      while (markedIndex < ann.pos) {
        pureText += markedText[markedIndex];
        markedIndex++;
      }

      // Добавляем аннотацию
      annotations.push({
        text: ann.text,
        startOffset: pureText.length,
        endOffset: pureText.length + ann.text.length,
        color: `highlight_${ann.colorName}`,
        tooltip: ann.tooltip
      });

      pureText += ann.text;
      markedIndex = ann.endIndex;
    }

    // Добавляем оставшийся текст
    while (markedIndex < markedText.length) {
      pureText += markedText[markedIndex];
      markedIndex++;
    }

    return { text: pureText, annotations };
  }

  /**
   * Находит все аннотации в тексте (включая вложенные)
   */
  private findAllAnnotations(markedText: string): Array<{
    pos: number;
    text: string;
    colorName: string;
    tooltip: string;
    endIndex: number;
    processed?: boolean;
  }> {
    const annotations: Array<{
      pos: number;
      text: string;
      colorName: string;
      tooltip: string;
      endIndex: number;
      processed?: boolean;
    }> = [];

    for (let i = 0; i < markedText.length; i++) {
      if (markedText[i] === '[') {
        const ann = this.parseAnnotation(markedText, i);
        if (ann) {
          annotations.push({
            pos: i,
            ...ann
          });
        }
      }
    }

    return annotations;
  }

  /**
   * Проверяет аннотации на пересечения (для сырых данных)
   */
  private checkOverlapsParsed(annotations: Array<{ pos: number; text: string; endIndex: number }>): string | null {
    for (let i = 0; i < annotations.length; i++) {
      for (let j = i + 1; j < annotations.length; j++) {
        const a = annotations[i];
        const b = annotations[j];

        // Проверяем пересечение позиций в исходной строке
        if (a.pos < b.endIndex && a.endIndex > b.pos) {
          return `Перекрывающиеся аннотации не поддерживаются.\n\n` +
            `Аннотация 1: "${a.text}" [позиция ${a.pos}]\n` +
            `Аннотация 2: "${b.text}" [позиция ${b.pos}]\n\n` +
            `Уберите вложенные аннотации или сделайте их непересекающимися.`;
        }
      }
    }

    return null;
  }

  /**
   * Парсит одну аннотацию начиная с позиции pos
   * Возвращает null если это не аннотация
   */
  private parseAnnotation(markedText: string, pos: number): {
    text: string;
    colorName: string;
    tooltip: string;
    endIndex: number;
  } | null {
    // Ищем закрывающую скобку ] с учётом вложенности
    let bracketCount = 1;
    let textEnd = pos + 1;

    while (textEnd < markedText.length && bracketCount > 0) {
      if (markedText[textEnd] === '[') bracketCount++;
      if (markedText[textEnd] === ']') bracketCount--;
      textEnd++;
    }

    if (bracketCount !== 0) {
      return null; // Незакрытая скобка
    }

    // Проверяем, что после ] идёт (*
    if (markedText[textEnd] !== '(' || markedText[textEnd + 1] !== '*') {
      return null; // Это не аннотация
    }

    // Извлекаем текст аннотации
    const annotationText = markedText.substring(pos + 1, textEnd - 1);

    // Парсим (*цвет "подсказка")
    let colorEnd = textEnd + 2;
    while (colorEnd < markedText.length && markedText[colorEnd] !== ' ' && markedText[colorEnd] !== ')') {
      colorEnd++;
    }

    const colorName = markedText.substring(textEnd + 2, colorEnd);

    // Проверяем, есть ли подсказка
    let tooltip = '';
    let endIndex = colorEnd;

    if (markedText[colorEnd] === ' ') {
      // Ожидаем "подсказка"
      if (markedText[colorEnd + 1] === '"') {
        const quoteEnd = markedText.indexOf('"', colorEnd + 2);
        if (quoteEnd !== -1) {
          tooltip = markedText.substring(colorEnd + 2, quoteEnd);
          endIndex = quoteEnd + 1; // После закрывающей кавычки
        }
      }
    }

    // Пропускаем закрывающую скобку )
    if (markedText[endIndex] === ')') {
      endIndex++;
    }

    return {
      text: annotationText,
      colorName,
      tooltip,
      endIndex
    };
  }
}
