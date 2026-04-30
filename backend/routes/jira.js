import express from 'express';

const router = express.Router();

router.get('/jira/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { jiraDomain, jiraEmail, jiraToken } = req.query;

    if (!jiraDomain || !jiraEmail || !jiraToken) {
      return res.status(400).json({ error: 'Jira credentials required: jiraDomain, jiraEmail, jiraToken' });
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const rawDomain = jiraDomain.trim();
    const domainHost = rawDomain
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/\.atlassian\.net$/i, '');
    const url = `https://${domainHost}.atlassian.net/rest/api/3/issue/${ticketId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.error('Jira API response:', response.status, bodyText);
      const message = bodyText
        ? `Jira API error ${response.status}: ${bodyText}`
        : `Jira API error ${response.status}`;
      return res.status(502).json({ error: message });
    }

    const data = await response.json();
    const description = extractJiraFieldText(data.fields.description);
    const acceptanceCriteria =
      data.fields.customfield_10020 ||
      data.fields.customfield_10021 ||
      extractAcceptanceCriteria(description);

    const issue = {
      title: data.fields.summary,
      description,
      acceptanceCriteria: acceptanceCriteria || 'Not specified'
    };

    res.json(issue);
  } catch (error) {
    console.error('Jira fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

function extractJiraFieldText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field
      .map(extractJiraFieldText)
      .filter(Boolean)
      .join('\n');
  }
  if (typeof field === 'object') {
    if (field.type === 'text') {
      return field.text || '';
    }
    if (field.content) {
      return extractJiraFieldText(field.content);
    }
    return Object.values(field)
      .map(extractJiraFieldText)
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function extractAcceptanceCriteria(text) {
  const marker = 'acceptance criteria';
  const lower = text.toLowerCase();
  const index = lower.indexOf(marker);
  if (index === -1) return '';
  const after = text.slice(index + marker.length);
  return after.trim();
}

router.post('/jira/defect', async (req, res) => {
  try {
    const { summary, description, steps, expectedResult, actualResult, severity, priority, jiraDomain, jiraEmail, jiraToken, projectKey, issueType } = req.body;

    if (!jiraDomain || !jiraEmail || !jiraToken || !projectKey || !summary) {
      return res.status(400).json({ error: 'Missing required fields or Jira credentials' });
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const rawDomain = jiraDomain.trim();
    const domainHost = rawDomain
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/\.atlassian\.net$/i, '');
    
    const url = `https://${domainHost}.atlassian.net/rest/api/3/issue`;

    const fullDescription = `${description ? description + '\n\n' : ''}Steps:
${steps || ''}

Expected Result:
${expectedResult || ''}

Actual Result:
${actualResult || ''}`;

    // Note: This uses Jira REST API v3 format for description (Atlassian Document Format)
    // For simplicity, falling back to basic text content format which is standard for v3.
    const body = {
      fields: {
        project: {
          key: projectKey
        },
        summary: summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: fullDescription
                }
              ]
            }
          ]
        },
        issuetype: {
          name: issueType || "Bug"
        },
        priority: {
          name: priority || "Medium"
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.error('Jira API error creating defect:', response.status, bodyText);
      return res.status(502).json({ error: `Jira API error ${response.status}: ${bodyText}` });
    }

    const data = await response.json();
    res.json({ success: true, key: data.key, id: data.id });
  } catch (error) {
    console.error('Error creating Jira defect:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;