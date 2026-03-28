/**
 * Ключи для localStorage
 */
export const STORAGE_KEYS = {
  ARTICLES: 'unadesk_articles',
  ANNOTATIONS_PREFIX: 'unadesk_annotations_'
} as const;

/**
 * Получает ключ localStorage для аннотаций статьи
 */
export function getAnnotationsStorageKey(articleId: string): string {
  return `${STORAGE_KEYS.ANNOTATIONS_PREFIX}${articleId}`;
}
