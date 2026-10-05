import express from 'express';
import { createApp } from './server/index.js';
import { createPostgresStore } from './server/postgres.js';

const app = express();
app.set('trust proxy', 1);

export default createApp(createPostgresStore(), app);
