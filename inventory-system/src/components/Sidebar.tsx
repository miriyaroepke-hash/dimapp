"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Menu, X, Monitor, Store } from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const navItems = [
    { name: "План дня", href: "/daily-plan", icon: LayoutDashboard },
    { name: "Склад", href: "/inventory", icon: Package },
    { name: "Шоурум", href: "/showroom", icon: Store },
    { name: "Витрина", href: "/storefront", icon: Store },
    { name: "Инвентаризация", href: "/stock-check", icon: ShoppingCart },
    { name: "Заказы", href: "/orders", icon: ShoppingCart },
    { name: "Архив", href: "/archive", icon: Package },
    { name: "Пользователи", href: "/users", icon: Settings },
    { name: "Конструктор сайта", href: "/cms", icon: Monitor },
];


export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Mobile drawer logic could be added here or just responsive blocks

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-[#967BB6] text-black border-b border-gray-400">
                <span className="font-bold text-lg uppercase">Dimmiani</span>
                <button onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar Container */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-[#967BB6] text-black transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto border-r border-gray-400",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-center h-16 border-b border-gray-400">
                        <h1 className="text-xl font-bold uppercase tracking-widest">Dimmiani</h1>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={clsx(
                                        "flex items-center px-4 py-3 rounded-lg transition-colors font-medium",
                                        isActive ? "bg-black text-white" : "text-gray-900 hover:bg-[#B57EDC] hover:text-black"
                                    )}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-400">
                        <button
                            onClick={() => signOut()}
                            className="flex items-center w-full px-4 py-3 text-gray-900 rounded-lg hover:bg-[#B57EDC] hover:text-black transition-colors font-medium"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Выйти
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
