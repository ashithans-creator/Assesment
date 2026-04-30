import express from 'express';
import { generateTestCases } from '../services/ai.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { jiraContent, selectedModel, config, promptType } = req.body;

    if (!jiraContent || !selectedModel) {
      return res.status(400).json({ error: 'jiraContent and selectedModel required' });
    }

    let prompt = `Act as QA Engineer. Generate test cases from below Jira story.
Include functional, negative, and boundary cases.
Keep output clear and structured.

Jira Story:
${jiraContent}`;

    if (promptType === 'defect') {
      prompt = `Act as QA Engineer. Create a bug report from below issue.
Include:
- Summary
- Steps
- Expected Result
- Actual Result
Keep it short and structured.

Issue Context:
${jiraContent}`;
    }

    const testCases = await generateTestCases(prompt, selectedModel, config || {});
    res.json({ testCases });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;