import {
    LayoutDashboard,
    ShoppingBag,
    Facebook,
    Search,
    Filter,
    DollarSign,
    BarChart,
    Users,
    Target,
    Share2,
    Activity,
    ShieldAlert
} from "lucide-react";

export type ModuleKey =
    | 'dashboard'
    | 'checkin_loja'
    | 'meta_ads'
    | 'google_ads'
    | 'funil_loja'
    | 'finance'
    | 'curva_abc'
    | 'rfm'
    | 'ga4_audience'
    | 'ga4_source'
    | 'api_diag'
    | 'super_admin';

export interface MenuItem {
    key: ModuleKey;
    label: string;
    path: string;
    icon: any;
    moduleNeeded: string; // The specific module string in DB that enables this
}

export const MENU_CONFIG: MenuItem[] = [
    {
        key: 'checkin_loja',
        label: 'Check-in Loja Virtual',
        path: '/dashboard',
        icon: ShoppingBag,
        moduleNeeded: 'dashboard' // Basic access
    },
    {
        key: 'meta_ads',
        label: 'Meta Ads - Criativos',
        path: '/meta-ads',
        icon: Facebook,
        moduleNeeded: 'meta_ads'
    },
    {
        key: 'google_ads',
        label: 'Google Ads',
        path: '/google-ads',
        icon: Search,
        moduleNeeded: 'google_ads'
    },
    {
        key: 'funil_loja',
        label: 'Funil Loja Virtual',
        path: '/funnel',
        icon: Filter,
        moduleNeeded: 'wake_commerce'
    },
    {
        key: 'finance',
        label: 'Indicadores Financeiros',
        path: '/finance',
        icon: DollarSign,
        moduleNeeded: 'finance'
    },
    {
        key: 'curva_abc',
        label: 'Curva ABC (Tiny)',
        path: '/products',
        icon: BarChart,
        moduleNeeded: 'tiny_erp'
    },
    {
        key: 'rfm',
        label: 'RFM - Clientes',
        path: '/rfm',
        icon: Users,
        moduleNeeded: 'rfm'
    },
    {
        key: 'ga4_audience',
        label: 'Público-alvo (GA4)',
        path: '/publico-alvo',
        icon: Target,
        moduleNeeded: 'ga4'
    },
    {
        key: 'ga4_source',
        label: 'Origem/Mídia (GA4)',
        path: '/origem-midia',
        icon: Share2,
        moduleNeeded: 'ga4'
    },
    {
        key: 'api_diag',
        label: 'Diagnóstico de API',
        path: '/diagnostics',
        icon: Activity,
        moduleNeeded: 'dashboard'
    },
    {
        key: 'super_admin',
        label: 'Super Admin',
        path: '/admin',
        icon: ShieldAlert,
        moduleNeeded: 'super_admin'
    }
];
