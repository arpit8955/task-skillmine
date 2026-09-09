import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined', {
  skip: (req) => req.path === '/api/health',
}));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
