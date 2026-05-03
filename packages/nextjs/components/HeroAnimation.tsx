export default function HeroAnimation() {
  return (
    <div className="w-full max-w-[680px] mx-auto my-12 overflow-visible">
      <svg
        viewBox="0 0 660 155"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        aria-label="Tollgate flow: Agent resolves ENS, fetches manifest, pays USDC, MCP returns validated data"
      >
        <defs>
          <style>{`
            @keyframes coinSlide {
              0%   { transform: translateX(0px);  opacity: 0; }
              6%   { opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateX(76px); opacity: 0; }
            }
            .coin-group { animation: coinSlide 3s ease-in-out 0s infinite; }

            @keyframes mcpFlash {
              0%, 72%, 100% { fill: #EEF2FF; }
              80%, 90%       { fill: #ECFDF5; }
            }
            .mcp-bg { animation: mcpFlash 3s ease-in-out 0s infinite; }
          `}</style>

          {/* Arrow markers */}
          <marker id="ag-gray" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#D1D5DB" />
          </marker>
          <marker id="ag-indigo" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#6366F1" />
          </marker>
          <marker id="ag-emerald-left" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M8,0 L0,3 L8,6 Z" fill="#10B981" />
          </marker>
        </defs>

        {/* ── Arrows (behind nodes) ── */}

        {/* Agent → ENS */}
        <line x1="82" y1="73" x2="179" y2="73" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ag-gray)" />
        <text x="130" y="61" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
          resolve name
        </text>

        {/* ENS → Manifest */}
        <line x1="232" y1="73" x2="328" y2="73" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ag-gray)" />
        <text x="280" y="61" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
          fetch manifest
        </text>

        {/* Manifest → MCP (solid indigo) */}
        <line x1="412" y1="73" x2="492" y2="73" stroke="#6366F1" strokeWidth="2" markerEnd="url(#ag-indigo)" />
        <text x="452" y="61" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
          pay 0.01 USDC
        </text>

        {/* Return arrow (below) */}
        <line x1="590" y1="120" x2="82" y2="120" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ag-emerald-left)" />
        <text x="336" y="138" textAnchor="middle" fill="#10B981" fontSize="10" fontFamily="Inter, sans-serif" fontStyle="italic">
          validated data ✓
        </text>

        {/* ── Node 1: Agent (circle) ── */}
        <circle cx="55" cy="73" r="27" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
        <text x="55" y="69" textAnchor="middle" fontSize="18">🤖</text>
        <text x="55" y="81" textAnchor="middle" fill="#4F46E5" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="700">
          AGENT
        </text>
        <text x="55" y="112" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
          AI Agent
        </text>

        {/* ── Node 2: ENS (hexagon) ── */}
        <polygon
          points="205,46 228,59 228,86 205,99 182,86 182,59"
          fill="#F0FDF4"
          stroke="#10B981"
          strokeWidth="2"
        />
        <text x="205" y="70" textAnchor="middle" fontSize="16">⬡</text>
        <text x="205" y="80" textAnchor="middle" fill="#065F46" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="700">
          ENS
        </text>
        <text x="205" y="112" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
          ENS Name
        </text>

        {/* ── Node 3: Manifest (rounded rect) ── */}
        <rect x="328" y="51" width="84" height="44" rx="6" ry="6" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2" />
        <text x="370" y="72" textAnchor="middle" fill="#92400E" fontSize="12" fontFamily="'JetBrains Mono', monospace">
          {`{ tools }`}
        </text>
        <text x="370" y="112" textAnchor="middle" fill="#9CA3AF" fontSize="9" fontFamily="Inter, sans-serif">
          Tollgate Contract
        </text>

        {/* ── Node 4: MCP (rounded rect, flashing) ── */}
        <rect className="mcp-bg" x="492" y="51" width="98" height="44" rx="6" ry="6" stroke="#6366F1" strokeWidth="2" />
        <text x="541" y="70" textAnchor="middle" fill="#4F46E5" fontSize="10" fontFamily="'JetBrains Mono', monospace">
          MCP Server
        </text>
        <text x="541" y="83" textAnchor="middle" fill="#9CA3AF" fontSize="9" fontFamily="Inter, sans-serif">
          get_price()
        </text>
        <text x="541" y="112" textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
          MCP Server
        </text>

        {/* ── Animated USDC coin ── */}
        <g className="coin-group" transform="translate(414, 65)">
          <circle r="9" cx="0" cy="0" fill="#10B981" />
          <text y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Inter, sans-serif">
            $
          </text>
        </g>
      </svg>
    </div>
  );
}
