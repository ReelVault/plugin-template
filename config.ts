import { defineConfig, field, type InferConfig } from "reelvault-sdk/plugin";

export const config = defineConfig({
	greeting: field.string({
		label: "Greeting word",
		description: "Shown by the /hello route. Change it in the admin panel to see the hot reload.",
		default: "Hello",
	}),
});

export type TemplateConfig = InferConfig<typeof config>;
