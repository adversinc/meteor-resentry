export interface SentryInitOptions {
	dsn: string,
	release: string,

	// Additional ignore rules for Sentry
	ignoreErrors?: (RegExp|string)[];

	// If true, then force Sentry to work even in devel
	forceEnable?: boolean;
	// If extra logging is enabled
	debug?: boolean;
}

export interface MeteorStub {
	isDevelopment: boolean;
	isProduction: boolean;
	settings: any;

	// Undocumented Meteor API
	_debug(message, misc, stack);

	Error: any;
}
