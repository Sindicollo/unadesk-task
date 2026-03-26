import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticlesService } from '../../services/articles.service';
import { Article } from '../../models/article';

@Component({
  selector: 'app-article-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './article-list.component.html',
  styleUrl: './article-list.component.scss'
})
export class ArticleListComponent {
  private articlesService = inject(ArticlesService);
  
  readonly articles = computed(() => this.articlesService.getAll());
  readonly hasArticles = computed(() => this.articles().length > 0);

  deleteArticle(article: Article): void {
    if (confirm(`Удалить статью "${article.title}"?`)) {
      this.articlesService.delete(article.id);
    }
  }
}
