"use client";

import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export default function CopyLinkButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/portfolio/${username}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleCopy} className="btn-secondary !py-2 !px-4 text-xs">
      {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
    </button>
  );
}
