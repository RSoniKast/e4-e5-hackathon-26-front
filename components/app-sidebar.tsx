"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  DoorClosed,
  Users,
  GraduationCap,
  Activity,
  Eye,
  School,
  ChevronsUpDown,
  LogOut,
  Settings,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Sites & Bâtiments", icon: MapPin, href: "/dashboard" },
  { label: "Salles de classe", icon: DoorClosed, href: "/dashboard/salles" },
  { label: "Personnels", icon: Users, href: "/dashboard/personnels" },
  { label: "Classes & Élèves", icon: GraduationCap, href: "/dashboard/classes" },
  { label: "Monitoring centrales", icon: Activity, href: "/dashboard/monitoring" },
  { label: "Visualisation salles", icon: Eye, href: "/dashboard/visualisation" },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const displayName = user ? user.username : "...";
  const initials = user
    ? user.username
      .split(".")
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2)
    : "??";

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              size="lg"
              className="flex-1"
              render={<Link href="/dashboard" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10">
                <School className="size-5" />
              </div>
              <span className="font-heading text-base font-semibold">
                ClassroomObserv
              </span>
            </SidebarMenuButton>
            <ModeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={!!item.href && pathname === item.href}
                    tooltip={item.label}
                    render={item.href ? <Link href={item.href} /> : undefined}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <SidebarMenuButton size="lg" render={<DropdownMenuTrigger />}>
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.role ?? ""}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
              <DropdownMenuContent
                className="w-(--anchor-width) min-w-56"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Settings />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={logout}
                  >
                    <LogOut />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
