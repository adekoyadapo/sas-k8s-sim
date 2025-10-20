"use client";
import * as Dialog from "@radix-ui/react-dialog";
import ThemeToggle from "./ThemeToggle";

export default function MobileDrawer({ auth, onLogout }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button aria-label="Open menu" className="lg:hidden btn-muted h-8 px-3">Menu</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-0 top-0 z-50 h-full w-72 translate-x-0 bg-white p-4 shadow-xl outline-none dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <img src="/logo.svg" alt="logo" className="h-6 w-6" />
              SaaS Simulator
            </a>
            <Dialog.Close asChild>
              <button className="btn-muted h-8 px-3">Close</button>
            </Dialog.Close>
          </div>
          <nav className="mt-6 flex flex-col gap-2 text-sm">
            <a className="hover:underline" href="/dashboard">Dashboard</a>
            {!auth && <a className="hover:underline" href="/login">Login</a>}
            {!auth && <a className="hover:underline" href="/register">Register</a>}
          </nav>
          <div className="mt-6 flex items-center gap-2">
            <ThemeToggle />
            {auth && <button className="btn-muted h-8 px-3" onClick={onLogout}>Logout</button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

