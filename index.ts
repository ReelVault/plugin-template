import { definePlugin, ok, route, t, updateStored } from "@reelvault/sdk/plugin";
import { config } from "./config";

const Counter = t.Object({ value: t.Number() });

export default definePlugin(config, {
	async setup(host) {
		await host.routes.register(
			route({
				method: "GET",
				path: "/hello",
				query: t.Object({ name: t.Optional(t.String()) }),
				handler: ({ query }) => ok({ message: `${host.config.greeting}, ${query.name ?? "world"}!` }),
			}),
		);

		// Atomic, validated read-modify-write — no plugin-side locking needed.
		await host.routes.register(
			route({
				method: "POST",
				path: "/visits",
				handler: async () => {
					const next = await updateStored(host.storage, "visits", Counter, (previous) => ({ value: (previous?.value ?? 0) + 1 }));
					return ok(next);
				},
			}),
		);

		host.logger.info("Plugin template ready → /v1/plugins/org.example.template/hello");
	},
});
