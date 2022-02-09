import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { errorHandler } from './midlewares/error.js';
import router from './router.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use(errorHandler);

app.use('/', router);

app.listen(process.env.PORT || 3333, () => {
  console.log("Server starter")
});
