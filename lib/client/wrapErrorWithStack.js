"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapErrorWithStackIntegration = wrapErrorWithStackIntegration;
const core_1 = require("@sentry/core");
const utils_1 = require("@sentry/utils");
const INTEGRATION_NAME = 'WrapConsoleErrorWithStack';
function wrapErrorWithStackIntegration(options = {}) {
    const levels = ["error"];
    return {
        name: INTEGRATION_NAME,
        setup(client) {
            const originalConsoleError = console.error;
            (0, utils_1.addConsoleInstrumentationHandler)(({ args, level }) => {
                if ((0, core_1.getClient)() !== client || !levels.includes(level)) {
                    return;
                }
                consoleErrorHandler(args, level, originalConsoleError);
            });
        },
    };
}
function consoleErrorHandler(args, level, origHandler) {
    // Error message
    const message = (0, utils_1.safeJoin)(args, ' ');
    const err = new Error(message);
    // Sentry displays error.name as title, so we set it manually
    err.name = message;
    err.message = window.document.location.href;
    // Stack frames to cut (this file and Sentry)
    const stackFramesToSkip = 4;
    if (err.stack) {
        const stackLines = err.stack.split('\n');
        err.stack = stackLines.slice(stackFramesToSkip + 1).join('\n');
    }
    const captureContext = {
        level: (0, utils_1.severityLevelFromString)(level),
        extra: {
            arguments: args,
        },
    };
    (0, core_1.withScope)(scope => {
        scope.addEventProcessor(event => {
            event.logger = 'console';
            (0, utils_1.addExceptionMechanism)(event, {
                handled: true,
                type: 'console',
            });
            return event;
        });
        if (level === 'assert') {
            if (!args[0]) {
                const message = `Assertion failed: ${(0, utils_1.safeJoin)(args.slice(1), ' ') || 'console.assert'}`;
                scope.setExtra('arguments', args.slice(1));
                (0, core_1.captureMessage)(message, captureContext);
            }
            return;
        }
        const error = args.find(arg => arg instanceof Error);
        if (error) {
            (0, core_1.captureException)(error, captureContext);
            return;
        }
        // Here's the main difference from the original Sentry code
        (0, core_1.captureException)(err, captureContext);
    });
}
