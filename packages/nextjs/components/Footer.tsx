const FOOTER_LINKS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "GitHub Repository", href: "https://github.com" },
  { label: "Discord Support", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 w-full py-12 border-t border-gray-200 mb-9">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <span className="text-xs text-gray-500">© 2024 Tollgate. The MCP Manifest Authority.</span>
        <nav className="flex flex-wrap justify-center gap-4">
          {FOOTER_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-xs text-gray-500 hover:text-indigo-600 underline decoration-indigo-500/30 underline-offset-4 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
