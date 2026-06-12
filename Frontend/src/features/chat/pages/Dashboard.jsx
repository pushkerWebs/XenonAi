import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';
import { useChat } from '../hooks/useChat';
import remarkGfm from 'remark-gfm';
import * as framerMotion from 'framer-motion';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/hooks/useAuth';
import { resetChatState } from '../chat.slice';
import { disconnectSocket } from '../service/chat.socket';

const MODEL_OPTIONS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'mistral-small-latest', label: 'Mistral Small Latest' },
];

const { motion: Motion, AnimatePresence } = framerMotion;

// Helper function to format a display name
const formatDisplayName = (user) => {
  if (user?.username && user.username.trim()) {
    return user.username.trim();
  }

  if (!user?.email) {
    return 'User';
  }

  const namePart = user.email.split('@')[0];
  const parts = namePart.split(/[._-]/);
  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
};

// Enhanced markdown components with better table and text styling
const MarkdownComponents = ({ isDarkMode }) => ({
  p: ({ children }) => <p className='mb-3 last:mb-0 text-[15px] leading-relaxed tracking-wide'>{children}</p>,
  ul: ({ children }) => <ul className='mb-3 list-disc pl-5 space-y-1 text-[15px] leading-relaxed'>{children}</ul>,
  ol: ({ children }) => <ol className='mb-3 list-decimal pl-5 space-y-1 text-[15px] leading-relaxed'>{children}</ol>,
  li: ({ children }) => <li className='mb-1'>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className={`border-l-4 ${isDarkMode ? 'border-gray-500 bg-gray-800/40' : 'border-violet-300 bg-violet-50/60'} pl-4 py-2 my-3 rounded-r-lg italic`}>
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-violet-100 text-gray-800'}`}>{children}</code>;
    }
        return (
          <pre className={`mb-3 overflow-x-auto p-3 rounded-lg text-sm font-mono ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800'} whitespace-pre-wrap wrap-break-word`}>
        <code className={className}>{children}</code>
      </pre>
    );
  },
  pre: ({ children }) => <>{children}</>,
  h1: ({ children }) => <h1 className={`text-2xl font-bold mt-3 mb-2 ${isDarkMode ? 'text-white' : 'text-black'} tracking-tight`}>{children}</h1>,
  h2: ({ children }) => <h2 className={`text-xl font-semibold mt-2 mb-1.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} tracking-tight`}>{children}</h2>,
  h3: ({ children }) => <h3 className={`text-lg font-medium mt-2 mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{children}</h3>,
  h4: ({ children }) => <h4 className={`text-base font-medium mt-2 mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{children}</h4>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-violet-600 hover:text-violet-800'} hover:underline transition-colors`}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{children}</strong>,
  em: ({ children }) => <em className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{children}</em>,
  hr: () => <hr className={`my-2 border-0 h-px w-full ${isDarkMode ? 'bg-gray-700/60' : 'bg-gray-300/70'}`} />,
  table: ({ children }) => (
    <div className={`overflow-x-auto my-4 rounded-xl border-2 shadow-md ${isDarkMode ? 'border-gray-700 shadow-black/20' : 'border-violet-300 shadow-violet-100'}`}>
      <table className="min-w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-violet-600'}`}>
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className={`${isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-violet-100'}`}>
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-violet-50'} transition-colors`}>
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className={`px-4 py-3 text-left font-semibold tracking-wide ${isDarkMode ? 'text-gray-200 border-b border-gray-700' : 'text-white border-b border-violet-500'}`}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className={`px-4 py-2.5 align-top ${isDarkMode ? 'text-gray-300 border-b border-gray-800' : 'text-gray-700 border-b border-violet-100'}`}>
      {children}
    </td>
  ),
});

