import { create } from "zustand";

interface WalletState {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  connect: async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          set({ address: accounts[0] });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("Please install MetaMask!");
    }
  },
  disconnect: () => set({ address: null }),
}));
