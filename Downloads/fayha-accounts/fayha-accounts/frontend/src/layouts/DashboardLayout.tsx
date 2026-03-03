import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Calculator,
    Receipt,
    CreditCard,
    Landmark,
    PieChart,
    Settings,
    Menu,
    X,
    Bell,
    Search,
    Users,
    Monitor,
    ChevronDown,
    LogOut,
    UserCircle,
    HelpCircle,
    Moon,
    Maximize2,
    Globe,
    Shield,
    ChevronRight,
    Zap,
    Target,
    UserCheck,
    FolderOpen,
    FileCheck,
    Ship,
    Anchor,
    ClipboardList,
    TrendingUp,
    CircleArrowDown,
    FileInput,
    FileOutput,
    CircleMinus,
    ArrowLeftRight,
    History,
    FileText,
    Package,
    Building,
    FileSpreadsheet,
    Table,
    BookOpen,
    Wallet
} from 'lucide-react';
import { clearAuth, dashboardApi, authApi } from '../services/api';

interface NavChildItem {
    name: string;
    href: string;
}

interface NavItem {
    name: string;
    href: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
    children?: NavChildItem[];
}

interface DashboardLayoutProps {
    onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<{ id: string; title: string; time: string; type: string }[]>([]);
    const [user, setUser] = useState<{ firstName?: string; lastName?: string; email?: string; role?: string } | null>(null);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
    const location = useLocation();

    useEffect(() => {
        dashboardApi.getNotifications()
            .then(data => setNotifications(Array.isArray(data) ? data : []))
            .catch(() => setNotifications([]));
        authApi.getProfile()
            .then(data => setUser(data))
            .catch(() => {});
    }, []);

    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'Loading...';
    const userInitials = user ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || 'U' : '..';
    const userRole = user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
    const userEmail = user?.email || '';