const TypewriterMarkdown = ({
  content,
  isActive,
  shouldStop,
  onStart,
  onComplete,
  isDarkMode,
}) => {
  const [visibleContent, setVisibleContent] = useState(content);
  const onCompleteRef = useRef(onComplete);
  const onStartRef = useRef(onStart);
  const stopRef = useRef(shouldStop);
  const workerRef = useRef(null);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    stopRef.current = shouldStop;
  }, [shouldStop]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if (!isActive) {
      if (!hasStartedRef.current || hasCompletedRef.current) {
        setVisibleContent(content);
      }
      return;
    }

    hasStartedRef.current = true;
    hasCompletedRef.current = false;
    onStartRef.current?.();

    setVisibleContent('');

    const workerSource = `
      let timerId = null;
      let stopped = false;

      const stopTimer = () => {
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
      };

      self.onmessage = (event) => {
        const data = event.data || {};

        if (data.type === 'stop') {
          stopped = true;
          stopTimer();
          return;
        }

        if (data.type !== 'start') {
          return;
        }

        const text = String(data.content || '');
        const delay = typeof data.delay === 'number' ? data.delay : 12;
        let index = 0;
        stopped = false;
        stopTimer();

        const tick = () => {
          if (stopped) {
            return;
          }

          index += 1;
          self.postMessage({ type: 'tick', index });

          if (index >= text.length) {
            self.postMessage({ type: 'done' });
            stopTimer();
            return;
          }

          timerId = setTimeout(tick, delay);
        };

        if (text.length === 0) {
          self.postMessage({ type: 'done' });
          return;
        }

        tick();
      };
    `;

    const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
    const worker = new Worker(workerUrl);
    workerRef.current = worker;
    URL.revokeObjectURL(workerUrl);

    worker.onmessage = (event) => {
      const data = event.data || {};

      if (stopRef.current) {
        return;
      }

      if (data.type === 'tick') {
        setVisibleContent(content.slice(0, data.index));
        return;
      }

      if (data.type === 'done') {
        hasCompletedRef.current = true;
        setVisibleContent(content);
        onCompleteRef.current?.();
      }
    };

    worker.postMessage({ type: 'start', content, delay: 12 });

    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, [content, isActive]);

  const markdownComponents = MarkdownComponents({ isDarkMode });

  return (
    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
      {visibleContent}
    </ReactMarkdown>
  );
};

