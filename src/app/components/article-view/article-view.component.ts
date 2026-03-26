import { Component, inject, signal, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ArticlesService } from '../../services/articles.service';
import { AnnotationsService } from '../../services/annotations.service';
import { Article } from '../../models/article';
import { Annotation, NewAnnotation } from '../../models/annotation';

interface ColorOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-article-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './article-view.component.html',
  styleUrl: './article-view.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ArticleViewComponent implements OnInit, OnDestroy {
  private articlesService = inject(ArticlesService);
  private annotationsService = inject(AnnotationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  article = signal<Article | null>(null);
  annotations = signal<Annotation[]>([]);
  renderedContent = signal<string>('');

  // UI для создания аннотаций
  selectedColor = 'highlight_yellow';
  annotationText = signal('');
  annotationTextForEdit = '';
  showAnnotationPanel = signal(false);
  pendingSelection: { start: number; end: number; text: string } | null = null;
  selectedAnnotation = signal<Annotation | null>(null);

  // Tooltip
  activeTooltip: Annotation | null = null;
  tooltipPosition = { x: 0, y: 0 };

  readonly colorOptions: ColorOption[] = [
    { value: 'highlight_yellow', label: 'Жёлтый' },
    { value: 'highlight_red', label: 'Красный' },
    { value: 'highlight_blue', label: 'Синий' },
    { value: 'highlight_green', label: 'Зелёный' },
    { value: 'highlight_purple', label: 'Фиолетовый' },
    { value: 'highlight_pink', label: 'Розовый' },
    { value: 'highlight_orange', label: 'Оранжевый' },
    { value: 'highlight_cyan', label: 'Голубой' }
  ];

  readonly colorValues: Record<string, string> = {
    'highlight_yellow': '#fbbf24',
    'highlight_red': '#f87171',
    'highlight_blue': '#60a5fa',
    'highlight_green': '#34d399',
    'highlight_purple': '#a78bfa',
    'highlight_pink': '#f472b6',
    'highlight_orange': '#fb923c',
    'highlight_cyan': '#22d3ee'
  };

  ngOnInit(): void {
    const articleId = this.route.snapshot.paramMap.get('id');

    if (!articleId) {
      this.router.navigate(['/']);
      return;
    }

    const article = this.articlesService.getById(articleId);
    if (!article) {
      this.router.navigate(['/']);
      return;
    }

    this.article.set(article);
    this.annotations.set(this.annotationsService.getByArticleId(articleId));
    this.renderContent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  renderContent(): void {
    const article = this.article();
    const annotations = this.annotations();

    if (!article) {
      this.renderedContent.set('');
      return;
    }

    const sortedAnnotations = [...annotations].sort((a, b) => a.startOffset - b.startOffset);

    let result = '';
    let lastIndex = 0;

    for (const ann of sortedAnnotations) {
      const before = article.content.substring(lastIndex, ann.startOffset);
      const highlighted = article.content.substring(ann.startOffset, ann.endOffset);

      result += this.escapeHtml(before);
      result += `<span class="highlight ${ann.color}" data-annotation-id="${ann.id}">${this.escapeHtml(highlighted)}</span>`;

      lastIndex = ann.endOffset;
    }

    result += this.escapeHtml(article.content.substring(lastIndex));
    this.renderedContent.set(result);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  onContentMouseUp(event: MouseEvent): void {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    const contentDiv = event.currentTarget as HTMLElement;

    if (!contentDiv.contains(range.commonAncestorContainer)) {
      return;
    }

    const article = this.article();
    if (!article) return;

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(contentDiv);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;
    const selectedText = range.toString();

    if (start === end) {
      return;
    }

    // Проверяем, есть ли уже аннотация в этом диапазоне
    const existingAnnotation = this.findAnnotationInRange(start, end);

    if (existingAnnotation) {
      this.selectedAnnotation.set(existingAnnotation);
      this.selectedColor = existingAnnotation.color;
      this.annotationText.set(existingAnnotation.text);
      this.annotationTextForEdit = existingAnnotation.text;
      this.showAnnotationPanel.set(true);
      this.pendingSelection = null;
    } else {
      this.pendingSelection = { start, end, text: selectedText };
      this.selectedAnnotation.set(null);
      this.selectedColor = 'highlight_yellow';
      this.annotationText.set('');
      this.annotationTextForEdit = '';
      this.showAnnotationPanel.set(true);
    }
  }

  onContentContextMenu(event: MouseEvent): void {
    event.preventDefault();

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    const contentDiv = event.currentTarget as HTMLElement;

    if (!contentDiv.contains(range.commonAncestorContainer)) {
      return;
    }

    // Фокус на поле цвета
    const colorSelect = document.getElementById('annotation-color-select');
    if (colorSelect) {
      colorSelect.focus();
    }
  }

  onHighlightClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const highlight = target.closest('.highlight');

    if (!highlight) return;

    event.preventDefault();
    event.stopPropagation();

    const annotationId = highlight.getAttribute('data-annotation-id');
    if (!annotationId) return;

    const annotation = this.annotations().find(ann => ann.id === annotationId);
    if (annotation) {
      this.selectedAnnotation.set(annotation);
      this.selectedColor = annotation.color;
      this.annotationText.set(annotation.text);
      this.annotationTextForEdit = annotation.text;
      this.showAnnotationPanel.set(true);
      this.pendingSelection = null;
    }
  }

  private findAnnotationInRange(start: number, end: number): Annotation | null {
    const annotations = this.annotations();

    for (const ann of annotations) {
      if (start < ann.endOffset && end > ann.startOffset) {
        return ann;
      }
    }

    return null;
  }

  saveAnnotation(): void {
    const articleId = this.article()?.id;
    if (!articleId) return;

    if (this.pendingSelection) {
      const newAnnotation: NewAnnotation = {
        startOffset: this.pendingSelection.start,
        endOffset: this.pendingSelection.end,
        color: this.selectedColor,
        text: this.annotationText()
      };

      this.annotationsService.create(articleId, newAnnotation);
      this.annotations.set(this.annotationsService.getByArticleId(articleId));
      this.renderContent();
    } else if (this.selectedAnnotation()) {
      this.annotationsService.update(
        articleId,
        this.selectedAnnotation()!.id,
        {
          color: this.selectedColor,
          text: this.annotationText()
        }
      );
      this.annotations.set(this.annotationsService.getByArticleId(articleId));
      this.renderContent();
    }

    this.closeAnnotationPanel();
  }

  deleteAnnotation(): void {
    const articleId = this.article()?.id;
    if (!articleId || !this.selectedAnnotation()) return;

    this.annotationsService.delete(articleId, this.selectedAnnotation()!.id);
    this.annotations.set(this.annotationsService.getByArticleId(articleId));
    this.renderContent();
    this.closeAnnotationPanel();
  }

  closeAnnotationPanel(): void {
    this.showAnnotationPanel.set(false);
    this.pendingSelection = null;
    this.selectedAnnotation.set(null);
    this.selectedColor = 'highlight_yellow';
    this.annotationText.set('');
    this.annotationTextForEdit = '';
    window.getSelection()?.removeAllRanges();
  }

  onHighlightMouseEnter(event: MouseEvent, annotation: Annotation): void {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.activeTooltip = annotation;
    this.tooltipPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    };
  }

  onHighlightMouseLeave(): void {
    this.activeTooltip = null;
  }

  get selectedColorValue(): string {
    return this.colorValues[this.selectedColor] || '#fbbf24';
  }

  get selectedColorLabel(): string {
    const option = this.colorOptions.find(c => c.value === this.selectedColor);
    return option ? option.label : 'Выберите цвет';
  }
}
