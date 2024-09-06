# Sentry wrapper for MeteorJS

## Usage

Add configuration (see below) to Meteor settings.

client/index.ts:

```typescript
import * as Resentry from "meteor-resentry/lib/client";
Resentry.init(Meteor.settings.public.sentry, Meteor);
```

server/index.ts:

```typescript
import * as Resentry from "meteor-resentry/lib/server";
Resentry.init(Meteor.settings.public.sentry, Meteor);
```

### Sentry versions
@sentry/browser version is currently limited to ^7. v8 makes Meteor crash with wrong
modules load order.

## Configuration

```json5
{
  // Sentry DSN
  dsn: "...",

  // Release ID for Sentry
  release: "0.0.1", 
  
  // Optional, ignore rules for Sentry
  ignoreErrors: [],

  // Optional, forces to enable Sentry (by default, Sentry disabled in development)
  forceEnable: false,
  
  // Optional, extra logging is enabled
  debug: false,
}
```

Specifying the project release version is
strongly recommended. It can be done either i:

* ```Meteor.session.public.version```
* ```Meteor.settings.public.sentry.release```

# Testing

To test your setup is working, run the following code
and check if you get the error in Sentry.

client/index.ts:

```typescript

setTimeout(() => {
	// @ts-ignore
	unexistantFunc();
}, 1000);

setTimeout(() => {
	console.error("Testing console.error");
}, 500);
```

server/index.ts:

```typescript
setTimeout(() => {
	// @ts-ignore
	serverUnexistantFunc();
}, 1000);

setTimeout(() => {
	console.error("Testing server console.error");
}, 500);
```
