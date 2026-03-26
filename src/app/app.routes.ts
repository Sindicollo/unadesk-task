import { Routes } from '@angular/router';
import { ArticleListComponent } from './components/article-list/article-list.component';
import { ArticleEditorComponent } from './components/article-editor/article-editor.component';
import { ArticleViewComponent } from './components/article-view/article-view.component';

export const routes: Routes = [
  { path: '', component: ArticleListComponent },
  { path: 'new', component: ArticleEditorComponent },
  { path: 'edit/:id', component: ArticleEditorComponent },
  { path: 'article/:id', component: ArticleViewComponent },
  { path: '**', redirectTo: '' }
];
