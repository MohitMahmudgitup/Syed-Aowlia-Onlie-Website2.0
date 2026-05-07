/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { Bell, Menu, MoreVertical, User, Settings, ChevronDown } from "lucide-react";
import { RiBarChartHorizontalLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./Sidebar";
import { IoAdd, IoLink } from "react-icons/io5";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logoutUser, selectCurrentUser } from "@/redux/featured/auth/authSlice";
import { useLogoutMutation } from "@/redux/featured/auth/authApi";
import { signOut } from "next-auth/react";

type TopNavbarProps  = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function TopNavbar({ isSidebarOpen, toggleSidebar }: TopNavbarProps) {
  const [open, setOpen] = useState(false);
  const currentUser = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    if (currentUser?._id) {
      try {
        await logout(currentUser._id).unwrap();
      } catch (err) {}
    }
    dispatch(logoutUser());
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <div className="flex items-center w-full justify-between gap-4 px-4 py-2.5 md:px-6 lg:px-8 bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">

      {/* Left — Sidebar toggle */}
      <div className="flex items-center gap-3">
        {/* Mobile sheet trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 hover:bg-gray-100 rounded-xl"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar isOpen={open} onClose={() => setOpen(false)} isCollapsed={false} />
          </SheetContent>
        </Sheet>

        {/* Desktop toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-9 w-9 hover:bg-gray-100 rounded-xl"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <RiBarChartHorizontalLine className="h-5 w-5 text-gray-500" />
        </Button>

        {/* Page breadcrumb / brand hint (optional, desktop only) */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest select-none">
            Dashboard
          </span>
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">

        {/* CTA Buttons — hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <Link href={`/admin/create-shop`} className="hidden md:inline-block">
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 shadow-sm transition-all duration-150"
            >
              <IoAdd className="h-3.5 w-3.5" />
              Create Shop
            </Button>
          </Link>
          <Link href={`${process.env.NEXT_PUBLIC_CUSTOMER_URL}`} target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium px-3 transition-all duration-150"
            >
              <IoLink className="h-3.5 w-3.5" />
              Visit Site
            </Button>
          </Link>
        </div>

        {/* Divider */}
        <div className="hidden md:block h-6 w-px bg-gray-200 mx-1" />

        {/* Settings icon — desktop */}
        <Link href="/admin/shop-setting" className="hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>

        {/* Notification bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 relative transition-all duration-150"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-xl border border-gray-100 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-semibold text-gray-800">Notifications</span>
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-600 border-0">3 new</Badge>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: "🛒", title: "New order received", time: "2m ago", unread: true },
                { icon: "💬", title: "Customer left a review", time: "1h ago", unread: true },
                { icon: "⚠️", title: "Low stock alert: Nike Air", time: "3h ago", unread: false },
              ].map((n, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${n.unread ? "bg-blue-50/40" : ""}`}
                >
                  <span className="text-lg mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                  {n.unread && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t bg-gray-50">
              <button className="text-xs text-blue-600 font-medium hover:underline w-full text-center">
                View all notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ml-0.5"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8 ring-2 ring-gray-100">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                  {currentUser?.name?.[0]?.toUpperCase() ?? <User className="h-3.5 w-3.5" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start leading-none">
                <span className="text-sm font-semibold text-gray-800 max-w-[120px] truncate">
                  {currentUser?.name ?? "User"}
                </span>
                <span className="text-xs text-gray-400 max-w-[120px] truncate mt-0.5">
                  {currentUser?.email ?? ""}
                </span>
              </div>
              <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-gray-400 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border border-gray-100 p-1.5">
            <div className="px-3 py-2.5 mb-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{currentUser?.name}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{currentUser?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-gray-100 my-1" />
            <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Link href="/admin/profile" className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-gray-400" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Link href="/admin/shop-setting" className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100 my-1" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2.5"
            >
              <span className="text-base leading-none">🚪</span>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile overflow menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="More options"
                className="h-9 w-9 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-56 rounded-xl border border-gray-100 shadow-xl p-1.5">
              <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Link href="/admin/create-shop" className="flex items-center gap-2.5">
                  <IoAdd className="h-4 w-4 text-gray-400" />
                  Create Shop
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Link href="https://mega-mart.store" target="_blank" className="flex items-center gap-2.5">
                  <IoLink className="h-4 w-4 text-gray-400" />
                  Visit Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100 my-1" />
              <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Link href="/admin/shop-setting" className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-gray-400" />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}