const Dashboard = () => {
  const { initializeSocketConnection, handleGetChats, handleOpenChat, handleSendMessage, handleCreateNewChat, handleDeleteChat, handleDeleteMessage, isGenerating, stopGeneration, lastAlert, dismissAlert } = useChat();
  const { handleLogout: logoutUser } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const _isMobileInit = window.innerWidth < 768;
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openChatMenuId, setOpenChatMenuId] = useState(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [locallyDeletedMessageIds, setLocallyDeletedMessageIds] = useState([]);
  const [stoppedStreamingMessageIds, setStoppedStreamingMessageIds] = useState([]);
  const [isTypewriterStreaming, setIsTypewriterStreaming] = useState(false);
  const [activeStreamingMessageId, setActiveStreamingMessageId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [showDeleteChatDropdown, setShowDeleteChatDropdown] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isMobileScreen, setIsMobileScreen] = useState(_isMobileInit);
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const chats = useSelector((state) => state.chat.chats);
  const currentChatId = useSelector((state) => state.chat.currentChatId);
  const currentMessages = useMemo(() => chats[currentChatId]?.messages || [], [chats, currentChatId]);
  const visibleMessages = useMemo(
    () => currentMessages.filter((message) => !message?.id || !locallyDeletedMessageIds.includes(message.id)),
    [currentMessages, locallyDeletedMessageIds]
  );
  const lastUserMessageIndex = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].role === 'user') return i;
    }
    return -1;
  }, [visibleMessages]);
  const currentMessageCount = chats[currentChatId]?.messages?.length || 0;
  const isGenerationActive = isGenerating || isTypewriterStreaming;
  const normalizedAvatar = typeof user?.avatar === 'string' ? user.avatar.trim() : '';
  const formattedUserName = formatDisplayName(user);
  const messagesBottomRef = useRef(null);
  const lastMessageRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typedAssistantMessageIdsRef = useRef(new Set());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteChatDropdown && !event.target.closest('.delete-chat-dropdown')) {
        setShowDeleteChatDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDeleteChatDropdown]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileScreen(mobile);
      // Auto-close sidebar when switching to mobile, auto-open when going desktop
      if (!mobile && !isSidebarOpen) setIsSidebarOpen(true);
      if (mobile && isSidebarOpen) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Re-fetch chats whenever the authenticated user changes (covers first open,
  // page refresh, and the case where handleGetMe finishes after Dashboard mounts).
  useEffect(() => {
    if (!userId) return;
    initializeSocketConnection();
    handleGetChats();
  }, [userId, initializeSocketConnection, handleGetChats]);

 
 

const scrollToLatestMessage = useCallback(() => {
  const container = scrollContainerRef.current;
  const target = lastMessageRef.current;

  if (!container || !target) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const desiredOffset = Math.max(140, Math.round(window.innerHeight * 0.2));
  const nextScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - desiredOffset;

  container.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: "smooth",
  });
}, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      setIsAtBottom(distanceFromBottom < 120);
    };

    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });
    return () => container.removeEventListener('scroll', updateScrollState);
  }, [currentChatId, currentMessages.length]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToLatestMessage();
    });
  }, [currentChatId, currentMessageCount, visibleMessages.length, scrollToLatestMessage]);

  useEffect(() => {
    setStoppedStreamingMessageIds([]);
    setIsTypewriterStreaming(false);
    setActiveStreamingMessageId(null);
  }, [currentChatId]);

  useEffect(() => {
    const focusInput = () => {
      inputRef.current?.focus();
    };

    focusInput();
    requestAnimationFrame(focusInput);
  }, [currentChatId, currentMessages.length]);

  useEffect(() => {
    if (!currentChatId || currentMessages.length === 0) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [currentChatId, currentMessages.length]);

  useEffect(() => {
    const knownMessageIds = new Set(currentMessages.map((message) => message.id).filter(Boolean));
    setLocallyDeletedMessageIds((prev) => prev.filter((messageId) => knownMessageIds.has(messageId)));
  }, [currentMessages]);

  useEffect(() => {
    const closeMenus = () => {
      setOpenChatMenuId(null);
      setOpenMessageMenuId(null);
      setShowUserMenu(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') closeMenus();
    };

    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', closeMenus);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!lastAlert) return;
    const timer = setTimeout(() => dismissAlert(), 8000);
    return () => clearTimeout(timer);
  }, [lastAlert, dismissAlert]);

  const handleFileChange = useCallback((e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setAttachedFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        const filtered = newFiles.filter((f) => !existing.has(`${f.name}-${f.size}`));
        return [...prev, ...filtered].slice(0, 5);
      });
    }
    e.target.value = '';
  }, []);

  const removeAttachedFile = useCallback((index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmitMessage = async (event) => {
    event.preventDefault();
    const trimmedMessage = chatInput.trim();
    if ((!trimmedMessage && attachedFiles.length === 0) || isGenerationActive) return;

    const filesToSend = [...attachedFiles];
    const messageToSend = trimmedMessage || '📎 Please analyze the attached file(s).';

    setChatInput('');
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      await handleSendMessage({
        message: messageToSend,
        chatId: currentChatId,
        model: selectedModel,
        files: filesToSend,
      });
    } catch (error) {
      console.error('Failed to submit message:', error);
      setChatInput((prev) => prev || trimmedMessage);
      setAttachedFiles((prev) => (prev.length === 0 ? filesToSend : prev));
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && (chatInput.trim() || attachedFiles.length > 0) && !isGenerationActive) {
      event.preventDefault();
      handleSubmitMessage(event);
    }
  };

  const handleStopResponse = () => {
    if (isGenerating) stopGeneration();
    if (activeStreamingMessageId) {
      setStoppedStreamingMessageIds((prev) =>
        prev.includes(activeStreamingMessageId) ? prev : [...prev, activeStreamingMessageId]
      );
      setIsTypewriterStreaming(false);
      setActiveStreamingMessageId(null);
    }
  };

  const renderComposerActionButton = () => (
    <AnimatePresence mode="wait" initial={false}>
      {isGenerationActive ? (
        <Motion.button
          key="stop"
          type="button"
          onClick={handleStopResponse}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className={`h-9 w-9 rounded-full border ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-gray-50 text-gray-700'} transition-all duration-200 flex items-center justify-center`}
          aria-label="Stop generation"
        >
          <span className={`h-3 w-3 rounded-sm ${isDarkMode ? 'bg-white' : 'bg-gray-600'}`} />
        </Motion.button>
      ) : (
        <Motion.button
          key="send"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!chatInput.trim() && attachedFiles.length === 0}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          className={`p-2 rounded-xl ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-violet-500 text-white hover:bg-violet-600'} disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg`}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="5" />
            <polyline points="6 11 12 5 18 11" />
          </svg>
        </Motion.button>
      )}
    </AnimatePresence>
  );

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const openChat = (chatId) => {
    setOpenChatMenuId(null);
    handleOpenChat(chatId, chats);
    closeSidebarOnMobile();
  };

  const createNewChat = async () => {
    setOpenChatMenuId(null);
    setChatInput('');
    await handleCreateNewChat();
    closeSidebarOnMobile();
  };

  const deleteChatById = async (chatId) => {
    const shouldDelete = window.confirm('Delete this chat permanently? This action cannot be undone.');
    if (!shouldDelete) return;

    setDeletingChatId(chatId);
    const didDelete = await handleDeleteChat(chatId);
    setDeletingChatId(null);
    if (didDelete) {
      setOpenChatMenuId(null);
      setShowDeleteChatDropdown(false);
    }
  };

  const deleteCurrentChat = async () => {
    if (currentChatId) {
      await deleteChatById(currentChatId);
    }
  };

  const deleteMessageById = async (messageId) => {
    if (!currentChatId || !messageId) return;

    setOpenMessageMenuId(null);
    setLocallyDeletedMessageIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
    setDeletingMessageId(messageId);
    await handleDeleteMessage({ chatId: currentChatId, messageId });
    setDeletingMessageId(null);
  };

  const handleLogout = async () => {
    const didLogout = await logoutUser();
    if (!didLogout) return;

    disconnectSocket();
    dispatch(resetChatState());
    setShowUserMenu(false);
    navigate('/login');
  };

  const suggestions = [
    { title: 'Summarize latest AI news', description: "Get a curated brief of today's most significant breakthroughs.", icon: '📰' },
    { title: 'Explain quantum physics', description: 'Demystify entanglement and superposition using clear analogies.', icon: '⚛️' },
    { title: 'Write a Python script', description: 'Generate optimized data analysis scripts for your datasets.', icon: '🐍' },
    { title: 'Plan a 3-day trip to Tokyo', description: 'A detailed itinerary through Shibuya, Akihabara, and hidden gems.', icon: '🗼' },
  ];

  // Sidebar is always 240px wide; we only slide it in/out via translateX
  const SIDEBAR_W = 240;
  const sidebarVariants = {
    open: {
      x: 0,
      transition: { type: 'spring', stiffness: 320, damping: 32 },
    },
    closed: {
      x: -SIDEBAR_W,
      transition: { type: 'spring', stiffness: 320, damping: 32 },
    },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const getThemeStyles = () => {
    if (isDarkMode) {
      return {
        background: 'bg-black',
        sidebarBg: 'bg-gray-950',
        borderColor: 'border-gray-800',
        inputBg: 'bg-gray-900',
        buttonGradient: 'from-gray-700 to-gray-800',
        textPrimary: 'text-white',
        textSecondary: 'text-gray-400',
        messageUserBg: 'bg-gray-800 border border-gray-700',
        messageBotBg: 'bg-gray-900/80 backdrop-blur-sm border border-gray-800',
        suggestionBorder: 'border-gray-800',
        suggestionText: 'text-gray-400',
        cardBg: 'bg-gray-900/40',
        iconColor: 'text-gray-400',
        hoverBg: 'hover:bg-gray-800/50',
        accent: 'gray',
        navbarBg: 'bg-black/90',
        hrColor: 'bg-gray-800',
        inputBorder: '',
      };
    }
    return {
      background: 'bg-violet-50/30',
      sidebarBg: 'bg-white',
      borderColor: 'border-violet-200',
      inputBg: 'bg-white',
      buttonGradient: 'from-violet-500 to-violet-600',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-500',
      messageUserBg: 'bg-violet-50 border border-violet-200',
      messageBotBg: 'bg-white border border-violet-100',
      suggestionBorder: 'border-violet-200',
      suggestionText: 'text-gray-600',
      cardBg: 'bg-violet-50/40',
      iconColor: 'text-violet-400',
      hoverBg: 'hover:bg-violet-50',
      accent: 'violet',
      navbarBg: 'bg-white/90',
      hrColor: 'bg-violet-200',
      inputBorder: 'border-2 border-violet-400',
    };
  };

  const theme = getThemeStyles();

  return (
    <div className={`relative flex h-screen w-full overflow-hidden ${theme.background} transition-colors duration-300`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,image/*"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload-input"
        multiple
      />

      {/* Fixed Navbar */}
      <div
        className={`fixed top-0 right-0 z-50 ${theme.navbarBg} backdrop-blur-md px-4 py-3 flex items-center justify-between transition-all duration-300`}
        style={{ left: isSidebarOpen ? SIDEBAR_W : 0 }}
      >
        <div className="flex items-center gap-2">
          {/* Hamburger only shown when sidebar is CLOSED */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <span className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'} font-michroma`}>
            Xenon
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Dark mode toggle button in navbar */}
          <Motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-violet-100 hover:bg-violet-200'} transition-all duration-200 ${theme.iconColor}`}
          >
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </Motion.button>

          {currentChatId && (
            <div className="relative delete-chat-dropdown">
              <button
                onClick={() => setShowDeleteChatDropdown(!showDeleteChatDropdown)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
                aria-label="Chat menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              <AnimatePresence>
                {showDeleteChatDropdown && (
                  <Motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`absolute right-0 top-10 z-50 min-w-35 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-950' : 'border-gray-200 bg-white'} shadow-xl overflow-hidden`}
                  >
                    <button
                      onClick={deleteCurrentChat}
                      disabled={deletingChatId === currentChatId}
                      className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:bg-gray-800 disabled:opacity-60 transition-colors"
                    >
                      {deletingChatId === currentChatId ? 'Deleting...' : 'Delete chat'}
                    </button>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Thin hr beneath navbar for separation */}
      <div
        className={`fixed top-15 right-0 z-40 h-px ${theme.hrColor} transition-all duration-300`}
        style={{ left: isSidebarOpen ? SIDEBAR_W : 0 }}
      />

      {isSidebarOpen && isMobileScreen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-10 bg-black/30 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar */}
      <Motion.aside
        initial={isSidebarOpen ? 'open' : 'closed'}
        animate={isSidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={`fixed left-0 top-0 h-full z-20 flex flex-col shadow-xl overflow-hidden transition-colors duration-300 ${theme.sidebarBg} ${theme.borderColor} border-r`}
        style={{ width: SIDEBAR_W }}
      >
        <div className={`p-4 pb-3 ${theme.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                <rect x="2" y="2" width="28" height="28" rx="8" ry="8" fill={isDarkMode ? '#171717' : '#171717'} stroke={isDarkMode ? '#404040' : '#d4d4d4'} strokeWidth="1.5" />
                <line x1="10" y1="10" x2="22" y2="22" stroke={isDarkMode ? '#d4d4d4' : '#d4d4d4'} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="22" y1="10" x2="10" y2="22" stroke={isDarkMode ? '#d4d4d4' : '#d4d4d4'} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className={`p-1.5 rounded-lg ${theme.iconColor} ${isDarkMode ? 'hover:text-white hover:bg-white/10' : 'hover:text-black hover:bg-black/5'} transition`}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="3" x2="6" y2="21" />
                <line x1="12" y1="3" x2="12" y2="21" />
                <line x1="18" y1="3" x2="18" y2="21" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-3">
          <Motion.button
            whileTap={{ scale: 0.98 }}
            onClick={createNewChat}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-violet-500 text-white hover:bg-violet-600'} font-medium text-sm transition-all duration-200 shadow-md`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </Motion.button>
        </div>

        <div className={`flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:thin] ${isDarkMode ? '[scrollbar-color:rgba(75,85,99,0.5)_transparent]' : '[scrollbar-color:rgba(156,163,175,0.4)_transparent]'}`}>
          <p className={`text-[10px] font-semibold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} tracking-wider px-2 mb-2`}>RECENT CHATS</p>
          <div className="space-y-1">
            <AnimatePresence>
              {Object.values(chats).length === 0 ? (
                <div className="px-2 py-4 text-center">
                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No chats yet</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-500'} mt-1`}>Start a new conversation!</p>
                </div>
              ) : (
                Object.values(chats).map((chat, index) => (
                  <Motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ x: 2, backgroundColor: isDarkMode ? 'rgba(55,65,81,0.5)' : 'rgba(243,244,246,0.8)' }}
                    onClick={() => openChat(chat.id)}
                    className={`group px-2 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      (currentChatId === chat.id || currentChatId === chat._id)
                        ? isDarkMode
                          ? 'bg-gray-800 shadow-sm border border-gray-700'
                          : 'border border-violet-400 bg-violet-50/60 shadow-sm'
                        : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${theme.textPrimary} pr-2`}>
                        {chat.title || `Chat ${index + 1}`}
                      </p>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenChatMenuId((prev) => (prev === chat.id ? null : chat.id));
                          }}
                          className={`opacity-70 group-hover:opacity-100 transition-opacity p-1 rounded-md ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {openChatMenuId === chat.id && (
                            <Motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 top-6 z-30 min-w-30 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-950' : 'border-gray-200 bg-white'} shadow-xl overflow-hidden p-1`}
                            >
                              <button
                                onClick={() => deleteChatById(chat.id)}
                                disabled={deletingChatId === chat.id}
                                className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-gray-800 rounded-md disabled:opacity-60"
                              >
                                {deletingChatId === chat.id ? 'Deleting...' : 'Delete chat'}
                              </button>
                            </Motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <p className={`text-[10px] ${isDarkMode ? 'text-gray-600' : 'text-gray-500'} mt-1`}>
                      {new Date(chat.updatedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </Motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar footer - user icon, name, and email */}
        <div className={`p-3 border-t ${theme.borderColor} mt-auto`}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
            className={`w-full flex items-center gap-3 p-2 rounded-xl ${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-violet-50'} transition-colors`}
          >
            {normalizedAvatar ? (
              <img
                src={normalizedAvatar}
                alt="avatar"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || user?.email || 'User'}`;
                }}
                className="w-8 h-8 rounded-full object-cover border border-gray-700"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'} flex items-center justify-center font-semibold text-sm shadow-md`}
              >
                {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className={`text-sm font-medium ${theme.textPrimary} truncate`}>
                {formattedUserName}
              </p>
              <p className={`text-xs truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {user?.email || 'No email'}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme.iconColor}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <Motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-20 left-3 right-3 w-auto ${isDarkMode ? 'bg-gray-950' : 'bg-white'} backdrop-blur-xl rounded-xl shadow-2xl border ${theme.borderColor} overflow-hidden`}
              >
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-4 py-3 text-sm text-rose-400 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-violet-50'} transition flex gap-3 items-center`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </Motion.aside>

      <div
        className="w-full h-full flex flex-col transition-all duration-300"
        style={{ marginLeft: !isMobileScreen && isSidebarOpen ? SIDEBAR_W : 0 }}
      >
        <main className="flex flex-col flex-1 overflow-hidden">
          {currentMessages.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center flex-1 px-4 pt-16 pb-4 overflow-y-auto">
              <div className="w-full max-w-2xl text-center">
                <Motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-3xl sm:text-4xl font-bold ${theme.textPrimary} tracking-tight mb-4`}
                >
                  What can I help with?
                </Motion.h1>
                <Motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'} text-sm mb-8 max-w-md mx-auto px-2`}
                >
                  Intelligent assistant for specialized knowledge and problem-solving.
                </Motion.p>

                <div className="mb-12">
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 justify-center">
                      {attachedFiles.map((file, idx) => (
                        <Motion.div
                          key={`${file.name}-${idx}`}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                            }`}
                        >
                          <span>{file.type.startsWith('image/') ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📝'}</span>
                          <span className="truncate max-w-25 font-medium">{file.name}</span>
                          <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {(file.size / 1024).toFixed(0)}KB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachedFile(idx)}
                            className={`p-0.5 rounded hover:bg-white/10 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </Motion.div>
                      ))}
                    </div>
                  )}
                  <div
                    className={`relative ${theme.inputBg} ${theme.inputBorder} rounded-2xl ${isDarkMode ? 'focus-within:shadow-[0_0_0_2px_rgba(255,255,255,0.05)]' : 'focus-within:shadow-[0_0_0_3px_rgba(236,72,153,0.2)]'} transition-all duration-200`}
                  >
                    {/* Mobile: model selector row (only visible on xs, hidden on sm+) */}
                    <div className="flex items-center justify-end px-3 pt-2 sm:hidden">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className={`rounded-lg border ${theme.borderColor} bg-transparent px-2 py-1 text-xs ${theme.textPrimary} outline-none max-w-[140px]`}
                      >
                        {MODEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className={isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Input row */}
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`pl-4 shrink-0 transition-colors ${attachedFiles.length > 0 ? (isDarkMode ? 'text-gray-400' : 'text-gray-600') : isDarkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={attachedFiles.length > 0 ? 'Ask about your file(s), or just press Enter…' : 'Ask anything...'}
                        className={`flex-1 py-3 px-2 bg-transparent rounded-2xl outline-none ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-black placeholder:text-gray-400'} text-sm min-w-0`}
                      />
                      {/* Desktop: model selector inline (hidden on mobile) */}
                      <div className="hidden sm:flex px-2 shrink-0">
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className={`w-36 rounded-lg border ${theme.borderColor} bg-transparent px-2 py-1 text-xs ${theme.textPrimary} outline-none focus:ring-1 focus:ring-gray-500`}
                        >
                          {MODEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className={isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="pr-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {renderComposerActionButton()}
                      </div>
                    </div>
                  </div>
                  <p className={`mt-2 text-xs text-center ${isDarkMode ? 'text-gray-600' : 'text-violet-400'}`}>
                    <span className="font-semibold">Xenon</span> · Can make mistakes
                  </p>
                </div>

                <div className="space-y-0 max-w-md mx-auto">
                  {suggestions.map((suggestion, idx) => (
                    <Motion.button
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setChatInput(suggestion.title)}
                      className="w-full group"
                    >
                      <div className={`py-3 border-b ${theme.suggestionBorder} transition-colors duration-200`}>
                        <p className={`${theme.suggestionText} text-sm group-hover:${isDarkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-200 text-left`}>
                          {suggestion.title}
                        </p>
                      </div>
                    </Motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className={`relative flex-1 overflow-y-auto px-4 pt-20 pb-[34vh] ${isDarkMode ? 'chat-scroll' : 'chat-scroll chat-scroll-light'}`}
            >
                  
                    <div className="max-w-3xl mx-auto min-h-full flex flex-col space-y-4 pt-3 sm:pt-4 md:pt-6">
            
                <AnimatePresence>
                  {visibleMessages.map((message, index) => {
                    const messageKey = message.id || `${message.role}-${index}`;
                    const isUserMessage = message.role === 'user';
                    const previousMessageRole = visibleMessages[index - 1]?.role;
                    const hasExtraTopSpacing = index > 0 && previousMessageRole !== message.role;
                    const isThinkingPlaceholder = message.content === 'Thinking...';
                    const shouldTypewriter =
                      !isUserMessage &&
                      !!message.id &&
                      message.shouldAnimate === true &&
                      !isThinkingPlaceholder &&
                      !typedAssistantMessageIdsRef.current.has(message.id) &&
                      !stoppedStreamingMessageIds.includes(message.id) &&
                      index === visibleMessages.length - 1;

                    return (
                      <Motion.div
                        key={messageKey}
                        ref={index === lastUserMessageIndex ? lastMessageRef : (lastUserMessageIndex === -1 && index === visibleMessages.length - 1 ? lastMessageRef : null)}
                        variants={messageVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
                        className={`flex w-full ${hasExtraTopSpacing ? 'mt-4 sm:mt-5' : ''} ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`group relative ${isUserMessage
                            ? `max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl pl-4 pr-8 py-2.5 ${theme.messageUserBg} ${theme.textPrimary} shadow-sm`
                            : `w-full max-w-full rounded-2xl px-1 ${theme.textPrimary}`
                            }`}
                        >
                          {isUserMessage && (
                            <>
                              <p className="text-[15px] leading-relaxed wrap-break-word whitespace-pre-wrap">{message.content}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMessageMenuId((prev) => (prev === message.id ? null : message.id));
                                }}
                                className={`absolute right-2 top-2 z-10 ${openMessageMenuId === message.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  } transition-opacity duration-200 p-1 rounded-md ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-black'} disabled:cursor-not-allowed`}
                                disabled={!message.id || deletingMessageId === message.id}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>
                              <AnimatePresence>
                                {openMessageMenuId === message.id && message.id && (
                                  <Motion.div
                                    initial={{ opacity: 0, y: 3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 3 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute right-2 top-7 z-20 min-w-25 rounded-md border p-1 ${isDarkMode ? 'border-gray-700 bg-gray-950' : 'border-gray-200 bg-white'}`}
                                  >
                                    <button
                                      onClick={() => deleteMessageById(message.id)}
                                      disabled={deletingMessageId === message.id}
                                      className="w-full px-2 py-1.5 text-left text-xs text-rose-400 hover:bg-gray-800 rounded-sm"
                                    >
                                      {deletingMessageId === message.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </Motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          )}

                          {!isUserMessage && (
                            <>
                              {isThinkingPlaceholder ? (
                                <div className="flex items-center gap-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'} animate-bounce`}
                                      style={{ animationDelay: '0ms' }}
                                    />
                                    <span
                                      className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'} animate-bounce`}
                                      style={{ animationDelay: '150ms' }}
                                    />
                                    <span
                                      className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'} animate-bounce`}
                                      style={{ animationDelay: '300ms' }}
                                    />
                                  </div>
                                  <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} animate-pulse`}>
                                    Thinking...
                                  </span>
                                </div>
                              ) : message.content?.startsWith('⚠️') || message.content?.startsWith('⏱️') ? (
                                <div
                                  className={`flex items-start gap-2 py-2 px-3 rounded-lg text-sm ${isDarkMode ? 'bg-rose-950/25 border border-rose-900/40 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'
                                    }`}
                                >
                                  <span className="text-base shrink-0 mt-0.5">
                                    {message.content.charAt(0) === '⚠' ? '⚠️' : '⏱️'}
                                  </span>
                                  <span className="leading-relaxed">{message.content.replace(/^(?:⚠️|⏱️)\s*/, '')}</span>
                                </div>
                              ) : (
                                <div className="prose prose-sm max-w-none">
                                  <TypewriterMarkdown
                                    content={message.content}
                                    isDarkMode={isDarkMode}
                                    isActive={shouldTypewriter}
                                    shouldStop={stoppedStreamingMessageIds.includes(message.id)}
                                    onStart={() => {
                                      setIsTypewriterStreaming(true);
                                      setActiveStreamingMessageId(message.id);
                                    }}
                                    onComplete={() => {
                                      if (message.id) {
                                        typedAssistantMessageIdsRef.current.add(message.id);
                                        setIsTypewriterStreaming(false);
                                        setActiveStreamingMessageId(null);
                                      }
                                    }}
                                  />
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMessageMenuId((prev) => (prev === message.id ? null : message.id));
                                }}
                                className={`absolute -right-2 top-0 z-10 ${openMessageMenuId === message.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  } transition-opacity duration-200 p-1 rounded-md ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-black'} disabled:cursor-not-allowed`}
                                disabled={!message.id || deletingMessageId === message.id}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>
                              <AnimatePresence>
                                {openMessageMenuId === message.id && message.id && (
                                  <Motion.div
                                    initial={{ opacity: 0, y: 3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 3 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute -right-2 top-5 z-20 min-w-25 rounded-md border p-1 ${isDarkMode ? 'border-gray-700 bg-gray-950' : 'border-gray-200 bg-white'}`}
                                  >
                                    <button
                                      onClick={() => deleteMessageById(message.id)}
                                      disabled={deletingMessageId === message.id}
                                      className="w-full px-2 py-1.5 text-left text-xs text-rose-400 hover:bg-gray-800 rounded-sm"
                                    >
                                      {deletingMessageId === message.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </Motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          )}
                        </div>
                      </Motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesBottomRef} className="h-px" />
              </div>
            </div>
          )}
        </main>

        {currentMessages.length > 0 && (
          <div
            className={`fixed bottom-0 right-0 z-10 px-2 pb-2 pt-1 backdrop-blur-sm transition-all duration-300 ${isDarkMode ? 'bg-black/80 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]' : 'bg-white/80 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]'}`}
            style={{ left: !isMobileScreen && isSidebarOpen ? SIDEBAR_W : 0 }}
          >
            <div className="max-w-3xl mx-auto">

              <AnimatePresence>
                {!isAtBottom && (
                  <Motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ duration: 0.25 }}
                    className="fixed bottom-22 left-1/2 -translate-x-1/2 z-50"
                  >
                    <Motion.button
                      onClick={scrollToLatestMessage}
                      aria-label="Scroll to latest message"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={!isDarkMode ? { backgroundColor: '#F5F3FF', color: '#8B5CF6', borderColor: '#EDE9FE' } : undefined}
                      className={`group flex h-9 w-9 items-center justify-center rounded-full shadow-xl transition-all duration-200 ${isDarkMode
                        ? "bg-gray-800/90 text-white border border-gray-700 hover:bg-gray-700"
                        : "border hover:bg-[#EDE9FE] hover:text-[#7C3AED]"
                        }`}
                    >
                      <span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.0001 1.99974L11.0002 1.9996L11.0002 18.1715L7.05044 14.2218L5.63623 15.636L12.0002 22L18.3642 15.636L16.9499 14.2218L13.0002 18.1716L13.0001 1.99974Z" />
                        </svg>
                      </span>
                    </Motion.button>
                  </Motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmitMessage}>
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachedFiles.map((file, idx) => (
                      <Motion.div
                        key={`${file.name}-${idx}`}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                          }`}
                      >
                        <span>{file.type.startsWith('image/') ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📝'}</span>
                        <span className="truncate max-w-25 font-medium">{file.name}</span>
                        <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {(file.size / 1024).toFixed(0)}KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(idx)}
                          className={`p-0.5 rounded hover:bg-white/10 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </Motion.div>
                    ))}
                  </div>
                )}
                <div
                  className={`relative ${theme.inputBg} ${theme.inputBorder} rounded-2xl ${isDarkMode ? 'focus-within:shadow-[0_0_0_2px_rgba(255,255,255,0.05)]' : 'focus-within:shadow-[0_0_0_3px_rgba(236,72,153,0.2)]'} transition-all duration-200`}
                >
                  {/* Mobile: model selector row (only visible on xs, hidden on sm+) */}
                  <div className="flex items-center justify-end px-3 pt-2 sm:hidden">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className={`rounded-lg border ${theme.borderColor} bg-transparent px-2 py-1 text-xs ${theme.textPrimary} outline-none max-w-[140px]`}
                    >
                      {MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className={isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Input row */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`pl-4 shrink-0 transition-colors ${attachedFiles.length > 0 ? (isDarkMode ? 'text-gray-400' : 'text-gray-600') : isDarkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={attachedFiles.length > 0 ? 'Ask about your file(s), or just press Enter…' : 'Ask anything...'}
                      className={`flex-1 py-3 px-2 bg-transparent rounded-2xl outline-none ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-black placeholder:text-gray-400'} text-sm min-w-0`}
                    />
                    {/* Desktop: model selector inline (hidden on mobile) */}
                    <div className="hidden sm:flex px-2 shrink-0">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className={`w-36 rounded-lg border ${theme.borderColor} bg-transparent px-2 py-1 text-xs ${theme.textPrimary} outline-none focus:ring-1 focus:ring-gray-500`}
                      >
                        {MODEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className={isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="pr-3 shrink-0">{renderComposerActionButton()}</div>
                  </div>
                </div>
                <p className={`mt-2 text-xs text-center ${isDarkMode ? 'text-gray-600' : 'text-violet-400'}`}>
                  <span className="font-semibold">Xenon</span> · Can make mistakes
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
