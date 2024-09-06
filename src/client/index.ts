/**
 * Catch errors, console.error and console.log (with potential error messages)
 * and forward them to Sentry
 */

import * as Sentry from "@sentry/browser";
import type * as SentryTypes from "@sentry/types";
import type {MeteorStub, SentryInitOptions} from "../types";

let initOptions: SentryInitOptions;

declare var Meteor: MeteorStub;

const DefaultIgnoreErrors: (RegExp|string)[] = [
	/Skipping downloading new version because the Cordova/,
	/No callback invoker/,
	/Error in Success callbackId: WebAppLocalServer/,
	/Can't select in removed DomRange/, // FIXME!
	/Non-success status code 404 for asset.*map/, // Source maps not found in Cordova
	/Cannot read properties of undefined \(reading 'connected'\)/,
	/instantSearchSDKJSBridgeClearHighlight/,
	/AbortError/,
	/script error\./i,
	/@webkit-masked-url/, // WebKit extension errors
	/Error syncing to server time/, // Happens on server restart
];

function beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint): Sentry.ErrorEvent | PromiseLike<Sentry.ErrorEvent> {
	if(Meteor?.isDevelopment) {
		console.log("[SENTRY] beforeSend:", hint?.syntheticException?.stack?.includes("app.js"));
	}

	if(hint?.syntheticException?.stack?.includes("twk-chunk")) {
		return null;
	}

	return event;
}

export function init(options: SentryInitOptions): void {
	if(!options.dsn) {
		console.warn("Sentry not initialized, no DSN provided");
		return;
	}
	if(!options.release && !Meteor.settings.public.version) {
		console.warn("Release version not provided, using '0.0.1' as default");
	}

	initOptions = Object.assign({}, options);

	if(options.forceEnable || Meteor.isProduction) {
		if(options.forceEnable) {
			console.warn("Sentry forcefully enabled for browser");
		}

		const sentryOptions: Sentry.BrowserOptions = {
			dsn: options.dsn,
			release: options.release || Meteor.settings.public.version || "0.0.1",
			environment: 'client',
			debug: options.debug,

			ignoreErrors: DefaultIgnoreErrors,
			integrations: Sentry.getDefaultIntegrations({}),
			beforeSend,

			// We recommend adjusting this value in production, or using tracesSampler
			// for finer control
			tracesSampleRate: options.tracesSampleRate || 1.0,
		};

		(sentryOptions.integrations as SentryTypes.Integration[]).push(Sentry.captureConsoleIntegration({
			levels: ["error"]
		}));

		if(options.integrations) {
			(sentryOptions.integrations as SentryTypes.Integration[]).push(...options.integrations);
		}

		if(options.ignoreErrors) {
			sentryOptions.ignoreErrors.push(...options.ignoreErrors);
		}

		if(options.tracePropagationTargets) {
			sentryOptions.tracePropagationTargets = options.tracePropagationTargets;
		}

		//
		// Init Sentry
		Sentry.init(sentryOptions);

		const oldLog = console.log;

		// Catch regular console log which actually contains exceptions
		console.log = function(message, ex) {
			if(message !== undefined && message !== null && message.toString().match(/Exception/)) {
				let exStr = "---";
				if(ex === undefined) {
					exStr = "undefined";
				} else if(ex == null) {
					exStr = "null";
				} else {
					try {
						exStr = ex.toString();
					} catch(exc) {
						console.log("Problem converting ex to string:", exc);
					}
				}

				// For Exceptions we exchange the actual error (ex) and "Exception" message
				reportError(`${exStr} (${message})`);
			} else if(message !== undefined && message !== null && message.toString().match(/Error|route/)) {
				console.log("Debug 'unknown error':", {
					message,
					ex,
					arguments,
					stack: new Error().stack
				});
				reportError.apply(this, arguments); //- this seems to be a fix
				//reportError.apply(arguments);
			}

			oldLog.apply(console, arguments);
		};

		// Catch actual console errors
		// Not required since captureConsoleIntegration() now does this
		// const oldError = console.error;
		/* console.error = function(message) {
			try {
				for(let i = 1; i < arguments.length; i++) {
					message += "\n\n" + JSON.stringify(arguments[i]);
				}
			} catch(ex) {
				message += " (error adding args: " + ex.toString() + ")";
			}

			reportError(message);
			oldError.apply(console, arguments);
		};  */
	}
}

function reportError(message, ex = null) {
	let sentryMsg = message;
	if(ex) {
		sentryMsg += " " + ex.toString();
	}

	// FIXME: Ignore flood
	//  20201122 - ?
	if(message?.startsWith && message.startsWith("No callback invoker")) {
		return;
	}

	if(initOptions.debug) {
		console.warn("Sending to Sentry:", sentryMsg);
	}
	Sentry.captureMessage(sentryMsg, "error");
}

function captureException(exception: Error) {
	Sentry.captureException(exception);
}


