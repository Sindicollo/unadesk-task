import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ArticlesService } from '../../services/articles.service';
import { AnnotationsService } from '../../services/annotations.service';
import { Article } from '../../models/article';
import { Annotation } from '../../models/annotation';
import { ParseMarkedContentResult, ParsedAnnotation } from '../../models/annotation-parser';

@Component({
  selector: 'app-article-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './article-editor.component.html',
  styleUrl: './article-editor.component.scss'
})
export class ArticleEditorComponent implements OnInit {
  private articlesService = inject(ArticlesService);
  private annotationsService = inject(AnnotationsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  title = signal('');
  content = signal('');
  contentWithMarks = signal('');
  isEditMode = false;
  articleId: string | null = null;
  annotations: Annotation[] = [];

  ngOnInit(): void {
    this.articleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.articleId;

    if (this.isEditMode && this.articleId) {
      const article = this.articlesService.getById(this.articleId);
      if (article) {
        this.title.set(article.title);
        this.content.set(article.content);
        this.annotations = this.annotationsService.getByArticleId(this.articleId);
        this.contentWithMarks.set(this.convertToMarkedContent(article.content, this.annotations));
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  /**
   * Конвертирует текст с аннотациями в размеченный формат
   * [текст аннотации](*цвет "подсказка")
   */
  private convertToMarkedContent(text: string, annotations: Annotation[]): string {
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
  private parseMarkedContent(markedText: string): ParseMarkedContentResult {
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  save(): void {
    if (!this.title().trim() || !this.contentWithMarks().trim()) {
      alert('Заполните заголовок и содержание');
      return;
    }

    // Парсим размеченный контент
    const parsed = this.parseMarkedContent(this.contentWithMarks());
    
    if ('error' in parsed) {
      alert('Ошибка в разметке:\n' + parsed.error);
      return;
    }

    const { text: plainText, annotations: newAnnotations } = parsed;

    if (this.isEditMode && this.articleId) {
      // Сохраняем статью
      this.articlesService.update(this.articleId, {
        title: this.title(),
        content: plainText
      });

      // Удаляем старые аннотации и создаём новые
      const oldAnnotations = this.annotationsService.getByArticleId(this.articleId);
      for (const oldAnn of oldAnnotations) {
        this.annotationsService.delete(this.articleId, oldAnn.id);
      }
      for (const newAnn of newAnnotations) {
        this.annotationsService.create(this.articleId, {
          startOffset: newAnn.startOffset,
          endOffset: newAnn.endOffset,
          color: newAnn.color,
          text: newAnn.tooltip
        });
      }
    } else {
      const article = this.articlesService.create({
        title: this.title(),
        content: plainText
      });
      this.articleId = article.id;

      // Создаём аннотации
      for (const newAnn of newAnnotations) {
        this.annotationsService.create(article.id, {
          startOffset: newAnn.startOffset,
          endOffset: newAnn.endOffset,
          color: newAnn.color,
          text: newAnn.tooltip
        });
      }
    }

    this.router.navigate(['/article', this.articleId]);
  }

  cancel(): void {
    if (this.articleId) {
      this.router.navigate(['/article', this.articleId]);
    } else {
      this.router.navigate(['/']);
    }
  }

  onContentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.contentWithMarks.set(target.value);
  }
}
