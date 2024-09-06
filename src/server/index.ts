/**
 * Catch errors to Sentry
 */
import * as Sentry from "@sentry/node";
import type * as SentryTypes from "@sentry/types";

import type {MeteorStub, SentryInitOptions} from "../types";

let initOptions: SentryInitOptions;
declare var Meteor: MeteorStub;


// Replace original console.error as soon as possible (other packages may overwrite it)
let oldError: typeof console.error;
earlyReplaceConsoleError();


export function init(options: SentryInitOptions): void {
	if(!options.dsn) {
		console.warn("Sentry not initialized, no DSN provided");
		return;
	}
	if(!options.release && !Meteor.settings.public.version) {
		console.warn("Release version not provided, using '0.0.1' as default");
	}

	initOptions = Object.assign({}, options);

	// Setup Sentry error logging (only in Production mode)
	if(!Meteor.isProduction && !options.forceEnable) {
		return;
	}

	if(options.forceEnable) {
		console.info("Sentry forcefully enabled for server");
	}

	const ignoreErrors: (RegExp | string)[] = [
		/Skipping downloading new version because the Cordova/,
	];
	if(options.ignoreErrors) {
		ignoreErrors.push(...options.ignoreErrors);
	}

	const sentryOptions: Sentry.NodeOptions = {
		dsn: options.dsn,
		release: options.release || Meteor.settings.public.version || "0.0.1",
		environment: 'server',

		integrations: Sentry.getDefaultIntegrations({}),

		ignoreErrors,
	};

	if(options.integrations) {
		(sentryOptions.integrations as SentryTypes.Integration[]).push(...options.integrations);
	}

	// Seems to break Meteor's console.error
	// integrations.push(Sentry.captureConsoleIntegration());

	Sentry.init(sentryOptions);

	// Catch-all Server's errors (seems not required, Sentry does this)
	/*
	process.on('uncaughtException', function(err) {
		reportError("uncaughtException:", err);
		console.log('!uncaughtException: ', err);
		//oldError('!uncaughtException: ', err);
		//oldError(err.stack);

		setTimeout(() => {
			process.exit(7);
		}, 1000);
	});
*/


	// Catch-all Meteor's errors
	const originalMeteorDebug = Meteor._debug;
	Meteor._debug = (message, misc, stack) => {
		if(misc) {
			message += " " + misc;
		}

		const error = new Meteor.Error(message);
		//error.stack = stack;

		if(initOptions.debug) {
			console.info("(Meteor internal exception reported to Sentry)");
		}

		captureException(error);
		return originalMeteorDebug.call(this, message);
	};
}


function reportError(message, ex = null) {
	let sentryMsg = message;
	if(ex) {
		sentryMsg += " " + ex.toString();
	}

	if(initOptions.debug) {
		console.log(`(Error reported to Sentry: ${message})`);
	}
	Sentry.captureMessage(sentryMsg, "error");
}

function captureException(exception: Error) {
	Sentry.captureException(exception);
}

function earlyReplaceConsoleError() {
	oldError = console.error;

// Catch-all console.error
	console.error = function(message) {
		try {
			for(let i = 1; i < arguments.length; i++) {
				message += "\n\n" + JSON.stringify(arguments[i]);
			}
		} catch(ex) {
			message += " (error adding args: " + ex.toString() + ")";
		}

		// Skip /^[A-Za-z]+:/ messages, they are errors also provided by Sentry
		if(message?.match && !message.match(/^[A-Z][A-Za-z]+:/)) {
			reportError(message);
		}

		//console.log("Calling original console.error");
		oldError.apply(console, arguments);
	};
	//console.log("console.error replaced");
}
