import type { Metadata } from "next";
import RegisterForm from "~~/components/RegisterForm";

export const metadata: Metadata = {
  title: "Register a service — Tollgate",
  description: "Publish your MCP server or REST API to the Tollgate ENS registry.",
};

export default function RegisterPage() {
  return (
    <div className="py-[72px]">
      <RegisterForm />
    </div>
  );
}
