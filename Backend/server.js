import "dotenv/config"
import app from "./src/app.js";
import connectDb from "./src/config/database.js";
import http from 'http'
import { initSocket } from "./src/sockets/server.socket.js";

const PORT = process.env.PORT
const httpServer = http.createServer(app);

initSocket(httpServer)

connectDb()
.catch((err)=>{
    console.error("MongoDb connection failed : ",err)
    process.exit(1)
})



httpServer.listen(PORT ,()=>{
    console.log(`server running on port ${PORT}`)
})

