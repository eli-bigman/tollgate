import type { ManifestData } from "~~/types";

type Props = {
  subdomain: string;
  serviceType: "MCP" | "API";
  endpointUrl: string;
  price: string;
  payeeWallet: string;
  manifest: ManifestData | null;
};

function JsonLine({
  indent,
  keyName,
  value,
  valueType,
  isLast,
}: {
  indent: number;
  keyName?: string;
  value: string;
  valueType: "string" | "number" | "key" | "bracket";
  isLast?: boolean;
}) {
  const pad = "  ".repeat(indent);
  const comma = isLast ? "" : ",";

  return (
    <div>
      <span className="text-[#9CA3AF]">{pad}</span>
      {keyName && (
        <>
          <span className="text-[#6366F1]">&quot;{keyName}&quot;</span>
          <span className="text-[#9CA3AF]">: </span>
        </>
      )}
      {valueType === "string" && <span className="text-[#98C379]">&quot;{value}&quot;</span>}
      {valueType === "number" && <span className="text-[#E5C07B]">{value}</span>}
      {valueType === "bracket" && <span className="text-[#ABB2BF]">{value}</span>}
      <span className="text-[#ABB2BF]">{comma}</span>
    </div>
  );
}

export default function ManifestPreview({ subdomain, serviceType, endpointUrl, price, payeeWallet, manifest }: Props) {
  const ensName = subdomain ? `${subdomain}.tollgate.eth` : "<subdomain>.tollgate.eth";
  const endpoint = endpointUrl || "<endpoint_url>";
  const payee = payeeWallet || "<wallet_address>";
  const defaultPrice = price || "0.01";

  const tools = manifest?.tools?.slice(0, 2) ?? [];

  return (
    <div className="border border-border-strong rounded-xl bg-white shadow-card overflow-hidden">
      {/* Header bar */}
      <div className="bg-surface-subtle border-b border-border-light px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-sm">📄</span>
          <span className="font-mono text-sm font-medium text-text-primary">tollgate.json</span>
        </div>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">Preview</span>
      </div>

      {/* Code area */}
      <div className="bg-[#1E2433] px-4 py-4 min-h-[360px] overflow-x-auto">
        <pre className="font-mono text-[12px] leading-relaxed text-[#ABB2BF]">
          <JsonLine indent={0} value="{" valueType="bracket" />
          <JsonLine indent={1} keyName="ens" value={ensName} valueType="string" />
          <JsonLine indent={1} keyName="type" value={serviceType === "MCP" ? "mcp_server" : "rest_api"} valueType="string" />
          <JsonLine indent={1} keyName="endpoint" value={endpoint} valueType="string" />
          <div>
            <span className="text-[#9CA3AF]">{"  "}</span>
            <span className="text-[#6366F1]">&quot;payment&quot;</span>
            <span className="text-[#9CA3AF]">: </span>
            <span className="text-[#ABB2BF]">{"{"}</span>
          </div>
          <JsonLine indent={2} keyName="currency" value="ETH" valueType="string" />
          <JsonLine indent={2} keyName="amount" value={defaultPrice} valueType="number" />
          <JsonLine indent={2} keyName="wallet" value={payee} valueType="string" isLast />
          <JsonLine indent={1} value="}," valueType="bracket" />
          <div>
            <span className="text-[#9CA3AF]">{"  "}</span>
            <span className="text-[#6366F1]">&quot;tools&quot;</span>
            <span className="text-[#9CA3AF]">: </span>
            <span className="text-[#ABB2BF]">[</span>
          </div>
          {tools.length === 0 ? (
            <div className="text-[#6B7280] text-[11px] px-4 py-1 italic">
              {/* tools loaded from manifest after URL validation */}
              <span>    </span>
              <span className="text-[#566070]">{"// tools auto-populated from manifest"}</span>
            </div>
          ) : (
            tools.map((tool, i) => (
              <div key={tool.name}>
                <JsonLine indent={2} value="{" valueType="bracket" />
                <JsonLine indent={3} keyName="name" value={tool.name} valueType="string" />
                {tool.price && <JsonLine indent={3} keyName="price" value={tool.price} valueType="number" isLast={!tool.description} />}
                {tool.description && <JsonLine indent={3} keyName="description" value={tool.description} valueType="string" isLast />}
                <JsonLine indent={2} value={i < tools.length - 1 ? "}," : "}"} valueType="bracket" />
              </div>
            ))
          )}
          <JsonLine indent={1} value="]" valueType="bracket" isLast />
          <JsonLine indent={0} value="}" valueType="bracket" isLast />
        </pre>
      </div>

      {/* Footer */}
      <div className="bg-surface-subtle border-t border-border-light px-4 py-3">
        <p className="text-xs text-text-muted text-center">
          This file will be served at{" "}
          <span className="font-mono">/.well-known/tollgate.json</span> on your MCP server
        </p>
      </div>
    </div>
  );
}
