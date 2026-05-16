import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.routes.js'
import morgan from 'morgan'
import cors from 'cors'
import chatRouter from './routes/chat.routes.js'
import multer from 'multer'

 
const app = express()

app.set("trust proxy", 1)

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(morgan("dev"))
app.use(
    cors({
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    }),
);

app.use('/api/auth',authRouter)


app.use('/api/chats',chatRouter)

app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Max allowed size is 10MB per file.' })
        }
        return res.status(400).json({ message: err.message || 'Upload failed.' })
    }

    if (err) {
        return res.status(400).json({ message: err.message || 'Request failed.' })
    }

    return res.status(500).json({ message: 'Unexpected server error' })
})


export default app