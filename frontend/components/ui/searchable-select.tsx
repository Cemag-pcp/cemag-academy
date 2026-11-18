'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'

export interface SearchableOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  id?: string
}

// Busca sem diferenciar acentos/maiúsculas ("predial" encontra "PREDIAL", "manutencao" encontra "MANUTENÇÃO")
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  disabled,
  className,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selecionado = options.find(o => o.value === value)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'border-input data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50',
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2',
            'text-sm whitespace-nowrap shadow-xs outline-none transition-[color,box-shadow]',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selecionado && 'text-muted-foreground')}>
            {selecionado?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      {/* Sem Portal: dentro de um Dialog o portal impede a rolagem da lista */}
      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        className={cn(
          'bg-popover text-popover-foreground z-50 rounded-md border shadow-md outline-hidden',
          'w-[var(--radix-popover-trigger-width)] min-w-56 p-0',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        )}
      >
        <Command filter={(item, busca) => (normalizar(item).includes(normalizar(busca)) ? 1 : 0)}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}
