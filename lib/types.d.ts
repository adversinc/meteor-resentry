export interface SentryInitOptions {
    dsn: string;
    release: string;
    ignoreErrors?: (RegExp | string)[];
    forceEnable?: boolean;
    debug?: boolean;
}
export interface MeteorStub {
    isDevelopment: boolean;
    isProduction: boolean;
    settings: any;
    _debug(message: any, misc: any, stack: any): any;
    Error: any;
}
