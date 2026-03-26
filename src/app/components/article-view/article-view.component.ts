import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ArticlesService } from '../../services/articles.service';
import { AnnotationsService } from '../../services/annotations.service';
import { Article } from '../../models/article';
import { Annotation, NewAnnotation } from '../../models/annotation';

interface HighlightedText {
  before: string;
  highlighted: string;
  after: string;
  annotation: Annotation;
}

@Component({
  selector: 'app-article-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './article-view.component.html',
  styleUrl: './article-view.component.scss'
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
  
  selectedColor = '#fbbf24';
  annotationText = '';
  showAnnotationDialog = false;
  pendingSelection: { start: number; end: number } | null = null;

  activeTooltip: Annotation | null = null;
  tooltipPosition = { x: 0, y: 0 };

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
      result += `<span class="highlight" style="background-color: ${ann.color};" data-annotation-id="${ann.id}">${this.escapeHtml(highlighted)}</span>`;
      
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

    if (start === end) {
      return;
    }

    this.pendingSelection = { start, end };
    this.showAnnotationDialog = true;
    this.annotationText = '';
  }

  saveAnnotation(): void {
    if (!this.pendingSelection || !this.article()) return;

    const newAnnotation: NewAnnotation = {
      startOffset: this.pendingSelection.start,
      endOffset: this.pendingSelection.end,
      color: this.selectedColor,
      text: this.annotationText
    };

    this.annotationsService.create(this.article()!.id, newAnnotation);
    this.annotations.set(this.annotationsService.getByArticleId(this.article()!.id));
    this.renderContent();
    
    this.closeAnnotationDialog();
    window.getSelection()?.removeAllRanges();
  }

  closeAnnotationDialog(): void {
    this.showAnnotationDialog = false;
    this.pendingSelection = null;
    this.annotationText = '';
  }

  cancelSelection(): void {
    this.closeAnnotationDialog();
    window.getSelection()?.removeAllRanges();
  }

  deleteAnnotation(annotationId: string): void {
    const article = this.article();
    if (!article) return;

    this.annotationsService.delete(article.id, annotationId);
    this.annotations.set(this.annotationsService.getByArticleId(article.id));
    this.renderContent();
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

  get colorOptions(): string[] {
    return ['#fbbf24', '#f87171', '#60a5fa', '#34d399', '#a78bfa', '#f472b6'];
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }
}
