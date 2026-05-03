"use client";

export default function HeroBackground() {
  return (
    <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[100vw] h-full -z-10 pointer-events-none select-none overflow-hidden flex justify-center bg-white">
      <svg
        className="w-full h-full opacity-70 object-cover"
        viewBox="0 0 1200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Outer Lane */}
        <path
          id="laneOuter"
          d="M -50 150 C 100 150, 200 300, 150 400 C 100 500, 300 550, 600 550 C 900 550, 1100 500, 1050 400 C 1000 300, 1100 150, 1250 150"
          stroke="#F3F4F6"
          strokeWidth="32"
          strokeLinecap="round"
        />

        {/* Inner Lane */}
        <path
          id="laneInner"
          d="M -50 100 C 140 100, 250 250, 200 350 C 150 450, 300 500, 600 500 C 900 500, 1050 450, 1000 350 C 950 250, 1060 100, 1250 100"
          stroke="#F3F4F6"
          strokeWidth="24"
          strokeLinecap="round"
        />

        {/* Tollgate Checkpoint (Covers both lanes at the bottom center) */}
        <rect x="596" y="470" width="8" height="100" rx="4" fill="#E5E7EB" />

        {/* ── Outer Lane Nodes (16s duration, hits center at 50% = 8s) ── */}
        <rect x="-24" y="-12" width="48" height="24" rx="12">
          <animate attributeName="fill" values="#6366F1;#6366F1;#10B981;#10B981;#6366F1;#6366F1" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="16s" repeatCount="indefinite" begin="0s" />
          <animate attributeName="opacity" values="0.2;0.2;0.6;0.6;0.2;0.2" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="16s" repeatCount="indefinite" begin="0s" />
          <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" begin="0s">
            <mpath href="#laneOuter" />
          </animateMotion>
        </rect>
        
        {/* Outer Lane Ripple 1 */}
        <circle cx="600" cy="550" r="0" fill="none" stroke="#10B981" strokeWidth="3">
          <animate attributeName="r" values="0;0;40;40" keyTimes="0;0.49;0.54;1" dur="16s" repeatCount="indefinite" begin="0s" />
          <animate attributeName="opacity" values="0;0;0.5;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="16s" repeatCount="indefinite" begin="0s" />
        </circle>
        {/* Outer Lane Payment Text 1 */}
        <text x="620" y="540" fill="#10B981" fontSize="13" fontWeight="bold" fontFamily="monospace" opacity="0">
          + 0.01 ETH
          <animate attributeName="y" values="540;540;490;490" keyTimes="0;0.49;0.54;1" dur="16s" repeatCount="indefinite" begin="0s" />
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="16s" repeatCount="indefinite" begin="0s" />
        </text>

        <rect x="-24" y="-12" width="48" height="24" rx="12">
          <animate attributeName="fill" values="#6366F1;#6366F1;#F59E0B;#F59E0B;#6366F1;#6366F1" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="16s" repeatCount="indefinite" begin="-8s" />
          <animate attributeName="opacity" values="0.2;0.2;0.6;0.6;0.2;0.2" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="16s" repeatCount="indefinite" begin="-8s" />
          <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" begin="-8s">
            <mpath href="#laneOuter" />
          </animateMotion>
        </rect>
        
        {/* Outer Lane Ripple 2 */}
        <circle cx="600" cy="550" r="0" fill="none" stroke="#F59E0B" strokeWidth="3">
          <animate attributeName="r" values="0;0;40;40" keyTimes="0;0.49;0.54;1" dur="16s" repeatCount="indefinite" begin="-8s" />
          <animate attributeName="opacity" values="0;0;0.5;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="16s" repeatCount="indefinite" begin="-8s" />
        </circle>
        {/* Outer Lane Payment Text 2 */}
        <text x="620" y="540" fill="#F59E0B" fontSize="13" fontWeight="bold" fontFamily="monospace" opacity="0">
          + 0.02 ETH
          <animate attributeName="y" values="540;540;490;490" keyTimes="0;0.49;0.54;1" dur="16s" repeatCount="indefinite" begin="-8s" />
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="16s" repeatCount="indefinite" begin="-8s" />
        </text>

        {/* ── Inner Lane Nodes (14s duration, hits center at 50% = 7s) ── */}
        <rect x="-16" y="-8" width="32" height="16" rx="8">
          <animate attributeName="fill" values="#6366F1;#6366F1;#10B981;#10B981;#6366F1;#6366F1" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="14s" repeatCount="indefinite" begin="-2s" />
          <animate attributeName="opacity" values="0.15;0.15;0.5;0.5;0.15;0.15" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="14s" repeatCount="indefinite" begin="-2s" />
          <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" begin="-2s">
            <mpath href="#laneInner" />
          </animateMotion>
        </rect>
        
        {/* Inner Lane Ripple 1 */}
        <circle cx="600" cy="500" r="0" fill="none" stroke="#10B981" strokeWidth="2">
          <animate attributeName="r" values="0;0;30;30" keyTimes="0;0.49;0.54;1" dur="14s" repeatCount="indefinite" begin="-2s" />
          <animate attributeName="opacity" values="0;0;0.5;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="14s" repeatCount="indefinite" begin="-2s" />
        </circle>
        {/* Inner Lane Payment Text 1 */}
        <text x="620" y="490" fill="#10B981" fontSize="12" fontWeight="bold" fontFamily="monospace" opacity="0">
          + 0.01 ETH
          <animate attributeName="y" values="490;490;440;440" keyTimes="0;0.49;0.54;1" dur="14s" repeatCount="indefinite" begin="-2s" />
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="14s" repeatCount="indefinite" begin="-2s" />
        </text>

        <rect x="-16" y="-8" width="32" height="16" rx="8">
          <animate attributeName="fill" values="#6366F1;#6366F1;#10B981;#10B981;#6366F1;#6366F1" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="14s" repeatCount="indefinite" begin="-9s" />
          <animate attributeName="opacity" values="0.15;0.15;0.5;0.5;0.15;0.15" keyTimes="0;0.48;0.50;0.52;0.54;1" dur="14s" repeatCount="indefinite" begin="-9s" />
          <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" begin="-9s">
            <mpath href="#laneInner" />
          </animateMotion>
        </rect>
        
        {/* Inner Lane Ripple 2 */}
        <circle cx="600" cy="500" r="0" fill="none" stroke="#10B981" strokeWidth="2">
          <animate attributeName="r" values="0;0;30;30" keyTimes="0;0.49;0.54;1" dur="14s" repeatCount="indefinite" begin="-9s" />
          <animate attributeName="opacity" values="0;0;0.5;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="14s" repeatCount="indefinite" begin="-9s" />
        </circle>
        {/* Inner Lane Payment Text 2 */}
        <text x="620" y="490" fill="#10B981" fontSize="12" fontWeight="bold" fontFamily="monospace" opacity="0">
          + 0.01 ETH
          <animate attributeName="y" values="490;490;440;440" keyTimes="0;0.49;0.54;1" dur="14s" repeatCount="indefinite" begin="-9s" />
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.49;0.50;0.54;1" dur="14s" repeatCount="indefinite" begin="-9s" />
        </text>

      </svg>
    </div>
  );
}
