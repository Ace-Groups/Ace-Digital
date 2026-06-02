import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meRouter from "./me";
import dashboardRouter from "./dashboard";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import teamsRouter from "./teams";
import employeesRouter from "./employees";
import financeRouter from "./finance";
import clientsRouter from "./clients";
import approvalsRouter from "./approvals";
import reportsRouter from "./reports";
import channelsRouter from "./channels";
import activityRouter from "./activity";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(teamsRouter);
router.use(employeesRouter);
router.use(financeRouter);
router.use(clientsRouter);
router.use(approvalsRouter);
router.use(reportsRouter);
router.use(channelsRouter);
router.use(activityRouter);

export default router;
