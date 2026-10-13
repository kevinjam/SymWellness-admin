import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Library,
  Newspaper,
  SlidersHorizontal,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: 'Core' | 'Product' | 'Operations' | 'Governance';
  /** Search keywords for the command palette. */
  keywords?: string;
}

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Core', keywords: 'home dashboard kpi' },
  { id: 'users', label: 'Users', icon: Users, group: 'Core', keywords: 'patients doctors accounts' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, group: 'Core', keywords: 'billing revenue plans stripe' },
  { id: 'usage', label: 'Usage & AI', icon: Sparkles, group: 'Product', keywords: 'features thesis scans analytics' },
  { id: 'catalogs', label: 'Catalogs', icon: Library, group: 'Product', keywords: 'categories dosage forms faq' },
  { id: 'content', label: 'Content', icon: Newspaper, group: 'Product', keywords: 'daily insights' },
  { id: 'controls', label: 'App controls', icon: SlidersHorizontal, group: 'Operations', keywords: 'maintenance kill switch feature flags disable' },
  { id: 'support', label: 'Support inbox', icon: LifeBuoy, group: 'Operations', keywords: 'tickets bugs messages' },
  { id: 'care', label: 'Care network', icon: Stethoscope, group: 'Operations', keywords: 'doctors clinics providers' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Operations', keywords: 'push' },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck, group: 'Governance', keywords: 'deletion audit privacy gdpr hipaa' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Governance', keywords: 'theme account api' },
];

export const NAV_GROUPS = ['Core', 'Product', 'Operations', 'Governance'] as const;
