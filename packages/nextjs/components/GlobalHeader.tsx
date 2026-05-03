"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletStore } from "~~/store/wallet";

function TollgateLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 2.5L24 8.25V19.75L14 25.5L4 19.75V8.25L14 2.5Z"
        stroke="#6366F1"
        strokeWidth="2"
        fill="none"
      />
      <path d="M8 14H20" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Directory" },
  { href: "/register", label: "Register" },
  { href: "/agent", label: "Agent Demo" },
] as const;

export default function GlobalHeader() {
  const pathname = usePathname();
  const { address, connect, disconnect } = useWalletStore();

  return (
    <header
      className="bg-white/90 backdrop-blur-md sticky top-0 w-full z-50 border-b border-border-light"
      style={{ height: "60px" }}
    >
      <div className="flex items-center justify-between px-6 h-full max-w-container mx-auto">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <TollgateLogo />
          <span className="text-[17px] font-semibold text-text-primary">Tollgate</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-text-primary border-b-2 border-primary pb-0.5 font-medium"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {address ? (
          <button
            onClick={disconnect}
            className="bg-surface-subtle border border-border-strong text-text-primary text-[13px] px-[14px] py-[7px] rounded-md transition-colors font-medium"
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </button>
        ) : (
          <button
            onClick={connect}
            className="bg-primary hover:bg-primary-dark text-white text-[13px] px-[14px] py-[7px] rounded-md transition-colors font-medium"
          >
            Connect
          </button>
        )}
      </div>
    </header>
  );
}
