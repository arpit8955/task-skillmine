import mongoose from 'mongoose';

const knowledgeArticleSchema = new mongoose.Schema({
  articleId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true, index: true },
  content: { type: String, required: true },
  tags: [String],
}, { timestamps: true });

knowledgeArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });

export default mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
