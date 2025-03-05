export class DisabledInDemoModeError extends Error {
	constructor(message = "This feature is disabled in demo mode", ...args: any) {
		super(message, ...args);
		this.message = message;
	}
}
