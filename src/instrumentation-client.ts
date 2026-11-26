// Crash reports from the browser (Sentry, EU data region): src/lib/crash.ts.
// Runs before the app starts; Sentry itself loads once the page is idle.
import { startCrashReports } from "@/lib/crash";

startCrashReports();
