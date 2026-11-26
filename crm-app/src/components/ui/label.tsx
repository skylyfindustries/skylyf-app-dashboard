import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Building2, User, Phone, Mail, Globe, MapPin, Home, Hash, FileText, CreditCard, Calendar, Clock,
  IndianRupee, Package, Tag, Cog, Briefcase, Lock, Shield, Landmark, Image, StickyNote, Percent,
  Truck, Layers, ListOrdered, Activity, type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "mb-1.5 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

// First match wins. Picks an icon from the label text so every field header gets one.
const ICONS: [RegExp, LucideIcon][] = [
  [/email/i, Mail],
  [/password/i, Lock],
  [/role|permission/i, Shield],
  [/phone|mobile|whatsapp/i, Phone],
  [/website|url/i, Globe],
  [/logo/i, Image],
  [/ifsc|bank|branch|account/i, Landmark],
  [/gst|pan\b|invoice|quotation|proforma|footer|title/i, FileText],
  [/address/i, Home],
  [/city|state|location|rack|bin/i, MapPin],
  [/pincode|pin code|zip|quantity|qty|reorder|level|job no|number|sku|code/i, Hash],
  [/price|amount|rate|cost|₹|tax/i, IndianRupee],
  [/percent|%/i, Percent],
  [/date|from|to\b|delivered|due/i, Calendar],
  [/time/i, Clock],
  [/supplier|vendor/i, Truck],
  [/category|type|model/i, Tag],
  [/unit/i, Layers],
  [/status/i, Activity],
  [/department|designation/i, Briefcase],
  [/machine/i, Cog],
  [/company|client|customer|name/i, Building2],
  [/who|person|taking|returning|contact|user/i, User],
  [/part|item|product/i, Package],
  [/term|order/i, ListOrdered],
  [/note|reason|why|description|instruction|message|adjust/i, StickyNote],
  [/card|payment/i, CreditCard],
];

const textOf = (c: React.ReactNode): string | null => {
  const parts = React.Children.toArray(c);
  if (parts.some((p) => React.isValidElement(p))) return null; // already has its own icon / markup
  return parts.join("");
};

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & { icon?: LucideIcon | false }
>(({ className, children, icon, ...props }, ref) => {
  const text = textOf(children);
  const Icon = icon === false || text === null ? null : icon || ICONS.find(([re]) => re.test(text))?.[1] || null;
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), Icon && "flex items-center gap-1.5", className)}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      {children}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
