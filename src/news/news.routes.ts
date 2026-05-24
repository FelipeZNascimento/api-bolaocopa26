import express from "express";
import { EditionService } from "#edition/edition.service.js";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";

const router = express.Router();

const newsService = new NewsService();
const editionService = new EditionService();

const newsController = new NewsController(newsService, editionService);

router.get("/", newsController.getAll);

export default router;
