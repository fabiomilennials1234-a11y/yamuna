"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { MENU_CONFIG } from "@/config/menu"
import Image from "next/image"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  modules: string[];
  tenantName?: string;
}

export function AppSidebar({ user, modules, tenantName = "Yamuna", ...props }: AppSidebarProps) {
  // Filter menu based on modules
  const navItems = React.useMemo(() => {
    return MENU_CONFIG.filter(item => {
      if (!modules || modules.length === 0) return true;
      // 'dashboard' is usually available if they are logged in, but check logic
      if (item.moduleNeeded === 'dashboard') return true;
      return modules.includes(item.moduleNeeded);
    }).map(item => ({
      title: item.label,
      url: item.path,
      icon: item.icon,
    }))
  }, [modules]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!p-2"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-600/20 text-sidebar-primary-foreground min-w-8">
                <Image src="/logos/favicon.png" alt="Yamuna Logo" width={32} height={32} className="size-5 object-contain" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                <span className="truncate font-bold text-lg">{tenantName}</span>
                <span className="truncate text-xs text-muted-foreground">Enterprise</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
