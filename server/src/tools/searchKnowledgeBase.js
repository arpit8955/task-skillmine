import { KnowledgeArticle } from '../models/index.js';

export const definition = {
  type: 'function',
  function: {
    name: 'search_knowledge_base',
    description: 'Search the support knowledge base for relevant articles about policies, procedures, and common issues. Use this to find company policies on refunds, shipping, compensation, etc.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant knowledge base articles',
        },
        category: {
          type: 'string',
          description: 'Optional category filter (e.g., refunds, shipping, returns, compensation)',
        },
      },
      required: ['query'],
    },
  },
};

export async function execute({ query, category }) {
  if (!query || typeof query !== 'string') {
    throw new Error('Valid query is required');
  }

  let filter = {};
  if (category) {
    filter.category = { $regex: category, $options: 'i' };
  }

  const articles = await KnowledgeArticle.find(
    { ...filter, $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(3)
    .lean();

  if (articles.length === 0) {
    const fallback = await KnowledgeArticle.find(filter).limit(3).lean();
    return {
      found: fallback.length > 0,
      query,
      articles: fallback.map(a => ({
        articleId: a.articleId,
        title: a.title,
        category: a.category,
        content: a.content.substring(0, 500),
      })),
    };
  }

  return {
    found: true,
    query,
    articles: articles.map(a => ({
      articleId: a.articleId,
      title: a.title,
      category: a.category,
      content: a.content.substring(0, 500),
    })),
  };
}
