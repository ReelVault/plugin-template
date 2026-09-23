import { createRoot } from "react-dom/client";
import { definePluginElement, mountShadow } from "@reelvault/sdk/ui";
import { TemplatePage } from "./app";
import { PluginHostProvider } from "./host-context";
import css from "./styles.css?inline";

definePluginElement("rv-template-page", (element, host) => {
	const root = createRoot(mountShadow(element, css));
	root.render(
		<PluginHostProvider host={host}>
			<TemplatePage />
		</PluginHostProvider>,
	);
	return () => root.unmount();
});
