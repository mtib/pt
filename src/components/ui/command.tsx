"use client";

import * as React from "react";

interface CommandProps {
    children: React.ReactNode;
}

export function Command({ children }: CommandProps) {
    return (
        <div className="command-container border rounded-lg shadow-lg bg-gray-50 w-full max-w-md">
            {children}
        </div>
    );
}

interface CommandInputProps {
    placeholder?: string;
    value: string;
    onValueChange: (value: string) => void;
}

export function CommandInput({ placeholder, value, onValueChange }: CommandInputProps) {
    return (
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="command-input w-full p-3 border-b focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-t-lg"
        />
    );
}

interface CommandListProps {
    items: { value: string; label: string; }[] | undefined;
    onSelect: (item: { value: string; label: string; }) => void;
}

export function CommandList({ items = [], onSelect }: CommandListProps) {
    return (
        <ul className="command-list max-h-60 overflow-y-auto bg-white">
            {items.length > 0 ? (
                items.map((item) => (
                    <CommandItem key={item.value} onSelect={() => onSelect(item)}>
                        {item.label}
                    </CommandItem>
                ))
            ) : (
                <li className="command-item px-4 py-2 text-gray-500">No results found</li>
            )}
        </ul>
    );
}

interface CommandItemProps {
    children: React.ReactNode;
    onSelect: () => void;
}

export function CommandItem({ children, onSelect }: CommandItemProps) {
    return (
        <li
            onClick={onSelect}
            className="command-item cursor-pointer px-4 py-2 hover:bg-indigo-100"
        >
            {children}
        </li>
    );
}
