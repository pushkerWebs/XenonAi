import {Router} from 'express'
import { sendMessage, getChats, getMessages, deleteChat, deleteMessage, cleanupExchange } from '../controllers/chat.controller.js'
import { authUser } from '../middleware/auth.middleware.js'
import { aiMessageRateLimit } from '../middleware/rateLimit.middleware.js'
import multer from 'multer'

const chatRouter = Router()

// Multer: memory storage, 10MB limit, allowed types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    const lowerName = String(file.originalname || '').toLowerCase();
    const isPdfByName = lowerName.endsWith('.pdf');
    const isTxtByName = lowerName.endsWith('.txt');
    const isGenericBinary = file.mimetype === 'application/octet-stream';
    const isImage = file.mimetype.startsWith('image/');

    if (
      allowed.includes(file.mimetype) ||
      isImage ||
      (isGenericBinary && (isPdfByName || isTxtByName))
    ) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not supported. Please upload a PDF, TXT, or image file.`));
    }
  },
})

chatRouter.post("/message", aiMessageRateLimit, authUser, upload.array('files', 5), sendMessage)
chatRouter.post("/cleanup-exchange", authUser, cleanupExchange)

chatRouter.get("/", authUser, getChats)

chatRouter.get("/:chatId/messages", authUser, getMessages)

chatRouter.delete("/delete/:chatId", authUser, deleteChat)

chatRouter.delete("/delete-message/:messageId", authUser, deleteMessage)

export default chatRouter