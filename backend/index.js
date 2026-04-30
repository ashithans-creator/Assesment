import express from 'express';
import cors from 'cors';
import jiraRouter from './routes/jira.js';
import generateRouter from './routes/generate.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'QA Buddy backend running', endpoints: ['/api/jira/:ticketId', '/api/generate', '/chat'] });
});

app.use('/api', jiraRouter);
app.use('/api', generateRouter);
app.use('/chat', chatRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`QA Buddy backend running at http://localhost:${PORT}`);
});
