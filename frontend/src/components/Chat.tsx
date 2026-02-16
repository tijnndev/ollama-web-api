import React, { useState, useRef } from 'react';
import { streamGenerate, listOllamaModels, validateApiKey } from '../api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  images?: string[]; // base64 data URLs for attached images
};

const Chat: React.FC = () => {
  const [model, setModel] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string>(
    (localStorage.getItem('api_key') || localStorage.getItem('token') || '') as string
  );
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [validating, setValidating] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Queue incoming chunks (these are typically short fragments/words)
  // Each item pairs the assistant message id with the chunk to append
  const chunkQueueRef = useRef<Array<{ id: string; chunk: string }>>([]);
  const animatingRef = useRef<boolean>(false);
  const wordDelay = 30; // ms between words/chunks (faster for smooth ChatGPT-like typing)

  React.useEffect(() => {
    // load available models
    (async () => {
      try {
        const data = await listOllamaModels();
        const modelsArray = Array.isArray(data) ? data : (data && (data.models || data)) || [];
        if (Array.isArray(modelsArray) && modelsArray.length > 0) {
          setModels(modelsArray as any[]);
          if (!model) setModel(modelsArray[0].name || '');
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  };

  const pushUserMessage = async (text: string, attachedFiles: File[]) => {
    // Convert files to base64 data URLs for display
    const imagePromises = attachedFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    
    const images = await Promise.all(imagePromises);
    
    const msg: Message = { 
      id: String(Date.now()) + Math.random(), 
      role: 'user', 
      text,
      images: images.length > 0 ? images : undefined
    };
    setMessages((m) => [...m, msg]);
    // scroll after a tick
    setTimeout(scrollToBottom, 50);
  };

  const pushAssistantMessage = () => {
    const msg: Message = { id: String(Date.now()) + Math.random(), role: 'assistant', text: '', streaming: true };
    setMessages((m) => [...m, msg]);
    setTimeout(scrollToBottom, 50);
    return msg.id;
  };

  const appendToAssistant = (id: string, text: string) => {
    setMessages((m) => {
      const copy = m.slice();
      const idx = copy.findIndex((x) => x.id === id);
      if (idx !== -1) {
        copy[idx] = { ...copy[idx], text: copy[idx].text + text };
      }
      return copy;
    });
    scrollToBottom();
  };

  const setAssistantStreaming = (id: string, streaming: boolean) => {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, streaming } : x)));
  };

  const enqueueChunk = (id: string, chunk: string) => {
    if (!chunk) return;
    chunkQueueRef.current.push({ id, chunk });
    if (!animatingRef.current) {
      animatingRef.current = true;
      void processQueue();
    }
  };

  const processQueue = async () => {
    // append each queued chunk (word) as-is with a short delay between chunks
    while (chunkQueueRef.current.length > 0) {
      const item = chunkQueueRef.current.shift()!;
      const { id, chunk } = item;
      
      // Just append to the assistant message - it should already exist from handleSend
      appendToAssistant(id, chunk);
      
      // pause between words/chunks
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, wordDelay));
    }
    animatingRef.current = false;
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setApiKey(v);
    try {
      localStorage.setItem('api_key', v);
    } catch (e) {
      // ignore storage errors
    }
    setApiKeyValid(null);
  };

  const handleValidate = async () => {
    if (!apiKey) return;
    setValidating(true);
    try {
      const res = await validateApiKey(apiKey);
      setApiKeyValid(!!res?.valid);
    } catch (err) {
      setApiKeyValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSend = async () => {
    if (!apiKey) {
      alert('Missing API key. Please paste your project API key in the field above.');
      return;
    }
    if (!prompt || prompt.trim() === '') return;

    // Clear prompt and files immediately after sending
    const currentPrompt = prompt;
    const currentFiles = files;
    setPrompt('');
    setFiles([]);

    // Push user message with images and assistant placeholder
    await pushUserMessage(currentPrompt, currentFiles);
    const assistantId = pushAssistantMessage();
    setIsStreaming(true);

    try {
      await streamGenerate(apiKey, model || '', currentPrompt, currentFiles, (chunk) => {
        // enqueue each fragment (word/partial) to be appended word-by-word
        enqueueChunk(assistantId, chunk);
      });
    } catch (err: any) {
      appendToAssistant(assistantId, '\n[Error] ' + err.message);
    } finally {
      setAssistantStreaming(assistantId, false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-window">
        <div className="chat-header">
          <h2>Chat</h2>
          <div className="chat-controls">
            <label>
              API Key
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Project API Key"
                  className="input"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={() => setApiKeyVisible((v) => !v)} className="button" style={{ padding: '8px 10px' }}>
                  {apiKeyVisible ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={handleValidate} className="button" style={{ padding: '8px 10px' }} disabled={validating || !apiKey}>
                  {validating ? 'Checking...' : 'Validate'}
                </button>
              </div>
              <div style={{ marginTop: 6 }}>
                {apiKeyValid === true && <span style={{ color: '#10b981', fontWeight: 600 }}>Valid key</span>}
                {apiKeyValid === false && <span style={{ color: '#ff6b7d', fontWeight: 600 }}>Invalid key</span>}
              </div>
            </label>

            <label>
              Model
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                <option value="">(choose)</option>
                {models.map((m: any) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div ref={messagesRef} className="chat-messages-scroll">
          {messages.length === 0 && <div className="empty-state">Send a message to start the conversation.</div>}
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="message-bubble">
                {m.images && m.images.length > 0 && (
                  <div className="message-images">
                    {m.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt={`Attachment ${idx + 1}`} 
                        className="message-image"
                      />
                    ))}
                  </div>
                )}
                <div className="message-text">{m.text || (m.streaming ? '' : '')}</div>
                {m.streaming && <div className="typing-indicator"><span></span><span></span><span></span></div>}
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input-container">
          {files.length > 0 && (
            <div className="attachments-preview">
              {files.map((f, i) => (
                <span key={i} className="attachment-pill">
                  {f.name}
                  <button 
                    onClick={() => removeFile(i)} 
                    className="remove-attachment"
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="chat-input-wrapper">
            <label className="file-input-label" htmlFor="file-upload">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFiles}
                style={{ display: 'none' }}
              />
            </label>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message"
              rows={1}
              className="chat-textarea"
            />
            
            <button 
              onClick={handleSend} 
              disabled={isStreaming || !prompt.trim()} 
              className="send-button"
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
