import {Router} from 'express';
import upload from '../lib/multer.js';
import { uploadVideo, getAllVideos, getVideoById } from '../controllers/video.controller.js';
import { summarizeAtTimestamp } from '../controllers/summary.controller.js';
import { chatWithVideo, getChatHistory, deleteChatHistory } from '../controllers/chat.controller.js';

const router = Router();

router.post('/upload', upload.single('file'), uploadVideo);
router.get('/all', getAllVideos);
router.get('/:videoId', getVideoById);
router.post('/summary', summarizeAtTimestamp);

// Chat routes
router.post('/chat', chatWithVideo);
router.get('/:videoId/chat', getChatHistory);
router.delete('/:videoId/chat', deleteChatHistory);

export default router;