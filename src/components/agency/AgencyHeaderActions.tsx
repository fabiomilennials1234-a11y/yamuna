"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateTenantModal } from "./CreateTenantModal";

export function AgencyHeaderActions() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
                <Plus size={18} />
                Novo Cliente
            </button>

            <CreateTenantModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
