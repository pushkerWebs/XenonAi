import { generateResponse, generateChatTitle, AI_MODELS } from "../services/ai.service.js";
import { extractDocumentContexts } from "../services/rag.service.js";
import chatModel from "../models/chat.model.js";
import messageModel from "../models/message.model.js";

export async function sendMessage(req, res) {
  try {
    const { message, chatId, model, exchangeId } = req.body;
    const selectedModel = Object.values(AI_MODELS).includes(model) ? model : AI_MODELS.GEMINI;
    let requestAborted = false;
    const createdMessageIds = [];

    const cleanupAbortedExchange = async () => {
      if (createdMessageIds.length > 0) {
        await messageModel.deleteMany({
          _id: { $in: createdMessageIds },
        });
      }

      if (chat) {
        const remainingMessages = await messageModel.countDocuments({
          chat: chat._id,
        });

        if (remainingMessages === 0) {
          await chatModel.findOneAndDelete({
            _id: chat._id,
            user: req.user.id,
          });
        }
      }
    };

    req.on("aborted", () => {
      requestAborted = true;
    });

    // ── RAG: Extract document contexts from all uploaded files ────────────
    let documentContexts = null;
    if (req.files && req.files.length > 0) {
      try {
        documentContexts = await extractDocumentContexts(req.files);
      } catch (ragErr) {
        return res.status(400).json({ message: ragErr.message });
      }
    }

    let title = null,
      chat = null;
    if (chatId) {
      chat = await chatModel.findOne({
        _id: chatId,
        user: req.user.id,
      });

      if (!chat) {
        return res.status(404).json({
          message: "Chat not found",
        });
      }
    } else {
      title = await generateChatTitle(message);

      chat = await chatModel.create({
        user: req.user.id,
        title: title,
      });
    }

    // Store the user message — include filenames annotation if files were attached
    let fileAnnotation = ""
    if (documentContexts?.documents?.length) {
      const names = documentContexts.documents.map((d) => `📎 *${d.filename}*`).join("  ")
      fileAnnotation = `\n\n${names}`
    }
    const userContent = fileAnnotation ? `${message}${fileAnnotation}` : message

    const userMessage = await messageModel.create({
      chat: chatId || chat._id,
      content: userContent,
      exchangeId: exchangeId || null,
      role: "user",
    });
    createdMessageIds.push(userMessage._id);

    if (requestAborted || req.aborted) {
      await cleanupAbortedExchange();
      return;
    }

    const messages = await messageModel.find({
      chat: chatId || chat._id,
    });

    const result = await generateResponse(messages, selectedModel, documentContexts);

    if (requestAborted || req.aborted) {
      await cleanupAbortedExchange();
      return;
    }

    const aiMessage = await messageModel.create({
      chat: chatId || chat._id,
      content: result.text || "No response generated.",
      exchangeId: exchangeId || null,
      role: "assistant",
    });
    createdMessageIds.push(aiMessage._id);

    if (requestAborted || req.aborted) {
      await cleanupAbortedExchange();
      return;
    }

    res.status(201).json({
      title,
      chat,
      userMessage,
      aiMessage,
      modelUsed: result.modelUsed,
      wasFallback: result.wasFallback,
      rateLimited: result.rateLimited,
    });
  } catch (error) {
    console.error("sendMessage Error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate AI response",
    });
  }
}

export async function cleanupExchange(req, res) {
  const { exchangeId } = req.body;

  if (!exchangeId) {
    return res.status(400).json({
      message: "exchangeId is required",
    });
  }

  const messages = await messageModel.find({
    exchangeId,
  }).populate("chat", "user");

  const ownedMessages = messages.filter((message) => String(message.chat?.user) === String(req.user.id));
  const chatIds = [...new Set(ownedMessages.map((message) => String(message.chat?._id)).filter(Boolean))];

  if (ownedMessages.length > 0) {
    await messageModel.deleteMany({
      _id: { $in: ownedMessages.map((message) => message._id) },
    });
  }

  for (const chatId of chatIds) {
    const remainingMessages = await messageModel.countDocuments({
      chat: chatId,
    });

    if (remainingMessages === 0) {
      await chatModel.findOneAndDelete({
        _id: chatId,
        user: req.user.id,
      });
    }
  }

  res.status(200).json({
    message: "Exchange cleaned up successfully",
    removedMessages: ownedMessages.length,
  });
}

export async function getChats(req, res) {
  const user = req.user;

  const chats = await chatModel.find({
    user: user.id,
  });

  res.status(200).json({
    message: "Chats retrieved successfully",
    chats
  });
}


export async function getMessages(req, res) {
  const { chatId } = req.params;

  const chat = await chatModel.findOne({
    _id: chatId,
    user: req.user.id
  });

  if (!chat) {
    return res.status(404).json({
      message: "Chat not found"
    })
  }

  const messages = await messageModel.find({
    chat: chatId,
  });

  if (messages.length === 0) {
    await chatModel.findOneAndDelete({
      _id: chatId,
      user: req.user.id,
    })

    return res.status(200).json({
      message: "Chat was empty and deleted",
      messages: [],
      chatDeleted: true,
      chatId,
    })
  }

  res.status(200).json({
    message: "Messages retrieved successfully",
    messages,
    chatDeleted: false,
  });

}


export async function deleteChat(req, res) {
  const { chatId } = req.params;

  const chat = await chatModel.findOneAndDelete({
    _id: chatId,
    user: req.user.id
  });

  if (!chat) {
    return res.status(404).json({
      message: "Chat not found"
    })
  }

  await messageModel.deleteMany({
    chat: chatId
  });

  res.status(200).json({
    message: "Chat deleted successfully"
  });

}

export async function deleteMessage(req, res) {
  const { messageId } = req.params

  const message = await messageModel.findById(messageId).populate("chat", "user")

  if (!message) {
    return res.status(404).json({
      message: "Message not found"
    })
  }

  if (String(message.chat?.user) !== String(req.user.id)) {
    return res.status(403).json({
      message: "Not authorized to delete this message"
    })
  }

  const chatId = message.chat?._id

  await message.deleteOne()

  const remainingMessages = await messageModel.countDocuments({
    chat: chatId,
  })

  let chatDeleted = false
  if (remainingMessages === 0) {
    await chatModel.findOneAndDelete({
      _id: chatId,
      user: req.user.id,
    })
    chatDeleted = true
  }

  res.status(200).json({
    message: "Message deleted successfully",
    chatDeleted,
    chatId,
  })

}