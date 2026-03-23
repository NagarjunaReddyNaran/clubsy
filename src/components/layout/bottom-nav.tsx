"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, CreditCard, Bell, Users, FileText } from "lucide-react";

interface BottomNavProps {
  role: "ADMIN" | "USER";
  unreadCount?: number;
}

const userTabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/plans", label: "Plans", icon: Package },
  { href: "/dashboard/membership", label: "Membership", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Alerts", icon: Bell },
];

const adminTabs = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/memberships", label: "Members", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: FileText },
  { href: "/admin/plans", label: "Plans", icon: Package },
];

export function BottomNav({ role, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const tabs = role === "ADMIN" ? adminTabs : userTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 sm:hidden safe-area-pb">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href));
          const showBadge = href === "/dashboard/notifications" && unreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors relative",
                isActive ? "text-blue-600" : "text-gray-500"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="truncate max-w-[52px]">{label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
