import { button, defineSchema, row, stack, text, textField } from "@reelvault/sdk/ui/schema";

/**
 * Declarative schema for the "Say hello" dialog. The host renders it with its
 * own components; the build compiles this to `dist/ui/schema.json`, referenced
 * from `ui.json` via `schemaRef`.
 */
export default defineSchema({
	body: [
		stack([
			text("This dialog is rendered by the host from a declarative schema.", "muted"),
			textField({ name: "name", label: "Your name", placeholder: "World" }),
			row(
				[
					button("Cancel", { type: "close" }, { variant: "ghost" }),
					button("Send", {
						type: "call",
						path: "/hello",
						query: { name: "{{form.name}}" },
						successToast: "Sent",
						close: true,
					}),
				],
				{ align: "end" },
			),
		]),
	],
});
