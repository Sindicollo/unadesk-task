import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ArticlesService } from '../../services/articles.service';
import { AnnotationsService } from '../../services/annotations.service';
import { AnnotationParserService } from '../../services/annotation-parser.service';
import { Annotation } from '../../models/annotation';

@Component({
  selector: 'app-article-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './article-editor.component.html',
  styleUrl: './article-editor.component.scss'
})
export class ArticleEditorComponent implements OnInit {
  private articlesService = inject(ArticlesService);
  private annotationsService = inject(AnnotationsService);
  private parserService = inject(AnnotationParserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  title = signal('');
  content = signal('');
  contentWithMarks = signal('');
  isEditMode = false;
  articleId: string | null = null;
  annotations: Annotation[] = [];
  hasChanges = signal(false);

  private originalTitle = '';
  private originalContentMarks = '';

  ngOnInit(): void {
    this.articleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.articleId;

    if (this.isEditMode && this.articleId) {
      const article = this.articlesService.getById(this.articleId);
      if (article) {
        this.title.set(article.title);
        this.content.set(article.content);
        this.annotations = this.annotationsService.getByArticleId(this.articleId);
        this.contentWithMarks.set(this.parserService.convertToMarkedContent(article.content, this.annotations));
        this.originalTitle = article.title;
        this.originalContentMarks = this.contentWithMarks();
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  onContentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.contentWithMarks.set(target.value);
    this.checkChanges();
  }

  goToViewMode(): void {
    if (!this.articleId) {
      this.router.navigate(['/']);
      return;
    }

    if (this.hasChanges()) {
      const confirmNavigate = confirm(
        'У вас есть несохранённые изменения. Перейти в режим просмотра без сохранения?'
      );
      if (!confirmNavigate) return;
    }

    this.router.navigate(['/article', this.articleId]);
  }

  checkChanges(): void {
    const titleChanged = this.title() !== this.originalTitle;
    const contentChanged = this.contentWithMarks() !== this.originalContentMarks;
    this.hasChanges.set(titleChanged || contentChanged);
  }

  save(): void {
    if (!this.title().trim() || !this.contentWithMarks().trim()) {
      alert('Заполните заголовок и содержание');
      return;
    }

    // Парсим размеченный контент
    const parsed = this.parserService.parseMarkedContent(this.contentWithMarks());

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
      // Обновляем оригинальные значения после сохранения
      this.originalTitle = this.title();
      this.originalContentMarks = this.contentWithMarks();
      this.hasChanges.set(false);
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
}
