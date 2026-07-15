// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Env {
			QDRANT_URL?: string;
			QDRANT_KEY?: string;
			OPENROUTER_KEY?: string;
			GOOGLE_ID?: string;
			GOOGLE_SECRET?: string;
			SECRET?: string;
		}

		// interface Error {}
		interface Locals {
			user: { id: string; name: string; picture?: string; email?: string } | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