    const toggleSubMenu = (name: string) => {
        setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const navigationItems: NavItem[] = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'CRM', href: '/crm', icon: Target },
        { name: 'Clients', href: '/clients', icon: Users },
        { name: 'Consignee', href: '/consignee', icon: UserCheck },
        { name: 'Payable', href: '/payable', icon: CreditCard },
        {
            name: 'Job Reference',
            href: '/job-reference',
            icon: FolderOpen,
            children: [
                { name: 'Job Reference', href: '/job-reference' },
                { name: 'Job Category', href: '/job-reference/category' },
                { name: 'Job Title', href: '/job-reference/title' },
                { name: 'Job Controller', href: '/job-reference/controller' },
                { name: 'To Be Invoiced', href: '/job-reference/to-be-invoiced' },
            ],
        },
        { name: 'FCL/LCL', href: '/fcl-lcl', icon: Package },
        { name: 'Job Cost Center', href: '/job-cost-center', icon: Calculator },
        { name: 'File Verification', href: '/file-verification', icon: FileCheck },
        { name: 'Shipment', href: '/shipment', icon: Ship },
        { name: 'Invoice Service', href: '/invoice-service', icon: FileSpreadsheet },
        { name: 'Sales Quote', href: '/sales-quote', icon: FileText },
        { name: 'Sales Invoice', href: '/sales-invoice', icon: Receipt },
        { name: 'Terminal', href: '/terminal', icon: Building },
        { name: 'Port Handling', href: '/port-handling', icon: Anchor },
        { name: 'Daily Work Order', href: '/daily-work-order', icon: ClipboardList },
        {
            name: 'Sales Income',
            href: '/sales-income',
            icon: TrendingUp,
            children: [
                { name: 'Client Advance', href: '/sales-income/client-advance' },
                { name: 'Receive Payment', href: '/sales-income/receive-payment' },
            ],
        },
        { name: 'Payable Expense', href: '/payable-expense', icon: CircleArrowDown },
        { name: 'Client OPB', href: '/client-opb', icon: FileInput },
        { name: 'Payable OPB', href: '/payable-opb', icon: FileOutput },
        { name: 'Expense Entry', href: '/expense-entry', icon: CircleMinus },
        {
            name: 'Payment Entry',
            href: '/payment-entry',
            icon: Wallet,
        },
        { name: 'RCV / PVC', href: '/rcv-pvc', icon: ArrowLeftRight },
        { name: 'Transaction History', href: '/transaction-history', icon: History },
        { name: 'SOA', href: '/soa', icon: Table },
        {
            name: 'Accounting',
            href: '/accounting',
            icon: BookOpen,
            children: [
                { name: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
                { name: 'Entries', href: '/accounting/journal-entries' },
                { name: 'General Ledger', href: '/accounting/general-ledger' },
                { name: 'Trial Balance', href: '/accounting/trial-balance' },
                { name: 'Balance Sheet', href: '/accounting/balance-sheet' },
                { name: 'Income Statement', href: '/accounting/income-statement' },
                { name: 'Aging Reports', href: '/accounting/aging-reports' },
                { name: 'Bank Accounts', href: '/accounting/bank-accounts' },
                { name: 'Bank Reconciliation', href: '/accounting/bank-reconciliation' },
            ],
        },
        { name: 'Report', href: '/report', icon: PieChart },
        { name: 'Display', href: '/display', icon: Monitor },
    ];

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.includes('/crm')) return 'CRM';
        if (path.includes('/clients')) return 'Clients';
        if (path.includes('/consignee')) return 'Consignee';
        if (path.includes('/payable-expense')) return 'Payable Expense';
        if (path.includes('/payable-opb')) return 'Payable OPB';
        if (path.includes('/payable')) return 'Payable';
        if (path.includes('/job-reference')) return 'Job Reference';
        if (path.includes('/fcl-lcl')) return 'FCL/LCL';
        if (path.includes('/job-cost-center')) return 'Job Cost Center';
        if (path.includes('/file-verification')) return 'File Verification';
        if (path.includes('/shipment')) return 'Shipment';
        if (path.includes('/invoice-service')) return 'Invoice Service';
        if (path.includes('/sales-quote')) return 'Sales Quote';
        if (path.includes('/sales-invoice')) return 'Sales Invoice';
        if (path.includes('/sales-income')) return 'Sales Income';
        if (path.includes('/terminal')) return 'Terminal';
        if (path.includes('/port-handling')) return 'Port Handling';
        if (path.includes('/daily-work-order')) return 'Daily Work Order';
        if (path.includes('/client-opb')) return 'Client OPB';
        if (path.includes('/expense-entry')) return 'Expense Entry';
        if (path.includes('/payment-entry')) return 'Payment Entry';
        if (path.includes('/rcv-pvc')) return 'RCV / PVC';
        if (path.includes('/transaction-history')) return 'Transaction History';
        if (path.includes('/soa')) return 'SOA';
        if (path.includes('/accounting/chart-of-accounts')) return 'Chart of Accounts';
        if (path.includes('/accounting/journal-entries')) return 'Entries';
        if (path.includes('/accounting/general-ledger')) return 'General Ledger';
        if (path.includes('/accounting/trial-balance')) return 'Trial Balance';
        if (path.includes('/accounting/balance-sheet')) return 'Balance Sheet';
        if (path.includes('/accounting/income-statement')) return 'Income Statement';
        if (path.includes('/accounting/aging-reports')) return 'Aging Reports';
        if (path.includes('/accounting/bank-accounts')) return 'Bank Accounts';
        if (path.includes('/accounting/bank-reconciliation')) return 'Bank Reconciliation';
        if (path.includes('/accounting')) return 'Accounting';
        if (path.includes('/report')) return 'Report';
        if (path.includes('/display')) return 'Display';
        if (path.includes('/settings')) return 'Settings';
        return 'Fayha Clearance';
    };

    const isItemActive = (item: NavItem): boolean => {
        if (item.children) {
            return item.children.some(
                (child) =>
                    location.pathname === child.href ||
                    (child.href !== '/' && location.pathname.startsWith(child.href))
            );
        }
        return (
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:relative lg:translate-x-0 shadow-sidebar flex flex-col`}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Landmark className="h-5 w-5 text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="font-bold text-base tracking-tight text-white">Fayha Clearance</h1>
                                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Enterprise ERP</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Quick Stats Bar */}
                {!sidebarCollapsed && (
                    <div className="px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-slate-400">System Online</span>
                            <span className="ml-auto text-xs text-emerald-400 font-semibold">500+ Users</span>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {navigationItems.map((item) => {
                        const isActive = isItemActive(item);
                        const isExpanded = expandedMenus[item.name] ?? false;
                        const hasChildren = item.children && item.children.length > 0;

                        return (
                            <div key={item.name}>
                                {/* Parent item */}
                                {hasChildren ? (
                                    <button
                                        onClick={() => toggleSubMenu(item.name)}
                                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${isActive
                                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                        title={sidebarCollapsed ? item.name : undefined}
                                    >
                                        <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                        {!sidebarCollapsed && (
                                            <>
                                                <span className="flex-1 text-left">{item.name}</span>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform duration-200" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 flex-shrink-0 transition-transform duration-200" />
                                                )}
                                            </>
                                        )}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full -ml-3" />
                                        )}
                                    </button>
                                ) : (
                                    <NavLink
                                        to={item.href}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${isActive
                                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                        title={sidebarCollapsed ? item.name : undefined}
                                    >
                                        <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                        {!sidebarCollapsed && (
                                            <>
                                                <span className="flex-1">{item.name}</span>
                                                {item.badge && (
                                                    <span className={`${item.badgeColor || 'bg-slate-600'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full -ml-3" />
                                        )}
                                    </NavLink>
                                )}

                                {/* Child items */}
                                {hasChildren && isExpanded && !sidebarCollapsed && (
                                    <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                                        {item.children!.map((child) => {
                                            const isChildActive = location.pathname === child.href;
                                            return (
                                                <NavLink
                                                    key={child.href}
                                                    to={child.href}
                                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${isChildActive
                                                        ? 'text-emerald-400 bg-emerald-500/10'
                                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isChildActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                                    <span>{child.name}</span>
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Settings Link */}
                <div className="px-3 pb-2">
                    <NavLink
                        to="/settings"
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${location.pathname === '/settings'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <Settings className="h-5 w-5 flex-shrink-0" />
                        {!sidebarCollapsed && <span>Settings</span>}
                    </NavLink>
                </div>

                {/* User Profile Section */}
                <div className="p-3 border-t border-white/5">
                    <div className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        <div className="relative flex-shrink-0">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/20">
                                {userInitials}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{userName}</p>
                                <p className="text-[11px] text-slate-500 truncate">{userRole}</p>
                            </div>
                        )}
                        {!sidebarCollapsed && <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Header */}
                <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-slate-500 hover:text-slate-700 lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden lg:flex text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Breadcrumb */}
                        <div className="hidden md:flex items-center gap-2 text-sm">
                            <span className="text-slate-400">Home</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                            <span className="font-semibold text-slate-700">{getPageTitle()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Global Search */}
                        <div className="relative hidden lg:block">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search jobs, invoices, customers..."
                                className="h-10 w-80 rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                            />
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 text-[10px] font-mono text-slate-500">
                                Ctrl+K
                            </kbd>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Quick Actions */}
                            <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Quick Actions">
                                <Zap className="h-5 w-5" />
                            </button>

                            {/* Fullscreen */}
                            <button className="hidden md:flex p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all" title="Fullscreen">
                                <Maximize2 className="h-5 w-5" />
                            </button>

                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }}
                                    className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <Bell className="h-5 w-5" />
                                    {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />}
                                </button>

                                {/* Notifications Dropdown */}
                                {notificationsOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-elevated border border-slate-200/80 overflow-hidden animate-fade-in-down z-50">
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="font-bold text-slate-900">Notifications</h3>
                                            {notifications.length > 0 && <span className="badge-danger">{notifications.length} New</span>}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="px-4 py-8 text-center">
                                                    <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                                    <p className="text-sm text-slate-400">No notifications</p>
                                                </div>
                                            ) : (
                                                notifications.slice(0, 10).map((n) => (
                                                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.type === 'warning' ? 'bg-amber-400' :
                                                                n.type === 'success' ? 'bg-emerald-400' :
                                                                    n.type === 'danger' ? 'bg-red-400' : 'bg-blue-400'
                                                                }`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-slate-700 font-medium">{n.title}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="relative ml-1">
                                <button
                                    onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }}
                                    className="flex items-center gap-2.5 p-1.5 pr-3 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                        {userInitials}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className="text-sm font-semibold text-slate-700 leading-tight">{userName}</p>
                                        <p className="text-[10px] text-slate-400">{userRole}</p>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
                                </button>

                                {/* User Dropdown */}
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-elevated border border-slate-200/80 overflow-hidden animate-fade-in-down z-50">
                                        <div className="p-4 border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {userInitials}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{userName}</p>
                                                    <p className="text-xs text-slate-500">{userEmail}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                                                <UserCircle className="h-4 w-4 text-slate-400" />
                                                My Profile
                                            </button>
                                            <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                                                <Shield className="h-4 w-4 text-slate-400" />
                                                Security Settings
                                            </button>
                                            <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                                                <Globe className="h-4 w-4 text-slate-400" />
                                                Language & Region
                                            </button>
                                            <button onClick={() => { setUserMenuOpen(false); navigate('/display'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                                                <Moon className="h-4 w-4 text-slate-400" />
                                                Dark Mode
                                            </button>
                                            <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                                                <HelpCircle className="h-4 w-4 text-slate-400" />
                                                Help & Support
                                            </button>
                                        </div>
                                        <div className="p-2 border-t border-slate-100">
                                            <button
                                                onClick={() => {
                                                    clearAuth();
                                                    onLogout();
                                                    navigate('/login', { replace: true });
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6" onClick={() => { setUserMenuOpen(false); setNotificationsOpen(false); }}>
                    <div className="mx-auto max-w-7xl animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
