/**
 * Catch errors, console.error and console.log (with potential error messages)
 * and forward them to Sentry
 */
import type { SentryInitOptions } from "../types";
export declare function init(options: SentryInitOptions): void;
