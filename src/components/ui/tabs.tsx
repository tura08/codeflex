"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Customized shadcn Tabs:
 * - TabsList: muted bar with bottom border
 * - TabsTrigger (active): no bottom border (only top + sides), bg on active
 */

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("border-b bg-muted/10 px-6 flex gap-2", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "px-4 py-2 text-sm rounded-t-md transition-colors",
        "text-muted-foreground hover:text-foreground",
        // Active: background + top/sides border only (no bottom border)
        "data-[state=active]:bg-background",
        "data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-muted-foreground/30",
        "data-[state=active]:font-medium",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
