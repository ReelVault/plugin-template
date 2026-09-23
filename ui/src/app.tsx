import { useState } from "react";
import { usePluginHost } from "./host-context";

export function TemplatePage() {
	const host = usePluginHost();
	const [message, setMessage] = useState("");

	const callBackend = async (): Promise<void> => {
		try {
			const result = await host.api.call<{ message: string }>("/hello", { query: { name: "plugin" } });
			setMessage(result.message);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Request failed");
		}
	};

	return (
		<div className="page">
			<div className="panel">
				<h1>Hello from {host.pluginId}</h1>
				<p className="muted">
					Locale: {host.context.locale} · Theme: {host.context.theme}
				</p>
				<div className="row">
					<button type="button" className="primary" onClick={() => void callBackend()}>
						Call backend /hello
					</button>
				</div>
				{message ? <p>{message}</p> : null}
			</div>
		</div>
	);
}
