import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ArticlesService } from '../../services/articles.service';
import { Article } from '../../models/article';

@Component({
  selector: 'app-article-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './article-editor.component.html',
  styleUrl: './article-editor.component.scss'
})
export class ArticleEditorComponent {
  private articlesService = inject(ArticlesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  title = '';
  content = '';
  isEditMode = false;
  articleId: string | null = null;

  ngOnInit(): void {
    this.articleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.articleId;

    if (this.isEditMode && this.articleId) {
      const article = this.articlesService.getById(this.articleId);
      if (article) {
        this.title = article.title;
        this.content = article.content;
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  save(): void {
    if (!this.title.trim() || !this.content.trim()) {
      alert('Заполните заголовок и содержание');
      return;
    }

    if (this.isEditMode && this.articleId) {
      this.articlesService.update(this.articleId, { title: this.title, content: this.content });
    } else {
      const article = this.articlesService.create({ title: this.title, content: this.content });
      this.articleId = article.id;
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
}
