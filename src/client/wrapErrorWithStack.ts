import { getClient, defineIntegration, withScope, captureMessage, captureException } from "@sentry/core";
import { addExceptionMechanism, addConsoleInstrumentationHandler, severityLevelFromString, safeJoin} from "@sentry/utils";
import type * as SentryTypes from "@sentry/types";

interface CaptureConsoleOptions {

}

const INTEGRATION_NAME = 'WrapConsoleErrorWithStack';

type ConsoleError = typeof console.error;

export function wrapErrorWithStackIntegration(options: CaptureConsoleOptions = {}) {
	const levels = ["error"];

	return {
		name: INTEGRATION_NAME,

		setupOnce() {},

		setup(client) {
			const originalConsoleError: ConsoleError = console.error;

			addConsoleInstrumentationHandler(({ args, level }) => {
				if (getClient() !== client || !levels.includes(level)) {
					return;
				}
				consoleErrorHandler(args, level, originalConsoleError);
			});
		},
	} as SentryTypes.Integration;
}

function consoleErrorHandler(args: unknown[], level: string, origHandler: ConsoleError): void {
	// Error message
	const message = safeJoin(args, ' ');
	const err = new Error(message);

	// Sentry displays error.name as title, so we set it manually
	err.name = message;
	err.message = window.document.location.href;

	// Stack frames to cut (this file and Sentry)
	const stackFramesToSkip = 4;
	if(err.stack) {
		const stackLines = err.stack.split('\n');
		err.stack = stackLines.slice(stackFramesToSkip+1).join('\n');
	}


	const captureContext: SentryTypes.CaptureContext = {
		level: severityLevelFromString(level),
		extra: {
			arguments: args,
		},
	};

	withScope(scope => {
		scope.addEventProcessor(event => {
			event.logger = 'console';

			addExceptionMechanism(event, {
				handled: true,
				type: 'console',
			});

			return event;
		});

		if (level === 'assert') {
			if (!args[0]) {
				const message = `Assertion failed: ${safeJoin(args.slice(1), ' ') || 'console.assert'}`;
				scope.setExtra('arguments', args.slice(1));
				captureMessage(message, captureContext);
			}
			return;
		}

		const error = args.find(arg => arg instanceof Error);
		if(error) {
			captureException(error, captureContext);
			return;
		}

		// Here's the main difference from the original Sentry code
		captureException(err, captureContext);
	});
}
