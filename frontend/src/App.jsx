import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

const initialMessages = [
  {
    role: 'assistant',
    content: 'Hello! I can help with QA questions, test case generation, and defect report creation. Type anything to get started.'
  }
];



const providerOptions = [
  { value: 'ollama', label: 'Ollama (Local)', models: ['phi3:latest', 'mistral', 'llama3'] },
  { value: 'openai', label: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'] },
  { value: 'gemini', label: 'Gemini', models: ['gemini-pro', 'gemini-pro-vision'] },
  { value: 'groq', label: 'Groq', models: ['groq-gpt-1.5', 'groq-gpt-2'] }
];

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'ollama',
    model: 'phi3:latest',
    openaiKey: '',
    openaiModel: 'gpt-4',
    geminiKey: 'gemini-pro',
    groqKey: '',
    ollamaModel: 'phi3:latest',
    jiraDomain: '',
    jiraEmail: '',
    jiraToken: '',
    jiraLLMProvider: 'groq',
    jiraLLMModel: 'groq-gpt-1.5'
  });
  const [jiraTicket, setJiraTicket] = useState('');
  const [jiraContent, setJiraContent] = useState('');
  const [jiraTestCases, setJiraTestCases] = useState('');
  const [jiraFetching, setJiraFetching] = useState(false);
  const [jiraGenerating, setJiraGenerating] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState('none');
  const [jiraError, setJiraError] = useState('');
  const [defectSummary, setDefectSummary] = useState('');
  const [defectSteps, setDefectSteps] = useState('');
  const [defectExpectedResult, setDefectExpectedResult] = useState('');
  const [defectActualResult, setDefectActualResult] = useState('');
  const [defectSeverity, setDefectSeverity] = useState('Medium');
  const [defectPriority, setDefectPriority] = useState('Medium');
  const [defectGenerating, setDefectGenerating] = useState(false);
  const [defectCreating, setDefectCreating] = useState(false);
  const [defectSuccess, setDefectSuccess] = useState('');
  const [jiraTab, setJiraTab] = useState('testCases');
  const [defectProjectKey, setDefectProjectKey] = useState('PROJ');
  const [defectIssueType, setDefectIssueType] = useState('Bug');
  const [defectContext, setDefectContext] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedText, setAttachedText] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('qaAssistantHistory');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setChats(parsed);
        setCurrentChatId(parsed[0].id);
        setMessages(parsed[0].messages);
      }
    } catch (err) {
      console.warn('Unable to load chat history', err);
    }
  }, []);

  useEffect(() => {
    try {
      const savedSettings = window.localStorage.getItem('qaAssistantSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      const savedIntegration = window.localStorage.getItem('qaAssistantIntegration');
      if (savedIntegration) {
        setActiveIntegration(savedIntegration);
      }
    } catch (err) {
      console.warn('Unable to load settings', err);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('qaAssistantIntegration', activeIntegration);
  }, [activeIntegration]);

  useEffect(() => {
    const providerData = providerOptions.find(p => p.value === settings.provider);
    if (!providerData) return;

    if (settings.provider === 'openai' || settings.provider === 'ollama') {
      return;
    }

    if (!providerData.models.includes(settings.model)) {
      setSettings(prev => ({ ...prev, model: providerData.models[0] }));
    }
  }, [settings.provider]);

  useEffect(() => {
    const providerData = providerOptions.find(p => p.value === settings.jiraLLMProvider);
    if (!providerData) return;

    if (!providerData.models.includes(settings.jiraLLMModel)) {
      setSettings(prev => ({ ...prev, jiraLLMModel: providerData.models[0] }));
    }
  }, [settings.jiraLLMProvider, settings.jiraLLMModel]);

  useEffect(() => {
    window.localStorage.setItem('qaAssistantHistory', JSON.stringify(chats));
  }, [chats]);

  const buildTitle = (messageList) => {
    const firstUser = messageList.find((item) => item.role === 'user');
    if (!firstUser) return 'New chat';
    const trimmed = firstUser.content.trim();
    return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
  };

  const saveChat = (messageList) => {
    const title = buildTitle(messageList);
    const timestamp = Date.now();

    if (currentChatId) {
      setChats((prev) => {
        const updated = prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: messageList, title, updatedAt: timestamp }
            : chat
        );
        const active = updated.find((chat) => chat.id === currentChatId);
        return [active, ...updated.filter((chat) => chat.id !== currentChatId)];
      });
      return;
    }

    const newChat = {
      id: String(timestamp),
      title,
      messages: messageList,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const handleSelectChat = (id) => {
    const selected = chats.find((chat) => chat.id === id);
    if (!selected) return;
    setCurrentChatId(id);
    setMessages(selected.messages);
    setError('');
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages(initialMessages);
    setMode('qa');
    setInput('');
    setError('');
  };

  const handleClearHistory = () => {
    window.localStorage.removeItem('qaAssistantHistory');
    setChats([]);
    handleNewChat();
  };

  const handleSaveSettings = () => {
    window.localStorage.setItem('qaAssistantSettings', JSON.stringify(settings));
    setShowSettings(false);
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getRequestProvider = () => {
    return settings.provider === 'jira'
      ? (settings.jiraLLMProvider || 'groq')
      : settings.provider;
  };

  const getRequestModel = (provider) => {
    if (provider === 'openai') return settings.provider === 'jira' ? settings.jiraLLMModel : settings.openaiModel;
    if (provider === 'ollama') return settings.provider === 'jira' ? settings.jiraLLMModel : settings.ollamaModel;
    if (provider === 'groq') return settings.provider === 'jira' ? settings.jiraLLMModel : settings.model;
    if (provider === 'gemini') return settings.provider === 'jira' ? settings.jiraLLMModel : settings.model;
    return settings.model;
  };

  const buildJiraFetchParams = () => {
    const params = new URLSearchParams();
    if (settings.jiraDomain) params.append('jiraDomain', settings.jiraDomain);
    if (settings.jiraEmail) params.append('jiraEmail', settings.jiraEmail);
    if (settings.jiraToken) params.append('jiraToken', settings.jiraToken);
    return params.toString();
  };

  const fetchJiraTicket = async () => {
    const ticketId = jiraTicket.trim();
    if (!ticketId) {
      setJiraError('Enter a Jira ticket ID.');
      return;
    }

    if (!settings.jiraDomain || !settings.jiraEmail || !settings.jiraToken) {
      setJiraError('Jira domain, email, and token are required.');
      return;
    }

    setJiraError('');
    setJiraFetching(true);
    setJiraTestCases('');

    try {
      const query = buildJiraFetchParams();
      const response = await fetch(`http://localhost:4000/api/jira/${encodeURIComponent(ticketId)}?${query}`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Jira fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const filledContent = `Title: ${data.title}\n\nDescription:\n${data.description}\n\nAcceptance Criteria:\n${data.acceptanceCriteria}`;
      setJiraContent(filledContent);
    } catch (err) {
      setJiraError(err.message || 'Unable to fetch Jira ticket.');
    } finally {
      setJiraFetching(false);
    }
  };

  const generateJiraTestCases = async () => {
    if (!jiraContent.trim()) {
      setJiraError('Please fetch or enter Jira content first.');
      return;
    }

    setJiraError('');
    setJiraGenerating(true);

    try {
      const provider = getRequestProvider();
      const model = getRequestModel(provider);
      const config = {
        openaiKey: settings.openaiKey,
        openaiModel: settings.openaiModel,
        geminiKey: settings.geminiKey,
        groqKey: settings.groqKey,
        ollamaModel: settings.ollamaModel,
        groqModel: provider === 'groq' ? (settings.provider === 'jira' ? settings.jiraLLMModel : settings.model) : undefined,
        jiraLLMModel: settings.jiraLLMModel
      };

      const response = await fetch('http://localhost:4000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraContent,
          selectedModel: provider,
          config
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Generate request failed.');
      }

      const data = await response.json();
      setJiraTestCases(data.testCases || 'No test cases returned.');
    } catch (err) {
      setJiraError(err.message || 'Unable to generate test cases.');
    } finally {
      setJiraGenerating(false);
    }
  };

  const downloadExcel = () => {
    if (!jiraTestCases) return;

    // Split by double newlines to separate distinct test case blocks roughly
    const blocks = jiraTestCases.split(/\n\n+/);
    let data = [['Test Case Reference', 'Details']];
    
    blocks.forEach((block, index) => {
      if (block.trim()) {
        data.push([`TC-${index + 1}`, block.trim()]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    // Set column widths to make it readable
    worksheet['!cols'] = [{ wch: 20 }, { wch: 100 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");
    
    XLSX.writeFile(workbook, "Jira_Test_Cases.xlsx");
  };

  const generateJiraDefect = async () => {
    if (!defectContext.trim() && !jiraContent.trim()) {
      setJiraError('Please provide context for the defect generation.');
      return;
    }

    const contentToUse = defectContext.trim() ? defectContext : jiraContent;

    setJiraError('');
    setDefectSuccess('');
    setDefectGenerating(true);

    try {
      const provider = getRequestProvider();
      const model = getRequestModel(provider);
      const config = {
        openaiKey: settings.openaiKey,
        openaiModel: settings.openaiModel,
        geminiKey: settings.geminiKey,
        groqKey: settings.groqKey,
        ollamaModel: settings.ollamaModel,
        groqModel: provider === 'groq' ? (settings.provider === 'jira' ? settings.jiraLLMModel : settings.model) : undefined,
        jiraLLMModel: settings.jiraLLMModel
      };

      const response = await fetch('http://localhost:4000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraContent: contentToUse,
          selectedModel: provider,
          config,
          promptType: 'defect'
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Generate request failed.');
      }

      const data = await response.json();
      const rawText = data.testCases || '';
      
      // Attempt to parse out basic fields if present
      const summaryMatch = rawText.match(/Summary:?\s*(.*?)(?=\n|$)/i);
      if (summaryMatch) setDefectSummary(summaryMatch[1].trim());
      else setDefectSummary('Auto-generated Defect Summary');

      const stepsMatch = rawText.match(/Steps:?\s*([\s\S]*?)(?=\n-?\s*Expected Result|$)/i);
      if (stepsMatch) setDefectSteps(stepsMatch[1].trim());

      const expMatch = rawText.match(/Expected Result:?\s*([\s\S]*?)(?=\n-?\s*Actual Result|$)/i);
      if (expMatch) setDefectExpectedResult(expMatch[1].trim());

      const actMatch = rawText.match(/Actual Result:?\s*([\s\S]*?)(?=$)/i);
      if (actMatch) setDefectActualResult(actMatch[1].trim());

    } catch (err) {
      setJiraError(err.message || 'Unable to generate defect details.');
    } finally {
      setDefectGenerating(false);
    }
  };

  const createJiraDefect = async () => {
    if (!defectSummary.trim()) {
      setJiraError('Defect summary is required.');
      return;
    }
    if (!defectProjectKey.trim()) {
      setJiraError('Project key is required.');
      return;
    }

    setJiraError('');
    setDefectSuccess('');
    setDefectCreating(true);

    try {
      const response = await fetch('http://localhost:4000/api/jira/defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: defectSummary,
          steps: defectSteps,
          expectedResult: defectExpectedResult,
          actualResult: defectActualResult,
          severity: defectSeverity,
          priority: defectPriority,
          jiraDomain: settings.jiraDomain,
          jiraEmail: settings.jiraEmail,
          jiraToken: settings.jiraToken,
          projectKey: defectProjectKey.toUpperCase(),
          issueType: defectIssueType.trim()
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Create defect request failed.');
      }

      const data = await response.json();
      setDefectSuccess(`Defect created successfully: ${data.key}`);
    } catch (err) {
      setJiraError(err.message || 'Unable to create defect.');
    } finally {
      setDefectCreating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      setAttachedFile(file);
      setAttachedText(data.text);
    } catch (err) {
      console.error(err);
      setError('Error uploading file: ' + err.message);
    } finally {
      setLoading(false);
      // Reset input value so same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed && !attachedText) return;

    let finalContent = trimmed;
    if (attachedText) {
      finalContent = `Requirement Document Content:\n---\n${attachedText}\n---\n\nUser Question: ${trimmed || 'Please analyze this document and generate test cases.'}`;
    }

    const userMessage = { role: 'user', content: trimmed || 'File attached' };
    const updatedMessages = [...messages, userMessage];
    
    // We send the full context (with doc content) to the AI, but only show the user's text in UI
    const apiMessages = [...messages, { role: 'user', content: finalContent }];

    setMessages(updatedMessages);
    setInput('');
    setAttachedFile(null);
    setAttachedText('');
    setError('');
    setLoading(true);

    try {
      const requestProvider = settings.provider;
      const requestModel = settings.provider === 'openai' ? settings.openaiModel : settings.provider === 'ollama' ? settings.ollamaModel : settings.model;
      const requestApiKey = requestProvider === 'openai' ? settings.openaiKey : requestProvider === 'gemini' ? settings.geminiKey : requestProvider === 'groq' ? settings.groqKey : undefined;

      const response = await fetch('http://localhost:4000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          provider: requestProvider,
          apiKey: requestApiKey,
          model: requestModel
        })
      });

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || 'Server error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line === '' || line === '[DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.choices && json.choices[0]?.delta?.content) {
                assistantText += json.choices[0].delta.content;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: 'assistant', content: assistantText };
                  return copy;
                });
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }

      // Save the complete conversation once at the end
      const finalMessages = [...updatedMessages, { role: 'assistant', content: assistantText }];
      saveChat(finalMessages);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Chat request failed.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">QA</div>
          <div>
            <h2>QA Assistant</h2>
            <p>Test cases, bug reports, and QA guidance.</p>
          </div>
        </div>

        <button className="new-chat" onClick={handleNewChat}>
          + New chat
        </button>

        <div className="sidebar-history">
          <div className="sidebar-history-header">
            <span>History</span>
            <button type="button" className="clear-history" onClick={handleClearHistory}>
              Clear
            </button>
          </div>

          <div className="history-list">
            {chats.length === 0 ? (
              <p className="empty-history">No saved chats yet.</p>
            ) : (
              chats.map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <div>{chat.title}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      <main className="chat-panel">
        <div className="chat-header">
          <div>
            <h1>QA-AI Assistant</h1>
            <p>Ask questions, generate test cases, or create defect reports.</p>
            <p className="model-info">
              Model: {settings.provider === 'openai' ? settings.openaiModel : settings.provider === 'ollama' ? settings.ollamaModel : settings.model} ({settings.provider})
            </p>
          </div>
          <div className="header-controls">
            <button className="settings-btn" onClick={() => setShowSettings(true)}>Settings</button>
            <div className="control-group">
              <label>Integration:</label>
              <select value={activeIntegration} onChange={(e) => setActiveIntegration(e.target.value)}>
                <option value="none">None</option>
                <option value="jira">Jira</option>
              </select>
            </div>
          </div>
        </div>

        {activeIntegration === 'jira' ? (
          <div className="jira-panel">
            <div className="jira-top">
              <input
                type="text"
                value={jiraTicket}
                onChange={(e) => setJiraTicket(e.target.value)}
                placeholder="Jira Ticket ID (e.g. PROJ-123)"
              />
              <button type="button" onClick={fetchJiraTicket} disabled={jiraFetching || !jiraTicket.trim()}>
                {jiraFetching ? 'Fetching…' : 'Fetch Jira Ticket'}
              </button>
            </div>

            <div className="jira-tabs">
              <button 
                type="button" 
                className={`tab-btn ${jiraTab === 'testCases' ? 'active' : ''}`} 
                onClick={() => setJiraTab('testCases')}
              >
                Test Cases
              </button>
              <button 
                type="button" 
                className={`tab-btn ${jiraTab === 'defect' ? 'active' : ''}`} 
                onClick={() => setJiraTab('defect')}
              >
                Create Defect
              </button>
            </div>

            {jiraTab === 'testCases' && (
              <div className="jira-body">
                <div className="jira-editor">
                  <div className="panel-heading">Jira Content (Editable)</div>
                  <textarea
                    value={jiraContent}
                    onChange={(e) => setJiraContent(e.target.value)}
                    placeholder="Jira data will appear here..."
                    rows="10"
                    disabled={jiraFetching}
                  />
                  <button type="button" onClick={generateJiraTestCases} disabled={jiraGenerating || !jiraContent.trim()}>
                    {jiraGenerating ? 'Generating…' : 'Generate Test Cases'}
                  </button>
                </div>

                <div className="jira-output">
                  <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Generated Test Cases</span>
                    {jiraTestCases && (
                      <button 
                        type="button" 
                        onClick={downloadExcel} 
                        style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#10b981' }}
                      >
                        Download Excel
                      </button>
                    )}
                  </div>
                  <div className="output-box">
                    {jiraTestCases ? (
                      <pre>{jiraTestCases}</pre>
                    ) : (
                      <p>No test cases generated yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {jiraTab === 'defect' && (
              <div className="jira-defect-panel">
                <div className="defect-form">
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Project Key</label>
                      <input 
                        type="text" 
                        placeholder="e.g., PROJ" 
                        value={defectProjectKey} 
                        onChange={(e) => setDefectProjectKey(e.target.value)} 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Issue Type</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Bug" 
                        value={defectIssueType} 
                        onChange={(e) => setDefectIssueType(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Context for AI Defect Generation (Optional)</label>
                    <textarea 
                      placeholder="Paste test failure or bug details here, or leave blank to use the fetched Jira ticket..." 
                      rows="3" 
                      value={defectContext} 
                      onChange={(e) => setDefectContext(e.target.value)} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="button" onClick={generateJiraDefect} disabled={defectGenerating || (!defectContext.trim() && !jiraContent.trim())} className="generate-defect-btn">
                        {defectGenerating ? 'Generating...' : 'Generate Defect using AI'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Summary</label>
                    <input type="text" placeholder="Summary (title)" value={defectSummary} onChange={(e) => setDefectSummary(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label>Steps to Reproduce</label>
                    <textarea placeholder="Steps to Reproduce" rows="3" value={defectSteps} onChange={(e) => setDefectSteps(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label>Expected Result</label>
                    <textarea placeholder="Expected Result" rows="2" value={defectExpectedResult} onChange={(e) => setDefectExpectedResult(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label>Actual Result</label>
                    <textarea placeholder="Actual Result" rows="2" value={defectActualResult} onChange={(e) => setDefectActualResult(e.target.value)} />
                  </div>
                  
                  <div className="dropdowns-group">
                    <label>
                      Severity:
                      <select value={defectSeverity} onChange={(e) => setDefectSeverity(e.target.value)}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </label>
                    <label>
                      Priority:
                      <select value={defectPriority} onChange={(e) => setDefectPriority(e.target.value)}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </label>
                  </div>

                  <button type="button" onClick={createJiraDefect} disabled={defectCreating || !defectSummary.trim()} className="create-defect-btn">
                    {defectCreating ? 'Creating Defect...' : 'Create Defect in Jira'}
                  </button>
                  
                  {defectSuccess && <p className="success-message">{defectSuccess}</p>}
                </div>
              </div>
            )}

            {jiraError && <p className="error" style={{ color: '#ef4444', marginTop: '10px' }}>{jiraError}</p>}
          </div>
        ) : (
          <> 
            <div className="chat-window">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message..."
                rows="4"
                disabled={loading}
              />

              <div className="composer-footer">
                <div className="composer-actions">
                  <button 
                    type="button" 
                    className="attach-btn" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Requirement Document"
                  >
                    📎
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".pdf,.txt,.md,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  {attachedFile && (
                    <div className="file-chip">
                      <span>{attachedFile.name}</span>
                      <button type="button" onClick={() => { setAttachedFile(null); setAttachedText(''); }}>×</button>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading || (!input.trim() && !attachedText)}>
                  {loading ? 'Streaming…' : 'Send'}
                </button>
              </div>

              {error && <p className="error">{error}</p>}
            </form>
          </>
        )}

        {showSettings && (
          <div className="settings-modal">
            <div className="settings-content">
              <h2>Model Settings</h2>
              <label>
                Provider:
                <select value={settings.provider} onChange={(e) => handleSettingsChange('provider', e.target.value)}>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Model:
                <select
                  value={settings.provider === 'openai' ? settings.openaiModel : settings.provider === 'ollama' ? settings.ollamaModel : settings.model}
                  onChange={(e) => {
                    if (settings.provider === 'openai') {
                      handleSettingsChange('openaiModel', e.target.value);
                    } else if (settings.provider === 'ollama') {
                      handleSettingsChange('ollamaModel', e.target.value);
                    } else {
                      handleSettingsChange('model', e.target.value);
                    }
                  }}
                >
                  {providerOptions.find(p => p.value === settings.provider)?.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              {settings.provider === 'openai' && (
                <label>
                  OpenAI API Key:
                  <input
                    type="password"
                    value={settings.openaiKey}
                    onChange={(e) => handleSettingsChange('openaiKey', e.target.value)}
                    placeholder="Enter OpenAI API key"
                  />
                </label>
              )}
              {settings.provider === 'gemini' && (
                <label>
                  Gemini API Key:
                  <input
                    type="password"
                    value={settings.geminiKey}
                    onChange={(e) => handleSettingsChange('geminiKey', e.target.value)}
                    placeholder="Enter Gemini API key"
                  />
                </label>
              )}
              {settings.provider === 'groq' && (
                <label>
                  Groq API Key:
                  <input
                    type="password"
                    value={settings.groqKey}
                    onChange={(e) => handleSettingsChange('groqKey', e.target.value)}
                    placeholder="Enter Groq API key"
                  />
                </label>
              )}
              {settings.provider === 'ollama' && (
                <label>
                  Ollama Model:
                  <input
                    type="text"
                    value={settings.ollamaModel}
                    onChange={(e) => handleSettingsChange('ollamaModel', e.target.value)}
                    placeholder="phi3:latest or mistral"
                  />
                </label>
              )}
              <div className="setting-group jira-settings">
                <h3>Jira Integration</h3>
                <label>
                  Jira Domain:
                  <input
                    type="text"
                    value={settings.jiraDomain}
                    onChange={(e) => handleSettingsChange('jiraDomain', e.target.value)}
                    placeholder="example.atlassian.net"
                  />
                </label>
                <label>
                  Jira Email:
                  <input
                    type="text"
                    value={settings.jiraEmail}
                    onChange={(e) => handleSettingsChange('jiraEmail', e.target.value)}
                    placeholder="email@example.com"
                  />
                </label>
                <label>
                  Jira API Token:
                  <input
                    type="password"
                    value={settings.jiraToken}
                    onChange={(e) => handleSettingsChange('jiraToken', e.target.value)}
                    placeholder="Enter Jira API token"
                  />
                </label>
              </div>
                
              <div className="settings-actions">
                <button onClick={handleSaveSettings}>Save</button>
                <button onClick={() => setShowSettings(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
