import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import {config} from 'dotenv';
import videoRoutes from './routes/video.routes.js';
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// CORS configuration - allow frontend URL from environment or default to localhost
const allowedOrigins = [
    "http://localhost:5173",
    "https://localhost:5173",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Routes
app.use('/api/v1/video', videoRoutes);

app.get("/", (req, res) => {
    res.send("Server is running");      
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.log(error);
    process.exit(1);
});