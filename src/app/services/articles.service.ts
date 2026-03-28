import { Injectable, signal, computed } from '@angular/core';
import { Article, NewArticle } from '../models/article';
import { STORAGE_KEYS, getAnnotationsStorageKey } from '../constants/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.ARTICLES;

@Injectable({
  providedIn: 'root'
})
export class ArticlesService {
  private articlesSignal = signal<Article[]>(this.loadFromStorage());
  
  readonly articles = computed(() => this.articlesSignal());
  readonly articlesCount = computed(() => this.articlesSignal().length);

  private loadFromStorage(): Article[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.articlesSignal()));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  getAll(): Article[] {
    return this.articlesSignal();
  }

  getById(id: string): Article | undefined {
    return this.articlesSignal().find(article => article.id === id);
  }

  create(newArticle: NewArticle): Article {
    const now = Date.now();
    const article: Article = {
      id: this.generateId(),
      title: newArticle.title,
      content: newArticle.content,
      createdAt: now,
      updatedAt: now
    };
    
    this.articlesSignal.update(articles => [article, ...articles]);
    this.saveToStorage();
    return article;
  }

  update(id: string, updates: Partial<NewArticle>): Article | null {
    let updatedArticle: Article | null = null;
    
    this.articlesSignal.update(articles => 
      articles.map(article => {
        if (article.id === id) {
          updatedArticle = {
            ...article,
            ...updates,
            updatedAt: Date.now()
          };
          return updatedArticle;
        }
        return article;
      })
    );
    
    if (updatedArticle) {
      this.saveToStorage();
    }
    
    return updatedArticle;
  }

  delete(id: string): boolean {
    const exists = this.articlesSignal().some(article => article.id === id);
    if (exists) {
      this.articlesSignal.update(articles => articles.filter(article => article.id !== id));
      this.saveToStorage();

      // Удаляем аннотации статьи
      localStorage.removeItem(getAnnotationsStorageKey(id));
    }
    return exists;
  }
}
