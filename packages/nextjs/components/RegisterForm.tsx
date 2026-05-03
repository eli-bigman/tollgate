"use client";

import { useState, useEffect, useCallback } from "react";
import ManifestPreview from "./ManifestPreview";
import type { ManifestData } from "~~/types";
import { Plug, Globe, Check } from "lucide-react";

type ServiceType = "MCP" | "API";

type ValidationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; toolCount: number; toolSummary: string; manifest: ManifestData }
  | { status: "error"; message: string };

export default function RegisterForm() {
  const [serviceType, setServiceType] = useState<ServiceType>("MCP");
  const [subdomain, setSubdomain] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [manifestUrl, setManifestUrl] = useState("");
  const [price, setPrice] = useState("0.01");
  const [payeeWallet, setPayeeWallet] = useState("");
  const [description, setDescription] = useState("");
  const [validation, setValidation] = useState<ValidationState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-populate manifest URL from endpoint
  useEffect(() => {
    if (endpointUrl) {
      const base = endpointUrl.replace(/\/$/, "");
      setManifestUrl(`${base}/.well-known/tollgate.json`);
    } else {
      setManifestUrl("");
    }
  }, [endpointUrl]);

  // Debounced manifest validation — always via server proxy (no direct browser fetch)
  const validateManifest = useCallback(async (url: string) => {
    if (!url) {
      setValidation({ status: "idle" });
      return;
    }
    setValidation({ status: "loading" });
    try {
      const res = await fetch(`/api/manifest/fetch?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ManifestData = await res.json();
      const toolCount = data.tools?.length ?? 0;
      const toolSummary =
        toolCount > 0
          ? data.tools!.slice(0, 3)
              .map((t) => `${t.name} (${t.price ?? "??"})`)
              .join(", ")
          : "No tools found";
      setValidation({ status: "success", toolCount, toolSummary, manifest: data });
    } catch {
      setValidation({
        status: "error",
        message: `No manifest found at ${url}. Deploy your MCP server first.`,
      });
    }
  }, []);

  useEffect(() => {
    if (!manifestUrl) {
      setValidation({ status: "idle" });
      return;
    }
    const timer = setTimeout(() => validateManifest(manifestUrl), 500);
    return () => clearTimeout(timer);
  }, [manifestUrl, validateManifest]);

  function handleSubmit() {
    setIsSubmitting(true);
    // POST to /api/ens/register (stub — wires to L2Registrar later)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  }

  const activeManifest = validation.status === "success" ? validation.manifest : null;

  if (isSuccess) {
    return (
      <div className="max-w-[900px] mx-auto px-6 flex items-center justify-center py-20">
        <div className="text-center bg-[#F0FDF4] border border-[#D1FAE5] rounded-xl p-10 max-w-md w-full">
          <div className="w-12 h-12 rounded-full bg-on-secondary-container flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mt-2">Registered!</h2>
          <p className="font-mono text-sm bg-accent-indigo-light text-primary px-3 py-1 rounded mt-3 inline-block">
            {subdomain || "yourservice"}.tollgate.eth
          </p>
          <p className="text-sm text-text-secondary mt-3 leading-relaxed">
            Agents can now discover your MCP, read your manifest, and pay per tool call.
          </p>
          <div className="flex justify-center gap-4 mt-6 text-sm text-primary">
            <a href="#" className="hover:underline">View on ENS ↗</a>
            <button
              onClick={() => { setIsSuccess(false); setSubdomain(""); setEndpointUrl(""); }}
              className="hover:underline"
            >
              Register Another
            </button>
            <a href="/" className="hover:underline">View Directory</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-6">
      {/* Page header */}
      <div className="mb-10">
        <a href="/" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
          ← Directory
        </a>
        <h1 className="text-3xl font-bold text-text-primary mt-2">Register a service</h1>
        <p className="text-base text-text-secondary mt-2">
          Publish your MCP server as an ENS subname. Your manifest defines the contract.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12">
        {/* ── LEFT: Form ── */}
        <div className="space-y-7">
          {/* Service type toggle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Service Type
            </label>
            <div className="flex gap-3">
              {(["MCP", "API"] as ServiceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setServiceType(type)}
                  className={`flex-1 border-2 rounded-xl p-4 text-center transition-colors cursor-pointer ${
                    serviceType === type
                      ? "border-primary bg-accent-indigo-light"
                      : "border-border-strong bg-white hover:border-primary/50"
                  }`}
                >
                  <span className="mb-1 flex justify-center text-current">{type === "MCP" ? <Plug className="w-6 h-6" /> : <Globe className="w-6 h-6" />}</span>
                  <span className={`block font-semibold text-sm ${serviceType === type ? "text-primary" : "text-text-primary"}`}>
                    {type === "MCP" ? "MCP Server" : "REST API"}
                  </span>
                  <span className="block text-xs text-text-secondary mt-0.5">
                    {type === "MCP" ? "Tools agents call via MCP" : "Standard endpoints"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ENS subdomain */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              ENS Subdomain
            </label>
            <div className="flex">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-service"
                className="flex-1 border border-border-strong border-r-0 rounded-l-lg px-4 py-2.5 font-mono text-sm text-text-primary bg-surface-subtle focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <span className="bg-surface-subtle border border-border-strong rounded-r-lg px-4 py-2.5 font-mono text-sm text-text-secondary flex items-center shrink-0">
                .tollgate.eth
              </span>
            </div>
            <p className="text-xs text-text-muted">Lowercase letters and hyphens only.</p>
          </div>

          {/* Endpoint URL */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Endpoint URL
              {validation.status === "success" && (
                <span className="flex items-center gap-1 bg-on-secondary-container text-white text-[10px] px-2 py-0.5 rounded-full normal-case font-medium">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Manifest Valid
                </span>
              )}
            </label>
            <input
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://your-mcp-server.railway.app"
              className={`w-full border rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary focus:outline-none focus:ring-1 transition-colors ${
                validation.status === "success"
                  ? "border-on-secondary-container focus:ring-on-secondary-container bg-accent-emerald-bg/20"
                  : "border-border-strong focus:ring-primary focus:border-primary"
              }`}
            />

            {/* Validation feedback */}
            {validation.status === "loading" && (
              <p className="text-xs text-text-muted flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                Checking manifest…
              </p>
            )}
            {validation.status === "success" && (
              <div className="bg-[#F0FDF4] border border-[#D1FAE5] rounded-lg p-3">
                <p className="text-sm font-medium text-[#065F46]">✓ Manifest found</p>
                <p className="text-xs text-text-secondary mt-1">
                  {validation.toolCount} tool{validation.toolCount !== 1 ? "s" : ""} detected:{" "}
                  {validation.toolSummary}
                </p>
              </div>
            )}
            {validation.status === "error" && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3">
                <p className="text-sm font-medium text-[#991B1B]">✗ {validation.message}</p>
                <p className="text-xs text-text-muted mt-1">
                  See docs for manifest spec.
                </p>
              </div>
            )}
          </div>

          {/* Manifest URL (auto-filled) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Manifest URL
            </label>
            <input
              type="text"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
              placeholder="{endpoint}/.well-known/tollgate.json"
              className="w-full border border-border-strong rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary bg-surface-subtle focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-text-muted">
              Agents fetch this to read your tool contracts.
            </p>
          </div>

          {/* Price + Payee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Default Price (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-text-secondary font-mono text-sm">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.001"
                  min="0"
                  placeholder="0.01"
                  className="w-full border border-border-strong rounded-lg pl-7 pr-14 py-2.5 font-mono text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <span className="absolute right-3 top-2.5 text-text-muted font-mono text-xs">USDC</span>
              </div>
              <p className="text-xs text-text-muted">Tools can override in manifest.</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Payment Wallet
                <button
                  onClick={() => setPayeeWallet("0x0000000000000000000000000000000000000000")}
                  className="normal-case text-xs font-medium text-primary hover:underline"
                >
                  Fill from wallet
                </button>
              </label>
              <input
                type="text"
                value={payeeWallet}
                onChange={(e) => setPayeeWallet(e.target.value)}
                placeholder="0x..."
                className="w-full border border-border-strong rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-border-light">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors shadow-card hover:shadow-card-hover disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering…
                </>
              ) : (
                "Register on ENS →"
              )}
            </button>
            <p className="text-center text-xs text-text-muted mt-2">
              Requires a small gas fee on Base Sepolia.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Manifest Preview ── */}
        <div className="lg:sticky lg:top-20 self-start">
          <ManifestPreview
            subdomain={subdomain}
            serviceType={serviceType}
            endpointUrl={endpointUrl}
            price={price}
            payeeWallet={payeeWallet}
            manifest={activeManifest}
          />
        </div>
      </div>
    </div>
  );
}
