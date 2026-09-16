import { Router, type IRouter } from "express";
import healthRouter from "./health";
import busesRouter from "./buses";
import queueRouter from "./queue";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(busesRouter);
router.use(queueRouter);
router.use(notificationsRouter);

export default router;
