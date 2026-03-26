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
   */
  parseMarkedContent(markedText: string): ParseMarkedContentResult {
    const annotations: ParsedAnnotation[] = [];
    let result = '';

    // Паттерн для поиска [текст](*цвет "подсказка")
    // Подсказка может быть пустой или отсутствовать
    const pattern = /\[([^\]]+)\]\(\*([\w]+)(?:\s+"([^"]*)")?\)/g;
    let match;
    let lastEndIndex = 0;

    const validColors = ['yellow', 'red', 'blue', 'green', 'purple', 'pink', 'orange', 'cyan'];

    while ((match = pattern.exec(markedText)) !== null) {
      const annotationText = match[1];
      const colorName = match[2];
      const tooltip = match[3] || '';
      const start = match.index;
      const end = pattern.lastIndex;

      // Валидация цвета
      if (!validColors.includes(colorName)) {
        return { error: `Неверный цвет "${colorName}". Допустимые: ${validColors.join(', ')}` };
      }

      // Добавляем текст до аннотации
      result += markedText.substring(lastEndIndex, start);

      // Создаём аннотацию
      annotations.push({
        text: annotationText,
        startOffset: result.length,
        endOffset: result.length + annotationText.length,
        color: `highlight_${colorName}`,
        tooltip
      });

      // Добавляем текст аннотации
      result += annotationText;
      lastEndIndex = end;
    }

    // Добавляем оставшийся текст
    result += markedText.substring(lastEndIndex);

    // Проверка на незакрытые метки [
    const openBracketPattern = /\[[^\]]*$/g;
    if (openBracketPattern.test(markedText)) {
      const lastBracketIndex = markedText.lastIndexOf('[');
      const snippet = markedText.substring(lastBracketIndex, Math.min(lastBracketIndex + 30, markedText.length));
      return { error: `Обнаружена незакрытая метка аннотации. Проверьте: [${snippet}...` };
    }

    // Проверка на метки без цвета (есть [ и ], но нет (* после ])
    const noColorPattern = /\[[^\]]+\](?!\(\*)/g;
    const noColorMatches = markedText.match(noColorPattern);
    if (noColorMatches && noColorMatches.length > 0) {
      return { error: 'Обнаружена метка без указания цвета. Формат: [текст](*цвет "подсказка")' };
    }

    // Проверка на незакрытые скобки ()
    const openParenPattern = /\(\*[^\)]*$/g;
    if (openParenPattern.test(markedText)) {
      return { error: 'Обнаружена незакрытая скобка в аннотации. Убедитесь, что все () закрыты' };
    }

    return { text: result, annotations };
  }
}
