"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Megaphone,
  FileText,
  ClipboardList,
  Upload,
  ShieldCheck,
  UserCircle,
  Settings,
  Zap,
  MoreHorizontal,
  Building2,
  MessageSquare,
} from "lucide-react";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  unreadCount?: number;
  clubName?: string | null;
  clubLogoUrl?: string | null;
}

// Primary admin items always visible in desktop nav
const adminPrimaryItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/plans", label: "Plans", icon: Package },
  { href: "/admin/memberships", label: "Memberships", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: FileText },
];

// Secondary admin items shown in "More" dropdown on desktop
const adminSecondaryItems = [
  { href: "/admin/extensions", label: "Extensions", icon: ClipboardList },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
  { href: "/admin/contact", label: "Contact", icon: MessageSquare },
];

const adminNavItems = [...adminPrimaryItems, ...adminSecondaryItems];

const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/plans", label: "Plans", icon: Package },
  { href: "/dashboard/membership", label: "Membership", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export function Navbar({ user, unreadCount = 0, clubName, clubLogoUrl }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = user.role === "ADMIN";
  const navItems = isAdmin ? adminNavItems : userNavItems;
  const primaryItems = isAdmin ? adminPrimaryItems : userNavItems;
  const secondaryItems = isAdmin ? adminSecondaryItems : [];
  const isSecondaryActive = secondaryItems.some((item) => pathname === item.href);

  function navLinkClass(href: string) {
    return cn(
      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative",
      pathname === href
        ? "bg-blue-50 text-blue-700"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    );
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">

          {/* ── Brand area ── */}
          <Link
            href={isAdmin ? "/admin" : "/dashboard"}
            className="flex items-center gap-2 flex-shrink-0"
          >
            {/* App icon — always visible */}
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            {/* Dual brand: "Clubsy | Club Name" */}
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-lg font-bold text-gray-900 flex-shrink-0">Clubsy</span>

              {clubName && (
                <>
                  {/* Divider */}
                  <span className="text-gray-300 font-light select-none flex-shrink-0">|</span>

                  {/* Optional club logo thumbnail */}
                  {clubLogoUrl && (
                    <img
                      src={clubLogoUrl}
                      alt=""
                      className="w-5 h-5 rounded object-cover flex-shrink-0"
                    />
                  )}

                  {/* Club name — no truncation, full name visible */}
                  <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                    {clubName}
                  </span>
                </>
              )}

              {isAdmin && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  Admin
                </span>
              )}
            </div>

            {/* Mobile: show club name below app name if present */}
            <div className="flex sm:hidden flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 leading-tight">Clubsy</span>
              {clubName && (
                <span className="text-xs text-gray-400 leading-tight">
                  {clubName}
                </span>
              )}
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 mx-4">
            {primaryItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xl:inline">{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}

            {/* Admin "More" dropdown for secondary items */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isSecondaryActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <MoreHorizontal className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden xl:inline">More</span>
                  <ChevronDown className="hidden xl:inline w-3.5 h-3.5" />
                </button>
                {moreOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                    <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                      {secondaryItems.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                            pathname === href
                              ? "text-blue-700 bg-blue-50"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2">
            {/* Mobile notification bell for users */}
            {!isAdmin && unreadCount > 0 && (
              <Link href="/dashboard/notifications" className="lg:hidden relative p-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </Link>
            )}

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-semibold text-sm">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden xl:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {/* User identity */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Club context + switcher placeholder */}
                    {clubName && (
                      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {clubLogoUrl ? (
                            <img src={clubLogoUrl} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-500 truncate">{clubName}</span>
                        </div>
                        {/* Club switcher — future feature */}
                        <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0 cursor-default" title="Multi-club support coming soon">
                          Soon
                        </span>
                      </div>
                    )}

                    {/* Navigation links */}
                    {isAdmin ? (
                      <>
                        <Link
                          href="/admin/settings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Club Settings
                        </Link>
                        <Link
                          href="/admin/billing"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          Billing
                        </Link>
                      </>
                    ) : (
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        Profile
                      </Link>
                    )}

                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-50"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Nav ── */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          {/* Club identity strip */}
          {clubName && (
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
              {clubLogoUrl ? (
                <img src={clubLogoUrl} alt="" className="w-7 h-7 rounded object-cover" />
              ) : (
                <div className="w-7 h-7 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-blue-500" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-700">{clubName}</p>
                <p className="text-xs text-gray-400">powered by Clubsy</p>
              </div>
            </div>
          )}

          <div className="px-4 py-2 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium relative",
                  pathname === href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin && (
              <>
                <Link href="/admin/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  <Settings className="w-4 h-4" /> Club Settings
                </Link>
                <Link href="/admin/billing" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  <Zap className="w-4 h-4" /> Billing
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
